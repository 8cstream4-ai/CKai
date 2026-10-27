import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = args => {
  const result = spawnSync('npm', args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, npm_config_cache: resolve(root, '../.cache/npm') } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run(['install', '--fetch-retries=1', '--fetch-timeout=30000']);
const bundled = JSON.parse(await readFile(resolve(root, 'node_modules/expo/bundledNativeModules.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
for (const name of [
  'expo-router', 'expo-dev-client', 'expo-secure-store', 'expo-sqlite', 'expo-crypto',
  'expo-clipboard', 'expo-haptics', 'expo-linear-gradient', 'expo-status-bar',
  'expo-linking', 'expo-constants', 'expo-splash-screen', 'expo-font',
  'react-native-safe-area-context', 'react-native-screens', 'react-native-gesture-handler',
  'expo-document-picker', 'expo-image-picker', 'expo-image-manipulator', 'expo-image', 'expo-video',
  'expo-file-system', 'expo-sharing', 'expo-print', 'expo-web-browser', 'expo-speech', 'expo-blur',
  'react-native-webview', '@shopify/react-native-skia',
  'react-native-reanimated', 'react-native-worklets', '@expo/vector-icons', '@shopify/flash-list',
]) {
  if (!bundled[name]) throw new Error(`Version Expo manquante : ${name}`);
  manifest.dependencies[name] = bundled[name];
}
await writeFile(resolve(root, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
run(['install', '--fetch-retries=1', '--fetch-timeout=30000']);
const bundle = spawnSync(process.execPath, ['scripts/bundle-reader.mjs'], { cwd: root, stdio: 'inherit' });
if (bundle.status !== 0) process.exit(bundle.status ?? 1);
if (process.env.CKAI_SKIP_PROVISION !== '1') {
  const result = spawnSync(process.execPath, ['--env-file-if-exists=../.env.local', 'scripts/provision.mjs'], { cwd: root, stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}
