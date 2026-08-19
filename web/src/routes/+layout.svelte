<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { KonstaProvider } from 'konsta/svelte';
  import { authClient } from '$lib/auth-client';
  import InstallBanner from '$lib/components/InstallBanner.svelte';
  import MdTabbar from '$lib/components/md/MdTabbar.svelte';
  import { systemPrefersDark, watchSystemDark } from '$lib/dark-mode';
  import '../app.css';

  const session = authClient.useSession();

  let { children } = $props();
  let dark = $state(systemPrefersDark());

  onMount(() => watchSystemDark((value) => (dark = value)));

  const hideTabs = $derived(
    $page.url.pathname === '/login' || $page.url.pathname === '/setup'
  );

  $effect(() => {
    if (!$session.isPending && !$session.data && !hideTabs) {
      goto('/login');
    }
  });
</script>

<KonstaProvider theme="material" materialTouchRipple {dark}>
  <div class="k-material k-md-vibrant md-app bg-md-light-surface-container-lowest dark:bg-md-dark-surface-container-lowest min-h-screen">
    <div class="pb-tabbar">
      {@render children()}
    </div>
    <InstallBanner />
    {#if !hideTabs && $session.data}
      <MdTabbar />
    {/if}
  </div>
</KonstaProvider>
