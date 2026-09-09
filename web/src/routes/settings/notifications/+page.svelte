<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, List, ListInput, ListItem, Button, Block, Toggle } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { api } from '$lib/api';
  import {
    getPushStatus,
    subscribeToPush,
    unsubscribeFromPush,
    isPushEnvironmentSupported,
    type PushStatus
  } from '$lib/push';

  interface NotificationSettings {
    ntfy: { enabled: boolean; server: string; topic: string; priority: number };
    gotify: { enabled: boolean; url: string; token: string; priority: number };
  }

  let settings = $state<NotificationSettings | null>(null);
  let saving = $state(false);
  let message = $state('');
  let pushStatus = $state<PushStatus>('unsupported');
  let pushBusy = $state(false);
  const pushSupported = isPushEnvironmentSupported();

  onMount(async () => {
    settings = await api.get('/notifications');
    pushStatus = await getPushStatus();
  });

  async function save() {
    if (!settings) return;
    saving = true;
    message = '';
    try {
      settings = await api.put('/notifications', settings);
      message = 'Saved';
    } catch (err) {
      message = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  async function enablePush() {
    pushBusy = true;
    message = '';
    try {
      await subscribeToPush();
      pushStatus = await getPushStatus();
      message = 'Push notifications enabled';
    } catch (err) {
      message = err instanceof Error ? err.message : 'Failed to enable push';
    } finally {
      pushBusy = false;
    }
  }

  async function disablePush() {
    pushBusy = true;
    message = '';
    try {
      await unsubscribeFromPush();
      pushStatus = await getPushStatus();
      message = 'Push notifications disabled';
    } catch (err) {
      message = err instanceof Error ? err.message : 'Failed to disable push';
    } finally {
      pushBusy = false;
    }
  }

  async function testPush() {
    message = '';
    try {
      const res = await api.post<{ ok: boolean; result?: { status?: string; error?: string } }>(
        '/push/test'
      );
      message = res.ok ? 'Test push sent' : `Test push failed: ${res.result?.error || res.result?.status || 'no delivery'}`;
    } catch (err) {
      message = err instanceof Error ? err.message : 'Test push failed';
    }
  }

  async function testNotification() {
    message = '';
    try {
      const res = await api.post<{ ok: boolean }>('/test-notification', {
        title: 'Test',
        message: 'Notification test'
      });
      message = res.ok ? 'Test notification sent' : 'Test notification had no deliveries';
    } catch (err) {
      message = err instanceof Error ? err.message : 'Test notification failed';
    }
  }
</script>

<Page class="md-page">
  <MdNavbar title="Notifications" backLink onBack={() => goto('/settings')} />

  {#if settings}
    {@const notificationSettings = settings}
    <List strong inset>
      <ListItem title="NTFY">
        {#snippet after()}
          <Toggle
            checked={notificationSettings.ntfy.enabled}
            onChange={(e) => (notificationSettings.ntfy.enabled = (e.target as HTMLInputElement).checked)}
          />
        {/snippet}
      </ListItem>
      <ListInput label="NTFY server" bind:value={notificationSettings.ntfy.server} />
      <ListInput label="NTFY topic" bind:value={notificationSettings.ntfy.topic} />
      <ListInput label="NTFY priority" type="number" bind:value={notificationSettings.ntfy.priority} />
    </List>

    <List strong inset>
      <ListItem title="Gotify">
        {#snippet after()}
          <Toggle
            checked={notificationSettings.gotify.enabled}
            onChange={(e) => (notificationSettings.gotify.enabled = (e.target as HTMLInputElement).checked)}
          />
        {/snippet}
      </ListItem>
      <ListInput label="Gotify URL" bind:value={notificationSettings.gotify.url} />
      <ListInput label="Gotify token" type="password" bind:value={notificationSettings.gotify.token} />
      <ListInput label="Gotify priority" type="number" bind:value={notificationSettings.gotify.priority} />
    </List>

    <List strong inset>
      <ListItem
        title="Web Push"
        subtitle={pushSupported
          ? pushStatus === 'subscribed'
            ? 'Subscribed on this device'
            : pushStatus === 'denied'
              ? 'Permission denied in browser settings'
              : 'Enable to receive reminders when the app is closed'
          : 'Install the PWA first (Add to Home Screen). On iOS, push requires iOS 16.4+ in standalone mode.'}
      />
    </List>
  {/if}

  <Block class="px-4 space-y-2">
    <Button large onClick={save} disabled={saving || !settings}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
    {#if pushSupported && pushStatus !== 'subscribed'}
      <Button large tonal onClick={enablePush} disabled={pushBusy || pushStatus === 'denied'}>
        Enable push notifications
      </Button>
    {/if}
    {#if pushStatus === 'subscribed'}
      <Button large tonal onClick={disablePush} disabled={pushBusy}>Disable push notifications</Button>
      <Button large tonal onClick={testPush}>Test Web Push</Button>
    {/if}
    <Button large tonal onClick={testNotification}>Test all notification channels</Button>
    {#if message}<p class="text-sm text-center text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">{message}</p>{/if}
  </Block>
</Page>
