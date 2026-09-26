import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  archivedChatListClass,
  chatListClass,
  pageSubtitleClass,
  replyBadgeClass,
  sectionLabelClass,
  settingsListClass,
  swipeActionLayoutClass,
  topBarInsetClass
} from '../../web/src/lib/uiSpacing';

function source(rel: string): string {
  return readFileSync(resolve(rel), 'utf8');
}

describe('top bar inset', () => {
  it('uses 16px plus the side safe area, not padding that drops the inset', () => {
    expect(topBarInsetClass).toBe('ps-safe-4 pe-safe-4');
  });

  it('applies that inset on the bar and keeps the status-bar offset and title ellipsis', () => {
    const navbar = source('web/src/lib/components/md/MdNavbar.svelte');
    expect(navbar).toContain("import { topBarInsetClass } from '$lib/uiSpacing'");
    expect(navbar).toContain('{topBarInsetClass}');
    expect(navbar).not.toContain('ps-safe pe-safe');
    expect(navbar).toContain('padding-top: env(safe-area-inset-top)');
    expect(navbar).toContain('height: calc(3.5rem + env(safe-area-inset-top))');
    expect(navbar).toContain('min-w-0 flex-1 truncate');
  });
});

describe('section labels and list gaps', () => {
  it('gives labels 12px vertical padding and keeps both color schemes', () => {
    expect(sectionLabelClass).toBe(
      'px-4 py-3 text-sm font-medium text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant'
    );
    expect(pageSubtitleClass).toBe(
      'px-4 pt-3 pb-3 text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant'
    );
  });

  it('separates the active chat list from the bar without doubling the archived gap', () => {
    expect(chatListClass).toBe('!my-0 pt-3');
    expect(archivedChatListClass).toBe('!my-0');
  });

  it('uses a 16px settings-list top gap without clearing Konsta’s bottom margin', () => {
    expect(settingsListClass).toBe('mt-4');
    expect(settingsListClass).not.toContain('!my-0');
  });

  it('uses those classes on Updates, Chats, Settings, and History', () => {
    const updates = source('web/src/routes/+page.svelte');
    const chats = source('web/src/routes/chats/+page.svelte');
    const settings = source('web/src/routes/settings/+page.svelte');
    const history = source('web/src/routes/settings/history/+page.svelte');

    expect(updates).toContain(
      "import { pageSubtitleClass, sectionLabelClass } from '$lib/uiSpacing'"
    );
    expect(updates).toContain('class={pageSubtitleClass}');
    expect(updates).toContain('class={sectionLabelClass}');
    expect(updates).not.toContain('px-4 pb-2');
    expect(updates).not.toContain('px-4 py-2');

    expect(chats).toContain(
      "import { archivedChatListClass, chatListClass, sectionLabelClass } from '$lib/uiSpacing'"
    );
    expect(chats).toContain('class={chatListClass}');
    expect(chats).toContain('class={archivedChatListClass}');
    expect(chats).toContain('class={sectionLabelClass}');
    expect(chats.match(/class="!my-0"/g)).toBeNull();

    expect(settings).toContain("import { settingsListClass } from '$lib/uiSpacing'");
    expect(settings).toContain('class={settingsListClass}');
    expect(settings).not.toContain('class="mt-2"');

    expect(history).toContain("import { sectionLabelClass } from '$lib/uiSpacing'");
    expect(history).toContain('class={sectionLabelClass}');
    expect(history).toContain('class="mt-2 {sectionLabelClass}"');
    expect(history).not.toContain('py-2');
  });
});

describe('swipe actions and reply badge', () => {
  it('puts 8px between a swipe icon and its label on both sides', () => {
    expect(swipeActionLayoutClass).toBe(
      'flex flex-col items-center justify-center gap-2 text-sm font-medium'
    );
    const row = source('web/src/lib/components/md/SwipeableRow.svelte');
    expect(row).toContain("import { swipeActionLayoutClass } from '$lib/uiSpacing'");
    const uses = row.match(/\{swipeActionLayoutClass\}/g) ?? [];
    expect(uses).toHaveLength(2);
    expect(row).not.toContain('gap-0.5');
  });

  it('gives the needs-reply badge 8px of horizontal padding without changing its height', () => {
    expect(replyBadgeClass).toBe('min-w-[1.25rem] h-5 px-2 text-xs font-semibold');
    const item = source('web/src/lib/components/md/ChatListItem.svelte');
    expect(item).toContain("import { replyBadgeClass } from '$lib/uiSpacing'");
    expect(item).toContain('class={replyBadgeClass}');
    expect(item).not.toContain('px-1.5');
  });

  it('does not add a ListInput padding override', () => {
    const css = source('web/src/app.css');
    expect(css).not.toContain('k-list-input');
  });
});
