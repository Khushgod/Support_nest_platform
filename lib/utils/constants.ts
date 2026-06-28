// Dependency-free constants safe to import from edge middleware.

/** Name of the httpOnly cookie that holds the JWT session token. */
export const AUTH_COOKIE = 'token';

// Deterministic invite tokens the seed assigns to demo candidates, so the login
// screen can deep-link into the public candidate-intake form for testing.
export const DEMO_INVITE_TOKEN = 'demo00pendingintake0000000000aaaa';
export const DEMO_EXPIRED_TOKEN = 'demo00expiredintake0000000000bbbb';
