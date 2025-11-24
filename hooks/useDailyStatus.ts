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
    });
};

// --- Mutation Hook ---
// 用于更新单个日期的完成状态（采用乐观更新）
export const useUpdateDailyStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ date, isCompleted }: { date: string, isCompleted: boolean }) => 
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
        // --- 【核心修改】在 onSuccess 中显示 Toast ---
        onSuccess: (data, variables) => {
          // data 是从 /api/update-daily-status 返回的数据，例如 { success: true, date: '...', is_completed: true }
          // variables 是调用 mutation 时传入的参数，例如 { date: '...', isCompleted: true }
          const { date, isCompleted } = variables;
          const dateObj = new Date(date + 'T00:00:00');
          const displayDate = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
          
          const message = isCompleted 
              ? `${displayDate} 简报已标记为完成` 
              : `${displayDate} 简报已标记为未完成`;
          
          showToast(message, 'success');
        },
        // --- 错误处理 ---
        onError: (err, variables, context) => {
          console.error("Failed to update daily status:", err);
          // 回滚 UI
          if (context?.previousStatuses) {
              queryClient.setQueryData(context.queryKey, context.previousStatuses);
          }
          // 【增】在出错时也显示 Toast
          showToast('状态更新失败，请重试', 'error');
      },
    });
};