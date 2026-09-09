#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const run=(command,args)=>{
 const result=spawnSync(command,args,{stdio:'inherit',shell:false});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0)process.exit(result.status??1);
};
run(process.execPath,['scripts/check-puzzles.mjs']);
// Avoid modifying the repository's protected dist directory.
const output=mkdtempSync(join(tmpdir(),'power-of-css-build-'));
run('npm',['run','build','--','--outDir',output]);
run(process.execPath,['scripts/check-puzzles.mjs',output]);
console.log(`Production preview artifact: ${output}`);
