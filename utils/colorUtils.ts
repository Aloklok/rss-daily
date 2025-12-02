// src/utils/colorUtils.ts

const TAG_COLOR_CLASSES = [
  'bg-slate-100 text-slate-800 dark:bg-slate-200 dark:text-slate-900',
  'bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900',
  'bg-orange-100 text-orange-800 dark:bg-orange-200 dark:text-orange-900',
  'bg-amber-100 text-amber-800 dark:bg-amber-200 dark:text-amber-900',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-200 dark:text-yellow-900',
  'bg-lime-100 text-lime-800 dark:bg-lime-200 dark:text-lime-900',
  'bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-200 dark:text-emerald-900',
  'bg-teal-100 text-teal-800 dark:bg-teal-200 dark:text-teal-900',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-200 dark:text-cyan-900',
  'bg-sky-100 text-sky-800 dark:bg-sky-200 dark:text-sky-900',
  'bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-900',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-200 dark:text-indigo-900',
  'bg-violet-100 text-violet-800 dark:bg-violet-200 dark:text-violet-900',
  'bg-purple-100 text-purple-800 dark:bg-purple-200 dark:text-purple-900',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-200 dark:text-fuchsia-900',
  'bg-pink-100 text-pink-800 dark:bg-pink-200 dark:text-pink-900',
  'bg-rose-100 text-rose-800 dark:bg-rose-200 dark:text-rose-900',
  'bg-gray-100 text-gray-800 dark:bg-gray-200 dark:text-gray-900',
  'bg-zinc-100 text-zinc-800 dark:bg-zinc-200 dark:text-zinc-900',
  'bg-neutral-100 text-neutral-800 dark:bg-neutral-200 dark:text-neutral-900',
  'bg-stone-100 text-stone-800 dark:bg-stone-200 dark:text-stone-900'
];

const GRADIENTS = [
  'from-rose-400 via-fuchsia-500 to-indigo-500',
  'from-green-400 via-cyan-500 to-blue-500',
  'from-amber-400 via-orange-500 to-red-500',
  'from-teal-400 via-sky-500 to-purple-500',
  'from-lime-400 via-emerald-500 to-cyan-500',
  'from-fuchsia-500 via-purple-600 to-indigo-600',
  'from-pink-500 via-rose-500 to-yellow-500',
  'from-blue-400 via-indigo-500 to-purple-500',
  'from-emerald-400 via-teal-500 to-cyan-500',
  'from-orange-400 via-red-500 to-pink-500',
  'from-indigo-400 via-purple-500 to-pink-500',
  'from-cyan-400 via-blue-500 to-indigo-500',
  'from-yellow-400 via-orange-500 to-red-500',
  'from-sky-400 via-blue-500 to-indigo-500',
  'from-violet-400 via-purple-500 to-fuchsia-500'
];

/**
 * 根据输入的字符串（如标签名）生成一个确定性的、好看的 Tailwind 颜色类名。
 * @param key - 用于生成哈希值的字符串。
 * @returns 返回一个 Tailwind CSS 类名字符串，例如 'bg-sky-100 text-sky-800'。
 */
export const getRandomColorClass = (key: string): string => {
  // 1. 【增加】对 key 不存在的情况进行健壮性处理
  if (!key) return TAG_COLOR_CLASSES[0];

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % TAG_COLOR_CLASSES.length);
  return TAG_COLOR_CLASSES[index];
};

/**
 * 根据输入的字符串（如日期）生成一个确定性的、好看的 Tailwind 渐变类名。
 * @param key - 用于生成哈希值的字符串。
 * @returns 返回一个 Tailwind CSS 渐变类名字符串。
 */
export const getRandomGradient = (key: string): string => {
  if (!key) return GRADIENTS[0];

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % GRADIENTS.length);
  return GRADIENTS[index];
};
