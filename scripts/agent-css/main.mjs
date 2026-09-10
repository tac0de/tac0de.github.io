import { mkdir, writeFile, readFile, readdir, open, unlink, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { loadCatalog, loadTask, regular, directory, workspacePath, hash, assert, EVALUATOR } from './contracts.mjs';
import { evaluate } from './evaluate.mjs';

export async function prepare(taskId, destination, catalogRoot) {
  const loaded = await loadTask(taskId, catalogRoot);
  const root = await workspacePath(destination);
  await mkdir(root); // No recursive creation and no overwrite of existing work.
  await writeFile(join(root, 'exercise.html'), loaded.html, { flag: 'wx' });
  await writeFile(join(root, 'task.json'), JSON.stringify(loaded.task, null, 2) + '\n', { flag: 'wx' });
  await writeFile(join(root, 'submission.css'), loaded.starter, { flag: 'wx' });
  await mkdir(join(root, 'attempts'));
  await writeFile(join(root, 'workspace.json'), JSON.stringify({ schemaVersion: 1, taskId,
    taskVersion: loaded.task.version, taskHash: loaded.taskHash }, null, 2) + '\n', { flag: 'wx' });
  return { status: 'prepared', workspace: root, taskId, taskVersion: loaded.task.version,
    objective: loaded.task.objective, editable: 'submission.css' };
}

export async function context(destination, catalogRoot) {
  const root = await workspacePath(destination);
  await directory(root);
  const metadata = JSON.parse(await regular(join(root, 'workspace.json'), 4096));
  const fields = Object.keys(metadata).sort().join();
  assert(['schemaVersion,taskHash,taskId,taskVersion','delivery,schemaVersion,taskHash,taskId,taskVersion'].includes(fields) && metadata.schemaVersion === 1, 'invalid-workspace');
  if (metadata.delivery) {
    const d = metadata.delivery;
    assert(Object.keys(d).sort().join() === 'condition,handoffHash,manifestHash,pairId'
      && ['baseline','recall'].includes(d.condition) && /^[\da-f-]{36}$/.test(d.pairId)
      && /^[\da-f]{64}$/.test(d.handoffHash) && /^[\da-f]{64}$/.test(d.manifestHash), 'invalid-delivery');
    assert(hash(await regular(join(root, 'handoff.json'))) === d.handoffHash, 'handoff-changed');
  }
  const loaded = await loadTask(metadata.taskId, catalogRoot);
  assert(metadata.taskVersion === loaded.task.version && metadata.taskHash === loaded.taskHash, 'task-version-mismatch');
  assert((await regular(join(root, 'exercise.html'))) === loaded.html, 'fixed-file-changed');
  assert((await regular(join(root, 'task.json'))) === JSON.stringify(loaded.task, null, 2) + '\n', 'fixed-file-changed');
  await directory(join(root, 'attempts'));
  return { root, ...loaded, delivery: metadata.delivery || null };
}

async function atomicJson(path, data) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
  await rename(temporary, path);
}

export async function check(destination, { chrome, signal, catalogRoot } = {}) {
  const c = await context(destination, catalogRoot);
  const lockPath = join(c.root, '.check.lock');
  const lock = await open(lockPath, 'wx');
  let release = true;
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    // Reload after lock acquisition and snapshot the submission before launching any browser.
    await context(destination, catalogRoot);
    const css = await regular(join(c.root, 'submission.css'), 32768);
    const files = await readdir(join(c.root, 'attempts'));
    assert(files.length <= 2000 && !files.some(file => !/^\d{4}-[\da-f-]{36}\.(?:json|css)$/.test(file)
      || !files.includes(file.replace(/\.(json|css)$/, (_, ext) => ext === 'json' ? '.css' : '.json'))), 'incomplete-attempts');
    const ordinals = files.map(file => Number(file.slice(0, 4)));
    const ordinal = Math.max(0, ...ordinals) + 1;
    assert(ordinal <= 1000, 'attempt-limit');
    const attemptId = `${String(ordinal).padStart(4, '0')}-${randomUUID()}`;
    const base = { schemaVersion: 1, attemptId, ordinal, taskId: c.task.id, taskVersion: c.task.version,
      taskHash: c.taskHash, submissionHash: hash(css), evaluatorVersion: EVALUATOR,
      startedAt: new Date().toISOString(), model: 'unknown', usage: 'unknown', mode: c.task.mode, delivery: c.delivery };
    const prefix = join(c.root, 'attempts', attemptId);
    await writeFile(`${prefix}.css`, css, { flag: 'wx' });
    await writeFile(`${prefix}.pending.json`, JSON.stringify(base, null, 2) + '\n', { flag: 'wx' });
    const outcome = await evaluate({ task: c.task, html: c.html, css, chrome, signal });
    release = outcome.cleanupConfirmed;
    const attempt = { ...base, ...outcome, finishedAt: new Date().toISOString() };
    await atomicJson(`${prefix}.json`, attempt);
    await unlink(`${prefix}.pending.json`);
    return { ...attempt, resultFile: `${prefix}.json` };
  } finally {
    await lock.close();
    if (release) await unlink(lockPath);
  }
}

