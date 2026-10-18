<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, List } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import SettingsProfile from '$lib/components/md/SettingsProfile.svelte';
  import SettingsRow from '$lib/components/md/SettingsRow.svelte';
  import { settingsListClass } from '$lib/uiSpacing';
  import { authClient } from '$lib/auth-client';
  import { fetchWhatsAppStatus, statusLabel } from '$lib/status';

  const session = authClient.useSession();

  async function logout() {
    await authClient.signOut();
    goto('/login');
  }

  let whatsappSubtitle = $state('Connection and linking');

  onMount(async () => {
    try {
      whatsappSubtitle = statusLabel((await fetchWhatsAppStatus()).status);
    } catch {
      // Keep the generic subtitle; the WhatsApp page shows the error.
    }
  });

  const email = $derived($session.data?.user?.email || $session.data?.user?.name || 'Dashboard');
</script>

<Page class="md-page">
  <MdNavbar title="Settings" />

  <SettingsProfile title="Respondr" subtitle={email} />

  <List strong class={settingsListClass}>
    <SettingsRow
      rowTitle="Core settings"
      subtitle="Scan interval, limits"
      icon="tune"
      onClick={() => goto('/settings/core')}
    />
    <SettingsRow
      rowTitle="Notifications"
      subtitle="Web Push"
      icon="notifications"
      onClick={() => goto('/settings/notifications')}
    />
    <SettingsRow
      rowTitle="WhatsApp"
      subtitle={whatsappSubtitle}
      icon="link"
      onClick={() => goto('/settings/link')}
    />
    <SettingsRow
      rowTitle="History"
      subtitle="Reminders and scans"
      icon="history"
      onClick={() => goto('/settings/history')}
    />
    <SettingsRow
      rowTitle="Logs"
      subtitle="Recent server logs"
      icon="article"
      onClick={() => goto('/settings/logs')}
    />
    <SettingsRow rowTitle="Log out" icon="logout" destructive onClick={logout} />
  </List>
</Page>
