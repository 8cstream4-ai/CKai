export interface BackgroundJob {
  id: string; controller: AbortController; done: Promise<void>; finish(): void;
}
/** Retains work independently of React mounts; completing a job releases its headless task. */
export function createBackgroundJobs() {
  const jobs = new Map<string, BackgroundJob>();
  return {
    start(id: string, controller: AbortController): BackgroundJob {
      if (!id || jobs.has(id)) throw new Error('Duplicate or empty background job');
      let resolve!: () => void;
      const done = new Promise<void>(complete => { resolve = complete; });
      let finished = false;
      const job: BackgroundJob = { id, controller, done, finish() {
        if (finished) return; finished = true; jobs.delete(id); resolve();
      } };
      jobs.set(id, job); return job;
    },
    wait(id: string): Promise<void> { return jobs.get(id)?.done ?? Promise.resolve(); },
    cancel(id: string, reason = 'user'): void {
      jobs.get(id)?.controller.abort(new Error(reason === 'timeout' ? 'Délai de réponse dépassé.' : 'Réponse arrêtée.'));
    },
    get size() { return jobs.size; },
  };
}
