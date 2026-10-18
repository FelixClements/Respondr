<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { KonstaProvider } from 'konsta/svelte';
  import { authClient } from '$lib/auth-client';
  import InstallBanner from '$lib/components/InstallBanner.svelte';
  import MdTabbar from '$lib/components/md/MdTabbar.svelte';
  import { systemPrefersDark, watchSystemDark } from '$lib/dark-mode';
  import { pwaInfo } from 'virtual:pwa-info';
  // Self-hosted fonts: no request to Google, and they work offline in the PWA.
  import '@fontsource/roboto/400.css';
  import '@fontsource/roboto/500.css';
  import '@fontsource/roboto/700.css';
  import '@fontsource-variable/material-symbols-outlined/fill.css';
  import '../app.css';

  const session = authClient.useSession();

  let { children } = $props();
  let dark = $state(systemPrefersDark());
  const webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

  onMount(() => {
    watchSystemDark((value) => (dark = value));

    if (!pwaInfo) return;
    void import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true });
    });
  });

  const hideTabs = $derived(
    $page.url.pathname === '/login' || $page.url.pathname === '/setup'
  );

  $effect(() => {
    if (!$session.isPending && !$session.data && !hideTabs) {
      goto('/login');
    }
  });
</script>

<svelte:head>
  <title>Respondr</title>
  {@html webManifest}
</svelte:head>

<KonstaProvider theme="material" materialTouchRipple {dark}>
  <div class="k-material k-md-vibrant md-app bg-md-light-surface-container-lowest dark:bg-md-dark-surface-container-lowest min-h-screen">
    <!-- Phone-first UI: on wider screens keep it in a centered column. -->
    <div
      class="pb-tabbar mx-auto w-full max-w-2xl min-h-screen lg:border-x lg:border-md-light-outline-variant/30 lg:dark:border-md-dark-outline-variant/30"
    >
      {@render children()}
    </div>
    <InstallBanner />
    {#if !hideTabs && $session.data}
      <MdTabbar />
    {/if}
  </div>
</KonstaProvider>
