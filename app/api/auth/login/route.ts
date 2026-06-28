import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, signToken, AUTH_COOKIE } from '@/lib/utils/auth';
import { isValidEmail } from '@/lib/validators';
import { AuthUser, ROLE_HOME } from '@/lib/types';

interface UserRow {
  id: string;
  organization_id: string;
  email: string;
  password_hash: string;
  role: AuthUser['role'];
  full_name: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};

    if (!isValidEmail(email) || typeof password !== 'string') {
      // Generic message — never reveal which field was wrong.
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = db
      .prepare(
        'SELECT id, organization_id, email, password_hash, role, full_name FROM Users WHERE email = ?'
      )
      .get(email) as UserRow | undefined;

    // Always run the comparison path-shape consistently; same generic error.
    const ok = user ? await verifyPassword(password, user.password_hash) : false;
    if (!user || !ok) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
    };
    const token = signToken(authUser);

    const res = NextResponse.json({
      success: true,
      role: user.role,
      redirectTo: ROLE_HOME[user.role] ?? '/dashboard',
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
    console.error('login error:', (error as Error).message);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
