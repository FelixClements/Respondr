export const NTFY_TOPIC_PATTERN = /^[a-zA-Z0-9_\-.~]+$/;

export function assertNtfyTopic(topic: string): void {
  if (!topic) return;
  if (!NTFY_TOPIC_PATTERN.test(topic)) {
    throw new Error(
      'Ntfy topic must contain only letters, numbers, hyphens, underscores, tildes, and dots'
    );
  }
}

export function clampNtfyPriority(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) throw new Error('Ntfy priority must be a number 1-5');
  if (parsed < 1 || parsed > 5) throw new Error('Ntfy priority must be between 1 and 5');
  return parsed;
}

export function clampGotifyPriority(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) throw new Error('Gotify priority must be a number 0-10');
  if (parsed < 0 || parsed > 10) throw new Error('Gotify priority must be between 0 and 10');
  return parsed;
}
