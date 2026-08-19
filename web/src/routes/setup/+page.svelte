<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, List, ListInput, Button, Block } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { getAuthStatus, setupAccount } from '$lib/api';
  import { authClient } from '$lib/auth-client';

  let username = $state('');
  let password = $state('');
  let confirm = $state('');
  let error = $state('');
  let loading = $state(false);

  onMount(async () => {
    const { hasUsers } = await getAuthStatus();
    if (hasUsers) goto('/login');
  });

  async function createAccount() {
    error = '';
    if (password !== confirm) {
      error = 'Passwords do not match';
      return;
    }
    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      return;
    }
    loading = true;
    try {
      await setupAccount(username, password);
      await authClient.signIn.username({ username, password });
      goto('/');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Setup failed';
    } finally {
      loading = false;
    }
  }
</script>

<Page class="md-page">
  <MdNavbar title="Setup" />

  <Block inset>
    <p class="text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">
      Create the dashboard account for this Respondr instance.
    </p>
  </Block>

  <List strong inset>
    <ListInput label="Username" type="text" bind:value={username} />
    <ListInput label="Password" type="password" bind:value={password} />
    <ListInput label="Confirm password" type="password" bind:value={confirm} />
  </List>

  <Block class="px-4">
    <Button large onClick={createAccount} disabled={loading}>
      {loading ? 'Creating…' : 'Create account'}
    </Button>
    {#if error}<p class="text-md-light-error dark:text-md-dark-error text-sm text-center mt-2">{error}</p>{/if}
  </Block>
</Page>
