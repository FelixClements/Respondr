<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, List, ListInput, Button, Block } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { api } from '$lib/api';

  let settings = $state<Record<string, string>>({});
  let saving = $state(false);
  let message = $state('');

  onMount(async () => {
    settings = await api.get('/settings');
  });

  async function save() {
    saving = true;
    message = '';
    try {
      settings = await api.put('/settings', {
        interval_minutes: parseInt(settings.interval_minutes, 10),
        chat_limit: parseInt(settings.chat_limit, 10),
        threshold_hours: parseFloat(settings.threshold_hours)
      });
      message = 'Saved';
    } catch (err) {
      message = err instanceof Error ? err.message : 'Save failed';
    } finally {
      saving = false;
    }
  }
</script>

<Page class="md-page">
  <MdNavbar title="Core settings" backLink onBack={() => goto('/settings')} />

  <List strong inset>
    <ListInput
      label="Scan interval (minutes, 1-59)"
      type="number"
      min="1"
      max="59"
      bind:value={settings.interval_minutes}
    />
    <ListInput
      label="Chat limit (1-200)"
      type="number"
      min="1"
      max="200"
      bind:value={settings.chat_limit}
    />
    <ListInput
      label="Threshold (hours, 1-168)"
      type="number"
      min="1"
      max="168"
      step="0.5"
      bind:value={settings.threshold_hours}
    />
  </List>

  <Block class="px-4">
    <Button large onClick={save} disabled={saving}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
    {#if message}<p class="text-sm text-center mt-2 text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">{message}</p>{/if}
  </Block>
</Page>
