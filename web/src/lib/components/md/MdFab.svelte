<script lang="ts">
  import MdSymbol from './MdSymbol.svelte';

  interface Props {
    label: string;
    icon?: string;
    loading?: boolean;
    disabled?: boolean;
    onClick?: () => void;
  }

  let { label, icon = 'play_arrow', loading = false, disabled = false, onClick }: Props = $props();
</script>

<button
  type="button"
  class="md-fab flex items-center gap-2 h-14 pl-4 pr-5 rounded-2xl shadow-lg
    bg-md-light-primary-container dark:bg-md-dark-primary-container
    text-md-light-on-primary-container dark:text-md-dark-on-primary-container
    font-medium text-sm
    disabled:opacity-50 active:scale-[0.98] transition-transform"
  {disabled}
  onclick={onClick}
>
  {#if loading}
    <span
      class="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
      aria-hidden="true"
    ></span>
  {:else}
    <MdSymbol name={icon} class="w-6 h-6" />
  {/if}
  <span>{label}</span>
</button>

<style>
  .md-fab {
    position: fixed;
    right: 1rem;
    bottom: calc(4.75rem + env(safe-area-inset-bottom));
    z-index: 25;
  }
</style>
