/**
 * SiliconFlow Provider 配置
 * 基于 Vercel AI SDK 的 OpenAI-Compatible Provider
 *
 * 使用 @ai-sdk/openai-compatible 创建统一的 SiliconFlow provider 实例，
 * 作为所有 AI SDK 调用的入口。
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1';

// 延迟获取 API Key，确保脚本模式下 dotenv 已加载
function getApiKey(): string {
    const key = process.env.GUIJI_API_KEY;
    if (!key) {
        throw new Error('GUIJI_API_KEY is not defined');
    }
    return key;
}

/**
 * 创建 SiliconFlow provider 实例
 * 注意：每次调用都会重新读取 API Key，确保环境变量动态加载
 */
export function createSiliconFlowProvider() {
    return createOpenAICompatible({
        name: 'siliconflow',
        baseURL: SILICONFLOW_BASE_URL,
        apiKey: getApiKey(),
    });
}
