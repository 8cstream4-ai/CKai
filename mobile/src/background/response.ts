import { AppRegistry, AppState, PermissionsAndroid, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { createBackgroundJobs, type BackgroundJob } from '../../../src/ai/background-jobs.ts';

interface NativeBackground {
  start(jobId: string, chatId: string, test: boolean): Promise<void>;
  update(jobId: string, stage: string): void;
  finish(jobId: string, status: string, show: boolean): Promise<void>;
  canNotify(): boolean;
  addListener(name: 'onStop', callback: (event: { jobId: string; reason: string }) => void): { remove(): void };
}
const native = Platform.OS === 'android' ? requireOptionalNativeModule<NativeBackground>('CKaiBackground') : null;
const jobs = createBackgroundJobs();
let stopListener: { remove(): void } | null = null;
let probe: BackgroundJob | null = null;
AppRegistry.registerHeadlessTask('CKaiReplyKeepAlive', () => async (data: { jobId?: string }) => {
  // Never replay a request after a process death: an unknown job ends immediately.
  if (data.jobId) await jobs.wait(data.jobId);
});
export function backgroundNotificationsAllowed(): boolean { try { return native?.canNotify() ?? false; } catch { return false; } }
export interface BackgroundHandle { job: BackgroundJob; lastStage: string; lastUpdate: number; }
export async function ensureNotificationPermission(explicit = false): Promise<boolean> {
  if (!native) return false;
  if (Number(Platform.Version) >= 33) {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!await PermissionsAndroid.check(permission)) {
      const asked = await SecureStore.getItemAsync('ckai.notifications.asked');
      if (explicit || !asked) {
        await SecureStore.setItemAsync('ckai.notifications.asked', '1');
        await PermissionsAndroid.request(permission, { title: 'Notifications CKai',
          message: 'Pour recevoir la fin de ta réponse quand tu utilises une autre application.', buttonPositive: 'Autoriser', buttonNegative: 'Plus tard' });
      }
    }
  }
  return native.canNotify();
}
export async function beginBackgroundResponse(jobId: string, chatId: string, controller: AbortController, test = false): Promise<BackgroundHandle | null> {
  if (!native) return null;
  if (!test && probe) { probe.controller.abort(); await probe.done; }
  if (AppState.currentState !== 'active') return null;
  await ensureNotificationPermission(test);
  controller.signal.throwIfAborted();
  if (!stopListener) stopListener = native.addListener('onStop', event => jobs.cancel(event.jobId, event.reason));
  const job = jobs.start(jobId, controller);
  if (test) probe = job;
  try {
    await native.start(jobId, chatId, test);
    return { job, lastStage: '', lastUpdate: 0 };
  } catch (error) {
    job.finish(); if (probe === job) probe = null;
    throw error;
  }
}
export function updateBackgroundStage(handle: BackgroundHandle | null, stage: string) {
  if (!handle || !native) return;
  const label = stage.split(':')[0]!.slice(0, 70);
  if (label === handle.lastStage || Date.now() - handle.lastUpdate < 1200) return;
  handle.lastStage = label; handle.lastUpdate = Date.now();
  try { native.update(handle.job.id, label); } catch { /* A notification update must not interrupt inference. */ }
}
export async function finishBackgroundResponse(handle: BackgroundHandle | null, status: string, show = AppState.currentState !== 'active') {
  if (!handle || !native) return;
  try { await native.finish(handle.job.id, status, show); }
  finally {
    handle.job.finish(); if (probe === handle.job) probe = null;
    if (!jobs.size) { stopListener?.remove(); stopListener = null; }
  }
}
export async function testBackgroundNotifications(chatId = ''): Promise<void> {
  if (jobs.size) throw new Error('Attends la fin de la réponse en cours.');
  if (!await ensureNotificationPermission(true)) throw new Error('Autorise les notifications dans les réglages Android, puis réessaie.');
  const controller = new AbortController();
  const handle = await beginBackgroundResponse('notification-test-' + randomUUID(), chatId, controller, true);
  if (!handle) throw new Error('Cette fonction nécessite le nouvel APK Android.');
  let stopped = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', abort); reject(controller.signal.reason); };
      const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(); }, 10000);
      controller.signal.addEventListener('abort', abort, { once: true });
      if (controller.signal.aborted) abort();
    });
  } catch { stopped = true; }
  finally { await finishBackgroundResponse(handle, stopped ? 'stopped' : 'complete', !stopped); }
}
