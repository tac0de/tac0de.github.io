import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const manifest=JSON.parse(readFileSync('package.json','utf8'));
const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
assert.equal(manifest.name,lock.name);
assert.deepEqual(manifest.devDependencies,lock.packages[''].devDependencies);
assert(!manifest.devDependencies.typescript && !lock.packages['node_modules/typescript']);
for(const old of ['src/main.ts','tsconfig.json','public/og-image.png','public/favicon.svg','evals/cases.json']) assert(!existsSync(old),`Obsolete artifact ${old}`);
const html = readFileSync('index.html','utf8');
assert(/<html[^>]*lang="en"/.test(html),'English document language');
assert(!/[가-힣]/u.test(html),'Website copy and accessible labels must be English');
const css = readFileSync('src/state.css','utf8');
const style = readFileSync('src/style.css','utf8');
const levels = JSON.parse(readFileSync('tests/levels.json','utf8'));
assert.equal(levels.length,9);
assert(!/style="[^"]*--turn:/.test(html),'Inline rotation must not override input-driven state');
assert(!/<script\b|\son\w+\s*=|<canvas\b|<iframe\b/i.test(html),'Runtime must have no JavaScript or canvas');
const canonical = '<link rel="canonical" href="https://tac0de.github.io/">';
assert(html.includes(canonical),'Canonical URL');
assert(!/(?:src|href)="https?:/i.test(html.replace(canonical,'')),'No external runtime resources');
function checkSocial(markup, imagePath) {
 const meta = key => markup.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]+)"`))?.[1];
 assert.equal(meta('og:url'),'https://tac0de.github.io/');
 assert.equal(meta('og:type'),'website');
 assert.equal(meta('og:title'),meta('twitter:title'));
 assert.equal(meta('og:description'),meta('description'));
 assert.equal(meta('twitter:description'),meta('description'));
 assert(meta('description')?.includes('No JavaScript.'));
 assert.equal(meta('og:image'),'https://tac0de.github.io/css-arcade-og.png');
 assert.equal(meta('og:image'),meta('twitter:image'));
 assert.equal(meta('twitter:card'),'summary_large_image');
 assert(meta('og:image:alt')?.length > 20);
 const png=readFileSync(imagePath);
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 assert.equal(meta('og:image:width'),'1200');assert.equal(meta('og:image:height'),'630');
}
checkSocial(html,'public/css-arcade-og.png');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'Unique IDs');
for (const [,id] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(id),`Broken anchor ${id}`);
assert.equal((html.match(/<form /g)||[]).length,9);
assert.equal((html.match(/type="reset"/g)||[]).length,9);
for(const level of levels) { assert(html.includes(`class="skip-link game-skip skip-${level.id}" href="#${level.id}"`)); assert(style.includes(`body:has(#${level.id}:target) .skip-${level.id}`)); }
assert(style.includes('prefers-reduced-motion:reduce'));
assert(style.includes('input:focus-visible'));
// Interpret the deliberately restricted state stylesheet independently of a browser.
// All logic selectors are a form ID followed by positive/negative checked tests.
const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]+)\}/g)].map(([,selectors,body])=>({selectors:selectors.split(',').map(s=>s.trim()),body}));
function matches(selector,level,checked,target) {
 const split=selector.indexOf(' '); if(split<0)throw Error('Unsupported state selector '+selector);
 if(selector.slice(split+1)!==target)return false;
 let predicate=selector.slice(0,split);
 if(!predicate.startsWith('#'+level.id+'-form'))return false;
 predicate=predicate.slice(('#'+level.id+'-form').length);
 let okay=true;
 predicate=predicate.replace(/:not\(:has\(#([\w-]+):checked\)\)/g,(_,id)=>{okay&&=!checked.has(id);return '';});
 predicate=predicate.replace(/:has\(#([\w-]+):checked\)/g,(_,id)=>{okay&&=checked.has(id);return '';});
 assert.equal(predicate,'','Unsupported predicate');return okay;
}
function declaration(level,checked,target,property,fallback) {
 let result=fallback;
 for(const rule of rules)if(rule.selectors.some(s=>matches(s,level,checked,target))) {
  for(const [,p,v] of rule.body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g))if(p===property)result=v.trim();
 }
 return result;
}
function combinations(count,base) {return Array.from({length:base**count},(_,n)=>Array.from({length:count},(_,i)=>Math.floor(n/base**i)%base));}
// Independent cell-by-cell ray walker, rather than the generation-time nearest-hit algorithm.
function walk(level,state,source) {
 let [x,y,dx,dy]=source;let start=[x,y];const segments=[];const seen=new Set();
 for(let steps=0;steps<1000;steps++) {
  x+=dx;y+=dy;
  const key=[x,y,dx,dy].join(',');assert(!seen.has(key),`${level.id}: optical loop`);seen.add(key);
  const mirror=level.mirrors.findIndex(([mx,my])=>mx===x&&my===y);
  if(mirror!==-1) {
   segments.push([...start,x,y]);start=[x,y];
   if(state[mirror]) {const ndx=-dy;dy=-dx;dx=ndx;}else{const ndx=dy;dy=dx;dx=ndx;}
  } else if(x===0||x===10||y===0||y===6) {segments.push([...start,x,y]);return {segments,end:[x,y]};}
 }
 throw Error('Unbounded ray');
}
function logic([op,names],bits) {
 const [a,b]=names.map(name=>Boolean(bits[name.charCodeAt(0)-65]));
 switch(op){case 'AND':return a&&b;case 'OR':return a||b;case 'XOR':return a!==b;case 'NOT':return !a;case 'COPY':return a;default:throw Error(op);}
}
let states=0,beams=0;
for(const level of levels) {
 const form=html.match(new RegExp(`<form id="${level.id}-form"[\\s\\S]*?</form>`))?.[0];assert(form);
 const count=level.kind==='glyph'?level.bases.length:level.kind==='lumen'?level.mirrors.length:level.count;
 assert.equal((form.match(/type="checkbox"/g)||[]).length,level.kind==='glyph'?0:count);
 const segments=[...form.matchAll(/<i id="([^"]+)"[^>]*data-segment="([^"]+)"/g)].map(([,id,data])=>({id,data:data.split(',').map(Number)}));
 let winCount=0;
 for(const values of combinations(count,level.kind==='glyph'?4:2)) {
  states++;
  const checked=new Set(values.flatMap((v,i)=>level.kind==='glyph'?[`${level.id}-r${i}-${v}`]:v?[`${level.id}-s${i}`]:[]));
  let expected;
  if(level.kind==='lumen') {
   const walks=level.sources.map(s=>walk(level,values,s));expected=walks.every((w,i)=>w.end.join()===level.receivers[i].join());
   const expectedSegments=new Set(walks.flatMap((w,i)=>w.segments.map(s=>[i,...s].join())));
   const visibleSegments=new Set(segments.filter(s=>declaration(level,checked,'#'+s.id,'display','none')==='block').map(s=>s.data.join()));
   assert.deepEqual(visibleSegments,expectedSegments,`${level.id} beams ${values}`);beams+=visibleSegments.size;
   walks.forEach((w,i)=>assert.equal(declaration(level,checked,`#${level.id}-receiver${i} .lit`,'display','none')==='inline',w.end.join()===level.receivers[i].join(),`${level.id} receiver ${i}`));
  } else if(level.kind==='glyph') {
   expected=values.every((v,i)=>(level.bases[i]+v*90)%360===0);
   for(let i=0;i<count;i++) assert.equal(parseFloat(declaration(level,checked,`.ring-${i}`,'--turn','NaN')),level.bases[i]+values[i]*90);
   assert.equal((form.match(/type="radio"/g)||[]).length,count*4);
  } else {
   const outputs=[...level.gates,level.warning].map(g=>logic(g,values));expected=outputs.slice(0,-1).every(Boolean)&&!outputs.at(-1);
   outputs.forEach((on,i)=>assert.equal(declaration(level,checked,`#${level.id}-gate${i} .lit`,'display','none')==='inline',on,`${level.id} gate ${i} ${values}`));
  }
  assert.equal(declaration(level,checked,'.success','display','none')==='block',expected,`${level.id} winner ${values}`);
  assert.equal(declaration(level,checked,'.pending','display','block')==='none',expected,`${level.id} pending ${values}`);
  if(expected)winCount++;
  if(values.every(v=>v===0))assert(!expected,`${level.id} must not start won`);
 }
 assert.equal(winCount,1,`${level.id}: exactly one solution`);
}
// Production output is supplied by verify.mjs; reject injected runtime modules too.
if(process.argv[2]) {
 const dir=resolve(process.argv[2]);const built=readFileSync(resolve(dir,'index.html'),'utf8');
 assert(!/<script\b|\son\w+\s*=/i.test(built),'No production runtime scripts');
 function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(f=>f.isDirectory()?files(resolve(path,f.name)):[resolve(path,f.name)]);}
 assert(!files(dir).some(f=>/\.(?:m?js|wasm)$/.test(f)),'No shipped JS/WASM');
 checkSocial(built,resolve(dir,'css-arcade-og.png'));
 for(const [,url] of built.replace(canonical,'').matchAll(/(?:href|src)="([^"#][^"]*)"/g))if(!url.startsWith('data:'))assert(existsSync(resolve(dir,url)),`Missing built resource ${url}`);
}
console.log(`PASS: 9 levels, ${states} exhaustive states, ${beams} visible ray segments; inputs, links, win/loss, rotation and gate outputs verified.`);
