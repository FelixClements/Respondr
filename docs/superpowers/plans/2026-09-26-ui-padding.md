# UI padding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the top bar, section labels, chat-list gap, settings-list gap, swipe actions, and the needs-reply badge enough padding that their content is not flush to an edge.

**Architecture:** One plain TypeScript module, `web/src/lib/uiSpacing.ts`, owns the Tailwind class strings from the spec. Svelte files import those constants instead of inlining utilities, so a page cannot drift back to `py-2` or `ps-safe`. Root Vitest reads the constants and the Svelte sources. There is no Svelte render harness in this repo, and this change does not add one.

**Tech Stack:** Svelte 5, SvelteKit, Tailwind CSS 4, Konsta UI 5.3.0, Vitest 3 (root `npm test`).

**Spec:** `docs/superpowers/specs/2026-09-26-ui-padding-design.md`

## Global Constraints

- Top bar horizontal padding is `ps-safe-4 pe-safe-4` (16px plus the side safe-area inset). Not `px-4`.
- Section-label vertical padding is `py-3` (12px). Updates subtitle is `pt-3 pb-3`.
- Active chat list class is `!my-0 pt-3`. Archived chat list class is `!my-0`.
- Settings list class is `mt-4`. Not `!my-0`.
- Swipe action layout uses `gap-2` on both buttons. Needs-reply badge uses `px-2` and keeps `h-5`.
- Do not add padding to Konsta `ListInput`, stat tiles, the connection card, the profile header, the scan button, the tab bar, list rows, inset blocks, or the install banner.
- Do not add a Svelte component test runner. Tests live in `tests/**/*.test.ts` and run with root `npm test`.
- Class strings live only in `web/src/lib/uiSpacing.ts`. Components import them.

## File structure

- `web/src/lib/uiSpacing.ts` — the only place the new class strings are written.
- `tests/web/uiSpacing.test.ts` — asserts those strings and that each Svelte file uses the matching export.
- `web/src/lib/components/md/MdNavbar.svelte` — top bar inset.
- `web/src/routes/+page.svelte` — Updates subtitle and “Recent reminders”.
- `web/src/routes/chats/+page.svelte` — “Archived” label and the two lists.
- `web/src/routes/settings/history/+page.svelte` — “Reminders” and “Scans”.
- `web/src/routes/settings/+page.svelte` — gap under the profile.
- `web/src/lib/components/md/SwipeableRow.svelte` — both action buttons.
- `web/src/lib/components/md/ChatListItem.svelte` — needs-reply badge.

## Review Focus

- A notched phone in landscape still needs the side safe area on the top bar. `px-4` would drop it. Expect `ps-safe-4 pe-safe-4`, and the title still clears the status bar via `env(safe-area-inset-top)`.
- A long page title must still ellipsize after the new 16px insets. The `h1` keeps `min-w-0 flex-1 truncate`.
- The archived chat list must not also get `pt-3`. The “Archived” label already separates it; extra padding would double the gap.
- The settings list must not gain `!my-0`. That would remove Konsta’s bottom list margin along with the old 8px top gap.
- Section labels must keep both `text-md-light-on-surface-variant` and `dark:text-md-dark-on-surface-variant` when the class moves into the shared module.

---

### Task 1: Top bar inset

**Files:**
- Create: `web/src/lib/uiSpacing.ts`
- Create: `tests/web/uiSpacing.test.ts`
- Modify: `web/src/lib/components/md/MdNavbar.svelte`

**Interfaces:**
- Consumes: nothing
- Produces: `export const topBarInsetClass = 'ps-safe-4 pe-safe-4'` from `web/src/lib/uiSpacing.ts`. Later tasks add more exports to that same file.

- [ ] **Step 1: Write the failing test**

Create `tests/web/uiSpacing.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { topBarInsetClass } from '../../web/src/lib/uiSpacing';

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/web/uiSpacing.test.ts`

If Vitest is not installed, run `npm install` from the repo root first, then the test command.

Expected: FAIL. Node cannot find `web/src/lib/uiSpacing.ts`.

- [ ] **Step 3: Write the minimal implementation**

