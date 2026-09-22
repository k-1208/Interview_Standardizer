import { ServiceBusClient } from '@azure/service-bus';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING;

export const SERVICE_BUS_QUEUE_NAME =
  process.env.SERVICE_BUS_QUEUE_NAME || 'pdf-processing';

export const SERVICE_BUS_EMAIL_QUEUE_NAME =
  process.env.SERVICE_BUS_EMAIL_QUEUE_NAME || 'email-dispatch';

if (!connectionString) {
  throw new Error(
    'SERVICE_BUS_CONNECTION_STRING is not configured. Set it in backend/.env.'
  );
}

export const serviceBusClient = new ServiceBusClient(connectionString);
