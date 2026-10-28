import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
const sdk=process.env.ANDROID_SDK_ROOT||process.env.ANDROID_HOME;
if(!sdk)throw new Error('Android SDK unavailable');
const tools=(await readdir(join(sdk,'build-tools'))).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).at(-1);
const directory=join(sdk,'build-tools',tools);
function run(binary,args){const result=spawnSync(join(directory,binary),args,{encoding:'utf8'});if(result.status!==0)throw new Error(binary+' failed: '+result.stderr);return result.stdout;}
const paths=['artifacts/upgrade-baseline/CKai-test.apk','artifacts/CKai-test.apk'];
const info=paths.map(path=>{
  const signature=run('apksigner',['verify','--print-certs',path]);
  const certificate=/Signer #1 certificate SHA-256 digest: ([a-f0-9]+)/i.exec(signature)?.[1];
  const manifest=run('aapt2',['dump','badging',path]);
  const name=/package: name='([^']+)' versionCode='(\d+)'/.exec(manifest);
  if(!certificate||!name)throw new Error('APK identity could not be verified');
  return {certificate,package:name[1],version:Number(name[2])};
});
if(info[0].certificate!==info[1].certificate||info[0].package!==info[1].package||info[1].version<=info[0].version)throw new Error('The new APK is not a compatible update');
console.log('APK update identity verified: same package and signing certificate, versionCode '+info[0].version+' -> '+info[1].version+'.');
