export const KNOWN_PLACEHOLDER_SECRETS = [
  'dev-secret-change-me-in-production-32chars',
  'change-me-use-openssl-rand-base64-32',
  'change-me-use-openssl-rand-base64-32-for-production',
  'better-auth-secret-12345678901234567890'
];

const DEV_FALLBACK_SECRET = 'dev-secret-change-me-in-production-32chars';

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getAuthSecret(): string {
  return process.env.BETTER_AUTH_SECRET || DEV_FALLBACK_SECRET;
}

export function getSetupToken(): string | undefined {
  const token = process.env.SETUP_TOKEN?.trim();
  return token || undefined;
}

export function getBindHostname(): string {
  const host = process.env.HOST?.trim();
  if (host) return host;
  return isProduction() ? '0.0.0.0' : '127.0.0.1';
}

export function isLoopbackBind(hostname = getBindHostname()): boolean {
  return hostname === '127.0.0.1' || hostname === '::1' || hostname === 'localhost';
}

export function requiresSetupToken(): boolean {
  return isProduction() && Boolean(getSetupToken());
}

export function isHttpSetupAllowed(): boolean {
  if (getSetupToken()) return true;
  if (isProduction()) return false;
  return isLoopbackBind();
}

export function validateProductionConfig(): void {
  if (!isProduction()) return;

  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'BETTER_AUTH_SECRET is required in production. Generate one with: openssl rand -base64 32'
    );
  }
  if (secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters in production.');
  }
  if (KNOWN_PLACEHOLDER_SECRETS.includes(secret)) {
    throw new Error(
      'BETTER_AUTH_SECRET must not be a placeholder value in production. Generate one with: openssl rand -base64 32'
    );
  }

  const baseUrl = process.env.BETTER_AUTH_URL?.trim();
  if (!baseUrl?.startsWith('https://')) {
    throw new Error(
      'BETTER_AUTH_URL must start with https:// in production. Terminate TLS at a reverse proxy and set BETTER_AUTH_URL to your public HTTPS origin.'
    );
  }
}
