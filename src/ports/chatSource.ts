import type { RawChat } from '../types.js';

export interface ChatSource {
  getRecentChats(limit?: number): Promise<RawChat[]>;
}
