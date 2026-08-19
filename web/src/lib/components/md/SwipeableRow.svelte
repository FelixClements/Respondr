<script lang="ts">
  import type { Snippet } from 'svelte';
  import MdSymbol from './MdSymbol.svelte';

  export interface SwipeAction {
    id: string;
    label: string;
    icon: string;
    class: string;
    onClick: () => void;
  }

  interface Props {
    children: Snippet;
    leftActions?: SwipeAction[];
    rightActions?: SwipeAction[];
    disabled?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  const ACTION_WIDTH = 80;

  let {
    children,
    leftActions = [],
    rightActions = [],
    disabled = false,
    open = $bindable(false),
    onOpenChange
  }: Props = $props();

  let offset = $state(0);
  let dragging = $state(false);
  let startX = 0;
  let startOffset = 0;

  const maxLeft = $derived(leftActions.length * ACTION_WIDTH);
  const maxRight = $derived(rightActions.length * ACTION_WIDTH);

  function notifyOpen(value: boolean) {
    open = value;
    onOpenChange?.(value);
  }

  function snap() {
    const threshold = ACTION_WIDTH * 0.35;
    if (maxLeft > 0 && offset > threshold) {
      offset = maxLeft;
      notifyOpen(true);
      return;
    }
    if (maxRight > 0 && offset < -threshold) {
      offset = -maxRight;
      notifyOpen(true);
      return;
    }
    offset = 0;
    notifyOpen(false);
  }

  function onPointerDown(e: PointerEvent) {
    if (disabled || (maxLeft === 0 && maxRight === 0)) return;
    dragging = true;
    startX = e.clientX;
    startOffset = offset;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    let next = startOffset + dx;
    if (maxLeft === 0) next = Math.min(0, next);
    else if (maxRight === 0) next = Math.max(0, next);
    else next = Math.max(-maxRight, Math.min(maxLeft, next));
    offset = next;
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    snap();
  }

  function runAction(action: SwipeAction) {
    offset = 0;
    notifyOpen(false);
    action.onClick();
  }

  $effect(() => {
    if (!open && !dragging) offset = 0;
  });
</script>

<div
  class="relative overflow-hidden bg-md-light-surface dark:bg-md-dark-surface"
  role="group"
  aria-roledescription="swipeable row"
>
  {#if maxLeft > 0}
    <div class="absolute inset-y-0 left-0 flex" style:width="{maxLeft}px">
      {#each leftActions as action (action.id)}
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-0.5 text-sm font-medium {action.class}"
          style:width="{ACTION_WIDTH}px"
          onclick={() => runAction(action)}
        >
          <MdSymbol name={action.icon} class="w-6 h-6" />
          <span class="text-xs">{action.label}</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if maxRight > 0}
    <div class="absolute inset-y-0 right-0 flex justify-end" style:width="{maxRight}px">
      {#each rightActions as action (action.id)}
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-0.5 text-sm font-medium {action.class}"
          style:width="{ACTION_WIDTH}px"
          onclick={() => runAction(action)}
        >
          <MdSymbol name={action.icon} class="w-6 h-6" />
          <span class="text-xs">{action.label}</span>
        </button>
      {/each}
    </div>
  {/if}

  <div
    class="relative bg-md-light-surface dark:bg-md-dark-surface"
    role="group"
    style:transform="translateX({offset}px)"
    style:transition={dragging ? 'none' : 'transform 0.2s ease-out'}
    style:touch-action="pan-y"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    {@render children()}
  </div>
</div>
