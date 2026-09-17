import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prismaClient.js';
import { createWorkspaceForUserInTransaction } from './workspace.service.js';

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
    throw new Error('Email already in use');
  }
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { name, organizationName, email, passwordHash },
      select: { id: true, name: true, organizationName: true, email: true, createdAt: true },
    });

    await createWorkspaceForUserInTransaction(tx, createdUser.id, organizationName);

    return createdUser;
  });
  
  const token = jwt.sign(
    { userId: user.id, email: user.email } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { user, token };
}

// ─── Register via workspace invitation (no new workspace) ─────────────────────

export async function registerUserFromInvitation(
  name: string,
  email: string,
  password: string,
  inviteToken: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  const invitation = await prisma.invitation.findUnique({
    where: { token: inviteToken },
    include: {
      workspace: { select: { id: true, name: true } },
    },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  const now = new Date();
  const isExpired = invitation.expiresAt.getTime() < now.getTime();

  if (isExpired && invitation.status === 'pending') {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'expired' },
    });
  }

  if (invitation.status !== 'pending' || isExpired) {
    throw new Error('Invitation expired or already used');
  }

  if (normalizedEmail !== invitation.email.toLowerCase()) {
    throw new Error('Email must match the invitation');
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new Error('Email already in use — sign in and accept the invitation');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name,
        organizationName: invitation.workspace.name,
        email: normalizedEmail,
        passwordHash,
      },
      select: { id: true, name: true, organizationName: true, email: true, createdAt: true },
    });

    await tx.workspaceMember.create({
      data: {
        userId: createdUser.id,
        workspaceId: invitation.workspaceId,
        role: invitation.role,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return createdUser;
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { user, token };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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
