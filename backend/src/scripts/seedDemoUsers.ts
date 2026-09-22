import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prismaClient.js';

async function seed() {
  console.log('🌱 Seeding demo workspace, role-based users, and sample candidate data...');

  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // 1. Ensure primary workspace exists
  let workspace = await prisma.workspace.findFirst({
    where: { slug: 'acme-corp' },
  });

  if (!workspace) {
    const superAdminUser = await prisma.user.upsert({
      where: { email: 'superadmin@example.com' },
      update: { passwordHash },
      create: {
        name: 'Super Admin User',
        email: 'superadmin@example.com',
        organizationName: 'Acme Corp',
        passwordHash,
      },
    });

    workspace = await prisma.workspace.create({
      data: {
        name: 'Acme Corp Workspace',
        slug: 'acme-corp',
        ownerId: superAdminUser.id,
      },
    });
  }

  const workspaceId = workspace.id;

  // 2. Super Admin User
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: { passwordHash, organizationName: 'Acme Corp' },
    create: {
      name: 'Super Admin User',
      email: 'superadmin@example.com',
      organizationName: 'Acme Corp',
      passwordHash,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: superAdmin.id,
        workspaceId,
      },
    },
    update: { role: 'super_admin' },
    create: {
      userId: superAdmin.id,
      workspaceId,
      role: 'super_admin',
    },
  });

  // 3. Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash, organizationName: 'Acme Corp' },
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      organizationName: 'Acme Corp',
      passwordHash,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: admin.id,
        workspaceId,
      },
    },
    update: { role: 'admin' },
    create: {
      userId: admin.id,
      workspaceId,
      role: 'admin',
    },
  });

  // 4. Reviewer User
  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@example.com' },
    update: { passwordHash, organizationName: 'Acme Corp' },
    create: {
      name: 'Reviewer User',
      email: 'reviewer@example.com',
      organizationName: 'Acme Corp',
      passwordHash,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: reviewer.id,
        workspaceId,
      },
    },
    update: { role: 'reviewer' },
    create: {
      userId: reviewer.id,
      workspaceId,
      role: 'reviewer',
    },
  });

  // 5. Seed Sample Candidates linked to workspace
  const candidate1 = await prisma.candidate.upsert({
    where: { id: 1 },
    update: {
      workspaceId,
      assignedReviewerId: reviewer.id,
      status: 'completed',
    },
    create: {
      id: 1,
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      board: 'CBSE',
      grade10: '94%',
      grade12: '96%',
      gpa: '3.9/4.0',
      degree: 'B.Tech Computer Science',
      status: 'completed',
      summary: 'Strong background in algorithms, distributed systems, and technical problem solving.',
      activities: ['Coding Club President', 'Hackathon Winner'],
      achievements: ['Gold Medalist in Algorithmic Challenge'],
      strengths: ['Problem Solving', 'System Architecture', 'Communication'],
      growthAreas: ['Frontend Polish'],
      skills: ['TypeScript', 'Node.js', 'React', 'MySQL', 'Redis'],
      workspaceId,
      assignedReviewerId: reviewer.id,
    },
  });

  const candidate2 = await prisma.candidate.upsert({
    where: { id: 2 },
    update: {
      workspaceId,
      assignedReviewerId: reviewer.id,
      status: 'reviewed',
    },
    create: {
      id: 2,
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      board: 'ICSE',
      grade10: '96%',
      grade12: '98%',
      gpa: '4.0/4.0',
      degree: 'B.S. Data Science & AI',
      status: 'reviewed',
      summary: 'Exceptional academic profile with deep interest in machine learning and data engineering.',
      activities: ['AI Research Fellow', 'Math Olympiad Team Lead'],
      achievements: ['National Merit Scholar'],
      strengths: ['Data Analysis', 'Python', 'Machine Learning', 'Leadership'],
      growthAreas: ['DevOps Tools'],
      skills: ['Python', 'PyTorch', 'SQL', 'Scikit-Learn'],
      workspaceId,
      assignedReviewerId: reviewer.id,
    },
  });

  const candidate3 = await prisma.candidate.upsert({
    where: { id: 3 },
    update: {
      workspaceId,
      assignedReviewerId: admin.id,
      status: 'pending',
    },
    create: {
      id: 3,
      name: 'Michael Scott',
      email: 'michael.scott@example.com',
      board: 'State Board',
      grade10: '88%',
      grade12: '90%',
      gpa: '3.6/4.0',
      degree: 'B.E. Software Engineering',
      status: 'pending',
      summary: 'Motivated software engineer with experience building web applications and REST APIs.',
      activities: ['Open Source Contributor'],
      achievements: ['Dean List Honor Student'],
      strengths: ['Full Stack Development', 'Teamwork'],
      growthAreas: ['Database Indexing'],
      skills: ['JavaScript', 'Express', 'HTML/CSS'],
      workspaceId,
      assignedReviewerId: admin.id,
    },
  });

  // Seed sample transcript analysis for Candidate 1 to show complete evaluation
  await prisma.transcriptAnalysis.upsert({
    where: { id: 1 },
    update: { summary: 'Alex Rivera demonstrated strong expertise in system design and backend scalability.' },
    create: {
      id: 1,
      candidateId: candidate1.id,
      botId: 'demo-bot-101',
      recordingId: 'rec-101',
      transcriptId: 'tr-101',
      transcriptText: 'Interviewer: Tell me about a complex project you built. Candidate: I built a high-throughput queue system using Redis and BullMQ.',
      summary: 'Alex Rivera demonstrated strong expertise in system design, BullMQ job queueing, and backend scalability. Great communicator.',
      questionsAsked: [
        'Tell me about a complex project you built.',
        'How do you handle background queue retries in Redis?',
        'How do you handle multi-tenant isolation?'
      ],
      questionAnswerPairs: [
        {
          question: 'Tell me about a complex project you built.',
          answer: 'I built an automated interview evaluation system using Express, BullMQ, and Gemini AI for transcript analysis.'
        },
        {
          question: 'How do you handle background queue retries in Redis?',
          answer: 'Using exponential backoff strategies and fallback handlers for high availability.'
        }
      ],
    },
  });

  // 6. Link all existing users to the workspace so any logged-in user can view candidates
  const allUsers = await prisma.user.findMany();
  for (const u of allUsers) {
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { userId: u.id, workspaceId },
    });
    if (!existingMember) {
      await prisma.workspaceMember.create({
        data: {
          userId: u.id,
          workspaceId,
          role: 'admin',
        },
      });
    }
  }

  console.log('✅ Demo users and candidate records seeded successfully!');
  console.log('----------------------------------------------------');
  console.log('Workspace ID:', workspaceId);
  console.log('Super Admin : superadmin@example.com / Password123!');
  console.log('Admin       : admin@example.com      / Password123!');
  console.log('Reviewer    : reviewer@example.com   / Password123!');
  console.log('Candidates  : 3 sample candidates seeded (Alex Rivera, Sarah Chen, Michael Scott)');
  console.log('----------------------------------------------------');
}

seed()
  .catch((err) => {
    console.error('❌ Error seeding demo data:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
