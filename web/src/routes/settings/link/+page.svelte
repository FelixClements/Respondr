<script lang="ts">
  import { goto } from '$app/navigation';
  import { Page, Block } from 'konsta/svelte';
  import MdNavbar from '$lib/components/md/MdNavbar.svelte';
</script>

<Page class="md-page">
  <MdNavbar title="Link WhatsApp" backLink onBack={() => goto('/settings')} />

  <Block strong inset>
    <p class="text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant mb-4">
      WhatsApp linking requires a desktop browser. Open Respondr on your computer and scan the QR
      code.
    </p>
    <p class="text-sm font-medium text-md-light-primary dark:text-md-dark-primary mb-2">Steps</p>
    <ol
      class="list-decimal list-inside space-y-2 text-sm text-md-light-on-surface dark:text-md-dark-on-surface"
    >
      <li>Open Respondr on your desktop computer</li>
      <li>Go to Settings → QR Code (or visit /qr)</li>
      <li>Open WhatsApp on your phone → Settings → Linked Devices</li>
      <li>Tap "Link a Device" and scan the QR code</li>
      <li>Return here and refresh the Updates tab</li>
    </ol>
  </Block>
</Page>
