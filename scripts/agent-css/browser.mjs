import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export class EvaluationError extends Error {
  constructor(code, message = code) { super(message); this.code = code; }
}

// CDP travels over inherited pipes, not an HTTP server or a user's browser session.
export async function openBrowser({ chrome, signal } = {}) {
  chrome ||= process.env.AGENT_CSS_CHROME || (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/chromium');
  const profile = await mkdtemp(join(tmpdir(), 'agent-css-browser-'));
  const child = spawn(chrome, ['--headless', '--remote-debugging-pipe', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--disable-extensions', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  let nextId = 0, buffer = '', ended = false, lastError = null, sessionId;
  const pending = new Map();
  const rejectPending = error => {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
    pending.clear();
  };
  const closed = new Promise(resolve => {
    child.once('close', () => { ended = true; rejectPending(lastError || new EvaluationError('browser-exited')); resolve(); });
  });
  child.once('error', () => {
    lastError = new EvaluationError('browser-unavailable', 'Set AGENT_CSS_CHROME to an installed Chrome/Chromium executable.');
    rejectPending(lastError);
  });
  child.stderr.on('data', () => {}); // Browser diagnostics can contain local machine data.
  child.stdio[3].on('error', () => rejectPending(new EvaluationError('browser-pipe-closed')));
  child.stdio[4].setEncoding('utf8');
  child.stdio[4].on('data', chunk => {
    buffer += chunk;
    if (buffer.length > 2_000_000) { rejectPending(new EvaluationError('browser-response-limit')); child.kill(); return; }
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const raw = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      let packet; try { packet = JSON.parse(raw); } catch { continue; }
      const request = pending.get(packet.id);
      if (request) {
        pending.delete(packet.id); clearTimeout(request.timer);
        packet.error ? request.reject(new EvaluationError('browser-protocol-error', request.method)) : request.resolve(packet.result);
      } else if (packet.method === 'Fetch.requestPaused') {
        send('Fetch.failRequest', { requestId: packet.params.requestId, errorReason: 'BlockedByClient' }, packet.sessionId).catch(() => {});
      }
    }
  });
  function send(method, params = {}, session = sessionId) {
    if (signal?.aborted) return Promise.reject(new EvaluationError('interrupted'));
    if (ended || lastError) return Promise.reject(lastError || new EvaluationError('browser-exited'));
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new EvaluationError('browser-timeout', method)); }, 4000);
      pending.set(id, { resolve, reject, timer, method });
      child.stdio[3].write(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }) + '\0');
    });
  }
  const abort = () => { rejectPending(new EvaluationError('interrupted')); child.kill('SIGTERM'); };
  signal?.addEventListener('abort', abort, { once: true });
  async function close() {
    signal?.removeEventListener('abort', abort);
    if (!ended) child.kill('SIGTERM');
    await Promise.race([closed, delay(1000)]);
    if (!ended) { child.kill('SIGKILL'); await Promise.race([closed, delay(1000)]); }
    if (!ended) throw new EvaluationError('termination-unconfirmed');
    await rm(profile, { recursive: true, force: true });
  }
  try {
    const version = await send('Browser.getVersion');
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
    await send('Page.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
    const evaluate = async (fn, ...args) => {
      const result = await send('Runtime.evaluate', {
        expression: `(${fn.toString()})(...${JSON.stringify(args)})`, returnByValue: true, awaitPromise: true,
      });
      if (result.exceptionDetails) throw new EvaluationError('observation-error');
      return result.result.value;
    };
    return { version: version.product, send, evaluate, close,
      async load(html) {
        const { frameTree } = await send('Page.getFrameTree');
        await send('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
      },
      async click(point) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
      },
    };
  } catch (error) { await close(); throw error; }
}
