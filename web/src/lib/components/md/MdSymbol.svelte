<script lang="ts">
  interface Props {
    name: string;
    filled?: boolean;
    class?: string;
  }

  let { name, filled = false, class: className = '' }: Props = $props();
</script>

<span
  class="material-symbols-outlined {filled ? 'filled' : ''} {className}"
  aria-hidden="true"
>
  {name}
</span>
