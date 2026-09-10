import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, access, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { prepare, context, check } from '../../scripts/agent-css/main.mjs';
import { hash } from '../../scripts/agent-css/contracts.mjs';
import { reflect, pair, measure, compare, demo, locked } from '../../scripts/agent-css/learning.mjs';
import { renderComparison } from '../../scripts/agent-css/report.mjs';

const note = { hypothesis:'A complete checked condition was missing.', rule:'Verify the complete truth table after each change.',
  applicability:'Native checkbox state tasks.', tags:['output-logic'] };
const temporary = async t => { const dir=await mkdtemp(join(tmpdir(),'agent-learning-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir; };
const code = expected => e => e.code === expected;
// These fixtures test record contracts only. The separately enabled browser test runs the full demo.
async function seed(root, ordinal, status='failed') {
  const c=await context(root), id=`${String(ordinal).padStart(4,'0')}-${randomUUID()}`;
  const css='/* synthetic contract fixture */';
  const attempt={schemaVersion:1,attemptId:id,taskHash:c.taskHash,evaluatorVersion:c.task.evaluatorVersion,
    status,submissionHash:hash(css),delivery:c.delivery,errorCode:status==='environment-error'?'browser-unavailable':null,
    startedAt:'2026-09-10T00:00:00.000Z',finishedAt:'2026-09-10T00:00:01.000Z',
    summary:{passed:status==='passed'?1:0,total:1,completed:['passed','failed'].includes(status)},
    cases:[{caseId:'state-3',passed:status==='passed',inputState:{A:true,B:true},expected:[{selector:'#lamp-on',on:true}],
      observed:{outputs:[{selector:'#lamp-on',on:false,off:true}]},errorCodes:status==='passed'?[]:['output-mismatch:#lamp-on']}]};
  await writeFile(join(root,'attempts',`${id}.css`),css);await writeFile(join(root,'attempts',`${id}.json`),JSON.stringify(attempt));return id;
}
async function fixture(t) {
  const root=await temporary(t),source=join(root,'source');await prepare('relay-and',source);
  const id=await seed(source,1);await reflect(source,id,note);return{root,source,id};
}

test('reflection binds observed evidence, rejects overwrite and source-code prose',async t=>{
  const {source,id}=await fixture(t);
  const r=JSON.parse(await readFile(join(source,'reflections',`${id}.json`),'utf8'));
  assert.equal(r.epistemicStatus,'agent-hypothesis');assert.equal(r.observed[0].caseId,'state-3');assert(!('css' in r));
  await assert.rejects(reflect(source,id,note),code('EEXIST'));
  await assert.rejects(reflect(source,id,{...note,rule:'a { display: block; }'}),code('reflection-must-be-prose'));
  const passed=await seed(source,2,'passed');await assert.rejects(reflect(source,passed,note),code('reflection-requires-failed-attempt'));
});

test('pair freezes related experience and delivery; unfinished and changed context fail',async t=>{
  const {root,source}=await fixture(t);const p=await pair(source,'relay-transfer',join(root,'pair'));
  const baseline=JSON.parse(await readFile(join(p.baseline,'handoff.json'),'utf8'));
  const recall=JSON.parse(await readFile(join(p.recall,'handoff.json'),'utf8'));
  assert.equal(baseline.experience.length,0);assert.equal(recall.experience.length,1);
  assert(!JSON.stringify(recall).includes('synthetic contract fixture'));
  assert.equal((await context(p.baseline)).taskHash,(await context(p.recall)).taskHash);
  await assert.rejects(pair(source,'relay-and',join(root,'bad')),code('unrelated-transfer-task'));
  const empty=await compare(p.pairDirectory,join(root,'empty-report'));
  assert.equal(empty.result.baseline.first,null);assert.equal(empty.result.recall.first,null);
  assert((await readFile(empty.html,'utf8')).includes('Not run'));
  await writeFile(join(p.recall,'handoff.json'),'{}');
  await assert.rejects(check(p.recall),code('handoff-changed'));
  await assert.rejects(compare(p.pairDirectory,join(root,'bad-report')),code('handoff-changed'));
});

test('comparison preserves first attempt and unknown costs; source cost basis is frozen',async t=>{
  const {root,source,id}=await fixture(t);
  await measure(source,id,{tokens:100,agentSeconds:5,costUSD:0});
  await assert.rejects(measure(source,id,{tokens:1,agentSeconds:1,costUSD:1}),code('EEXIST'));
  const p=await pair(source,'relay-transfer',join(root,'pair'));
  await seed(source,2,'passed'); // Must not change the historical source scope.
  const first=await seed(p.baseline,1);await seed(p.baseline,2,'passed');
  const recall=await seed(p.recall,1,'passed');await measure(p.recall,recall,{tokens:50,agentSeconds:3,costUSD:null});
  const r=await compare(p.pairDirectory,join(root,'report'));
  assert.equal(r.result.baseline.first.attemptId,first);assert.equal(r.result.baseline.first.status,'failed');
  assert.equal(r.result.baseline.latest.status,'passed');assert.equal(r.result.sourcePractice.cost.attempts,1);
  assert.equal(r.result.totalScope.attempts,4);assert.equal(r.result.totalScope.tokens.knownSubtotal,150);
  assert.equal(r.result.totalScope.tokens.missing,2);assert.equal(r.result.totalScope.tokens.total,null);
  assert.equal(r.result.totalScope.costUSD.total,null);
  await assert.rejects(compare(p.pairDirectory,r.reportDirectory),code('EEXIST'));
  assert(!/<script\b|\son\w+=/.test(await readFile(r.html,'utf8')));
});

test('environment failures and HTML content cannot masquerade as successful measured learning',async t=>{
  const {root,source}=await fixture(t);const p=await pair(source,'relay-transfer',join(root,'pair'));
  await seed(p.baseline,1,'environment-error');await seed(p.baseline,2,'passed');
  const r=await compare(p.pairDirectory,join(root,'report'));
  assert.equal(r.result.baseline.first.status,'environment-error');assert.equal(r.result.protocol.model,null);
  const hostile=structuredClone(r.result);hostile.experience[0].rule='<script>alert(1)</script>';
  hostile.protocol.model='</td><img src=x onerror=alert(1)>';
  const html=renderComparison(hostile);assert(!html.includes('<script>alert'));assert(html.includes('&lt;script&gt;'));
  assert(!html.includes('<img'));assert(html.includes('&lt;img'));
});

test('workspace locks prevent learning-record and comparison writers from overlapping',async t=>{
  const {root,source,id}=await fixture(t);const p=await pair(source,'relay-transfer',join(root,'pair'));
  await locked(source,()=>assert.rejects(measure(source,id,{tokens:null,agentSeconds:null,costUSD:null}),code('EEXIST')));
  await locked(p.recall,()=>assert.rejects(compare(p.pairDirectory,join(root,'busy')),code('EEXIST')));
  await assert.rejects(access(join(p.baseline,'.check.lock')));
  await assert.rejects(access(join(p.pairDirectory,'.check.lock')));
});

test('documented CLI commands work as a standalone entrypoint, not only imports',async t=>{
  const {root,source}=await fixture(t);
  const cli=fileURLToPath(new URL('../../scripts/agent-css/main.mjs',import.meta.url));
  const {stdout}=await promisify(execFile)(process.execPath,[cli,'pair',source,'relay-transfer',join(root,'cli-pair')]);
  assert.equal(JSON.parse(stdout).status,'paired');
  const rendered=await promisify(execFile)(process.execPath,[cli,'compare',join(root,'cli-pair'),join(root,'cli-report')]);
  assert.equal(JSON.parse(rendered.stdout).result.baseline.first,null);
});

test('scripted browser walkthrough completes without running any model',
 {skip:process.env.AGENT_CSS_BROWSER_TESTS!=='1',timeout:120000},async t=>{
  const result=await demo(join(await temporary(t),'demo'));
  const r=JSON.parse(await readFile(join(result.directory,'report/report.json'),'utf8'));
  assert.equal(r.kind,'scripted-demo');assert.equal(r.baseline.first.status,'passed');assert.equal(r.recall.first.status,'passed');
  assert.equal(r.sourcePractice.cost.attempts,2);assert.equal(r.totalScope.costUSD.total,null);
  assert.equal(r.experience.length,1);assert.equal(r.protocol.model,null);
  assert(!(await readFile(result.report,'utf8')).includes(result.directory));
 });
