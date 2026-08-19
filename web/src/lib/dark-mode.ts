import { browser } from '$app/environment';

export function systemPrefersDark(): boolean {
  if (!browser) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function watchSystemDark(onChange: (dark: boolean) => void): () => void {
  if (!browser) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => {
    const dark = mq.matches;
    document.documentElement.classList.toggle('dark', dark);
    onChange(dark);
  };
  update();
  mq.addEventListener('change', update);
  return () => mq.removeEventListener('change', update);
}