export async function report(destination, catalogRoot) {
  const c = await context(destination, catalogRoot);
  const files = (await readdir(join(c.root, 'attempts'))).sort();
  assert(files.length <= 2002, 'attempt-limit');
  const incomplete = files.filter(file => !/^\d{4}-[\da-f-]{36}\.(?:json|css)$/.test(file)
    || !files.includes(file.replace(/\.(json|css)$/, (_, ext) => ext === 'json' ? '.css' : '.json')));
  const attempts = [];
  for (const file of files.filter(file => /^\d{4}-[\da-f-]{36}\.json$/.test(file))) {
    const attempt = JSON.parse(await regular(join(c.root, 'attempts', file), 1048576));
    assert(attempt.taskHash === c.taskHash && `${attempt.attemptId}.json` === file, 'invalid-record');
    const snapshot = await regular(join(c.root, 'attempts', `${attempt.attemptId}.css`), 32768);
    assert(hash(snapshot) === attempt.submissionHash, 'invalid-record');
    attempts.push({ attemptId: attempt.attemptId, status: attempt.status, errorCode: attempt.errorCode,
      submissionHash: attempt.submissionHash, summary: attempt.summary });
  }
  const first = attempts[0] || null;
  return { taskId: c.task.id, mode: c.task.mode, firstAttempt: first, latestAttempt: attempts.at(-1) || null,
    attempts, incomplete, evidence: 'Local editable practice records; not a learning-gain or blind-evaluation score.' };
}

export async function main(args) {
  const [command, ...rest] = args;
  if (command === 'list' && rest.length === 0) return loadCatalog();
  if (command === 'prepare' && rest.length === 2) return prepare(...rest);
  if (command === 'report' && rest.length === 1) return report(rest[0]);
  if (['reflect','pair','measure','compare','demo'].includes(command)) {
    const learning = await import('./learning.mjs');
    return learning.dispatch(command, rest);
  }
  if (command === 'check' && rest.length === 1) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
    try { return await check(rest[0], { signal: controller.signal }); }
    finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
  }
  throw Object.assign(new Error('Use: list | prepare TASK NEW_DIRECTORY | check DIRECTORY | report DIRECTORY | reflect WORK ATTEMPT NOTE.json | pair SOURCE TARGET NEW_DIRECTORY [PROTOCOL.json] | measure WORK ATTEMPT METRICS.json | compare PAIR NEW_REPORT_DIRECTORY | demo NEW_DIRECTORY'), { code: 'usage' });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // Finish module initialization before lazily loading commands that reuse these exports.
  main(process.argv.slice(2)).then(result => {
    console.log(JSON.stringify(result, null, 2));
    if (result.status && !['passed','prepared','recorded','paired','reported','demo-complete'].includes(result.status)) process.exitCode = result.status === 'failed' ? 1 : 2;
  }).catch(error => {
    console.log(JSON.stringify({ status: 'command-error', errorCode: error.code || 'invalid-input',
      message: error.code === 'usage' ? error.message : 'Check the task, workspace integrity, and any retained lock. Existing files were not overwritten.' }, null, 2));
    process.exitCode = 2;
  });
}
