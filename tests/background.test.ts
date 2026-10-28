import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackgroundJobs } from '../src/ai/background-jobs.ts';
test('Arrière-plan : conserve la tâche tant que la réponse et sa sauvegarde ne sont pas terminées',async()=>{
  const jobs=createBackgroundJobs();const controller=new AbortController();const job=jobs.start('reply',controller);
  let completed=false;void jobs.wait('reply').then(()=>{completed=true;});await Promise.resolve();assert.equal(completed,false);
  jobs.cancel('reply');assert.equal(controller.signal.aborted,true);await Promise.resolve();assert.equal(completed,false);
  job.finish();await job.done;assert.equal(completed,true);assert.equal(jobs.size,0);
});
test('Arrière-plan : une ancienne action Arrêter ne touche pas la nouvelle réponse',()=>{
  const jobs=createBackgroundJobs();const old=jobs.start('old',new AbortController());old.finish();const current=jobs.start('new',new AbortController());
  jobs.cancel('old');assert.equal(current.controller.signal.aborted,false);current.finish();
});
test('Arrière-plan : pas de relance d’une requête inconnue après destruction du processus',async()=>{
  const jobs=createBackgroundJobs();await jobs.wait('unknown');assert.equal(jobs.size,0);
});
test('Arrière-plan : doublons refusés et fin idempotente',async()=>{
  const jobs=createBackgroundJobs();const job=jobs.start('reply',new AbortController());assert.throws(()=>jobs.start('reply',new AbortController()));
  job.finish();job.finish();await job.done;assert.equal(jobs.size,0);
});
test('Arrière-plan : une tâche ne termine pas une autre tâche',async()=>{
  const jobs=createBackgroundJobs();const a=jobs.start('a',new AbortController());const b=jobs.start('b',new AbortController());
  let done=false;void b.done.then(()=>{done=true;});a.finish();await Promise.resolve();assert.equal(done,false);assert.equal(jobs.size,1);b.finish();await b.done;
});
