// Compatibility re-export: src/server/security.ts was split into
// secrets.ts (env/prod guards), clientIp.ts (proxy IP), rateLimit.ts
// (factory + instances), and setupToken.ts. Import from the specific module
// in new code; this file stays so existing `from './security.js'` imports keep working.
export {
  KNOWN_PLACEHOLDER_SECRETS,
  isProduction,
  getAuthSecret,
  getSetupToken,
  getBindHostname,
  isLoopbackBind,
  requiresSetupToken,
  isHttpSetupAllowed,
  validateProductionConfig
} from './secrets.js';
export { isTrustProxyEnabled, isValidIp, extractClientIp } from './clientIp.js';
export {
  createRateLimiter,
  setupRateLimiter,
  authStatusRateLimiter,
  signInRateLimiter,
  RATE_LIMIT_POLICY
} from './rateLimit.js';
export { verifySetupToken } from './setupToken.js';
