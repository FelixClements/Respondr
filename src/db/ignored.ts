import * as chatState from './chatState.js';

export function add(chatId: string, name: string): void {
  chatState.add(chatId, name, 'ignored');
}

export function remove(chatId: string): void {
  chatState.remove(chatId);
}

export function isIgnored(chatId: string): boolean {
  return chatState.isIgnored(chatId);
}

export function list() {
  return chatState.listByState('ignored').map((row) => ({
    id: row.id,
    name: row.name,
    ignored_at: row.created_at
  }));
}
