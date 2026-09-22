import dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

dotenv.config();

const buildConnectionString = (): string => {
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}

	const dbHost = process.env.DATABASE_HOST || process.env.DB_HOST;
	const dbUser = process.env.DATABASE_USER || process.env.DB_USER;
	const dbPassword = process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD;
	const dbName = process.env.DATABASE_NAME || process.env.DB_NAME;
	const dbPort = process.env.DATABASE_PORT || process.env.DB_PORT || '5432';

	const missingEnvVars = [
		!dbHost ? 'DATABASE_HOST' : null,
		!dbUser ? 'DATABASE_USER' : null,
		!dbPassword ? 'DATABASE_PASSWORD' : null,
		!dbName ? 'DATABASE_NAME' : null,
	].filter(Boolean);

	if (missingEnvVars.length > 0) {
		throw new Error(
			`Missing required database environment variables: ${missingEnvVars.join(', ')} or DATABASE_URL. ` +
				'Please check backend .env configuration.'
		);
	}

	const user = encodeURIComponent(dbUser!);
	const password = encodeURIComponent(dbPassword!);
	return `postgresql://${user}:${password}@${dbHost}:${dbPort}/${dbName}`;
};

const rawConnectionString = buildConnectionString();
const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.delete('pgbouncer');
connectionUrl.searchParams.delete('sslmode');
const connectionString = connectionUrl.toString();
const needsSsl = connectionUrl.hostname.includes('supabase');

const pool = new Pool({
	connectionString,
	ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
	max: 5,
	connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };
