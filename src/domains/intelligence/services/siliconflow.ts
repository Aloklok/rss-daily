export const SILICONFLOW_API_KEY = process.env.GUIJI_API_KEY;
export const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

export async function chatWithSiliconFlow(
  messages: any[],
  modelName: string,
  useSearch: boolean = false,
): Promise<ReadableStream> {
  if (!SILICONFLOW_API_KEY) {
    throw new Error('GUIJI_API_KEY is not defined');
  }

  const tools = useSearch
    ? [
        {
          type: 'function',
          function: {
            name: 'google_search',
            description: 'Perform a google search to get latest information.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query string',
                },
              },
              required: ['query'],
            },
          },
        },
      ]
    : undefined;

  const body = {
    model: modelName,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
    tools: tools,
    tool_choice: useSearch ? 'auto' : 'none',
  };

  console.log(`[SiliconFlow] Sending request to ${modelName} (Search: ${useSearch})`);

  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SiliconFlow] API Error:', errorText);
    throw new Error(`SiliconFlow API Error: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error('SiliconFlow API returned no body');
  }

  return new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      try {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6);
                const data = JSON.parse(jsonStr);
                const _content = data.choices?.[0]?.delta?.content;
                // Yielding logic handled by consumer or stream adapter
              } catch (e) {
                console.warn('Error parsing JSON chunk', e);
              }
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
}

export async function* streamSiliconFlow(
  messages: any[],
  modelName: string,
  useSearch: boolean = false,
) {
  if (!SILICONFLOW_API_KEY) {
    throw new Error('GUIJI_API_KEY is not defined');
  }

  const isGLMLegacy = modelName === 'THUDM/glm-4-9b-chat';
  const tools =
    useSearch && !isGLMLegacy
      ? [
          {
            type: 'function',
            function: {
              name: 'google_search',
              description: 'Perform a google search to get latest information.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query string',
                  },
                },
                required: ['query'],
              },
            },
          },
        ]
      : undefined;

  const validRoles = ['system', 'user', 'assistant'];
  const sanitizedMessages = messages
    .map((m) => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content || '',
    }))
    .filter((m) => validRoles.includes(m.role) && m.content.trim() !== '');

  const systemMessages = sanitizedMessages.filter((m) => m.role === 'system');
  const conversationMessages = sanitizedMessages.filter((m) => m.role !== 'system');

  if (systemMessages.length > 0) {
    const systemContent = systemMessages.map((m) => m.content).join('\n\n');
    if (conversationMessages.length > 0 && conversationMessages[0].role === 'user') {
      conversationMessages[0].content = `${systemContent}\n\n${conversationMessages[0].content}`;
    } else {
      conversationMessages.unshift({ role: 'user', content: systemContent });
    }
  }

  const body: any = {
    model: modelName,
    messages: conversationMessages,
    stream: true,
    temperature: 0.7,
  };

  if (tools) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SiliconFlow] API Error:', errorText);
    throw new Error(`SiliconFlow API Error: ${response.status} - ${errorText}`);
  }

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let thinkingBuffer = '';
  let hasFinishedThinking = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (!hasFinishedThinking && thinkingBuffer) {
        yield { text: () => thinkingBuffer };
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const content = data.choices?.[0]?.delta?.content || '';

          if (!hasFinishedThinking) {
            thinkingBuffer += content;
            if (thinkingBuffer.includes('</think>')) {
              hasFinishedThinking = true;
              const closeTagIndex = thinkingBuffer.indexOf('</think>');
              const realContent = thinkingBuffer.slice(closeTagIndex + 8);
              if (realContent) {
                yield { text: () => realContent };
              }
              thinkingBuffer = '';
            }
          } else {
            if (content) {
              yield { text: () => content };
            }
          }
        } catch (_e) {
          // ignore
        }
      }
    }
  }
}

export async function generateSiliconFlow(messages: any[], modelName: string): Promise<string> {
  if (!SILICONFLOW_API_KEY) {
    throw new Error('GUIJI_API_KEY is not defined');
  }

  const body = {
    model: modelName,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: false,
    temperature: 0.7,
    max_tokens: 4096,
  };

  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SiliconFlow] API Error:', errorText);
    throw new Error(`SiliconFlow API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
