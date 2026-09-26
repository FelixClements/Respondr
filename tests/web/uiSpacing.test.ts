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
