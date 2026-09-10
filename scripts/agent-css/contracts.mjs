import { readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { EvaluationError } from './browser.mjs';

export const EVALUATOR = 'relay-visibility-v1';
export const CATALOG_ROOT = fileURLToPath(new URL('../../public/learn/', import.meta.url));
export const hash = text => createHash('sha256').update(text).digest('hex');
export const assert = (condition, code) => { if (!condition) throw new EvaluationError(code); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[a-zA-Z][\w-]{0,63}$/.test(value);
const selector = value => typeof value === 'string' && /^#[a-zA-Z][\w-]{0,63}$/.test(value);
const keys = (value, expected) => object(value) && Object.keys(value).sort().join() === [...expected].sort().join();

// Resolve an existing parent (including OS /tmp aliases), then reject symlinks in task-controlled entries.
export async function workspacePath(path) {
  const absolute = resolve(path);
  const parent = await realpath(dirname(absolute));
  return join(parent, basename(absolute));
}
export async function regular(path, limit = 262144) {
  const stat = await lstat(path);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= limit, 'invalid-file');
  const data = await readFile(path, 'utf8');
  assert(Buffer.byteLength(data) <= limit, 'invalid-file');
  return data;
}
export async function directory(path) {
  const stat = await lstat(path);
  assert(stat.isDirectory() && !stat.isSymbolicLink(), 'invalid-directory');
}
export function booleanValue(expression, state) {
  if ('input' in expression) return state[expression.input];
  const args = expression.args.map(arg => booleanValue(arg, state));
  switch (expression.op) {
    case 'AND': return args[0] && args[1];
    case 'OR': return args[0] || args[1];
    case 'XOR': return args[0] !== args[1];
    case 'NOT': return !args[0];
    default: throw new EvaluationError('invalid-task');
  }
}
function validateExpression(value, names, depth = 0) {
  assert(object(value) && depth <= 8, 'invalid-task');
  if ('input' in value) assert(keys(value, ['input']) && names.includes(value.input), 'invalid-task');
  else {
    assert(keys(value, ['op', 'args']) && ['AND', 'OR', 'XOR', 'NOT'].includes(value.op), 'invalid-task');
    assert(Array.isArray(value.args) && value.args.length === (value.op === 'NOT' ? 1 : 2), 'invalid-task');
    value.args.forEach(arg => validateExpression(arg, names, depth + 1));
  }
}
export function validateTask(task) {
  assert(keys(task, ['id','version','track','mode','objective','assets','allowedEdits','evaluatorVersion','checks']), 'invalid-task');
  assert(identifier(task.id) && /^\d+\.\d+\.\d+$/.test(task.version) && task.track === 'relay-input-state', 'invalid-task');
  assert(['practice','transfer'].includes(task.mode) && task.evaluatorVersion === EVALUATOR, 'unsupported-task');
  assert(typeof task.objective === 'string' && task.objective.length > 0 && task.objective.length < 4000, 'invalid-task');
  assert(JSON.stringify(task.allowedEdits) === '["submission.css"]', 'invalid-task');
  assert(keys(task.assets, ['html','starter']), 'invalid-task');
  for (const [key, extension] of [['html','html'],['starter','css']])
    assert(typeof task.assets[key] === 'string' && new RegExp(`^[a-zA-Z][\\w-]*\\.${extension}$`).test(task.assets[key]), 'invalid-task');
  const c = task.checks;
  assert(keys(c, ['form','controls','outputs','cases','reset','observation']) && selector(c.form), 'invalid-task');
  assert(Array.isArray(c.controls) && c.controls.length >= 1 && c.controls.length <= 5, 'invalid-task');
  assert(c.controls.every(object), 'invalid-task');
  const names = c.controls.map(input => input.name);
  assert(names.every(identifier) && new Set(names).size === names.length, 'invalid-task');
  for (const input of c.controls) assert(keys(input, ['name','selector','type','defaultChecked']) && selector(input.selector)
    && input.type === 'checkbox' && typeof input.defaultChecked === 'boolean', 'invalid-task');
  assert(Array.isArray(c.outputs) && c.outputs.length >= 1 && c.outputs.length <= 8, 'invalid-task');
  for (const output of c.outputs) {
    assert(keys(output, ['selector','when','observable']) && selector(output.selector)
      && output.observable === 'rendered-or-display-none', 'invalid-task');
    validateExpression(output.when, names);
  }
  assert(c.cases === 'all-boolean-combinations' && keys(c.reset, ['selector','expectedChecked']) && selector(c.reset.selector), 'invalid-task');
  assert(keys(c.reset.expectedChecked, names), 'invalid-task');
  for (const input of c.controls) assert(c.reset.expectedChecked[input.name] === input.defaultChecked, 'invalid-task');
  const selectors = [c.form, c.reset.selector, ...c.controls.map(i => i.selector), ...c.outputs.map(i => i.selector)];
  assert(new Set(selectors).size === selectors.length, 'invalid-task');
  const o = c.observation;
  assert(keys(o, ['viewport','stableSamples','intervalMs','timeoutMs']) && keys(o.viewport, ['width','height'])
    && o.viewport.width === 800 && o.viewport.height === 600 && o.stableSamples === 3 && o.intervalMs === 100 && o.timeoutMs === 2000, 'unsupported-task');
  return task;
}
export async function loadCatalog(root = CATALOG_ROOT) {
  await directory(root);
  let catalog;
  try { catalog = JSON.parse(await regular(join(root, 'catalog.json'))); } catch (error) {
    throw new EvaluationError('invalid-catalog', error.code || 'Invalid JSON');
  }
  assert(keys(catalog, ['schemaVersion','tasks']) && catalog.schemaVersion === 1 && Array.isArray(catalog.tasks)
    && catalog.tasks.length > 0 && catalog.tasks.length <= 100, 'invalid-catalog');
  catalog.tasks.forEach(validateTask);
  assert(new Set(catalog.tasks.map(task => task.id)).size === catalog.tasks.length, 'invalid-catalog');
  return catalog;
}
export async function loadTask(id, root = CATALOG_ROOT) {
  const catalog = await loadCatalog(root);
  const task = catalog.tasks.find(task => task.id === id);
  assert(task, 'unknown-task');
  const html = await regular(join(root, task.assets.html));
  const starter = await regular(join(root, task.assets.starter), 32768);
  assert(!/<script\b|<canvas\b|<iframe\b|<object\b|<embed\b|\son\w+\s*=|\s(?:src|href|action)\s*=/i.test(html)
    && html.includes('</head>') && html.includes("default-src 'none'"), 'invalid-task-html');
  const taskHash = hash(JSON.stringify({ task, html, starter }));
  return { task, html, starter, taskHash };
}
export function validateSubmission(css) {
  assert(typeof css === 'string' && Buffer.byteLength(css) <= 32768, 'submission-size-limit');
  // v1 explicitly excludes escapes and resource loading. CSP + Fetch blocking add independent enforcement.
  assert(!/[<\\\x00]/.test(css) && !/url\s*\(|@import\b|@font-face\b|@(?:-\w+-)?keyframes\b|\b(?:animation|transition)(?:-\w+)?\s*:/i.test(css), 'unsupported-css');
  // Boolean state must not be confounded with the runner's pointer/focus/navigation state.
  assert(!/:(?:focus(?:-visible|-within)?|hover|active|target(?:-within)?|visited|link|any-link|user-valid|user-invalid)\b/i.test(css), 'unsupported-interaction-selector');
}
