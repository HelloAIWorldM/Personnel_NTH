import * as dotenv from 'dotenv';
dotenv.config();

import { onRequest } from 'firebase-functions/v2/https';
import app from './app';

/**
 * Cloud Function Entrypoint for API
 * Endpoint: https://us-central1-sapxepnhansunth.cloudfunctions.net/api
 * Hoặc qua Firebase Hosting Rewrite: https://sapxepnhansunth.web.app/api/**
 */
export const api = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  app
);
