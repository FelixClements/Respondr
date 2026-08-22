import type { RawChat } from '../types.js';
import type { ChatSource } from '../ports/chatSource.js';

export class FakeChatSource implements ChatSource {
  constructor(private readonly chats: RawChat[]) {}

  async getRecentChats(limit = 50): Promise<RawChat[]> {
    return this.chats.slice(0, limit);
  }
}
