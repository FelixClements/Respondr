<script lang="ts">
  import { ListItem } from 'konsta/svelte';
  import MdSymbol from './MdSymbol.svelte';

  interface Props {
    rowTitle: string;
    subtitle?: string;
    icon: string;
    onClick?: () => void;
    destructive?: boolean;
  }

  let { rowTitle, subtitle, icon, onClick, destructive = false }: Props = $props();
</script>

<ListItem
  link
  title={rowTitle}
  {subtitle}
  {onClick}
  colors={destructive
    ? { primaryTextMaterial: 'text-md-light-error dark:text-md-dark-error' }
    : undefined}
>
  {#snippet media()}
    <div
      class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-md-light-primary-container dark:bg-md-dark-primary-container text-md-light-on-primary-container dark:text-md-dark-on-primary-container"
    >
      <MdSymbol name={icon} class="w-5 h-5" />
    </div>
  {/snippet}
</ListItem>
