## 项目根目录

- `App.tsx` - 主应用组件
- `README.md` - 项目文档
- `eslint.config.ts` - ESLint 配置
- `index.css` - 全局样式
- `index.html` - HTML 入口文件
- `index.tsx` - TypeScript 入口文件
- `metadata.json` - 项目元数据
- `package.json` - 项目依赖配置
- `package-lock.json` - 依赖锁定文件
- `postcss.config.js` - PostCSS 配置
- `tailwind.config.js` - Tailwind CSS 配置
- `tsconfig.json` - TypeScript 配置
- `types.ts` - TypeScript 类型定义
- `vite.config.ts` - Vite 构建配置
- `.DS_Store` - macOS 系统文件
- `.vscode/settings.json` - VSCode 设置

## API 目录

- `_utils.ts` - API 工具函数
- `article-states.ts` - 文章状态相关 API
- `articles-categories-tags.ts` - 文章分类标签 API
- `articles.ts` - 文章相关 API
- `get-available-dates.ts` - 获取可用日期 API
- `get-briefings.ts` - 获取简报 API
- `list-categories-tags.ts` - 列出分类标签 API
- `readability.ts.bak` - Readability 备份文件
- `refresh.ts` - 刷新功能 API
- `update-state.ts` - 更新文章状态 API

## 组件目录

- `ArticleCard.tsx` - 文章卡片组件
- `ArticleDetail.tsx` - 文章详情组件
- `ArticleGroup.tsx` - 文章分组组件
- `ArticleList.tsx` - 文章列表组件
- `ArticlePreviewModal.tsx` - 文章预览模态框
- `Briefing.tsx` - 简报主视图组件
- `ReaderView.tsx` - 阅读器视图组件
- `SettingsPopover.tsx` - 设置弹窗组件
- `Sidebar.tsx` - 侧边栏组件

## 自定义 Hooks 目录

- `useArticleManagement.ts` - 文章管理相关 Hook
- `useDataFetching.ts` - 数据获取相关 Hook
- `useFilters.ts` - 筛选器相关 Hook
- `useReader.ts` - 阅读器相关 Hook
- `useSidebar.ts` - 侧边栏相关 Hook

## 服务目录

- `api.ts` - API 服务模块

## 类型定义目录

- `optional-mods.d.ts` - 可选模块类型定义

## 构建输出目录

- `assets/` - 静态资源文件
- `index.html` - 构建后 HTML 文件
- `manifest.json` - 构建后清单文件
- `robots.txt` - 构建后 robots 文件
- `sw.js` - Service Worker 文件

## 公共资源目录 (`/public`)

- `manifest.json` - PWA 清单文件
- `robots.txt` - robots 文件
- `sw.js` - Service Worker 文件

## 配置文件说明

- 项目采用 React + TypeScript + Vite 架构
- 使用 Tailwind CSS 作为样式框架
- 通过 Supabase 和 FreshRSS 作为后端服务
- 实现了 PWA 功能支持离线访问
- 使用 Vercel Serverless Functions 作为后端 API
