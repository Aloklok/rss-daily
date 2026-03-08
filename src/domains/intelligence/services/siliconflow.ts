/**
 * SiliconFlow AI 服务（基于 Vercel AI SDK）
 *
 * 本文件是对旧版 siliconflow.legacy.ts（手写 fetch + SSE 解析）的 AI SDK 重写。
 * 所有导出函数保持与旧版完全相同的签名，确保消费者（orchestrator、translate、router 等）零改动。
 *
 * 回退方案：如需回退，将所有 import './siliconflow' 改为 import './siliconflow.legacy' 即可。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { generateText, streamText } from 'ai';
import { createSiliconFlowProvider } from './siliconflow-provider';

// Re-export TTS 功能（TTS 不在 AI SDK 范围内，直接使用旧实现）
export { generateSiliconFlowAudio } from './siliconflow.legacy';

/**
 * 消息角色规范化：将 'model' 转为 'assistant'，过滤无效消息
 */
function sanitizeMessages(messages: any[]) {
    const validRoles = ['system', 'user', 'assistant'];
    return messages
        .map((m) => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content || '',
        }))
        .filter((m) => validRoles.includes(m.role) && m.content.trim() !== '');
}

/**
 * Helper to clean thinking block from non-streaming response content
 * 保留与旧版完全一致的实现
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
 * Adapter to match the `chatWithGemini` interface
 * Returns an AsyncGenerator that yields objects with a text() method.
 *
 * 【AI SDK 实现】：使用 streamText() 替代手写 SSE 解析
 */
export async function* streamSiliconFlow(
    messages: any[],
    modelName: string,
    _useSearch: boolean = false,
    enableThinking: boolean = false,
) {
    const provider = createSiliconFlowProvider();

    // 消息预处理：复用旧版的 system role 合并逻辑
    // SiliconFlow 的某些模型（如 GLM-4-9B）不支持 system role，需要合并到 user 消息中
    const sanitized = sanitizeMessages(messages);
    const systemMessages = sanitized.filter((m) => m.role === 'system');
    const conversationMessages = sanitized.filter((m) => m.role !== 'system');

    if (systemMessages.length > 0) {
        const systemContent = systemMessages.map((m) => m.content).join('\n\n');
        if (conversationMessages.length > 0 && conversationMessages[0].role === 'user') {
            conversationMessages[0].content = `${systemContent}\n\n${conversationMessages[0].content}`;
        } else {
            conversationMessages.unshift({ role: 'user', content: systemContent });
        }
    }

    // 构建 AI SDK 请求
    const result = streamText({
        model: provider(modelName),
        messages: conversationMessages as any,
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(60000), // 60s 超时
        providerOptions: {
            siliconflow: {
                enable_thinking: enableThinking,
            },
        },
    });

    // 适配现有消费者接口: yield { text: () => string }
    // 现有的 route.ts 通过 `for await (const chunk of stream) { chunk.text() }` 消费
    let thinkingBuffer = '';
    let hasFinishedThinking = false;
    let hasCheckedForThinking = false;

    for await (const chunk of result.textStream) {
        if (!chunk) continue;

        // 保留与旧版相同的 <think> 处理逻辑
        if (!hasFinishedThinking) {
            thinkingBuffer += chunk;

            if (!hasCheckedForThinking && thinkingBuffer.length > 0) {
                if (thinkingBuffer.startsWith('<think>')) {
                    console.log('[SiliconFlow/SDK] Thinking detected, buffering CoT...');
                    hasCheckedForThinking = true;
                } else if (thinkingBuffer.length > 50) {
                    console.log('[SiliconFlow/SDK] No thinking detected, using passthrough.');
                    hasCheckedForThinking = true;
                    hasFinishedThinking = true;
                    yield { text: () => thinkingBuffer };
                    thinkingBuffer = '';
                }
            }

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
            yield { text: () => chunk };
        }
    }

    // 如果流结束但 thinking 从未结束，flush buffer
    if (!hasFinishedThinking && thinkingBuffer) {
        yield { text: () => thinkingBuffer };
    }
}

/**
 * SiliconFlow Chat Completion Handler (Deprecated)
 * 保留签名兼容性，内部委托 streamSiliconFlow
 * @deprecated 使用 streamSiliconFlow 代替
 */
export async function chatWithSiliconFlow(
    messages: any[],
    modelName: string,
    useSearch: boolean = false,
): Promise<ReadableStream> {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of generator) {
                    const text = chunk.text();
                    if (text) {
                        controller.enqueue(encoder.encode(text));
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
 * Non-streaming generation (Aggregated response)
 *
 * 【AI SDK 实现】：使用 generateText() 替代手写 node:https 请求
 */
export async function generateSiliconFlow(
    messages: any[],
    modelName: string,
    max_tokens: number = 16000,
    _jsonMode: boolean = false,
    enableThinking: boolean = true,
): Promise<string> {
    const provider = createSiliconFlowProvider();

    const sanitized = sanitizeMessages(messages);

    const result = await generateText({
        model: provider(modelName),
        messages: sanitized as any,
        temperature: 0.5,
        maxOutputTokens: max_tokens,
        providerOptions: {
            siliconflow: {
                enable_thinking: enableThinking,
            },
        },
    });

    // Filter out thinking block for DeepSeek R1 models
    return cleanDeepSeekContent(result.text);
}
