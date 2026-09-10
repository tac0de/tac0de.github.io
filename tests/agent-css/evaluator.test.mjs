import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, symlink, unlink, access, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTask, loadCatalog, validateTask, validateSubmission, booleanValue } from '../../scripts/agent-css/contracts.mjs';
import { evaluate, stableObservation } from '../../scripts/agent-css/evaluate.mjs';
import { prepare, check, report } from '../../scripts/agent-css/main.mjs';

const good = '#exercise:has(#input-a:checked):has(#input-b:checked) #lamp-on {display:block}';
const xor = '#exercise:has(#input-a:checked):not(:has(#input-b:checked)) #lamp-on, #exercise:not(:has(#input-a:checked)):has(#input-b:checked) #lamp-on {display:block}';
const rejected = code => error => error.code === code;
const temporary = async t => {
  const parent = await mkdtemp(join(tmpdir(), 'agent-css-test-'));
  t.after(() => rm(parent, { recursive: true, force: true })); return parent;
};

test('task contract rejects incomplete or executable expectations', async () => {
  const { task } = await loadTask('relay-and');
  for (const change of [
    t => t.assets.html = '../exercise.html', t => t.assets.html = '/tmp/a.html',
    t => t.checks.controls[1].name = 'A', t => t.checks.controls[1].selector = '#input-a',
    t => t.checks.outputs[0].when = { op: 'eval', args: [] },
    t => t.checks.outputs[0].when = { input: 'MISSING' },
    t => t.checks.outputs[0].when.args.pop(), t => t.checks.reset.expectedChecked.A = true,
    t => t.checks.observation.stableSamples = 0, t => t.mode = 'unknown',
  ]) { const copy = structuredClone(task); change(copy); assert.throws(() => validateTask(copy)); }
  assert.equal(booleanValue({ op: 'XOR', args: [{input:'A'}, {input:'B'}] }, {A:true,B:false}), true);
});

test('CSS resource, script-breakout, motion and size restrictions', () => {
  for (const css of ['a{background:url(https://example.com)}', '@import "a.css";', 'a{animation:spin 1s}',
    'a{transition:all 1s}', 'a{color:r\\65d}', '</style><script>alert(1)</script>', 'a'.repeat(32769)])
    assert.throws(() => validateSubmission(css));
  assert.doesNotThrow(() => validateSubmission(good));
  for (const selector of [':focus', ':FOCUS', ':focus-within', ':focus-visible', ':hover', ':active', ':target', ':visited'])
    assert.throws(() => validateSubmission(`#exercise:has(#input-a:checked):has(#input-b${selector}) #lamp-on{display:block}`), rejected('unsupported-interaction-selector'));
});

test('missing browser is recorded as an environment error, not a wrong answer', async t => {
  const root = join(await temporary(t), 'work'); await prepare('relay-and', root);
  const result = await check(root, { chrome: '/missing/chrome' });
  assert.equal(result.status, 'environment-error'); assert.equal(result.errorCode, 'browser-unavailable');
  assert.equal(result.summary.completed, false);
  assert.equal((await report(root)).firstAttempt.status, 'environment-error');
  await assert.rejects(access(join(root, '.check.lock')));
});

test('workspace overwrite, version, fixed files, symlinks, locks and incomplete attempts fail closed', async t => {
  const parent = await temporary(t), root = join(parent, 'work'); await prepare('relay-and', root);
  await assert.rejects(prepare('relay-and', root), rejected('EEXIST'));
  const original = await readFile(join(root, 'exercise.html'), 'utf8');
  await writeFile(join(root, 'exercise.html'), original + ' ');
  await assert.rejects(check(root), rejected('fixed-file-changed'));
  await writeFile(join(root, 'exercise.html'), original);
  const metadata = await readFile(join(root, 'workspace.json'), 'utf8');
  await writeFile(join(root, 'workspace.json'), metadata.replace('1.0.0', '9.0.0'));
  await assert.rejects(check(root), rejected('task-version-mismatch'));
  await writeFile(join(root, 'workspace.json'), metadata);
  await writeFile(join(root, '.check.lock'), 'existing lock');
  await assert.rejects(check(root), rejected('EEXIST'));
  assert.equal(await readFile(join(root, '.check.lock'), 'utf8'), 'existing lock');
  await unlink(join(root, '.check.lock'));
  await unlink(join(root, 'submission.css'));
  await writeFile(join(parent, 'outside.css'), good);
  await symlink(join(parent, 'outside.css'), join(root, 'submission.css'));
  await assert.rejects(check(root), rejected('invalid-file'));
  await unlink(join(root, 'submission.css')); await writeFile(join(root, 'submission.css'), good);
  await writeFile(join(root, 'attempts', '0001-12345678-1234-1234-1234-123456789012.css'), good);
  await assert.rejects(check(root), rejected('incomplete-attempts'));
  assert.equal((await report(root)).incomplete.length, 1);
  const alias = join(parent, 'alias'); await symlink(root, alias);
  await assert.rejects(check(alias), rejected('invalid-directory'));
});

