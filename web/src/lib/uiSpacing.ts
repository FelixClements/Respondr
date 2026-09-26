/** 16px plus the horizontal safe-area inset. Konsta: padding-inline = 1rem + inset. */
export const topBarInsetClass = 'ps-safe-4 pe-safe-4';

export const sectionLabelClass =
  'px-4 py-3 text-sm font-medium text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant';

export const pageSubtitleClass =
  'px-4 pt-3 pb-3 text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant';

/** Drops Konsta’s 32px list margin and keeps 12px under the top bar. */
export const chatListClass = '!my-0 pt-3';

/** The Archived label already separates this list, so it has no extra top padding. */
export const archivedChatListClass = '!my-0';

/** 16px under the profile. Not !my-0, so the list keeps its bottom margin. */
export const settingsListClass = 'mt-4';

export const swipeActionLayoutClass =
  'flex flex-col items-center justify-center gap-2 text-sm font-medium';

export const replyBadgeClass = 'min-w-[1.25rem] h-5 px-2 text-xs font-semibold';
