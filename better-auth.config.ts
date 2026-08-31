import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { getDb, initDb } from './src/db/index.js';

initDb();

const devSecret = process.env.BETTER_AUTH_SECRET || 'dev-secret-change-me-in-production-32chars';

export const auth = betterAuth({
  appName: 'Respondr',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:9595',
  secret: devSecret,
  database: getDb(),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8
  },
  disabledPaths: ['/sign-up/email', '/is-username-available'],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  plugins: [username({ displayUsername: false })]
});
