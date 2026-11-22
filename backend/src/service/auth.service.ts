import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prismaClient.js';
import { createWorkspaceForUserInTransaction } from './workspace.service.js';
import { HttpError } from '../utils/httpError.js';

import { signAuthToken } from '../config/auth.js';
import { passwordPolicyMessage, passwordProblems } from '../utils/passwordPolicy.js';

const BCRYPT_ROUNDS = 12;
// Compared against when the email doesn't exist, so login takes the same time
// whether or not an account exists (no user enumeration via timing).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

const assertPasswordPolicy = (password: string) => {
  const problems = passwordProblems(password);
  if (problems.length > 0) {
    throw new HttpError(400, passwordPolicyMessage(problems));
  }
};

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerUser(
  name: string,
  organizationName: string,
  email: string,
  password: string
) {
  assertPasswordPolicy(password);
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new HttpError(409, 'Email already in use');
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { name, organizationName, email: normalizedEmail, passwordHash },
      select: { id: true, name: true, organizationName: true, email: true, createdAt: true, tokenVersion: true },
    });

    await createWorkspaceForUserInTransaction(tx, createdUser.id, organizationName);

    return createdUser;
  });
  
  const token = signAuthToken({ userId: user.id, email: user.email, tv: user.tokenVersion });

  const { tokenVersion: _tv, ...safeUser } = user;
  return { user: safeUser, token };
}

// ─── Register via workspace invitation (no new workspace) ─────────────────────

export async function registerUserFromInvitation(
  name: string,
  email: string,
  password: string,
  inviteToken: string
) {
  assertPasswordPolicy(password);
  const normalizedEmail = email.trim().toLowerCase();

  const invitation = await prisma.invitation.findUnique({
    where: { token: inviteToken },
    include: {
      workspace: { select: { id: true, name: true } },
    },
  });

  if (!invitation) {
    throw new HttpError(404, 'Invitation not found');
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
    throw new HttpError(409, 'Invitation expired or already used');
  }

  if (invitation.role === 'super_admin') {
    throw new HttpError(400, 'Invitation has an invalid role');
  }

  if (normalizedEmail !== invitation.email.toLowerCase()) {
    throw new HttpError(409, 'Email must match the invitation');
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new HttpError(409, 'Email already in use — sign in and accept the invitation');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name,
        organizationName: invitation.workspace.name,
        email: normalizedEmail,
        passwordHash,
      },
      select: { id: true, name: true, organizationName: true, email: true, createdAt: true, tokenVersion: true },
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

  const token = signAuthToken({ userId: user.id, email: user.email, tv: user.tokenVersion });

  const { tokenVersion: _tv, ...safeUser } = user;
  return { user: safeUser, token };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  const valid = await bcrypt.compare(String(password ?? ''), user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !valid) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const token = signAuthToken({ userId: user.id, email: user.email, tv: user.tokenVersion });

  // Strip secrets before returning
  const { passwordHash: _removed, tokenVersion: _tv, ...safeUser } = user;
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
    throw new HttpError(404, 'User not found');
  }

  return user;
}

// ─── Logout: revoke every token issued so far ────────────────────────────────

export async function revokeUserTokens(userId: number, tokenVersion: number) {
  // Only bump if the presented token is still current (idempotent for stale tokens).
  await prisma.user.updateMany({
    where: { id: userId, tokenVersion },
    data: { tokenVersion: { increment: 1 } },
  });
}
