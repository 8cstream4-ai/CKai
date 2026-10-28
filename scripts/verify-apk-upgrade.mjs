import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseApkIdentity(signature, manifest) {
  const certificates=[...signature.matchAll(/certificate SHA-256 digest:\s*([a-f0-9:]+)/ig)].map(match=>match[1].replace(/:/g,'').toLowerCase());
  const unique=[...new Set(certificates)].sort();
  const name=/package:\s*name='([^']+)'/.exec(manifest)?.[1];
  const version=/\bversionCode='(\d+)'/.exec(manifest)?.[1];
  if(!unique.length||unique.some(value=>value.length!==64)||!name||!version)throw new Error('APK identity metadata is incomplete');
  return {certificate:unique.join(','),package:name,version:Number(version)};
}
export async function verifyUpdate() {
  const sdk=process.env.ANDROID_SDK_ROOT||process.env.ANDROID_HOME;
  if(!sdk)throw new Error('Android SDK unavailable');
  const tools=(await readdir(join(sdk,'build-tools'))).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).at(-1);
  const directory=join(sdk,'build-tools',tools);
  function run(binary,args){const result=spawnSync(join(directory,binary),args,{encoding:'utf8'});if(result.status!==0)throw new Error(binary+' failed: '+result.stderr);return result.stdout;}
  const path=process.argv[2]||'artifacts/CKai-test.apk';
  const signature=run('apksigner',['verify','--print-certs',path]);
  const manifest=run('aapt2',['dump','badging',path]);
  const current=parseApkIdentity(signature,manifest);
  const baseline=JSON.parse(await readFile(new URL('./apk-baseline.json',import.meta.url),'utf8'));
  if(baseline.certificate!==current.certificate||baseline.package!==current.package||current.version<=baseline.version)throw new Error('The new APK is not a compatible update: '+JSON.stringify(current));
  console.log('APK update identity verified: same package and signing certificate, versionCode '+baseline.version+' -> '+current.version+'.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await verifyUpdate();
