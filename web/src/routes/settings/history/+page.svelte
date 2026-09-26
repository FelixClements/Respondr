<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, Block, List, ListItem, Preloader } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { sectionLabelClass } from '$lib/uiSpacing';
  import { api } from '$lib/api';
  import { formatDateTime } from '$lib/status';

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

</script>

<Page class="md-page">
  <MdNavbar title="History" backLink onBack={() => goto('/settings')} />

  {#if loading}
    <Block class="text-center py-12"><Preloader /></Block>
  {:else}
    <p class={sectionLabelClass}>
      Reminders
    </p>
    <List strong inset>
      {#each reminders as r}
        <ListItem title={r.chat_name} subtitle={formatDateTime(r.sent_at)} />
      {/each}
    </List>

    <p class="mt-2 {sectionLabelClass}">
      Scans
    </p>
    <List strong inset>
      {#each scans as s}
        <ListItem
          title={`${s.chats_checked} chats · ${s.reminders_sent} reminders`}
          subtitle={formatDateTime(s.run_at)}
          footer={s.error || undefined}
        />
      {/each}
    </List>
  {/if}
</Page>
