// src/utils/colorUtils.ts

const TAG_COLOR_CLASSES = [
  'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200',
  'bg-lime-100 text-lime-800 dark:bg-lime-900/60 dark:text-lime-200',
  'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
  'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/60 dark:text-fuchsia-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
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
