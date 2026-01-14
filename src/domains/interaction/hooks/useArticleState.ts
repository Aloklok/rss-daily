// hooks/useArticleState.ts

import { useState, useEffect } from 'react';
import { Article } from '@/shared/types';

// 这个 Hook 现在只负责管理一个文章对象的本地状态，不再执行 API 调用。
export const useArticleState = (initialArticle: Article | null) => {
  const [article, setArticle] = useState(initialArticle);

  useEffect(() => {
    setArticle(initialArticle);
  }, [initialArticle]);

  // 它只返回状态，不再返回更新函数，因为更新由 App.tsx 的 handleArticleStateChange 统一处理。
  return {
    article,
  };
};
