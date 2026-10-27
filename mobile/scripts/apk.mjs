import { spawnSync } from 'node:child_process';
import { mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const command = (file, args, cwd = root) => {
  const result = spawnSync(file, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
command('npm', ['run', 'provision']);
command('npm', ['run', 'typecheck']);
command('npx', ['expo', 'install', '--check']);
command('npx', ['expo', 'prebuild', '--platform', 'android']);
// Release mode bundles JavaScript and assets; the phone does not need Metro.
command(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleRelease'], resolve(root, 'android'));
const destination = resolve(root, '../artifacts');
await mkdir(destination, { recursive: true });
await copyFile(resolve(root, 'android/app/build/outputs/apk/release/app-release.apk'), resolve(destination, 'CKai-test.apk'));
console.log('APK produit : artifacts/CKai-test.apk');
