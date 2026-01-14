import { Tag } from '../types';

/**
 * Helper to determine if a tag ID is a user-created tag
 * (i.e. not a system tag from Google or FreshRSS)
 */
export const isUserTag = (tagId: string): boolean =>
  !tagId.includes('/state/com.google/') && !tagId.includes('/state/org.freshrss/');

/**
 * Pure function to calculate the new available tags list after an article update.
 * It handles adding new tags, incrementing counts for existing tags,
 * and decrementing/removing counts for removed tags.
 *
 * @param currentAvailableTags - The current list of available tags with counts
 * @param oldArticleTags - Tags of the article before update
 * @param newArticleTags - Tags of the article after update
 * @returns A new array of tags with updated counts
 */
export const calculateNewAvailableTags = (
  currentAvailableTags: Tag[],
  oldArticleTags: string[] = [],
  newArticleTags: string[] = [],
): Tag[] => {
  const oldUserTags = new Set(oldArticleTags.filter(isUserTag));
  const newUserTags = new Set(newArticleTags.filter(isUserTag));

  const tagsToAdd = [...newUserTags].filter((t) => !oldUserTags.has(t));
  const tagsToRemove = [...oldUserTags].filter((t) => !newUserTags.has(t));

  if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
    return currentAvailableTags;
  }

  let newAvailableTags = [...currentAvailableTags];

  // 1. Identify which tags are TRULY new to the available list
  const existingTagIds = new Set(newAvailableTags.map((t) => t.id));
  const brandNewTags = tagsToAdd.filter((id) => !existingTagIds.has(id));

  // 2. Append brand new tags to the list with initial count 0 (count will be incremented below)
  brandNewTags.forEach((id) => {
    const label = decodeURIComponent(id.split('/').pop() || id);
    newAvailableTags.push({ id, label, count: 0 });
  });

  // 3. Update counts for all affected tags
  newAvailableTags = newAvailableTags.map((tag) => {
    const newTag = { ...tag };
    if (tagsToAdd.includes(newTag.id)) {
      newTag.count = (newTag.count || 0) + 1;
    }
    if (tagsToRemove.includes(newTag.id)) {
      newTag.count = Math.max(0, (newTag.count || 0) - 1);
    }
    return newTag;
  });

  return newAvailableTags;
};
