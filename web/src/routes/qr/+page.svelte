<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, Block, Preloader, Button } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { api } from '$lib/api';
  import { statusLabel, statusColor } from '$lib/status';

  let qr = $state<string | null>(null);
  let status = $state('');
  let loading = $state(true);

  async function load() {
    loading = true;
    const data = await api.get<{ qr: string | null; status: { status: string } }>('/qr');
    qr = data.qr;
    status = data.status.status;
    loading = false;
  }

  onMount(load);
</script>

<Page class="md-page">
  <MdNavbar title="Link device" backLink onBack={() => goto('/settings')} />

  {#if loading}
    <Block class="text-center py-12"><Preloader /></Block>
  {:else}
    <Block strong inset class="text-center">
      <p class="mb-4 font-medium text-lg {statusColor(status)}">{statusLabel(status)}</p>
      {#if qr}
        <img src={qr} alt="WhatsApp QR code" class="mx-auto max-w-xs rounded-lg" />
        <p class="text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant mt-4">
          Open WhatsApp → Linked devices → Link a device
        </p>
      {:else if status === 'ready'}
        <p class="text-brand-success font-medium">WhatsApp is already connected.</p>
      {:else}
        <p class="text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">
          Waiting for QR code…
        </p>
        <Button class="mt-4" onClick={load}>Refresh</Button>
      {/if}
    </Block>
  {/if}
</Page>
