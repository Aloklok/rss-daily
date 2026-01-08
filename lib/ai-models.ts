export const DEFAULT_MODEL_ID = 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B';

// --- AI Router Configuration ---
export const ENABLE_AI_ROUTER = true; // Set to false to disable the AI Router globally
export const ROUTER_MODEL_ID = 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B'; // Free model for fast routing

export const MODELS = [
  // --- SiliconFlow Models (Priority) ---
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    name: 'DS-R1-Distill-7B (Free)',
    desc: '免费 R1 蒸馏，高性价比',
    hasSearch: false,
    quota: 'Free',
    provider: 'siliconflow',
  },
  {
    id: 'THUDM/glm-4-9b-chat',
    name: 'GLM-4-9B (Free)',
    desc: '完全免费，日常对话首选',
    hasSearch: false,
    quota: 'Free',
    provider: 'siliconflow',
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
    name: 'DS-R1-Distill-14B',
    desc: '极强数理逻辑，¥0.7/M',
    hasSearch: false,
    quota: '¥0.7/M',
    provider: 'siliconflow',
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    name: 'DS-R1-Distill-32B',
    desc: '逻辑之王，深度推理',
    hasSearch: false,
    quota: '¥1.26/M',
    provider: 'siliconflow',
  },
  {
    id: 'Qwen/Qwen3-14B',
    name: 'Qwen3-14B',
    desc: '高性价比，支持思考',
    hasSearch: false,
    quota: '¥2.0/M',
    provider: 'siliconflow',
  },
  {
    id: 'Qwen/Qwen3-30B-A3B-Instruct',
    name: 'Qwen3-30B-A3B',
    desc: '长文本专家，256K上下文',
    hasSearch: false,
    quota: '¥2.8/M',
    provider: 'siliconflow',
  },
  {
    id: 'deepseek-ai/DeepSeek-V3.2',
    name: 'DeepSeek-V3.2',
    desc: '性能天花板，复杂搜索',
    hasSearch: false,
    quota: '¥3.0/M',
    provider: 'siliconflow',
  },
  {
    id: 'Qwen/Qwen3-VL-8B-Instruct',
    name: 'Qwen3-VL-8B',
    desc: '视觉搜索首选，256K',
    hasSearch: false,
    quota: '¥2.0/M',
    provider: 'siliconflow',
  },

  // --- Google Gemini Models ---
  {
    id: 'gemini-2.5-flash-lite-preview-09-2025',
    name: 'Gemini 2.5 Flash-Lite (Sep)',
    desc: '2025.09 版，100 RPD 强力羊毛',
    hasSearch: true,
    quota: '15 RPM / 100 RPD',
  },
  {
    id: 'gemini-flash-lite-latest',
    name: 'Gemini 1.5 Flash-Lite (Latest)',
    desc: '经典低负载，100 RPD 稳定羊毛',
    hasSearch: true,
    quota: '15 RPM / 100 RPD',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3.0 Flash (Preview)',
    desc: '最强下一代，目前独立池子',
    hasSearch: true,
    quota: '15 RPM / 独立 RPD',
  },
  {
    id: 'gemini-robotics-er-1.5-preview',
    name: 'Gemini 1.5 Robotics (Rare)',
    desc: '罕见 1.5 具身智能推理，独立池子',
    hasSearch: true,
    quota: '15 RPM / 独立 RPD',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    desc: '响应最快，额外独立池子',
    hasSearch: true,
    quota: '15 RPM / 独立 RPD',
  },
  {
    id: 'gemini-2.0-flash-lite-preview-02-05',
    name: 'Gemini 2.0 Flash-Lite (Old)',
    desc: '2.0 早期预览版，辅助独立池子',
    hasSearch: true,
    quota: '15 RPM / 独立 RPD',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    desc: '全能旗舰，共用每日 20 次',
    hasSearch: true,
    quota: '1500 RPM / 20 RPD',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    desc: '最强智力，极低 RPD 池',
    hasSearch: true,
    quota: '2 RPM / 50 RPD',
    provider: 'google',
  },
];
