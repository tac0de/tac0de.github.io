export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function renderComparison(r) {
  const e = escapeHtml;
  const metric = m => m.total === null ? `Unknown <small>${e(m.knownSubtotal)} known · ${e(m.missing)} missing</small>` : e(m.total);
  const status = a => a ? e(a.status) : 'Not run';
  const cases = a => a?.summary?.completed ? `${e(a.summary.passed)} / ${e(a.summary.total)}` : '—';
  const trial = (label,c) => `<tr><th scope="row">${label}</th><td>${status(c.first)}<small>${cases(c.first)} checks</small></td><td>${status(c.latest)}</td><td>${e(c.attemptCount)}</td></tr>`;
  const costRow = (label,c) => `<tr><th scope="row">${label}</th><td>${metric(c.tokens)}</td><td>${metric(c.agentSeconds)}</td><td>${metric(c.costUSD)}</td></tr>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'">
<title>Transfer evidence · The Power of CSS</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f0eee6;color:#171715;font:16px/1.6 system-ui,sans-serif;overflow-wrap:anywhere}main{max-width:1040px;margin:auto;padding:28px 24px 60px}header{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-bottom:20px;border-bottom:2px solid}h1{font-size:clamp(34px,6vw,68px);line-height:1.05;letter-spacing:-.045em;margin:34px 0 16px}h2{margin:30px 0 12px;font-size:22px}.label{font:12px/1.5 ui-monospace,monospace;letter-spacing:.04em}.notice{padding:16px 20px;border-left:5px solid #b82d19;background:#e5e1d6}.columns{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:32px}.section{border-top:2px solid;margin-top:28px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:12px 7px;border-bottom:1px solid #bcb8ae;vertical-align:top;font-weight:400}th{font-weight:650}thead th{font-size:12px;color:#59564f}small{display:block;font-size:12px;color:#59564f}.experience{padding:16px 0;border-bottom:1px solid #bcb8ae}.experience p{margin:8px 0}.hypothesis{color:#59564f}a{color:#a72514;text-underline-offset:4px}details{margin:18px 0}summary{cursor:pointer}footer{border-top:1px solid #bcb8ae;margin-top:32px;padding-top:16px;font-size:12px;color:#59564f}@media(max-width:650px){.columns{grid-template-columns:1fr;gap:0}main{padding:22px 16px}table{font-size:12px}th,td{padding:10px 4px}}
</style></head><body><main>
<header><strong>THE POWER OF CSS</strong><span class="label">LOCAL EVIDENCE / ${e(r.kind)}</span></header>
<h1>Experience delivered.<br>Results kept separate.</h1>
<p class="notice">${e(r.interpretation)}</p>
<p class="label">TARGET ${e(r.targetId)} · FIRST SUBMISSION IS NEVER REPLACED BY A RETRY</p>
<div class="columns"><section class="section"><h2>New-task attempts</h2>
<table><thead><tr><th>Context</th><th>First attempt</th><th>Latest</th><th>Attempts</th></tr></thead><tbody>${trial('Baseline',r.baseline)}${trial('With experience',r.recall)}</tbody></table>
<p><small>Check totals include initial state and resets, not independent tasks. Environment errors are not wrong answers. No success-rate uplift is inferred from one pair.</small></p>
<h2>Declared comparison conditions</h2><table><tbody>${Object.entries(r.protocol).map(([k,v])=>`<tr><th>${e(k)}</th><td>${e(v ?? 'Unknown')}</td></tr>`).join('')}</tbody></table>
<p><small>${e(r.protocolProvenance)}. ${e(r.exposure)}</small></p></section>
<section class="section"><h2>Experience supplied to recall</h2>${r.experience.map(x=>`<article class="experience"><span class="label">${e(x.sourceTask)} / ${e(x.sourceAttempt)}</span><h3>${e(x.rule)}</h3><p class="hypothesis">Hypothesis: ${e(x.hypothesis)}</p><p>Applies to: ${e(x.applicability)}</p><small>Agent-written hypothesis, not a verified cause. Source CSS excluded.</small><details><summary>Observed failure evidence</summary>${x.observed.map(o=>`<p><strong>${e(o.caseId)}</strong> · ${e(o.errorCodes.join(', '))}<small>Inputs: ${e(JSON.stringify(o.inputState))}</small></p>`).join('')}</details></article>`).join('') || '<p>No experience supplied.</p>'}</section></div>
<section class="section"><h2>Cost coverage</h2><table><thead><tr><th>Scope</th><th>Tokens</th><th>Agent seconds</th><th>Reported USD</th></tr></thead><tbody>${costRow('Source practice (frozen at pairing)',r.sourcePractice.cost)}${costRow('Baseline attempts',r.baseline.cost)}${costRow('Recall attempts',r.recall.cost)}${costRow('Entire recorded scope',r.totalScope)}</tbody></table>
<p><small>Values are self-reported. Missing data remains unknown. All attempts in each scope are counted once; practice after pairing is excluded from this snapshot. Evaluator runtime is separate from agent runtime.</small></p></section>
<footer>Generated ${e(r.generatedAt)} · Public tasks, editable local records · No backend · <a href="report.json">Machine-readable report</a></footer>
</main></body></html>\n`;
}
