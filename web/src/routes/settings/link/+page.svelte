<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, Block, Preloader, Button } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import MdSymbol from '$lib/components/md/MdSymbol.svelte';
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

  const mutedText = 'text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant';
</script>

<Page class="md-page">
  <MdNavbar title="Link WhatsApp" backLink onBack={() => goto('/settings')} />

  {#if !status && !error}
    <Block class="text-center py-12"><Preloader /></Block>
  {:else}
    <Block strong inset>
      {#if status}
        <p class="font-medium text-lg {statusColor(status.status)}">{statusLabel(status.status)}</p>
      {/if}
      {#if error}
        <p class="mt-2 text-sm text-md-light-error dark:text-md-dark-error" role="alert">{error}</p>
      {/if}

      {#if status?.isReady}
        <div class="mt-4 flex items-start gap-3">
          <MdSymbol name="check_circle" filled class="text-brand-success" />
          <div>
            <p class="text-md-light-on-surface dark:text-md-dark-on-surface">WhatsApp is connected.</p>
            <p class="mt-1 text-sm {mutedText}">
              To unlink, remove Respondr from WhatsApp → Linked devices on your phone.
            </p>
          </div>
        </div>
        <Button class="mt-4" tonal onClick={() => goto('/')}>Back to Updates</Button>
      {:else if qr}
        <div class="mt-4 grid items-center gap-6 md:grid-cols-2">
          <img src={qr} alt="WhatsApp QR code" class="mx-auto w-full max-w-xs rounded-lg" />
          <div>
            <ol
              class="list-decimal list-inside space-y-2 text-sm text-md-light-on-surface dark:text-md-dark-on-surface"
            >
              <li>On your phone, open WhatsApp → Settings → Linked devices</li>
              <li>Tap <span class="font-medium">Link a device</span></li>
              <li>Point your phone at this code</li>
            </ol>
            <p class="mt-4 text-sm {mutedText}">
              The code refreshes automatically, and this page updates once linked.
            </p>
            <p class="mt-2 text-sm {mutedText} md:hidden">
              Your phone scans this code, so open this page on a computer or another screen.
            </p>
          </div>
        </div>
      {:else if status && canReconnect(status)}
        <p class="mt-2 {mutedText}">
          {status.reconnectAt
            ? `Retrying automatically at ${formatNextScan(new Date(status.reconnectAt))}.`
            : 'Waiting for a QR code…'}
        </p>
        <Button class="mt-4" onClick={reconnect} disabled={reconnecting}>Reconnect now</Button>
      {:else}
        <p class="mt-2 {mutedText}">Waiting for QR code…</p>
      {/if}
    </Block>
  {/if}
</Page>
