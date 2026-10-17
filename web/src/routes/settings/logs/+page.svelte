<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, Block, Button, List, ListItem, Preloader, Segmented, SegmentedButton } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { sectionLabelClass } from '$lib/uiSpacing';
  import { api } from '$lib/api';
  import { formatDateTime } from '$lib/status';

  const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
  type Level = (typeof LEVELS)[number];

  interface LogEntry {
    ts: number;
    level: Level;
    message: string;
  }

  let level = $state<Level>('info');
  let logs = $state<LogEntry[]>([]);
  let loading = $state(true);
  let busy = $state(false);
  let message = $state('');

  async function load() {
    busy = true;
    message = '';
    try {
      const data = await api.get<{ level: Level; logs: LogEntry[] }>('/logs?limit=500');
      level = data.level;
      // Server returns oldest first; show the newest at the top.
      logs = data.logs.slice().reverse();
    } catch (err) {
      message = err instanceof Error ? err.message : 'Failed to load logs';
    } finally {
      busy = false;
      loading = false;
    }
  }

  async function setLevel(next: Level) {
    if (next === level || busy) return;
    busy = true;
    message = '';
    try {
      await api.put('/logs', { log_level: next });
    } catch (err) {
      message = err instanceof Error ? err.message : 'Failed to change log level';
      busy = false;
      return;
    }
    busy = false;
    await load();
  }

  onMount(load);
</script>

<Page class="md-page">
  <MdNavbar title="Logs" backLink onBack={() => goto('/settings')} />

  <p class={sectionLabelClass}>Log level</p>
  <Block class="px-4 !my-0">
    <Segmented strong rounded>
      {#each LEVELS as l}
        <SegmentedButton active={level === l} onClick={() => setLevel(l)}>
          {l}
        </SegmentedButton>
      {/each}
    </Segmented>
  </Block>

  <Block class="px-4">
    <Button large tonal onClick={load} disabled={busy}>Refresh</Button>
    {#if message}<p class="text-sm text-center mt-2 text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">{message}</p>{/if}
  </Block>

  {#if loading}
    <Block class="text-center py-12"><Preloader /></Block>
  {:else if logs.length === 0}
    <p class={sectionLabelClass}>No log entries at this level yet.</p>
  {:else}
    <List strong inset>
      {#each logs as entry}
        <ListItem
          title={entry.message}
          subtitle={`${entry.level.toUpperCase()} · ${formatDateTime(entry.ts)}`}
          titleWrapClass="whitespace-normal break-words font-mono text-xs"
        />
      {/each}
    </List>
  {/if}
</Page>
