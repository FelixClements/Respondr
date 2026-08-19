<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, Block, List, ListItem, Preloader } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { api } from '$lib/api';

  let reminders = $state<Array<{ chat_name: string; sent_at: number }>>([]);
  let scans = $state<
    Array<{ run_at: number; chats_checked: number; reminders_sent: number; error: string | null }>
  >([]);
  let loading = $state(true);

  onMount(async () => {
    const data = await api.get<{ reminders: typeof reminders; scans: typeof scans }>('/history');
    reminders = data.reminders;
    scans = data.scans;
    loading = false;
  });

  function formatTime(ts: number) {
    return new Date(ts).toLocaleString();
  }
</script>

<Page class="md-page">
  <MdNavbar title="History" backLink onBack={() => goto('/settings')} />

  {#if loading}
    <Block class="text-center py-12"><Preloader /></Block>
  {:else}
    <p
      class="px-4 py-2 text-sm font-medium text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant"
    >
      Reminders
    </p>
    <List strong inset>
      {#each reminders as r}
        <ListItem title={r.chat_name} subtitle={formatTime(r.sent_at)} />
      {/each}
    </List>

    <p
      class="mt-2 px-4 py-2 text-sm font-medium text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant"
    >
      Scans
    </p>
    <List strong inset>
      {#each scans as s}
        <ListItem
          title={`${s.chats_checked} chats · ${s.reminders_sent} reminders`}
          subtitle={formatTime(s.run_at)}
          footer={s.error || undefined}
        />
      {/each}
    </List>
  {/if}
</Page>
