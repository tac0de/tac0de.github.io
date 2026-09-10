import { openBrowser, EvaluationError } from './browser.mjs';
import { validateTask, validateSubmission, booleanValue } from './contracts.mjs';

export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function stableObservation(read, { stableSamples, intervalMs, timeoutMs }, signal) {
  const until = performance.now() + timeoutMs;
  let previous, count = 0;
  do {
    if (signal?.aborted) throw new EvaluationError('interrupted');
    const observed = await read(), serialized = JSON.stringify(observed);
    count = serialized === previous ? count + 1 : 1;
    if (count >= stableSamples) return { stable: true, observed };
    previous = serialized;
    await pause(intervalMs);
  } while (performance.now() < until);
  return { stable: false, observed: null };
}

// This function is inspector instrumentation, never shipped or inserted as a page script.
function inspect(checks) {
  const one = selector => {
    const nodes = document.querySelectorAll(selector);
    if (nodes.length !== 1) throw Error('Invalid fixed DOM');
    return nodes[0];
  };
  function rendered(element) {
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) !== 1) return false;
    }
    const r = element.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  }
  function usable(element) {
    const r = element.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    const label = hit?.closest('label');
    const target = hit === element || element.contains(hit) || label?.control === element;
    return { usable: rendered(element) && !element.matches(':disabled') && !element.closest('[inert]') && Boolean(target), x, y };
  }
  const form = one(checks.form);
  const controls = checks.controls.map(input => {
    const el = one(input.selector);
    return { name: input.name, checked: el.checked, defaultChecked: el.defaultChecked,
      valid: el.tagName === 'INPUT' && el.type === input.type && el.form === form,
      ...usable(el) };
  });
  const reset = one(checks.reset.selector);
  const outputs = checks.outputs.map(output => {
    const el = one(output.selector);
    return { selector: output.selector, on: rendered(el), off: getComputedStyle(el).display === 'none' };
  });
  const motion = [...document.querySelectorAll('*')].some(el => {
    const style = getComputedStyle(el);
    return style.animationName !== 'none' || style.transitionDuration.split(',').some(time => parseFloat(time) !== 0);
  });
  return { formValid: form.tagName === 'FORM' && form.querySelectorAll('input').length === checks.controls.length, controls, outputs, motion,
    reset: { valid: reset.tagName === 'BUTTON' && reset.type === 'reset' && reset.form === form, ...usable(reset) } };
}

