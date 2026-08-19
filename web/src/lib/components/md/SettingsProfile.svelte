<script lang="ts">
  import Avatar from './Avatar.svelte';

  interface Props {
    title?: string;
    subtitle?: string;
  }

  let { title = 'Respondr', subtitle = 'WhatsApp reminder engine' }: Props = $props();
</script>

<div
  class="flex items-center gap-4 px-4 py-5 bg-md-light-surface-container-low dark:bg-md-dark-surface-container-low border-b border-md-light-outline-variant/30 dark:border-md-dark-outline-variant/30"
>
  <Avatar name={title} size="lg" />
  <div class="min-w-0">
    <div
      class="text-lg font-medium text-md-light-on-surface dark:text-md-dark-on-surface truncate"
    >
      {title}
    </div>
    <div
      class="text-sm text-md-light-on-surface-variant dark:text-md-dark-on-surface-variant truncate"
    >
      {subtitle}
    </div>
  </div>
</div>
