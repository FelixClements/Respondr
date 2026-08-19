<script lang="ts">
  import { onMount } from 'svelte';
  import { Page, Block, List, Preloader, Link } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import ChatListItem from '$lib/components/md/ChatListItem.svelte';
  import SwipeableRow from '$lib/components/md/SwipeableRow.svelte';
  import { api } from '$lib/api';

  interface EnrichedChat {
    id: string;
    name: string;
    hoursSince: number | null;
    needsReply: boolean;
    state: { state: string } | null;
    lastMessage: { fromMe: boolean } | null;
  }

  let loading = $state(true);
  let chats = $state<EnrichedChat[]>([]);
  let error = $state<string | null>(null);
  let openSwipeId = $state<string | null>(null);

  async function load() {
    loading = true;
    try {
      const data = await api.get<{ chats: EnrichedChat[]; error?: string }>('/chats');
      chats = data.chats;
      error = data.error || null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load chats';
    } finally {
      loading = false;
    }
  }

  async function markDone(chat: EnrichedChat) {
    openSwipeId = null;
    await api.post(`/chats/${encodeURIComponent(chat.id)}/done`, { name: chat.name });
    await load();
  }

  async function markIgnore(chat: EnrichedChat) {
    openSwipeId = null;
    await api.post(`/chats/${encodeURIComponent(chat.id)}/ignore`, { name: chat.name });
    await load();
  }

  async function unignore(chat: EnrichedChat) {
    openSwipeId = null;
    await api.post(`/chats/${encodeURIComponent(chat.id)}/unignore`);
    await load();
  }

  onMount(load);

  const activeChats = $derived(chats.filter((c) => c.state?.state !== 'ignored'));
  const ignoredChats = $derived(chats.filter((c) => c.state?.state === 'ignored'));

  function chatSubtitle(chat: EnrichedChat): string {
    if (chat.needsReply && chat.hoursSince != null) {
      return `Needs reply · ${chat.hoursSince}h waiting`;
    }
    if (chat.hoursSince != null) {
      return `Last activity ${chat.hoursSince}h ago`;
    }
    return 'No recent messages';
  }

  function chatAfter(chat: EnrichedChat): string | undefined {
    if (chat.hoursSince == null) return undefined;
    return chat.hoursSince < 24 ? `${chat.hoursSince}h` : `${Math.floor(chat.hoursSince / 24)}d`;
  }

  function handleOpenChange(chatId: string, open: boolean) {
    if (open) openSwipeId = chatId;
    else if (openSwipeId === chatId) openSwipeId = null;
  }
</script>

<Page class="md-page">
  <MdNavbar title="Chats">
    {#snippet actions()}
      <Link onClick={load}>Refresh</Link>
    {/snippet}
  </MdNavbar>

  {#if loading}
    <Block class="text-center py-12"><Preloader /></Block>
  {:else if error}
    <Block class="text-center py-8">
      <p class="text-md-light-error dark:text-md-dark-error">{error}</p>
    </Block>
  {:else}
    <List strong class="!my-0">
      {#each activeChats as chat (chat.id)}
        <SwipeableRow
          open={openSwipeId === chat.id}
          onOpenChange={(open) => handleOpenChange(chat.id, open)}
          leftActions={[
            {
              id: 'done',
              label: 'Done',
              icon: 'check',
              class:
                'bg-brand-success text-white dark:bg-brand-success dark:text-white',
              onClick: () => markDone(chat)
            }
          ]}
          rightActions={[
            {
              id: 'ignore',
              label: 'Ignore',
              icon: 'block',
              class:
                'bg-md-light-surface-container-highest dark:bg-md-dark-surface-container-highest text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant',
              onClick: () => markIgnore(chat)
            }
          ]}
        >
          <ChatListItem
            name={chat.name}
            subtitle={chatSubtitle(chat)}
            timeLabel={chatAfter(chat)}
            needsReply={chat.needsReply}
            done={chat.state?.state === 'done'}
          />
        </SwipeableRow>
      {/each}
    </List>

    {#if ignoredChats.length > 0}
      <p
        class="px-4 py-2 text-sm font-medium text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant"
      >
        Archived
      </p>
      <List strong class="!my-0">
        {#each ignoredChats as chat (chat.id)}
          <SwipeableRow
            open={openSwipeId === chat.id}
            onOpenChange={(open) => handleOpenChange(chat.id, open)}
            leftActions={[
              {
                id: 'unignore',
                label: 'Restore',
                icon: 'undo',
                class:
                  'bg-md-light-primary-container dark:bg-md-dark-primary-container text-md-light-on-primary-container dark:text-md-dark-on-primary-container',
                onClick: () => unignore(chat)
              }
            ]}
          >
            <ChatListItem name={chat.name} subtitle="Ignored" />
          </SwipeableRow>
        {/each}
      </List>
    {/if}

    {#if activeChats.length === 0 && ignoredChats.length === 0}
      <Block class="text-center py-12">
        <p class="text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant text-sm">
          No chats yet. Link WhatsApp to get started.
        </p>
      </Block>
    {/if}
  {/if}
</Page>
