import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full pt-10 pb-10">
      <div className="mx-auto w-full max-w-3xl px-6 2xl:max-w-5xl">
        {/* 强化分割线，在暖黄背景上使用深色调 */}
        <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-transparent via-stone-400 to-transparent dark:via-stone-500" />

        <div className="flex flex-col items-center justify-center space-y-2 sm:flex-row sm:space-y-0">
          <span className="text-sm font-bold tracking-wide text-stone-950 dark:text-stone-900">
            © {currentYear} Alok
          </span>
          <span className="mx-4 hidden text-stone-400 sm:inline-block dark:text-stone-600">|</span>
          <a
            href="mailto:alok2333@outlook.com"
            className="border-b border-stone-300 text-sm font-bold tracking-wide text-stone-900 transition-colors duration-200 hover:border-blue-800 hover:text-blue-800 dark:text-stone-800 dark:hover:text-blue-900"
            aria-label="Send an email to Alok"
          >
            alok2333@outlook.com
          </a>
        </div>
      </div>
    </footer>
  );
}
