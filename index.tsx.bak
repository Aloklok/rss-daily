// index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // 【改】移除未使用的 QueryObserverOptions
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// 创建一个 QueryClient 实例 (保持不变)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // --- 【核心修改】开始 ---
      // 默认情况下，refetchOnWindowFocus 是 true
      refetchOnWindowFocus: false, // 禁用窗口重新聚焦时的自动刷新
      refetchOnReconnect: false,   // (可选，但推荐) 禁用网络重新连接时的自动刷新
      refetchOnMount: true,      // (保持) 组件挂载时仍然获取数据
      // --- 核心修改结束 ---

      staleTime: 1000 * 60 * 20, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// --- 【核心修复】开始 ---

// 将你的应用主体（包括所有 providers）封装在一个组件中，以便复用
const AppWithProviders: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <BrowserRouter>
        <App />
        <Analytics />
        <SpeedInsights />
      </BrowserRouter>
    </HelmetProvider>
  </QueryClientProvider>
);

// 使用 Vite 提供的环境变量 import.meta.env.DEV 来进行条件渲染
// 在开发环境 (vercel dev)，DEV 为 true，启用严格模式
// 在生产环境 (build)，DEV 为 false，禁用严格模式
root.render(
  import.meta.env.DEV ? (
    <React.StrictMode>
      <AppWithProviders />
    </React.StrictMode>
  ) : (
    <AppWithProviders />
  )
);
// --- 核心修复结束 ---