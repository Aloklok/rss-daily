// { "name": "supabase", "used": false }

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// 延迟获取 API Key，确保脚本模式下 dotenv 已加载
function getApiKey(): string | undefined {
  return process.env.GUIJI_API_KEY;
}

/**
 * SiliconFlow Chat Completion Handler
 * Supports streaming and Google Search tool
 */
export async function chatWithSiliconFlow(
  messages: any[],
  modelName: string,
  useSearch: boolean = false,
): Promise<ReadableStream> {
  if (!getApiKey()) {
    throw new Error('GUIJI_API_KEY is not defined');
  }

  // 1. Construct Tools (Google Search)
  // SiliconFlow supports OpenAI-compatible tool definitions
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

  // 2. Prepare Request Body
  const body = {
    model: modelName,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
    tools: tools, // Add tools if search is enabled
    tool_choice: useSearch ? 'auto' : 'none', // Allow model to choose search
  };

  console.log(`[SiliconFlow] Sending request to ${modelName} (Search: ${useSearch})`);

  // 3. Call API
  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
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

  // 4. Return the raw stream (API returns SSE compatible with our frontend consumer)
  // Note: We might need to transform it if the frontend expects a specific format,
  // but our route.ts currently wraps `chatWithGemini` stream.
  // SiliconFlow stream format: data: {"id":"...","choices":[{"delta":{"content":"..."}}]}
  // We need to parse this and yield just the text content to match `chatWithGemini`'s behavior
  // which returns a stream of text chunks.

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  // const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6);
                const data = JSON.parse(jsonStr);
                const content = data.choices?.[0]?.delta?.content;

                // If there is content, pass it through
                if (content) {
                  // We need to wrap it in a mock response object that has .text() method
                  // because route.ts expects the stream iterator to return objects with .text()
                  // Wait, route.ts iterates `for await (const chunk of stream)`.
                  // `chatWithGemini` returns a `GoogleGenerativeAIStream`.
                  // Its chunks are objects with .text().
                  // We should adapt to that interface OR modify route.ts to handle plain strings.
                  // Let's modify this stream to yield objects with .text() function to minimize route.ts changes.
                  // Actually, we can't yield an object with a function across the boundary easily if we were just piping bytes.
                  // But `chatWithGemini` returns an AsyncGenerator.
                  // Let's make this return a ReadableStream that yields *Text*.
                  // AND modify route.ts to handle this.
                  // Retrying strategy: `chatWithGemini` returns a custom generic stream.
                  // Let's emulate the behavior directly here for now, but since we are returning a ReadableStream for `Response`,
                  // actually route.ts *iterates* the stream from `chatWithGemini`.
                  // Let's look at route.ts again.
                  // route.ts: `for await (const chunk of stream) { const text = chunk.text(); }`
                  // So the stream must look like an async iterable of objects with a `.text()` method.
                  // We can't return a standard ReadableStream here effectively if we want to match that signature directly
                  // without using a generator.
                  // Let's change the return type to AsyncGenerator.
                }
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

/**
 * Adapter to match the `chatWithGemini` interface
 * Returns an AsyncGenerator that yields objects with a text() method.
 */
export async function* streamSiliconFlow(
  messages: any[],
  modelName: string,
  useSearch: boolean = false,
) {
  if (!getApiKey()) {
    throw new Error('GUIJI_API_KEY is not defined');
  }

  // 1. Construct Tools (Search) - Only for models confirmed to support it
  // GLM-4-9B is notoriously unstable with tools parameters on SiliconFlow
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

  // Sanitize messages
  const validRoles = ['system', 'user', 'assistant'];
  const sanitizedMessages = messages
    .map((m) => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content || '',
    }))
    .filter((m) => validRoles.includes(m.role) && m.content.trim() !== '');

  // Hack: Merge 'system' role into the first 'user' message for models that don't support it
  // (Common on SiliconFlow for legacy/specific models like GLM-4-9B, despite docs saying otherwise)
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

  // Now use conversationMessages as the payload
  const body: any = {
    model: modelName,
    messages: conversationMessages,
    stream: true,
    temperature: 0.7,
    // max_tokens: 4096,
  };

  // Debug tools
  if (tools) {
    console.log('[SiliconFlow] Tools attached:', tools.length);
    body.tools = tools;
    body.tool_choice = 'auto';
  } else {
    console.log('[SiliconFlow] No tools attached.');
  }

  // Debug: Check what we are sending
  console.log('[SiliconFlow] Payload Messages:', JSON.stringify(conversationMessages, null, 2));
  if (conversationMessages.length > 0) {
    console.log('[SiliconFlow] First Content Length:', conversationMessages[0].content.length);
    // Debug: Print first 100 chars to check for weird special chars
    console.log(
      '[SiliconFlow] Content Check:',
      conversationMessages[0].content.substring(0, 100).replace(/\n/g, '\\n'),
    );
  }

  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
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
  // DeepSeek R1 Strategy: Buffer everything until </think> is seen
  // This handles missing opening tags and ensures we hide the chain of thought.
  // If no </think> is found by end of stream, we flush the buffer (fallback).
  let thinkingBuffer = '';
  let hasFinishedThinking = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      // Stream finished. If we never saw </think>, flush everything.
      if (!hasFinishedThinking && thinkingBuffer) {
        console.log('[SF YIELD FLUSH]', JSON.stringify(thinkingBuffer));
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

            // Check for closing tag
            if (thinkingBuffer.includes('</think>')) {
              hasFinishedThinking = true;
              const closeTagIndex = thinkingBuffer.indexOf('</think>');
              const realContent = thinkingBuffer.slice(closeTagIndex + 8);

              if (realContent) {
                yield { text: () => realContent };
              }
              thinkingBuffer = ''; // Free memory
            }
          } else {
            // Passthrough mode
            if (content) {
              yield { text: () => content };
            }
          }
        } catch (_e) {
          // ignore parse errors
        }
      }
    }
  }
}

/**
 * Helper to clean thinking block from non-streaming response content
 */
export function cleanDeepSeekContent(content: string): string {
  if (!content) return '';
  if (content.includes('</think>')) {
    const parts = content.split('</think>');
    return parts[parts.length - 1].trim();
  }
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Non-streaming generation for Briefings (Aggregated internally to prevent timeouts)
 */
export async function generateSiliconFlow(
  messages: any[],
  modelName: string,
  max_tokens: number = 16000,
  jsonMode: boolean = false,
  enableThinking: boolean = true,
): Promise<string> {
  if (!getApiKey()) {
    throw new Error('GUIJI_API_KEY is not defined');
  }

  const body: any = {
    model: modelName,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true, // Use streaming internally
    temperature: 0.5, // Set to 0.5 for stable structural output
    max_tokens: max_tokens,
  };

  if (enableThinking) {
    body.enable_thinking = true;
  }

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
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
  let fullContent = '';
  let buffer = '';

  // Heartbeat printer
  let lastDotTime = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

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
          fullContent += content;

          // Process heartbeat (print a dot every 500ms while generating)
          const now = Date.now();
          if (now - lastDotTime > 500) {
            process.stdout.write('.');
            lastDotTime = now;
          }
        } catch (_e) {
          // ignore parse errors
        }
      }
    }
  }

  // Clear the dot line
  if (fullContent) process.stdout.write('\n');

  // Filter out thinking block for DeepSeek R1 models
  return cleanDeepSeekContent(fullContent);
}
