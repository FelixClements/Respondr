<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Tabbar, TabbarLink } from 'konsta/svelte';
  import MdSymbol from './MdSymbol.svelte';

  const tabs = [
    { href: '/', label: 'Updates', icon: 'notifications', match: (path: string) => path === '/' },
    {
      href: '/chats',
      label: 'Chats',
      icon: 'chat',
      match: (path: string) => path.startsWith('/chats')
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: 'settings',
      match: (path: string) => path.startsWith('/settings') || path === '/qr'
    }
  ] as const;
</script>

<Tabbar labels icons class="left-0 bottom-0 fixed safe-areas z-30">
  {#each tabs as tab}
    {@const active = tab.match($page.url.pathname)}
    <TabbarLink active={active} onclick={() => goto(tab.href)} label={tab.label}>
      {#snippet icon()}
        <MdSymbol name={tab.icon} filled={active} class="w-6 h-6" />
      {/snippet}
    </TabbarLink>
  {/each}
</Tabbar>