function submissionRules() {
  const sheet = document.querySelector('#agent-css-submission').sheet;
  let forbidden = false, declarationCount = 0;
  const walk = rules => {
    for (const rule of rules) {
      if (rule.type === 3 || rule.type === 7 || rule.type === 5) forbidden = true;
      if (rule.selectorText && /:(?:focus(?:-visible|-within)?|hover|active|target(?:-within)?|visited|link|any-link|user-valid|user-invalid)\b/i.test(rule.selectorText)) forbidden = true;
      if (rule.style) {
        declarationCount += rule.style.length;
        if ([...rule.style].some(property => /^(?:-\w+-)?(?:animation|transition)/.test(property)
          || /url\s*\(/i.test(rule.style.getPropertyValue(property)))) forbidden = true;
      }
      if (rule.cssRules) walk(rule.cssRules);
    }
  };
  walk(sheet.cssRules);
  return { forbidden, declarationCount };
}

export async function evaluate({ task, html, css, chrome, signal }) {
  const result = { status: 'environment-error', browserVersion: null, cases: [], errorCode: null, cleanupConfirmed: true };
  let browser;
  const deadline = new AbortController();
  const combined = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
  const timeout = setTimeout(() => deadline.abort(), 60000);
  try {
    validateTask(task);
    validateSubmission(css);
    browser = await openBrowser({ chrome, signal: combined });
    result.browserVersion = browser.version;
    await browser.load(html);
    let initial;
    try { initial = await browser.evaluate(inspect, task.checks); } catch (error) {
      if (error.code === 'observation-error') throw new EvaluationError('invalid-task-dom');
      throw error;
    }
    if (!initial.formValid || !initial.reset.valid || initial.controls.some((c, i) => !c.valid
      || c.checked !== task.checks.controls[i].defaultChecked || c.defaultChecked !== task.checks.controls[i].defaultChecked))
      throw new EvaluationError('invalid-task-dom');
    await browser.load(html.replace('</head>', `<style id="agent-css-submission">${css}</style></head>`));
    const rules = await browser.evaluate(submissionRules);
    if (rules.forbidden) throw new EvaluationError('unsupported-css');
    if (!rules.declarationCount && css.replace(/\/\*[\s\S]*?\*\//g, '').trim()) throw new EvaluationError('invalid-css');
    const checks = task.checks;
    const expectedDefault = checks.reset.expectedChecked;
    const observe = () => browser.evaluate(inspect, checks);
    const record = async (caseId, expectedState, actionError = null) => {
      const sampled = await stableObservation(observe, checks.observation, combined);
      const observed = sampled.observed;
      if (observed?.motion) throw new EvaluationError('unsupported-css');
      const errors = [];
      if (actionError) errors.push(actionError);
      if (!sampled.stable) errors.push('unstable-observation');
      if (observed) {
        for (const control of observed.controls) {
          if (!control.valid || !control.usable) errors.push(`input-unusable:${control.name}`);
          if (control.checked !== expectedState[control.name]) errors.push(`input-state:${control.name}`);
        }
        if (!observed.reset.valid || !observed.reset.usable) errors.push('reset-unusable');
        checks.outputs.forEach((output, i) => {
          const expected = booleanValue(output.when, expectedState);
          if (!(expected ? observed.outputs[i].on : observed.outputs[i].off)) errors.push(`output-mismatch:${output.selector}`);
        });
      }
      result.cases.push({ caseId, inputState: expectedState,
        expected: checks.outputs.map(output => ({ selector: output.selector, on: booleanValue(output.when, expectedState) })),
        observed, passed: errors.length === 0, errorCodes: errors });
    };
    await record('initial', expectedDefault);
    for (let bits = 0; bits < 2 ** checks.controls.length; bits++) {
      const state = Object.fromEntries(checks.controls.map((c, index) => [c.name, Boolean(bits & (1 << index))]));
      let actionError = null;
      for (const input of checks.controls) {
        const current = await observe();
        const control = current.controls.find(c => c.name === input.name);
        if (control.checked !== state[input.name]) {
          if (!control.usable) { actionError = `input-unusable:${input.name}`; break; }
          await browser.click(control);
        }
      }
      await record(`state-${bits}`, state, actionError);
      const current = await observe();
      if (current.reset.usable) await browser.click(current.reset);
      await record(`reset-${bits}`, expectedDefault, current.reset.usable ? null : 'reset-unusable');
    }
    result.status = result.cases.every(test => test.passed) ? 'passed' : 'failed';
  } catch (error) {
    result.errorCode = error.code || 'evaluator-error';
    if (error.code === 'termination-unconfirmed') result.cleanupConfirmed = false;
    if (signal?.aborted) { result.status = 'interrupted'; result.errorCode = 'interrupted'; }
    else if (deadline.signal.aborted) { result.status = 'environment-error'; result.errorCode = 'evaluation-timeout'; }
    else if (['unsupported-css','unsupported-interaction-selector','submission-size-limit','invalid-css'].includes(error.code)) result.status = 'invalid-submission';
    else if (['invalid-task','unsupported-task','invalid-task-dom'].includes(error.code)) result.status = 'invalid-task';
    else result.status = 'environment-error';
  } finally {
    clearTimeout(timeout);
    if (browser) {
      try { await browser.close(); } catch {
        result.status = 'environment-error'; result.errorCode = 'termination-unconfirmed'; result.cleanupConfirmed = false;
      }
    }
  }
  // Invalid submissions and unavailable environments cannot receive a positive score.
  result.summary = { passed: result.cases.filter(c => c.passed).length, total: result.cases.length,
    completed: ['passed','failed'].includes(result.status) };
  return result;
}
