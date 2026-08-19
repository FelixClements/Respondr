<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Page, List, ListInput, Button, Block } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
  import { authClient } from '$lib/auth-client';
  import { getAuthStatus } from '$lib/api';

  let username = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  onMount(async () => {
    const { hasUsers } = await getAuthStatus();
    if (!hasUsers) goto('/setup');
  });

  async function login() {
    error = '';
    loading = true;
    const result = await authClient.signIn.username({ username, password });
    loading = false;
    if (result.error) {
      error = result.error.message || 'Login failed';
      return;
    }
    goto('/');
  }
</script>

<Page class="md-page">
  <MdNavbar title="Respondr" />

  <Block class="text-center py-8">
    <div class="text-3xl font-medium text-md-light-primary dark:text-md-dark-primary mb-2">
      Respondr
    </div>
    <p class="text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant">
      Sign in to your reminder dashboard
    </p>
  </Block>

  <List strong inset>
    <ListInput label="Username" type="text" bind:value={username} />
    <ListInput label="Password" type="password" bind:value={password} />
  </List>

  <Block class="px-4">
    <Button large onClick={login} disabled={loading}>
      {loading ? 'Signing in…' : 'Sign in'}
    </Button>
    {#if error}<p class="text-md-light-error dark:text-md-dark-error text-sm text-center mt-2">{error}</p>{/if}
  </Block>
</Page>
