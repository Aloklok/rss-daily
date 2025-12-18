// components/TagPopover.tsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Article } from '../../../types';
import { useArticleStore } from '../../../store/articleStore';

interface TagPopoverProps {
  article: Article;
  onClose: () => void;
  // 【核心修改】让 onStateChange 返回 Promise<any> 或 Promise<void>
  onStateChange: (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => Promise<any>;
}

const TagPopover: React.FC<TagPopoverProps> = ({ article, onClose, onStateChange }) => {
  const availableUserTags = useArticleStore((state) => state.availableFilters.tags);
  const validUserTagIds = useMemo(
    () => new Set(availableUserTags.map((t) => t.id)),
    [availableUserTags],
  );
  const originalUserTags = useMemo(
    () => new Set((article.tags || []).filter((tagOnArticle) => validUserTagIds.has(tagOnArticle))),
    [article.tags, validUserTagIds],
  );

  const [selectedTags, setSelectedTags] = useState<Set<string>>(originalUserTags);
  const [isSaving, setIsSaving] = useState(false); // 我们将使用这个状态来控制按钮的 loading
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedTags(originalUserTags);
  }, [originalUserTags]);

  const handleTagChange = (tagId: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) newSet.delete(tagId);
      else newSet.add(tagId);
      return newSet;
    });
  };

  const handleConfirm = async () => {
    setIsSaving(true); // 开始 loading
    const tagsToAdd = [...selectedTags].filter((t) => !originalUserTags.has(t));
    const tagsToRemove = [...originalUserTags].filter((t) => !selectedTags.has(t));

    try {
      // 【核心修复】现在 await 会真正等待 API 调用完成（或失败）
      await onStateChange(article.id, tagsToAdd, tagsToRemove);
      // 只有在 await 成功后，才关闭弹窗
      onClose();
    } catch (error) {
      console.error('Failed to save tags', error);
      // 失败时，可以让弹窗保持打开，以便用户重试
    } finally {
      setIsSaving(false); // 结束 loading
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 bottom-full z-50 mb-2 w-64 origin-bottom-right scale-100 rounded-lg border border-gray-200 bg-white opacity-100 shadow-2xl transition-all duration-200 starting:scale-95 starting:opacity-0"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-b p-4">
        <h4 className="font-semibold text-gray-800">编辑标签</h4>
      </div>
      {!availableUserTags || availableUserTags.length === 0 ? (
        <div className="p-4 text-center text-gray-500">暂无可用标签。</div>
      ) : (
        <div className="max-h-60 overflow-y-auto p-4">
          <div className="space-y-3">
            {availableUserTags.map((tag) => (
              <label key={tag.id} className="flex cursor-pointer items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedTags.has(tag.id)}
                  onChange={() => handleTagChange(tag.id)}
                  className="h-4 w-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{tag.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end space-x-2 rounded-b-lg bg-gray-50 p-3">
        <button
          onClick={onClose}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          取消
        </button>
        {/* 【核心修复】按钮现在会根据 isSaving 状态显示 loading */}
        <button
          onClick={handleConfirm}
          disabled={isSaving}
          className="w-20 rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSaving ? '保存中...' : '确认'}
        </button>
      </div>
    </div>
  );
};

export default TagPopover;
