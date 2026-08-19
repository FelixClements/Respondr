<script lang="ts">
  interface Props {
    name: string;
    size?: 'sm' | 'md' | 'lg';
  }

  let { name, size = 'md' }: Props = $props();

  const initial = $derived(name.trim().charAt(0).toUpperCase() || '?');
  const sizeClass = $derived(
    size === 'sm' ? 'w-10 h-10 text-base' : size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-lg'
  );
</script>

<div
  class="rounded-full bg-md-light-primary-container dark:bg-md-dark-primary-container text-md-light-on-primary-container dark:text-md-dark-on-primary-container font-medium flex items-center justify-center shrink-0 {sizeClass}"
  aria-hidden="true"
>
  {initial}
</div>
