import { Role } from '@/lib/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES: Role[] = [
  'program_manager',
  'talent_acquisition',
  'employee_hr',
];

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

export function isValidPassword(password: unknown): password is string {
  // Minimum 8 chars for the MVP; never log the value.
  return typeof password === 'string' && password.length >= 8;
}

export function isValidRole(role: unknown): role is Role {
  return typeof role === 'string' && VALID_ROLES.includes(role as Role);
}
