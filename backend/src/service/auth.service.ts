import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prismaClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_use_strong_secret_in_env';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: number;
  email: string;
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerUser(
  name: string,
  organizationName: string,
  email: string,
  password: string
) {
  console.log('[auth/registerUser] Checking existing user', { email });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('[auth/registerUser] Existing user found', { email });
    throw new Error('Email already in use');
  }

  console.log('[auth/registerUser] Hashing password');
  const passwordHash = await bcrypt.hash(password, 10);

  // @ts-ignore — passwordHash will exist after schema update + prisma generate
  console.log('[auth/registerUser] Creating user in database', {
    email,
    organizationName,
  });
  const user = await prisma.user.create({
    data: { name, organizationName, email, passwordHash },
    select: { id: true, name: true, organizationName: true, email: true, createdAt: true },
  });

  console.log('[auth/registerUser] User created', { userId: user.id, email: user.email });

  const token = jwt.sign(
    { userId: user.id, email: user.email } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { user, token };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  // @ts-ignore — passwordHash will exist after schema update + prisma generate
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // @ts-ignore
  const valid = await bcrypt.compare(password, user.passwordHash as string);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Strip passwordHash before returning
  // @ts-ignore
  const { passwordHash: _removed, ...safeUser } = user;
  return { user: safeUser, token };
}

// ─── Get current user ─────────────────────────────────────────────────────────

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      workspaces: {
        select: {
          role: true,
          joinedAt: true,
          workspace: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}
