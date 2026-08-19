<script lang="ts">
  import { onMount } from 'svelte';
  import { Block, Button } from 'konsta/svelte';

  let show = $state(false);
  let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);

  onMount(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem('respondr-install-dismissed')) return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      show = true;
    });

    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIos && !standalone) {
      show = true;
    }
  });

  async function install() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      deferredPrompt = null;
      show = false;
    }
  }

  function dismiss() {
    localStorage.setItem('respondr-install-dismissed', '1');
    show = false;
  }
</script>

{#if show}
  <Block
    strong
    inset
    class="fixed bottom-24 left-4 right-4 z-50 shadow-lg mx-auto max-w-md"
  >
    <p class="text-sm font-medium mb-2 text-md-light-on-surface dark:text-md-dark-on-surface">
      Install Respondr
    </p>
    <p class="text-xs text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant mb-3">
      {#if deferredPrompt}
        Add to your home screen for quick access and push notifications.
      {:else}
        Tap Share → Add to Home Screen in Safari to install.
      {/if}
    </p>
    <div class="flex gap-2">
      {#if deferredPrompt}
        <Button small onClick={install}>Install</Button>
      {/if}
      <Button small tonal onClick={dismiss}>Dismiss</Button>
    </div>
  </Block>
{/if}
