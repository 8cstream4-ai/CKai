import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { RichMessage } from './features/attachments';
import type { Effort, Level } from '../../src/ai/types.ts';

export interface Preferences {
  name: string;
  theme: 'dark' | 'light' | 'amoled';
  level: Level;
  effort: Exclude<Effort, 'aucune'>;
  haptics: boolean;
  animations: 'reduced' | 'normal' | 'max';
  web: 'off' | 'auto' | 'on';
  visionModel: string;
  instructions: string;
  memory: boolean;
}
export const defaults: Preferences = { name: '', theme: 'dark', level: 'fort', effort: 'moyenne', haptics: true, animations: 'normal', web: 'auto', visionModel: 'qwen/qwen3.8-27b', instructions: '', memory: true };
export interface Chat { id: string; title: string; updatedAt: number; }
export interface StoredMessage {
  id: string; chatId: string; role: 'user' | 'assistant'; content: string;
  state: 'complete' | 'streaming' | 'stopped' | 'error' | 'interrupted';
  error: string | null; createdAt: number; rich?: RichMessage;
}

let database: Promise<SQLiteDatabase> | undefined;
export async function db(): Promise<SQLiteDatabase> {
  if (!database) database = (async () => {
    const connection = await openDatabaseAsync('ckai.db');
    await connection.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, updatedAt INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL, chatId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user','assistant')), content TEXT NOT NULL,
        state TEXT NOT NULL, error TEXT, createdAt INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS messages_chat ON messages(chatId, createdAt);
      CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY NOT NULL, fact TEXT NOT NULL, createdAt INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS summaries (chatId TEXT PRIMARY KEY NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, content TEXT NOT NULL, throughId TEXT NOT NULL);
      `);
    const columns = await connection.getAllAsync<{ name: string }>('PRAGMA table_info(messages)');
    if (!columns.some(column => column.name === 'rich')) await connection.execAsync("ALTER TABLE messages ADD COLUMN rich TEXT NOT NULL DEFAULT '{}'");
    await connection.execAsync('PRAGMA user_version = 2');
    await connection.runAsync("UPDATE messages SET state='interrupted' WHERE state='streaming'");
    return connection;
  })().catch(error => { database = undefined; throw error; });
  return database;
}
export async function loadPreferences(): Promise<Preferences> {
  const row = await (await db()).getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE id=1');
  if (!row) return { ...defaults };
  try {
    const value = JSON.parse(row.value) as Partial<Preferences>;
    return {
      name: typeof value.name === 'string' ? value.name.slice(0, 40) : '',
      theme: ['dark', 'light', 'amoled'].includes(value.theme ?? '') ? value.theme! : 'dark',
      level: ['auto', 'faible', 'moyen', 'fort'].includes(value.level ?? '') ? value.level! : 'fort',
      effort: ['courte', 'moyenne', 'profonde'].includes(value.effort ?? '') ? value.effort! : 'moyenne',
      haptics: typeof value.haptics === 'boolean' ? value.haptics : true,
      animations: ['reduced', 'normal', 'max'].includes(value.animations ?? '') ? value.animations! : 'normal',
      web: ['off', 'auto', 'on'].includes(value.web ?? '') ? value.web! : 'auto',
      visionModel: typeof value.visionModel === 'string' && value.visionModel.trim() ? value.visionModel.trim().slice(0, 150) : defaults.visionModel,
      instructions: typeof value.instructions === 'string' ? value.instructions.slice(0, 6000) : '',
      memory: typeof value.memory === 'boolean' ? value.memory : true,
    };
  } catch { return { ...defaults }; }
}
export async function savePreferences(value: Preferences) {
  await (await db()).runAsync('INSERT OR REPLACE INTO settings(id,value) VALUES (1,?)', JSON.stringify(value));
}
export async function listChats(): Promise<Chat[]> {
  return (await db()).getAllAsync<Chat>('SELECT * FROM conversations ORDER BY updatedAt DESC');
}
export async function loadMessages(chatId: string): Promise<StoredMessage[]> {
  const rows = await (await db()).getAllAsync<Omit<StoredMessage, 'rich'> & { rich: string }>('SELECT * FROM messages WHERE chatId=? ORDER BY createdAt, rowid', chatId);
  return rows.map(row => { let rich: RichMessage = {}; try { rich = JSON.parse(row.rich); } catch {} return { ...row, rich }; });
}
export async function insertMessage(message: StoredMessage) {
  await (await db()).runAsync('INSERT INTO messages(id,chatId,role,content,state,error,createdAt,rich) VALUES (?,?,?,?,?,?,?,?)',
    message.id, message.chatId, message.role, message.content, message.state, message.error, message.createdAt, JSON.stringify(message.rich ?? {}));
}
export async function saveMessage(message: StoredMessage) {
  await (await db()).runAsync('UPDATE messages SET content=?,state=?,error=?,rich=? WHERE id=?',
    message.content, message.state, message.error, JSON.stringify(message.rich ?? {}), message.id);
}
