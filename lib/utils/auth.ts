import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthUser } from '@/lib/types';
import { AUTH_COOKIE } from '@/lib/utils/constants';

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = '7d';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, getSecret(), { expiresIn: TOKEN_TTL });
}

/** Verify a JWT and return the embedded user, or null if invalid/expired. */
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as jwt.JwtPayload & AuthUser;
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      organization_id: decoded.organization_id,
    };
  } catch {
    return null;
  }
}

// Re-exported for convenience; canonical definition lives in constants.ts.
export { AUTH_COOKIE };
