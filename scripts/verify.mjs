#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { loadCatalog, loadTask } from './agent-css/contracts.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run=(command,args)=>{
 const result=spawnSync(command,args,{stdio:'inherit',shell:false});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0)process.exit(result.status??1);
};
run(process.execPath,['scripts/check-puzzles.mjs']);
run(process.execPath,['--test','tests/agent-css/evaluator.test.mjs','tests/agent-css/learning.test.mjs']);
const catalog = await loadCatalog();
for (const task of catalog.tasks) await loadTask(task.id);
// Avoid modifying the repository's protected dist directory.
const output=mkdtempSync(join(tmpdir(),'power-of-css-build-'));
run('npm',['run','build','--','--outDir',output]);
run(process.execPath,['scripts/check-puzzles.mjs',output]);
for (const file of readdirSync('public/learn')) {
 const source=readFileSync(join('public/learn',file),'utf8');
 assert.equal(readFileSync(join(output,'learn',file),'utf8'),source,`Static task asset changed: ${file}`);
 if(file.endsWith('.html')) {
  assert(!/<script\b|\son\w+\s*=|<canvas\b|<iframe\b/i.test(source),'No task-page runtime scripts');
  for(const [,url] of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
   if(url.startsWith('#')) {
    assert(source.includes(`id="${url.slice(1)}"`),`Missing anchor ${url}`);
    continue;
   }
   if(url==='https://github.com/tac0de/tac0de.github.io') continue;
   assert(!/^(?:https?:|data:|javascript:)/i.test(url),'No external task resources');
   assert(existsSync(join(output,'learn',url)),`Missing task link ${url}`);
  }
 }
}
const exampleText=readFileSync('public/learn/report.json','utf8');
const example=JSON.parse(exampleText);
assert.equal(example.kind,'scripted-demo');
assert.equal(example.protocol.model,null);
assert.equal(example.baseline.first.status,'passed');
assert.equal(example.recall.first.status,'passed');
assert.equal(example.totalScope.tokens.total,null);
assert(!/\/Users\/|\/private\/|\/tmp\//.test(exampleText),'Public demo must not expose local paths');
console.log(`Production preview artifact: ${output}`);
