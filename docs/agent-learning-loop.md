# Agent learning loop and public release

2026-09-10: user authorized implementing failure → experience → new-task delivery →
comparison, actual usage instructions, and publication through the existing Pages workflow.
No dependency, authentication, database or deployment configuration change is needed.
No real-model experiment is authorized by this release unit.

## Bounded product scope

Keep the current evaluator and add reflection, paired task preparation, optional
measurement records, and a generated HTML/JSON comparison report. Add one transfer
task with changed input names and DOM structure. Existing practice tasks remain.
Publish a usable static start page, task catalog, agent instructions, and a clearly
labeled scripted walkthrough report. Keep the playable game collection reachable.
The website never invokes a model or grades remotely; all execution stays local.

Compared directions: a notes-only export is fastest but misses the comparison loop;
the selected paired workflow connects existing primitives with bounded file contracts;
an automatic multi-model curriculum would broaden execution and evaluation scope
before an actual benefit is known. This release uses the paired workflow.

## Contracts and lifecycle

- `reflect WORKSPACE ATTEMPT NOTE.json`: accept bounded prose hypothesis, reusable
  rule, applicability and tags. Attach machine-observed failed-case evidence from
  that exact completed failed attempt. Human/agent prose remains a hypothesis.
  No source CSS is automatically copied. Reflections are immutable by convention,
  hash-linked to task/attempt and stored under the workspace write lock.
- `pair SOURCE TARGET NEW_DIRECTORY [PROTOCOL.json]`: require a different task in
  the same track and at least one valid reflection. Create two fresh workspaces
  for the identical target/version: baseline receives no source history; recall
  receives at most three related reflections and their observed evidence. Freeze
  context digests in workspace metadata before any attempt. Pair manifests bind
  task, conditions and context digests. Existing workspaces remain readable.
- `check` snapshots the frozen delivery identity into every attempt. A changed
  handoff file fails before evaluating. The tool does not run an agent and cannot
  prove the external agent actually read a context file.
- `measure WORKSPACE ATTEMPT METRICS.json`: optional append-only, bounded token,
  agent-time and USD-cost observations, explicitly self-reported. Null/missing
  means unknown, never zero. Keep evaluator runtime separate from agent runtime.
- `compare PAIR NEW_REPORT_DIRECTORY`: take both workspace locks in fixed order,
  snapshot records, verify task/context bindings, and generate HTML/CSS-only plus
  JSON reports. Never overwrite an existing output directory. Distinguish first
  attempt, latest attempt, environment errors, unrun conditions and retries.
  Unknown measurements prevent complete-cost claims; report known subtotals and
  missing coverage, including source practice overhead. No causal-learning score.
- A protocol may declare model, per-task limits, prompt identity, prior exposure,
  and isolated contexts. These are declarations, not runtime attestation. The
  guide requires separate fresh agent sessions for the two conditions. Same-agent
  sequential exposure is contaminated and must not be called a blind experiment.
- `demo NEW_DIRECTORY` uses prescribed CSS to exercise the workflow, not a model.
  Both comparison conditions receive the same correct CSS. The source practice
  has a deliberate failure and correction. Report is explicitly `scripted-demo`;
  no fabricated model/usage/improvement claim. Public example contains no local
  paths, user prompts, credentials or personal workspace data.

Local data remains editable; hashes catch accidental mismatches, not malicious
rewriting of both records and tools. Check/reflect/measure share a workspace lock;
pair reads source evidence under its lock; compare uses the frozen source snapshot and locks both conditions
in deterministic order. Incomplete preparation is left identifiable, not silently
repaired. No automatic stale-lock deletion, overwrite, network call, or model call.
Escape every user-supplied string in HTML reports; never interpolate note text as
markup/script. Limit record counts and sizes. Reject links and path traversal in
task-controlled file names and symlink record files/directories.

## Acceptance

1. A real browser failure produces observed evidence; a bounded prose reflection
   is saved without upgrading its causal hypothesis to a fact.
2. A renamed/restructured transfer task is delivered to fresh baseline/recall
   workspaces; only recall gets related experience and neither gets source CSS.
3. Changed delivery/task/attempt metadata and incomplete or busy workspaces fail
   explicitly. A repeated reflection/measurement cannot overwrite prior evidence.
4. Generated reports preserve first failure even after success, separate unknown
   cost and environment failures, render unrun conditions honestly, and escape HTML.
5. The scripted walkthrough runs end-to-end in installed Chromium with no model.
   Documentation commands are actually executed; a source checkout and installed
   Chrome are the stated requirements. No npm install is needed for the runner.
6. Static site contains no runtime JS, gives copyable agent instructions, links
   catalog/example/source and preserves the games. Check 320px and desktop access.
7. Focused tests, full required verifier, independent design/implementation review,
   existing Pages deployment, and public asset checks pass for the published commit.

## Release boundary

Publish source/tooling and static public assets only, never `.waymark`, local
workspaces, attempt histories or personal logs. The public report is derived from
the controlled demo, with its provenance stated. Keep `.github`, package manifests
and build configuration unchanged. Existing workflow builds only the static site.
Rollback is a reviewed revert commit followed by the existing Pages workflow.
The user has explicitly requested publication; no further generic approval round
is needed for that deployment. Runtime permission gates still apply.

## Verification record — 2026-09-10

- Independent design and implementation reviews: APPROVE, no blocking findings.
  Reviewer execution model metadata was unavailable; no model identity is asserted.
- Actual Chromium suite passed 13/13 before the standalone CLI entrypoint fix.
  A separate documented `demo` invocation then passed after that fix; a child-process
  regression now covers the entrypoint and comparison commands.
- Final required `node scripts/verify.mjs`: 12 passed, two explicitly opt-in browser
  tests skipped; production asset equality, links and no-JS checks passed.
- Existing nine puzzles: 236 states and 137 ray segments passed unchanged.
- In-app browser: learning landing and report readable at 320px, document width
  320px without horizontal overflow, zero scripts. Desktop landing visually checked.
- Release uses the existing main/Pages workflow; pre-release main was
  `1d4886be94b939623828b14a7cac1da2b1b29c0b`. Revert the release commit to roll back.
