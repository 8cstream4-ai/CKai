import test from 'node:test';
import assert from 'node:assert/strict';
import { parseApkIdentity } from '../scripts/verify-apk-upgrade.mjs';
const cert='fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c';
test('APK : sortie réelle apksigner 37 V2 Signer et aapt2',()=>{
  assert.deepEqual(parseApkIdentity('V2 Signer: certificate SHA-256 digest: '+cert,"package: name='app.ckai.privateassistant' versionCode='5' versionName='0.4.1'"),{certificate:cert,package:'app.ckai.privateassistant',version:5});
});
test('APK : accepte les préfixes de signataire et l’ordre des attributs sans perdre le certificat',()=>{
  const value=parseApkIdentity('Signer #1 certificate SHA-256 digest: '+cert+'\nV3 Signer: certificate SHA-256 digest: '+cert,"package: name='app.ckai.privateassistant' versionName='0.5.0' versionCode='6'");
  assert.equal(value.certificate,cert);assert.equal(value.version,6);
});
test('APK : refuse un certificat ou manifeste incomplet',()=>{
  assert.throws(()=>parseApkIdentity('SHA-256 public key digest: '+cert,"package: name='app.ckai.privateassistant' versionCode='6'"));
  assert.throws(()=>parseApkIdentity('V2 Signer: certificate SHA-256 digest: 1234',"package: name='app.ckai.privateassistant' versionCode='6'"));
});
