import dotenv from 'dotenv';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client.js';

dotenv.config();

const dbHost = process.env.DATABASE_HOST || process.env.DB_HOST;
const dbUser = process.env.DATABASE_USER || process.env.DB_USER;
const dbPassword = process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD;
const dbName = process.env.DATABASE_NAME || process.env.DB_NAME;
const dbPort = parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '3306', 10);

const missingEnvVars = [
	!dbHost ? 'DATABASE_HOST' : null,
	!dbUser ? 'DATABASE_USER' : null,
	!dbPassword ? 'DATABASE_PASSWORD' : null,
	!dbName ? 'DATABASE_NAME' : null,
].filter(Boolean);

if (missingEnvVars.length > 0) {
	throw new Error(
		`Missing required database environment variables: ${missingEnvVars.join(', ')}. ` +
			'Please check backend .env configuration.'
	);
}

const adapter = new PrismaMariaDb({
  host: dbHost!,
  port: dbPort,
  user: dbUser!,
  password: dbPassword!,
  database: dbName!,
  connectionLimit: 5,
  connectTimeout: 10000,
  allowPublicKeyRetrieval: true
});

const prisma = new PrismaClient({ adapter });

export { prisma };