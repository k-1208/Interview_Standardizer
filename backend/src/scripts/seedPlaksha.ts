/**
 * Seeds the default Plaksha organisation and its two initial accounts.
 *
 *   npm run seed:plaksha                      (local, after `npm run build`)
 *   node dist/src/scripts/seedPlaksha.js      (inside the backend container)
 *
 * Idempotent: safe to run on every deploy. It only adds what is missing.
 *  - Creates the "Plaksha" workspace if it does not exist.
 *  - Creates each user if they do not exist (password is set only at creation,
 *    so a password changed later is never overwritten by a re-run).
 *  - Ensures each user is a member of the workspace with the configured role.
 *
 * Passwords can be overridden with SEED_SUPER_ADMIN_PASSWORD / SEED_ADMIN_PASSWORD.
 * Pass --reset-passwords to force-set the passwords on existing accounts.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prismaClient.js';
import { passwordPolicyMessage, passwordProblems } from '../utils/passwordPolicy.js';

const BCRYPT_ROUNDS = 12;
const ORG_NAME = 'Plaksha';
const WORKSPACE_SLUG = 'plaksha';

type SeedRole = 'super_admin' | 'admin' | 'reviewer';

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: SeedRole;
  owner?: boolean;
}

const SEED_USERS: SeedUser[] = [
  {
    name: 'Umair Rashid',
    email: 'umair.rashid@plaksha.edu.in',
    password: process.env.SEED_SUPER_ADMIN_PASSWORD || 'Umair@1208',
    role: 'super_admin',
    owner: true,
  },
  {
    name: 'Kunal Gupta',
    email: 'kunal.gupta.ug23@plaksha.edu.in',
    password: process.env.SEED_ADMIN_PASSWORD || 'Kugu@1208',
    role: 'admin',
  },
];

const resetPasswords = process.argv.includes('--reset-passwords');

async function ensureUser(seed: SeedUser) {
  const email = seed.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (resetPasswords) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: await bcrypt.hash(seed.password, BCRYPT_ROUNDS),
          // Revoke any sessions issued under the old password.
          tokenVersion: { increment: 1 },
        },
      });
      console.log(`  ↻ ${email}: password reset`);
    } else {
      console.log(`  ✓ ${email}: already exists`);
    }
    return existing;
  }

  const user = await prisma.user.create({
    data: {
      name: seed.name,
      email,
      organizationName: ORG_NAME,
      passwordHash: await bcrypt.hash(seed.password, BCRYPT_ROUNDS),
    },
  });
  console.log(`  + ${email}: created`);
  return user;
}

async function seed() {
  for (const u of SEED_USERS) {
    const problems = passwordProblems(u.password);
    if (problems.length > 0) {
      throw new Error(`Seed password for ${u.email} is invalid: ${passwordPolicyMessage(problems)}`);
    }
  }

  console.log(`🌱 Seeding ${ORG_NAME} organisation...`);

  const users = new Map<string, Awaited<ReturnType<typeof ensureUser>>>();
  for (const u of SEED_USERS) users.set(u.email, await ensureUser(u));

  const ownerSeed = SEED_USERS.find((u) => u.owner)!;
  const owner = users.get(ownerSeed.email)!;

  let workspace = await prisma.workspace.findUnique({ where: { slug: WORKSPACE_SLUG } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: ORG_NAME, slug: WORKSPACE_SLUG, ownerId: owner.id },
    });
    console.log(`  + workspace "${ORG_NAME}" (${WORKSPACE_SLUG}): created`);
  } else {
    console.log(`  ✓ workspace "${ORG_NAME}" (${WORKSPACE_SLUG}): already exists`);
  }

  for (const u of SEED_USERS) {
    const user = users.get(u.email)!;
    await prisma.workspaceMember.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      update: { role: u.role },
      create: { userId: user.id, workspaceId: workspace.id, role: u.role },
    });
    console.log(`  ✓ ${u.email}: ${u.role} in ${ORG_NAME}`);
  }

  console.log(`✅ ${ORG_NAME} seed complete (workspace id ${workspace.id}).`);
}

seed()
  .catch((err) => {
    console.error('❌ Plaksha seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