test('duplicate catalog IDs and symlink assets are rejected', async t => {
  const root = await temporary(t); const { task, html, starter } = await loadTask('relay-and');
  await writeFile(join(root, 'catalog.json'), JSON.stringify({schemaVersion:1,tasks:[task,task]}));
  await assert.rejects(loadCatalog(root), rejected('invalid-catalog'));
  await writeFile(join(root, 'catalog.json'), JSON.stringify({schemaVersion:1,tasks:[task]}));
  await writeFile(join(root, 'actual.html'), html); await writeFile(join(root, 'starter.css'), starter);
  await symlink(join(root, 'actual.html'), join(root, 'relay.html'));
  await assert.rejects(loadTask('relay-and', root), rejected('invalid-file'));
});

test('unstable observations and interruption remain distinct', async () => {
  let value = 0;
  const unstable = await stableObservation(async () => ++value, {stableSamples:3,intervalMs:1,timeoutMs:10});
  assert.equal(unstable.stable, false);
  await assert.rejects(stableObservation(async () => true, {stableSamples:3,intervalMs:1,timeoutMs:10}, AbortSignal.abort()), rejected('interrupted'));
});

test('actual Chromium validates cascade, controls, reset, task data and persistent attempts',
  { skip: process.env.AGENT_CSS_BROWSER_TESTS !== '1', timeout: 180000 }, async t => {
    const { task, html } = await loadTask('relay-and');
    const run = css => evaluate({task,html,css});
    const correct = await run(good);
    assert.equal(correct.status, 'passed', JSON.stringify(correct));
    assert.equal(correct.cases.length, 9);
    assert.equal(correct.cases.filter(c => c.caseId.startsWith('reset-')).length, 4);
    for (const [css, code] of [
      ['#lamp-on{display:block}', 'output-mismatch:#lamp-on'],
      ['#exercise:has(#input-a:checked) #lamp-on{display:block}', 'output-mismatch:#lamp-on'],
      [good + '#lamp-on{display:none!important}', 'output-mismatch:#lamp-on'],
      [good + '#input-a{display:none}', 'input-unusable:A'],
      [good + '#reset{display:none}', 'reset-unusable'],
    ]) {
      const result = await run(css); assert.equal(result.status, 'failed', css);
      assert(result.cases.some(c => c.errorCodes.includes(code)), JSON.stringify(result));
    }
    assert.equal((await run('invalid css {{{')).status, 'invalid-submission');
    const focusFalsePositive = await run('#exercise:has(#input-a:checked):has(#input-b:focus) #lamp-on {display:block}');
    assert.equal(focusFalsePositive.status, 'invalid-submission');
    assert.equal(focusFalsePositive.errorCode, 'unsupported-interaction-selector');
    const invalid = structuredClone(task); invalid.checks.controls[0].defaultChecked = true; invalid.checks.reset.expectedChecked.A = true;
    assert.equal((await evaluate({task:invalid,html,css:good})).status, 'invalid-task');
    const canceled = await evaluate({task,html,css:good,signal:AbortSignal.abort()});
    assert.equal(canceled.status, 'interrupted');
    // A second catalog task exercises the same runner, with no evaluator code changes.
    const other = await loadTask('relay-xor');
    assert.equal((await evaluate({...other,css:xor})).status, 'passed');

    const root = join(await temporary(t), 'work'); await prepare('relay-and', root);
    const first = await check(root); assert.equal(first.status, 'failed');
    await writeFile(join(root, 'submission.css'), good);
    const second = await check(root); assert.equal(second.status, 'passed');
    const history = await report(root);
    assert.equal(history.firstAttempt.status, 'failed'); assert.equal(history.latestAttempt.status, 'passed');
    assert.equal(history.attempts.length, 2); assert.notEqual(first.submissionHash, second.submissionHash);
    assert.equal(await readFile(first.resultFile, 'utf8').then(JSON.parse).then(r => r.status), 'failed');
    // While a real evaluation holds the lock a second writer cannot start.
    const inFlight = check(root);
    for (let n = 0; n < 100; n++) {
      if ((await readdir(root)).includes('.check.lock')) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    await assert.rejects(check(root), rejected('EEXIST'));
    assert.equal((await inFlight).status, 'passed');
  });
