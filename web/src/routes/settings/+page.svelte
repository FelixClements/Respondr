<script lang="ts">
  import { goto } from '$app/navigation';
  import { Page, List } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import SettingsProfile from '$lib/components/md/SettingsProfile.svelte';
  import SettingsRow from '$lib/components/md/SettingsRow.svelte';
  import { authClient } from '$lib/auth-client';

  const session = authClient.useSession();

  async function logout() {
    await authClient.signOut();
    goto('/login');
  }

  const email = $derived($session.data?.user?.email || $session.data?.user?.name || 'Dashboard');
</script>

<Page class="md-page">
  <MdNavbar title="Settings" />

  <SettingsProfile title="Respondr" subtitle={email} />

  <List strong class="mt-2">
    <SettingsRow
      rowTitle="Core settings"
      subtitle="Scan interval, limits"
      icon="tune"
      onClick={() => goto('/settings/core')}
    />
    <SettingsRow
      rowTitle="Notifications"
      subtitle="NTFY, Gotify, Web Push"
      icon="notifications"
      onClick={() => goto('/settings/notifications')}
    />
    <SettingsRow
      rowTitle="Link WhatsApp"
      subtitle="Desktop linking steps"
      icon="link"
      onClick={() => goto('/settings/link')}
    />
    <SettingsRow
      rowTitle="History"
      subtitle="Reminders and scans"
      icon="history"
      onClick={() => goto('/settings/history')}
    />
    <SettingsRow rowTitle="Logs" icon="article" onClick={() => goto('/settings/logs')} />
    <SettingsRow
      rowTitle="QR Code"
      subtitle="Desktop only"
      icon="qr_code"
      onClick={() => goto('/qr')}
    />
    <SettingsRow rowTitle="Log out" icon="logout" destructive onClick={logout} />
  </List>
</Page>
