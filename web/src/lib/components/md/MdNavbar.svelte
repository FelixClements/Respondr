<script lang="ts">
  import { NavbarBackLink } from 'konsta/svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    backLink?: boolean;
    onBack?: () => void;
    actions?: Snippet;
  }

  let { title, backLink = false, onBack, actions }: Props = $props();
</script>

<header
  class="md-top-bar sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-md-light-outline-variant/30 bg-md-light-surface dark:border-md-dark-outline-variant/30 dark:bg-md-dark-surface ps-safe pe-safe"
>
  {#if backLink && onBack}
    <NavbarBackLink onClick={onBack} />
  {/if}
  <h1
    class="min-w-0 flex-1 truncate text-xl font-normal text-md-light-on-surface dark:text-md-dark-on-surface"
  >
    {title}
  </h1>
  {#if actions}
    <div class="flex shrink-0 items-center">
      {@render actions()}
    </div>
  {/if}
</header>

<style>
  .md-top-bar {
    padding-top: env(safe-area-inset-top);
    height: calc(3.5rem + env(safe-area-inset-top));
  }
</style>
