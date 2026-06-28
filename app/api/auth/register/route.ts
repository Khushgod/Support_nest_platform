import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { hashPassword, signToken, AUTH_COOKIE } from '@/lib/utils/auth';
import { isValidEmail, isValidPassword, isValidRole } from '@/lib/validators';
import { AuthUser, Role, ROLE_HOME } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name, organization_name } = body ?? {};

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Role defaults to program_manager for self-serve signup.
    const role: Role = isValidRole(body?.role) ? body.role : 'program_manager';
    const fullName =
      typeof full_name === 'string' && full_name.trim()
        ? full_name.trim()
        : email.split('@')[0];
    const orgName =
      typeof organization_name === 'string' && organization_name.trim()
        ? organization_name.trim()
        : `${fullName}'s Organization`;

    const orgId = randomUUID();
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    // Create org + user atomically.
    const createOrgAndUser = db.transaction(() => {
      db.prepare('INSERT INTO Organizations (id, name) VALUES (?, ?)').run(
        orgId,
        orgName
      );
      db.prepare(
        `INSERT INTO Users (id, organization_id, email, password_hash, role, full_name)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(userId, orgId, email, passwordHash, role, fullName);
    });
    createOrgAndUser();

    const authUser: AuthUser = {
      id: userId,
      name: fullName,
      email,
      role,
      organization_id: orgId,
    };
    const token = signToken(authUser);

    const res = NextResponse.json({
      success: true,
      role,
      redirectTo: ROLE_HOME[role] ?? '/dashboard',
      user: authUser,
    });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    // Never log request bodies (may contain PII / passwords).
    console.error('register error:', (error as Error).message);
    return NextResponse.json(
      { error: 'Could not create account' },
      { status: 500 }
    );
  }
}
