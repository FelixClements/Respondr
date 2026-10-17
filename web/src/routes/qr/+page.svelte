<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, Block, Preloader, Button } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { api } from '$lib/api';
  import {
    canReconnect,
    formatNextScan,
    requestReconnect,
    statusLabel,
    statusColor,
    STATUS_POLL_MS,
    type WhatsAppStatus
  } from '$lib/status';

  let qr = $state<string | null>(null);
  let status = $state<WhatsAppStatus | null>(null);
  let error = $state<string | null>(null);
  let reconnecting = $state(false);

  async function load() {
    try {
      const data = await api.get<{ qr: string | null; status: WhatsAppStatus }>('/qr');
      qr = data.qr;
      status = data.status;
      error = null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load QR code';
    }
  }

  async function reconnect() {
    reconnecting = true;
    try {
      await requestReconnect();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Reconnect failed';
    } finally {
      reconnecting = false;
    }
  }

  // WhatsApp rotates the QR code every ~20s; keep polling until linked.
  onMount(() => {
    load();
    const timer = setInterval(() => {
      if (!status?.isReady) load();
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  });
</script>

<Page class="md-page">
  <MdNavbar title="Link device" backLink onBack={() => goto('/settings')} />

  {#if !status && !error}
    <Block class="text-center py-12"><Preloader /></Block>
  {:else}
    <Block strong inset class="text-center">
      {#if status}
        <p class="mb-4 font-medium text-lg {statusColor(status.status)}">{statusLabel(status.status)}</p>
      {/if}
      {#if error}
        <p class="mb-4 text-sm text-md-light-error dark:text-md-dark-error" role="alert">{error}</p>
      {/if}
      {#if status?.isReady}
        <p class="text-brand-success font-medium">WhatsApp is connected.</p>
      {:else if qr}
        <img src={qr} alt="WhatsApp QR code" class="mx-auto max-w-xs rounded-lg" />
        <p class="text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant mt-4">
          Open WhatsApp → Linked devices → Link a device
        </p>
      {:else if status && canReconnect(status)}
        <p class="text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">
          {status.reconnectAt
            ? `Retrying automatically at ${formatNextScan(new Date(status.reconnectAt))}.`
            : 'Waiting for a QR code…'}
        </p>
        <Button class="mt-4" onClick={reconnect} disabled={reconnecting}>Reconnect now</Button>
      {:else}
        <p class="text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">
          Waiting for QR code…
        </p>
      {/if}
    </Block>
  {/if}
</Page>
