import * as session from './session.js';
import type { ChatSource } from '../ports/chatSource.js';

export interface AppDeps {
  chatSource: ChatSource;
  whatsapp: typeof session;
}

export function createWhatsApp(whatsapp: typeof session): AppDeps {
  const chatSource: ChatSource = {
    getRecentChats: (limit) => whatsapp.getRecentChats(limit)
  };
  return { chatSource, whatsapp };
}

let defaultDeps: AppDeps | null = null;

export function getAppDeps(): AppDeps {
  if (!defaultDeps) {
    defaultDeps = createWhatsApp(session);
  }
  return defaultDeps;
}
