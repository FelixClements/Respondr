# UI padding design

**Date:** 2026-09-26
**Status:** Approved for planning

## Goal

Give the cramped dashboard controls the same 16px screen inset Material uses elsewhere, without restyling controls that already have it.

## Decisions

1. **Top bar** — `MdNavbar` horizontal padding becomes Konsta `ps-safe-4` and `pe-safe-4`: `calc(1rem + safe-area-inset-*)`, which is 16px when the side inset is 0. Replace `ps-safe` / `pe-safe`, which are only the safe-area inset and are 0px on a normal phone. Keep the existing top safe-area padding and the `calc(3.5rem + env(safe-area-inset-top))` height. Keep `min-w-0 flex-1 truncate` on the title. Do not add extra padding on the Refresh link or the back control; the bar inset covers both.
2. **Section labels** — vertical padding goes from 8px (`py-2`) to 12px (`py-3`). Horizontal stays 16px (`px-4`). Keep the existing muted color classes, including dark mode. Labels: Updates “Recent reminders”, Chats “Archived”, History “Reminders” and “Scans”. The History “Scans” label keeps its extra `mt-2`.
3. **Updates subtitle** — the line under the title (“need reply · next scan”) gets 12px top and bottom (`pt-3 pb-3`). It currently has bottom padding only, so it sits against the bar.
4. **Chats list** — the active list keeps `!my-0` (that removes Konsta’s 32px list margin) and gains 12px top padding (`pt-3`) so the first row is not against the bar. The archived list stays `!my-0` with no extra top padding, because the “Archived” label already separates it.
5. **Settings list** — the gap under the profile goes from 8px (`mt-2`) to 16px (`mt-4`). Do not add `!my-0`. `mt-4` only replaces the top margin, so Konsta’s bottom list margin stays.
6. **Swipe actions** — the gap between the icon and the label on Done, Ignore, and Restore goes from 2px (`gap-0.5`) to 8px (`gap-2`). Both the leading and trailing action buttons use the same layout class.
7. **Needs-reply badge** — horizontal padding goes from 6px (`px-1.5`) to 8px (`px-2`). Keep `h-5`, `min-w-[1.25rem]`, `text-xs`, and `font-semibold`.

## Out of scope

Konsta filled `ListInput` fields on Login, Setup, Core settings, and Notifications already get 16px inside the gray box: ListItem adds `ps-safe-4` on the field and `pe-safe-4` on the inner wrapper. Do not add another horizontal padding rule. Do not change stat tiles, the connection card, the profile header, the scan button, the tab bar, list rows, inset blocks, or the install banner.

## Constraints

- One shared TypeScript module owns the class strings. Pages and components import it. Do not copy the utility strings into each file.
- Tests are root Vitest files under `tests/`. Do not add a Svelte component test runner.
- Do not change Konsta, Tailwind, or app behavior other than these class strings.