Create `web/src/lib/uiSpacing.ts`:

```ts
/** 16px plus the horizontal safe-area inset. Konsta: padding-inline = 1rem + inset. */
export const topBarInsetClass = 'ps-safe-4 pe-safe-4';
```

In `web/src/lib/components/md/MdNavbar.svelte`, add the import next to the existing imports:

```ts
import { topBarInsetClass } from '$lib/uiSpacing';
```

Replace the header class so `ps-safe pe-safe` becomes the constant. The rest of the class string stays:

```svelte
<header
  class="md-top-bar sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-md-light-outline-variant/30 bg-md-light-surface dark:border-md-dark-outline-variant/30 dark:bg-md-dark-surface {topBarInsetClass}"
>
```

Do not edit the `<style>` block. Do not add padding classes to `NavbarBackLink` or the actions wrapper.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/web/uiSpacing.test.ts`

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/uiSpacing.ts tests/web/uiSpacing.test.ts web/src/lib/components/md/MdNavbar.svelte
git commit -m "$(cat <<'EOF'
fix(web): inset the top bar by 16px plus the safe area

ps-safe alone is 0px on a normal phone, so the title and actions sat on the screen edge.
EOF
)"
```

---

### Task 2: Section labels and list gaps

**Files:**
- Modify: `web/src/lib/uiSpacing.ts`
- Modify: `tests/web/uiSpacing.test.ts`
- Modify: `web/src/routes/+page.svelte`
- Modify: `web/src/routes/chats/+page.svelte`
- Modify: `web/src/routes/settings/+page.svelte`
- Modify: `web/src/routes/settings/history/+page.svelte`

**Interfaces:**
- Consumes: `topBarInsetClass` already exported from `web/src/lib/uiSpacing.ts`. Do not change it.
- Produces:
  - `export const sectionLabelClass: string`
  - `export const pageSubtitleClass: string`
  - `export const chatListClass: string`
  - `export const archivedChatListClass: string`
  - `export const settingsListClass: string`

- [ ] **Step 1: Write the failing test**

Replace the existing `uiSpacing` import with this one. Do not leave a second import from the same module:

```ts
import {
  archivedChatListClass,
  chatListClass,
  pageSubtitleClass,
  sectionLabelClass,
  settingsListClass,
  topBarInsetClass
} from '../../web/src/lib/uiSpacing';
```

Append this describe block to `tests/web/uiSpacing.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/web/uiSpacing.test.ts`

Expected: FAIL. `sectionLabelClass` is not exported from `web/src/lib/uiSpacing.ts`.

- [ ] **Step 3: Write the minimal implementation**

Append these exports to `web/src/lib/uiSpacing.ts`:

```ts
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
```

In each Svelte file below, the `$lib/uiSpacing` import must be that exact one-line string. The test matches it with `toContain`.

In `web/src/routes/+page.svelte`, add the import with the other `$lib` imports:

```ts
import { pageSubtitleClass, sectionLabelClass } from '$lib/uiSpacing';
```

Replace the subtitle `<p>` class:

```svelte
<p class={pageSubtitleClass}>
  {headerSubtitle}
</p>
```

Replace the “Recent reminders” `<p>` class:

```svelte
<p class={sectionLabelClass}>
  Recent reminders
</p>
```

In `web/src/routes/chats/+page.svelte`, add:

```ts
import { archivedChatListClass, chatListClass, sectionLabelClass } from '$lib/uiSpacing';
```

The active-chat `<List>` (the first `List strong`) becomes:

```svelte
<List strong class={chatListClass}>
```

The “Archived” `<p>` becomes:

```svelte
<p class={sectionLabelClass}>
  Archived
</p>
```

The archived `<List>` becomes:

```svelte
<List strong class={archivedChatListClass}>
```

In `web/src/routes/settings/+page.svelte`, add:

```ts
import { settingsListClass } from '$lib/uiSpacing';
```

Replace the settings list opening tag:

```svelte
<List strong class={settingsListClass}>
```

In `web/src/routes/settings/history/+page.svelte`, add:

```ts
import { sectionLabelClass } from '$lib/uiSpacing';
```

The “Reminders” label becomes:

```svelte
<p class={sectionLabelClass}>
  Reminders
</p>
```

The “Scans” label keeps its top margin and becomes:

```svelte
<p class="mt-2 {sectionLabelClass}">
  Scans
</p>
```

Do not change list rows, empty states, or the loading blocks on these pages.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/web/uiSpacing.test.ts`

Expected: PASS. The Task 1 tests still pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/uiSpacing.ts tests/web/uiSpacing.test.ts web/src/routes/+page.svelte web/src/routes/chats/+page.svelte web/src/routes/settings/+page.svelte web/src/routes/settings/history/+page.svelte
git commit -m "$(cat <<'EOF'
fix(web): give section labels and list headers room under the bar

Eight pixels left the Updates subtitle, chat list, and settings list flush against the block above them.
EOF
)"
```

---

### Task 3: Swipe actions and needs-reply badge

**Files:**
- Modify: `web/src/lib/uiSpacing.ts`
- Modify: `tests/web/uiSpacing.test.ts`
- Modify: `web/src/lib/components/md/SwipeableRow.svelte`
- Modify: `web/src/lib/components/md/ChatListItem.svelte`

**Interfaces:**
- Consumes: the exports from Tasks 1 and 2. Do not change them.
- Produces:
  - `export const swipeActionLayoutClass: string`
  - `export const replyBadgeClass: string`

- [ ] **Step 1: Write the failing test**

Replace the `uiSpacing` import with this complete list. Keep every name Task 2 already imports:

```ts
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
```

Append this describe block:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/web/uiSpacing.test.ts`

Expected: FAIL. `swipeActionLayoutClass` is not exported.

- [ ] **Step 3: Write the minimal implementation**

Append to `web/src/lib/uiSpacing.ts`:

```ts
export const swipeActionLayoutClass =
  'flex flex-col items-center justify-center gap-2 text-sm font-medium';

export const replyBadgeClass = 'min-w-[1.25rem] h-5 px-2 text-xs font-semibold';
```

In `web/src/lib/components/md/SwipeableRow.svelte`, add this exact import:

```ts
import { swipeActionLayoutClass } from '$lib/uiSpacing';
```

Both action `<button>` elements currently start with `flex flex-col items-center justify-center gap-0.5 text-sm font-medium`. Replace that shared prefix in each button so the class is:

```svelte
class="{swipeActionLayoutClass} {action.class}"
```

Leave `style:width`, the icon, and the label as they are. There are two buttons (leading and trailing). Both must use the constant.

In `web/src/lib/components/md/ChatListItem.svelte`, add:

```ts
import { replyBadgeClass } from '$lib/uiSpacing';
```

Replace the Badge class:

```svelte
<Badge class={replyBadgeClass}>!</Badge>
```

Do not change `app.css`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/web/uiSpacing.test.ts`

Expected: PASS. Every describe in the file passes.

Then run the full suite:

Run: `npm test`

Expected: PASS. Existing server and engine tests still pass.

- [ ] **Step 5: Check the screens**

Dependencies for the web app are separate. From `web/`, run `npm install` if `web/node_modules` is missing, then `npm run dev` and open the dashboard.

Check these and fix the class constant if a control is still flush:

- Updates: “Updates” and Refresh are 16px from the screen edges. The subtitle is not touching the bar. “Recent reminders” has space above and below.
- Chats: the first row is not touching the bar. “Archived” has the same label spacing. Swiping a row shows a visible gap between the icon and Done, Ignore, or Restore.
- Settings: there is a clear gap between the profile block and “Core settings”. Open any subpage and confirm the back arrow is not on the screen edge.
- Login: username and password text is still inset inside the gray field, not pushed in a second time.
- Dark mode: section labels stay the muted variant color.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/uiSpacing.ts tests/web/uiSpacing.test.ts web/src/lib/components/md/SwipeableRow.svelte web/src/lib/components/md/ChatListItem.svelte
git commit -m "$(cat <<'EOF'
fix(web): separate swipe labels from their icons and pad the reply badge

The action buttons had 2px between icon and text, and the needs-reply mark had 6px of side padding.
EOF
)"
```
