import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { createChatTransport, createBasicTools, createSecretStore, providers, publicError } from '../../src/ai/index.ts';
import { conversationContext } from '../../src/ai/context.ts';
import { db, defaults, insertMessage, listChats, loadMessages, loadPreferences, saveMessage, savePreferences, type Chat, type Preferences, type StoredMessage } from './storage';
import bootstrap from '../_private/bootstrap.json';

interface Activity { text: string; completed: boolean; }
interface Runtime {
  ready: boolean; startupError: string | null; preferences: Preferences; chats: Chat[];
  current: Chat | null; messages: StoredMessage[]; busy: boolean; activity: Activity[];
  setPreferences(patch: Partial<Preferences>): Promise<void>;
  openChat(chat: Chat | null): Promise<void>; deleteChat(id: string): Promise<void>;
  send(text: string): Promise<boolean>; stop(): void; retry(id: string): Promise<void>;
  setKey(value: string): Promise<void>; testKey(candidate?: string): Promise<string>; restart(): void;
}
const Context = createContext<Runtime | null>(null);
export function useRuntime(): Runtime {
  const runtime = useContext(Context); if (!runtime) throw new Error('CKai runtime unavailable'); return runtime;
}
const secrets = createSecretStore(SecureStore, 'local');
const transport = createChatTransport({ secrets, fetch: expoFetch as typeof globalThis.fetch });

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false); const [startupError, setStartupError] = useState<string | null>(null);
  const [preferences, setPreferencesState] = useState<Preferences>({ ...defaults });
  const [chats, setChats] = useState<Chat[]>([]); const [current, setCurrent] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]); const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState<Activity[]>([]); const [boot, setBoot] = useState(0);
  const running = useRef<AbortController | null>(null); const mounted = useRef(true);
  const preferencesSnapshot = useRef<Preferences>({ ...defaults });
  const settingsQueue = useRef<Promise<void>>(Promise.resolve());
  const messageSnapshot = useRef(messages); messageSnapshot.current = messages;
  const currentSnapshot = useRef(current); currentSnapshot.current = current;
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const enqueueSave = (message: StoredMessage) => {
    const snapshot = { ...message };
    const job = writeQueue.current.then(() => saveMessage(snapshot));
    writeQueue.current = job.catch(() => {}); return job;
  };
  useEffect(() => {
    let disposed = false; mounted.current = true;
    void (async () => {
      try {
        setStartupError(null); setReady(false);
        const settings = await loadPreferences();
        if (!(await secrets.get('groq')) && bootstrap.groq) await secrets.set('groq', bootstrap.groq);
        const history = await listChats();
        if (!disposed) { preferencesSnapshot.current = settings; setPreferencesState(settings); setChats(history); setReady(true); }
      } catch { if (!disposed) setStartupError('Impossible d’ouvrir les données locales ou le stockage sécurisé.'); }
    })();
    return () => { disposed = true; mounted.current = false; running.current?.abort(); };
  }, [boot]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        const pending = messageSnapshot.current.findLast(message => message.state === 'streaming');
        if (pending) void enqueueSave(pending).catch(() => {});
      }
    });
    return () => listener.remove();
  }, []);
  const refreshChats = async () => { const result = await listChats(); if (mounted.current) setChats(result); };
  async function setPreferences(patch: Partial<Preferences>) {
    const job = settingsQueue.current.then(async () => {
      const next = { ...preferencesSnapshot.current, ...patch };
      await savePreferences(next); preferencesSnapshot.current = next; setPreferencesState(next);
    });
    settingsQueue.current = job.catch(() => {}); await job;
  }
  async function openChat(chat: Chat | null) {
    if (running.current) { Alert.alert('Réponse en cours', 'Arrête la réponse avant de changer de conversation.'); return; }
    try {
      await writeQueue.current;
      const history = chat ? await loadMessages(chat.id) : [];
      setMessages(history); setCurrent(chat); setActivity([]);
    } catch { Alert.alert('Stockage', 'Impossible de charger cette conversation.'); }
  }
  async function generate(chat: Chat, history: StoredMessage[], controller: AbortController) {
    const assistant: StoredMessage = { id: randomUUID(), chatId: chat.id, role: 'assistant', content: '', state: 'streaming', error: null, createdAt: Date.now() };
    let renderTimer: ReturnType<typeof setTimeout> | undefined;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let persistenceFailed = false;
    const draw = () => {
      renderTimer = undefined;
      if (mounted.current) setMessages([...history, { ...assistant }]);
    };
    const save = () => {
      saveTimer = undefined;
      void enqueueSave(assistant).catch(() => { persistenceFailed = true; controller.abort(); });
    };
    try {
      await insertMessage(assistant); draw();
      setActivity([{ text: 'Connexion à Groq', completed: false }]);
      for await (const event of transport.stream({ provider: providers.groq,
        messages: conversationContext(history), level: preferences.level, effort: preferences.effort,
        maxTokens: 4096, signal: controller.signal, tools: createBasicTools(),
      })) {
        if (event.type === 'status') setActivity(items => [
          ...items.map(item => ({ ...item, completed: true })),
          { text: event.stage === 'connecting' ? 'Connexion à Groq' : 'Rédaction de la réponse', completed: false },
        ]);
        if (event.type === 'retry') setActivity(items => [...items, { text: `Nouvelle tentative ${event.attempt}/2`, completed: false }]);
        if (event.type === 'tool-start') setActivity(items => [...items, { text: event.name === 'get_datetime' ? 'Lecture de la date actuelle' : `Outil : ${event.name}`, completed: false }]);
        if (event.type === 'tool-end') setActivity(items => items.map(item => ({ ...item, completed: true })));
        if (event.type === 'text') {
          if (!assistant.content && preferences.haptics) void Haptics.selectionAsync().catch(() => {});
          assistant.content += event.delta;
          if (!renderTimer) renderTimer = setTimeout(draw, 40);
          if (!saveTimer) saveTimer = setTimeout(save, 400);
        }
        if (event.type === 'error') { assistant.state = 'error'; assistant.error = event.message; }
        if (event.type === 'done') {
          assistant.state = event.reason === 'cancelled' ? 'stopped' : 'complete';
          if (event.reason === 'length') assistant.error = 'Limite de réponse atteinte. Tu peux demander de continuer.';
          if (event.reason === 'step-limit') assistant.error = 'Limite des étapes atteinte.';
        }
      }
      if (assistant.state === 'streaming') assistant.state = controller.signal.aborted ? 'stopped' : 'error';
      if (persistenceFailed) assistant.error = 'Stockage indisponible : cette réponse n’a pas pu être sauvegardée.';
    } catch {
      assistant.state = controller.signal.aborted ? 'stopped' : 'error';
      assistant.error = 'La réponse n’a pas pu être terminée. Réessaie ou vérifie les réglages.';
    } finally {
      if (renderTimer) clearTimeout(renderTimer); if (saveTimer) clearTimeout(saveTimer);
      draw();
      try { await enqueueSave(assistant); } catch { Alert.alert('Stockage', 'La dernière réponse n’a pas pu être sauvegardée.'); }
      if (mounted.current) { setActivity(items => items.map(item => ({ ...item, completed: true }))); setBusy(false); }
      if (running.current === controller) running.current = null;
      if (preferences.haptics) void Haptics.selectionAsync().catch(() => {});
    }
  }
  async function send(text: string): Promise<boolean> {
    const cleaned = text.trim();
    if (!cleaned || running.current) return false;
    if (cleaned.length > 9000) { Alert.alert('Message trop long', 'Limite actuelle : 9 000 caractères par message.'); return false; }
    const controller = new AbortController(); running.current = controller; setBusy(true);
    let launched = false;
    try {
      let chat = currentSnapshot.current;
      if (!chat) {
        chat = { id: randomUUID(), title: cleaned.slice(0, 50), updatedAt: Date.now() };
        await (await db()).runAsync('INSERT INTO conversations(id,title,updatedAt) VALUES (?,?,?)', chat.id, chat.title, chat.updatedAt);
        setCurrent(chat); currentSnapshot.current = chat;
      }
      const user: StoredMessage = { id: randomUUID(), chatId: chat.id, role: 'user', content: cleaned, state: 'complete', error: null, createdAt: Date.now() };
      await insertMessage(user);
      await (await db()).runAsync('UPDATE conversations SET updatedAt=? WHERE id=?', Date.now(), chat.id);
      const history = [...messageSnapshot.current, user]; setMessages(history);
      await refreshChats(); launched = true;
      void generate(chat, history, controller); return true;
    } catch { Alert.alert('Envoi impossible', 'Vérifie l’espace de stockage, puis réessaie.'); return false; }
    finally { if (!launched) { running.current = null; setBusy(false); } }
  }
  async function retry(id: string) {
    if (running.current || !currentSnapshot.current) return;
    const index = messageSnapshot.current.findIndex(message => message.id === id);
    if (index < 0 || messageSnapshot.current[index]?.role !== 'assistant') return;
    // Keep a full conversation when retrying an old answer; only the latest answer is regenerated.
    if (index !== messageSnapshot.current.length - 1) {
      Alert.alert('Réponse antérieure', 'La régénération est disponible sur la dernière réponse.'); return;
    }
    const controller = new AbortController(); running.current = controller; setBusy(true);
    try {
      await writeQueue.current;
      await (await db()).runAsync('DELETE FROM messages WHERE id=?', id);
      const history = messageSnapshot.current.slice(0, index); setMessages(history);
      void generate(currentSnapshot.current, history, controller);
    } catch { running.current = null; setBusy(false); Alert.alert('Impossible de réessayer', 'La conversation n’a pas pu être modifiée.'); }
  }
  async function deleteChat(id: string) {
    if (running.current) return;
    await (await db()).runAsync('DELETE FROM conversations WHERE id=?', id);
    if (currentSnapshot.current?.id === id) await openChat(null);
    await refreshChats();
  }
  const value: Runtime = {
    ready, startupError, preferences, chats, current, messages, busy, activity, setPreferences,
    openChat, deleteChat, send, retry, stop: () => running.current?.abort(),
    async setKey(value) { await secrets.set('groq', value); },
    async testKey(candidate) {
      try {
        const selected = candidate?.trim();
        const tester = createChatTransport({
          fetch: expoFetch as typeof globalThis.fetch,
          timeoutMs: 15_000,
          secrets: selected ? { ...secrets, async get() { return selected; } } : secrets,
        });
        const models = await tester.listModels(providers.groq);
        if (selected) await secrets.set('groq', selected);
        return models.includes('openai/gpt-oss-120b') ? 'Clé reconnue. GPT-OSS 120B est disponible.' : 'Clé reconnue, mais GPT-OSS 120B n’apparaît pas dans ton catalogue.';
      } catch (error) { throw new Error(publicError(error, 'fr').message); }
    },
    restart: () => setBoot(value => value + 1),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
