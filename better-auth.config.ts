import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { getDb, initDb } from './src/db/index.js';

initDb();

export const auth = betterAuth({
  appName: 'Respondr',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:9595',
  secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-me-in-production-32chars',
  database: getDb(),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 6
  },
  disabledPaths: ['/sign-up/email'],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  plugins: [username({ displayUsername: false })]
});
