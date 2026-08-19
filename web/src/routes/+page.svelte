<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, Block, Preloader, List, ListItem, Link } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import MdFab from '$lib/components/md/MdFab.svelte';
  import { api } from '$lib/api';
  import { fetchStatus, formatNextScan, statusLabel, statusColor } from '$lib/status';

  let loading = $state(true);
  let scanning = $state(false);
  let dashboard = $state<{
    status: { status: string; isReady: boolean };
    stats: { total: number | null; urgent: number | null; snoozed: number };
    recentReminders: Array<{ chat_name: string; sent_at: number }>;
    lastScan: { run_at: number; chats_checked: number; reminders_sent: number } | null;
    nextScan: string | null;
  } | null>(null);

  async function load() {
    loading = true;
    try {
      const [dash] = await Promise.all([api.get('/dashboard'), fetchStatus()]);
      dashboard = dash as typeof dashboard;
    } catch {
      /* handled by layout auth redirect */
    } finally {
      loading = false;
    }
  }

  async function runScan() {
    if (scanning) return;
    scanning = true;
    try {
      await api.post('/run');
      await load();
    } finally {
      scanning = false;
    }
  }

  onMount(load);

  function formatTime(ts: number) {
    return new Date(ts).toLocaleString();
  }

  const headerSubtitle = $derived(
    dashboard
      ? `${dashboard.stats.urgent ?? 0} need reply · next scan ${formatNextScan(dashboard.nextScan)}`
      : undefined
  );
</script>

<Page class="md-page">
  <MdNavbar title="Updates">
    {#snippet actions()}
      <Link onClick={load}>Refresh</Link>
    {/snippet}
  </MdNavbar>

  {#if loading}
    <Block class="text-center py-12"><Preloader /></Block>
  {:else if dashboard}
    {#if headerSubtitle}
      <p
        class="px-4 pb-2 text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant"
      >
        {headerSubtitle}
      </p>
    {/if}
    <Block strong inset class="mb-2">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">
            WhatsApp connection
          </div>
          <div class="font-medium text-lg {statusColor(dashboard.status.status)}">
            {statusLabel(dashboard.status.status)}
          </div>
        </div>
        {#if !dashboard.status.isReady}
          <Link onClick={() => goto('/settings/link')}>Link</Link>
        {/if}
      </div>
    </Block>

    <div
      class="grid grid-cols-3 gap-px bg-md-light-outline-variant/30 dark:bg-md-dark-outline-variant/30 mx-4 rounded-xl overflow-hidden mb-2"
    >
      <div
        class="bg-md-light-surface-container-high dark:bg-md-dark-surface-container-high p-4 text-center"
      >
        <div class="text-2xl font-medium text-md-light-primary dark:text-md-dark-primary">
          {dashboard.stats.urgent ?? '—'}
        </div>
        <div class="text-xs text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant mt-1">
          Need reply
        </div>
      </div>
      <div
        class="bg-md-light-surface-container-high dark:bg-md-dark-surface-container-high p-4 text-center"
      >
        <div class="text-2xl font-medium text-md-light-tertiary dark:text-md-dark-tertiary">
          {dashboard.stats.snoozed}
        </div>
        <div class="text-xs text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant mt-1">
          Snoozed
        </div>
      </div>
      <div
        class="bg-md-light-surface-container-high dark:bg-md-dark-surface-container-high p-4 text-center"
      >
        <div class="text-2xl font-medium text-md-light-on-surface dark:text-md-dark-on-surface">
          {formatNextScan(dashboard.nextScan)}
        </div>
        <div class="text-xs text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant mt-1">
          Next scan
        </div>
      </div>
    </div>

    <p
      class="px-4 py-2 text-sm font-medium text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant"
    >
      Recent reminders
    </p>

    {#if dashboard.recentReminders.length === 0}
      <Block class="text-center py-8">
        <p class="text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant text-sm">
          No reminders sent yet.
        </p>
      </Block>
    {:else}
      <List strong inset>
        {#each dashboard.recentReminders as reminder}
          <ListItem title={reminder.chat_name} subtitle={formatTime(reminder.sent_at)} />
        {/each}
      </List>
    {/if}

    <MdFab label="Scan now" icon="radar" loading={scanning} disabled={scanning} onClick={runScan} />
  {/if}
</Page>
