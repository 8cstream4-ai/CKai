import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import reader from '../../_private/reader.json';
interface Request { id: string; type: string; data: string; }
interface Result { text: string; truncated: boolean; pages: number; }
const Context = createContext<((type: string, data: string) => Promise<Result>) | null>(null);
export function useDocumentReader() { const value = useContext(Context); if (!value) throw new Error('Lecteur indisponible.'); return value; }
export function DocumentReaderProvider({ children }: { children: ReactNode }) {
  const web = useRef<WebView>(null); const [request, setRequest] = useState<Request | null>(null); const [ready, setReady] = useState(false);
  const pending = useRef<{ resolve(value: Result): void; reject(error: Error): void } | null>(null);
  const finish = (error?: string, result?: Result) => { const job = pending.current; pending.current = null; setRequest(null); if (error) job?.reject(new Error(error)); else if (result) job?.resolve(result); };
  useEffect(() => {
    if (!request) return;
    const timer = setTimeout(() => finish('Lecture trop longue. Essaie un fichier plus petit.'), 60000);
    return () => clearTimeout(timer);
  }, [request]);
  useEffect(() => {
    if (ready && request) web.current?.injectJavaScript(`window.ckaiRead(${JSON.stringify(request)});true;`);
  }, [ready, request]);
  useEffect(() => () => { pending.current?.reject(new Error('Lecture interrompue.')); pending.current = null; }, []);
  return <Context.Provider value={(type, data) => new Promise((resolve, reject) => {
    if (pending.current) { reject(new Error('Un document est déjà en cours de lecture.')); return; }
    pending.current = { resolve, reject }; setRequest({ id: String(Date.now()), type, data });
  })}>{children}<View style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <WebView ref={web} source={{ html: reader.html, baseUrl: 'https://ckai.invalid/' }} originWhitelist={['*']} javaScriptEnabled domStorageEnabled={false} mixedContentMode="never" allowFileAccess={false}
      onShouldStartLoadWithRequest={navigation => navigation.url === 'about:blank' || navigation.url === 'https://ckai.invalid/'}
      onMessage={event => { try {
        const result = JSON.parse(event.nativeEvent.data); if (result.ready) { setReady(true); return; }
        if (!request || result.id !== request.id) return;
        if (result.error) finish(String(result.error)); else if (typeof result.text === 'string') finish(undefined, { text: result.text.slice(0, 200000), truncated: !!result.truncated, pages: Number(result.pages) || 0 });
      } catch { finish('Réponse du lecteur invalide.'); } }} onError={() => { setReady(false); finish('Le lecteur de documents n’a pas pu démarrer.'); }} onRenderProcessGone={() => { setReady(false); finish('Le lecteur a été arrêté par Android. Réouvre CKai.'); }} />
  </View></Context.Provider>;
}
