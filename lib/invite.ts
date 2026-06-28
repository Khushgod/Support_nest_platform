import crypto from 'crypto';

/** 32-char (16-byte) unguessable hex token for a candidate invite link. */
export function generateInviteToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/** ISO timestamp `days` in the future (default 30). */
export function getInviteExpiry(days = 30): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function isTokenUsed(usedAt: string | null): boolean {
  return usedAt !== null && usedAt !== '';
}

/** Public-facing apply URL for a token (uses BASE_URL, defaults to localhost). */
export function getInviteLink(token: string): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/apply/${token}`;
}

/** Derived invite status for display. */
export type InviteStatus = 'pending' | 'submitted' | 'expired' | 'invalidated';

export function deriveInviteStatus(c: {
  status: string;
  invite_token_used_at: string | null;
  invite_token_expires_at: string | null;
}): InviteStatus {
  if (c.status === 'docs_submitted' || isTokenUsed(c.invite_token_used_at)) {
    if (c.invite_token_used_at === 'invalidated') return 'invalidated';
    return 'submitted';
  }
  if (isTokenExpired(c.invite_token_expires_at)) return 'expired';
  return 'pending';
}
