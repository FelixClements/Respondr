<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, List, ListItem, Button, Block } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { api } from '$lib/api';
  import {
    getPushStatus,
    subscribeToPush,
    unsubscribeFromPush,
    isPushEnvironmentSupported,
    type PushStatus
  } from '$lib/push';

  let message = $state('');
  let pushStatus = $state<PushStatus>('unsupported');
  let pushBusy = $state(false);
  const pushSupported = isPushEnvironmentSupported();

  onMount(async () => {
    pushStatus = await getPushStatus();
  });

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
</script>

<Page class="md-page">
  <MdNavbar title="Notifications" backLink onBack={() => goto('/settings')} />

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

  <Block class="px-4 space-y-2">
    {#if pushSupported && pushStatus !== 'subscribed'}
      <Button large tonal onClick={enablePush} disabled={pushBusy || pushStatus === 'denied'}>
        Enable push notifications
      </Button>
    {/if}
    {#if pushStatus === 'subscribed'}
      <Button large tonal onClick={disablePush} disabled={pushBusy}>Disable push notifications</Button>
      <Button large tonal onClick={testPush}>Test Web Push</Button>
    {/if}
    {#if message}<p class="text-sm text-center text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">{message}</p>{/if}
  </Block>
</Page>
