import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prismaClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme_use_strong_secret_in_env';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: number;
  email: string;
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const buildUniqueWorkspaceSlug = async (organizationName: string) => {
  const baseSlug = toSlug(organizationName) || 'workspace';
  let slug = baseSlug;
  let attempt = 1;

  while (true) {
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (!existing) {
      return slug;
    }
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }
};

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

    const slug = await buildUniqueWorkspaceSlug(organizationName);

    const workspace = await tx.workspace.create({
      data: {
        name: organizationName,
        slug,
        owner: { connect: { id: createdUser.id } },
      },
      select: { id: true },
    });

    await tx.workspaceMember.create({
      data: {
        userId: createdUser.id,
        workspaceId: workspace.id,
        role: 'super_admin',
      },
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
