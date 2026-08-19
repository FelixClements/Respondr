<script lang="ts">
  import { ListItem, Badge } from 'konsta/svelte';
  import Avatar from './Avatar.svelte';

  interface Props {
    name: string;
    subtitle: string;
    timeLabel?: string;
    needsReply?: boolean;
    done?: boolean;
  }

  let { name, subtitle, timeLabel, needsReply = false, done = false }: Props = $props();
</script>

<ListItem title={name} {subtitle} component="div">
  {#snippet media()}
    <Avatar {name} />
  {/snippet}
  {#snippet after()}
    <div class="flex flex-col items-end gap-1 shrink-0 ml-2">
      {#if timeLabel}
        <span
          class="text-xs text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant"
        >
          {timeLabel}
        </span>
      {/if}
      {#if needsReply}
        <Badge class="min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold">!</Badge>
      {:else if done}
        <span class="text-xs text-brand-success font-medium">Done</span>
      {/if}
    </div>
  {/snippet}
</ListItem>
