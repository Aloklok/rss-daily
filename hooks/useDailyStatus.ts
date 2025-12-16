// hooks/useDailyStatus.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDailyStatuses, updateDailyStatus, showToast } from '../services/api';
// --- Query Hook ---
// 用于获取指定月份的每日完成状态
export const useDailyStatusesForMonth = (month: string) => {
  // month 格式为 'YYYY-MM'
  const queryKey = ['dailyStatuses', month];

  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!month) return {};
      const startDate = `${month}-01`;
      const date = new Date(parseInt(month.substring(0, 4)), parseInt(month.substring(5, 7)), 0);
      const endDate = `${month}-${date.getDate()}`;
      return getDailyStatuses(startDate, endDate);
    },
    enabled: !!month, // 只有当 month 有效时才执行查询
    // 策略调整:
    // 1. 每次打开 APP (冷启动/刷新) -> 内存缓存为空 -> 发起请求
    // 2. 切换标签/最小化 (热启动) -> 内存缓存存在且未过期 (Infinity) -> 不发起请求
    // 3. 组件重渲染 -> 不发起请求
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

// --- Mutation Hook ---
// 用于更新单个日期的完成状态（采用乐观更新）
export const useUpdateDailyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, isCompleted }: { date: string; isCompleted: boolean }) =>
      updateDailyStatus(date, isCompleted),

    // --- 乐观更新 ---
    onMutate: async ({ date, isCompleted }) => {
      const month = date.substring(0, 7);
      const queryKey = ['dailyStatuses', month];

      // 1. 取消任何可能冲突的进行中查询
      await queryClient.cancelQueries({ queryKey });

      // 2. 获取当前状态的快照
      const previousStatuses = queryClient.getQueryData<Record<string, boolean>>(queryKey) || {};

      // 3. 立即更新缓存中的数据，让 UI 瞬间响应
      queryClient.setQueryData<Record<string, boolean>>(queryKey, (old) => ({
        ...old,
        [date]: isCompleted,
      }));

      // 4. 返回包含快照的上下文
      return { previousStatuses, queryKey };
    },
    // --- 【核心修改】在 onSuccess 中显示 Toast 并确认状态 ---
    onSuccess: (data, variables) => {
      const { date, isCompleted } = variables;
      const dateObj = new Date(date + 'T00:00:00');
      const displayDate = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

      const message = isCompleted
        ? `${displayDate} 简报已标记为完成`
        : `${displayDate} 简报已标记为未完成`;

      showToast(message, 'success');

      // 【核心修复】使用服务器返回的确认数据更新缓存
      // 这比 invalidateQueries 更安全，因为它不会触发可能返回旧数据的重新获取
      if (data && data.success) {
        const month = date.substring(0, 7);
        const queryKey = ['dailyStatuses', month];

        queryClient.setQueryData<Record<string, boolean>>(queryKey, (old) => ({
          ...old,
          [data.date]: data.is_completed,
        }));
      }
    },
    // --- 错误处理 ---
    onError: (err, variables, context) => {
      console.error('Failed to update daily status:', err);
      // 回滚 UI
      if (context?.previousStatuses) {
        queryClient.setQueryData(context.queryKey, context.previousStatuses);
      }
      // 【增】在出错时也显示 Toast
      showToast('状态更新失败，请重试', 'error');
    },
    // 【核心修复】移除 onSettled 中的 invalidateQueries
    // onSettled: (data, error, variables) => { ... }
  });
};
