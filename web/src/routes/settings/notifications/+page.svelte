<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, List, ListInput, ListItem, Button, Block, Toggle } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { api } from '$lib/api';

  let settings = $state<Record<string, string>>({});
  let saving = $state(false);
  let message = $state('');

  onMount(async () => {
    settings = await api.get('/notifications');
  });

  async function save() {
    saving = true;
    message = '';
    try {
      settings = await api.put('/notifications', {
        ntfy_enabled: settings.ntfy_enabled === '1',
        ntfy_server: settings.ntfy_server,
        ntfy_topic: settings.ntfy_topic,
        ntfy_priority: parseInt(settings.ntfy_priority || '3', 10),
        gotify_enabled: settings.gotify_enabled === '1',
        gotify_url: settings.gotify_url,
        gotify_token: settings.gotify_token,
        gotify_priority: parseInt(settings.gotify_priority || '5', 10)
      });
      message = 'Saved';
    } catch (err) {
      message = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  async function testPush() {
    await api.post('/push/test');
    message = 'Test push sent';
  }

  async function testNotification() {
    await api.post('/test-notification', { title: 'Test', message: 'Notification test' });
    message = 'Test notification sent';
  }
</script>

<Page class="md-page">
  <MdNavbar title="Notifications" backLink onBack={() => goto('/settings')} />

  <List strong inset>
    <ListItem title="NTFY">
      {#snippet after()}
        <Toggle
          checked={settings.ntfy_enabled === '1'}
          onChange={(e) => (settings.ntfy_enabled = (e.target as HTMLInputElement).checked ? '1' : '0')}
        />
      {/snippet}
    </ListItem>
    <ListInput label="NTFY server" bind:value={settings.ntfy_server} />
    <ListInput label="NTFY topic" bind:value={settings.ntfy_topic} />
    <ListInput label="NTFY priority" type="number" bind:value={settings.ntfy_priority} />
  </List>

  <List strong inset>
    <ListItem title="Gotify">
      {#snippet after()}
        <Toggle
          checked={settings.gotify_enabled === '1'}
          onChange={(e) => (settings.gotify_enabled = (e.target as HTMLInputElement).checked ? '1' : '0')}
        />
      {/snippet}
    </ListItem>
    <ListInput label="Gotify URL" bind:value={settings.gotify_url} />
    <ListInput label="Gotify token" type="password" bind:value={settings.gotify_token} />
    <ListInput label="Gotify priority" type="number" bind:value={settings.gotify_priority} />
  </List>

  <Block class="px-4 space-y-2">
    <Button large onClick={save} disabled={saving}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
    <Button large tonal onClick={testPush}>Test Web Push</Button>
    <Button large tonal onClick={testNotification}>Test notification</Button>
    {#if message}<p class="text-sm text-center text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">{message}</p>{/if}
  </Block>
</Page>
