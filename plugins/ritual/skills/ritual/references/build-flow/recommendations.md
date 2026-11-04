<!-- GENERATED from references/build-flow.src.md by the Ritual monorepo internal guard — DO NOT EDIT. -->
<!-- source-sha: 1ed60b58b757af57 -->

# /ritual build — Recommendations (generated; do not edit)

This file holds Steps 9 to 9.6.3 of `/ritual build`.
The previous phase is `references/build-flow/discovery.md`.
Read `references/build-flow/brief.md` only when you reach its first step, and read it then in full. Reading it earlier loads text you do not need yet.
The index `references/build-flow.md` lists every phase with its step range. A step named here that lives in another phase is found through that index.

## In this phase

Read the step you are on by its line range; the file is long and the other steps wait their turn.

- Step 9 — Review recommendations (compact landing → proceed or expert) (lines 24 to 207)
- Step 9.5 — Wait for requirements (auto-triggered by Step 9) (lines 208 to 247)
- Step 9.6 — Audit the recommendations + requirements against declared anti-goals (load-bearing — audit-repair loop) (lines 248 to 267)
- Step 9.6.1 — Render the gate prompt (mode-aware) (lines 268 to 290)
- Step 9.6.2 — Run the audit (when chosen or in strict mode) (lines 291 to 330)
- Step 9.6.3 — Render the findings + repair-action menu (lines 331 to 437)

---

#### Step 9 — Review recommendations (compact landing → proceed or expert)

**Plugin-attached:** this review can be a plugin-owned surface (see *Plugin-attached rendering*). Two different triggers, and they collapse DIFFERENT things:

**Always call `get_recommendations` first — the pointer replaces the TEXT, never the call.** On a component surface that call IS the rendering: its result carries the card component and `componentAttached: true`, so skipping it leaves the user staring at a pointer to a panel that was never mounted. There is no ambient drawer holding recs on a component surface; the tool result is the panel.

- **`.ritual/plugin.local.json` `active: true`** (the Ritual board + drawer) → the board already shows recs read-only. Call `get_recommendations` anyway (the gate needs the set), then render `↳ Review recommendations in the Ritual panel, then reply \`proceed\`.` and omit the rail — the board carries live progress.
- **`get_recommendations` returned `componentAttached: true` AND this host confirms the cards are visible** → use the inline cards. The metadata flag alone is not evidence of a rendered component; on a text-only surface use the compact landing below. Keep the rail, suppress the compact landing AND the category walk. Render EXACTLY this:

  ```text
  Ritual build
  ✓ Scope · ✓ Discovery · ▶ Recommendations · {Deliverable} · Implementation

  ↳ Review recommendations in the Ritual panel, then reply `proceed`.
  ```
- **Neither** → render the compact landing / category walk below, in full.

The non-blocking review still records `reviewedAt`/`reviewedBy` on `proceed`; the gate and its tokens are unchanged.

This is the most-read screen in the build flow, and it is a **non-blocking review**. Recommendations are **auto-accepted at generation** (created `approved`); the artifacts that depend on them (requirements, the deliverable doc, and — for developer-function jobs — the build brief) are **already being generated** the moment rec-gen completes. Step 9 is the user's chance to **read and refine** the set, not an accept-or-reject gate. Replying `proceed` records that a human reviewed it (stamps `reviewedAt` / `reviewedBy`) and continues to the build brief — it never blocks, and there is **no reject path here**.

**Landing-first:** show the workflow rail with Recommendations active, then one concise task-specific sentence from the agent explaining the proposed recommendations, then total recommendation/category counts, and one bullet per category with its recommendation count. Below the categories, put the environment-correct **Review in Ritual ↗** link and **`show recommendations` in chat** on the SAME line. End with **`proceed` — continue to the {Deliverable}** as the primary CTA. No scope recap, recommendation titles/descriptions, Pulse paragraph, or extra Next heading by default. Opening the workspace and showing the list are optional and never advance the workflow.

**Already-approved continuation:** if the user explicitly approved `proceed` in advance, still render this recommendation landing before continuing. The approval removes the wait, not the workflow rail, introduction, category counts, or review actions. Do not replace the landing with a paragraph narrating that approval. Record the existing review choice and continue only within the user’s authorized scope.

**Introduction:** directly below the workflow rail, write one short sentence grounded in this exploration and its recommendations. For example: “These recommendations focus on making the controls and help text match how the game actually works.” Explain the proposal, not the process; do not repeat the problem statement, narrate tools, claim the brief is ready, or add a Pulse paragraph. Pass it as `intro` to `render_gate`. Older callers without `intro` receive the neutral fallback “These recommendations are based on your discovery answers.”

**Workspace link:** use `explorationUrl` from the current `get_exploration_status` result. It is resolved from that deployment's configured web URL. Never hardcode SaaS or derive a customer web hostname from an auth/API hostname. If the URL is absent, keep `show recommendations` in chat on its own; do not invent a link. Existing servers that omit the field remain usable.

**Readiness:** recommendations ready does NOT imply the brief is ready. The landing makes no brief-readiness claim. On `proceed`, continue the existing status checks and open the actual brief or show its existing generation progress.

**Data source.** Use `get_recommendations(exploration_id)` (the raw array) — the walk shows full per-rec content, so you need the fields a titles-only preview omits:

- top-level: `id`, `title`, `content` (the description / summary), `status`, `priority`, `points`, `confidence`
- `categoryName` — **the load-bearing grouping key** (one rec → one category; `get_recommendations` exposes it top-level so you never reach into raw metadata for it)
- `metadata.explainability` — `rationale` (chained `→` arrow string), `faq_references[]`, `problem_alignment`, `inferred_elements`
- `metadata.acceptance_criteria[]` — concrete pass conditions (optional to surface; see § 9.1)

Assign stable `R1..RN` IDs **globally across all categories** in page order (NOT restarting per-category), and remember the `R{N}` → `id` map so you can resolve `edit R{N}` to the rec UUID for the MCP calls.

**Vocabulary — load-bearing:**

- Recommendations are grouped by **category** (the `categoryName` field). They are **NEVER** grouped by `matter` or by `Area` — those are discovery-phase concepts. `matter_id` must never appear in user-facing copy. Anti-pattern observed in agent output: *"44 recs grouped by matter"* — the right framing is *"44 recs across K categories."*
- Do NOT use "Reasoning chain" / "reasoning_chain" in user-facing copy. The user-visible label is **"Why this"** — a short Problem / Discovery / Tradeoff distillation derived from the `rationale` field, NOT the literal `→` arrow chain (that's the model's internal scratchpad shape).

**Action set — load-bearing.**

- `proceed` — record the existing human review and continue to the job's deliverable (§ 9.3). Primary CTA; viewing details is never required.
- `show recommendations` — display the full set in chat, grouped by category (§ 9.1a). Read-only; never marks reviewed, accepts, regenerates, or advances anything. Keep `expert` as an unadvertised compatibility alias for this same view. For existing gate-choice telemetry, normalize either spelling to `gate: recs_review`, `choice: expert`; this never records recommendation review.
- The Review in Ritual link opens the same exploration without recording a workflow choice.

Within the expanded list, `drill R{N}` opens one recommendation and `edit R{N} <change>` uses the existing preview-before-apply flow. No reject/drop, comment, pagination, or new approval gate is introduced.

##### 9.1 — The compact landing: category counts and optional review links

**Zero-rec guard:** only render this landing once normal readiness reads say recommendations are ready and the set is nonempty. Existing generating/empty/failed behavior stays unchanged.

**[USER PAUSE]** Render the following compact layout, substituting the actual job deliverable and terminal in the rail. Show every category; compute each count from its recommendations. Use “recommendation” / “category” for a count of one. Keep the two secondary review actions together, ABOVE the primary `proceed` CTA.

```text
Ritual build
✓ Scope · ✓ Discovery · ▶ Recommendations · {Deliverable} · Implementation

{one-sentence introduction explaining these recommendations}

{N} recommendations across {K} categories

- {Category name 1} — {count} recommendations
- {Category name 2} — {count} recommendations

[Review in Ritual ↗](<{explorationUrl}>) · `show recommendations` in chat

`proceed` — continue to the {Deliverable}
```

Counts refer to recommendations, never unexplained numbers. No titles, descriptions, R-IDs, scope recap, or routine Pulse paragraph appear here; details belong in the optional expanded list. Only surface a concise unresolved decision separately when it materially affects continuing. Never fabricate brief completion or change the primary action to “write” based on recommendation readiness.

##### 9.1a — `show recommendations`: the full list in chat

On `show recommendations` (or legacy `expert`), render the SAME complete set grouped by category, with stable global `R1..RN` identifiers, each title and a short description. Retain those identifiers when returning from drill/refine; never renumber within each category. This expands the existing review pause; it is not a new decision point and never mutates recommendations, the review mark or workflow state.

```text
Ritual build
✓ Scope · ✓ Discovery · ▶ Recommendations · {Deliverable} · Implementation

{Category name 1}
R1 · {title}
{short description}

R2 · {title}
{short description}

{Category name 2}
R3 · {title}
{short description}

{every remaining recommendation, grouped by category}

Reply `drill R{N}`, `edit R{N} <change>`, or `proceed` to continue to the {Deliverable}.
```

“Why this” and pass criteria remain in the single-recommendation drill view. Do not dump raw metadata, confidence scores or internal reasoning traces. All existing refinement and review-recording rules below still apply.

##### 9.1b — `drill R{N}`: one recommendation in full

**[USER PAUSE]** Render the single recommendation completely, then wait:

```text
Recommendations · R{N} — {title}

{content — the full description, wrapped at terminal width}

Why this: {one-line Problem→Discovery→Tradeoff distillation, plain prose}
Pass: {acceptance_criteria, one line each — omit the block if empty}

Reply  edit R{N} <your change>   ·   back (all recommendations)   ·   proceed (continue to the {Deliverable})
```

`back` re-renders the landing (§ 9.1, unchanged). Drilling is read-only — nothing advances or persists.

##### 9.2 — `edit R{N} <ask>`: preview, then apply

Revise → preview → apply: the change is **previewed before anything persists**.

1. Resolve `R{N}` → rec UUID from the walk's ID map.
2. Call `preview_recommendation_edit({ recommendation_id, instruction: "<the user's ask, verbatim>" })`. This runs an LLM and returns a **transient proposal** — nothing is mutated yet. It carries `id` (the proposal id), `summary` ("what changed"), and `diff[]` of `{ field, before, after }` where `field` is `title`, `description`, or `chain.<idx>`.
3. **[USER PAUSE]** Render the preview and wait:

```text
Recommendations · R{N} — proposed revision

What changed: {proposal.summary}

Title
- {before}
+ {after}

Description
- {before}
+ {after}

Why this — step {i}
- {before}
+ {after}

Reply  apply (save this revision)   ·   discard (keep the original)
```

   - Render ONLY the `diff` fields that are present. Map `field: "title"` → `Title`, `"description"` → `Description`, `"chain.<idx>"` → `Why this — step {idx+1}`.
   - If the proposal's `diff` is empty (the LLM found no meaningful change), say so plainly and return to the category view unchanged — don't fabricate a diff.

4. On `apply`: call `apply_recommendation_proposal({ recommendation_id, proposal_id })`. It persists a new version, replays the reasoning chain, and returns the applied proposal. Re-fetch the rec (`get_recommendations`) and **re-render the view the user came from** — the landing (§ 9.1) or the drill view (§ 9.1b) — with R{N} updated in place.
   On `discard`: return to that view unchanged — nothing was persisted.

Editing is non-destructive and does not advance the flow — the user can `edit` several recs before `proceed`.

##### 9.3 — `proceed`

- **`proceed`** (from the landing or any drill view) → call `accept_recommendations({ exploration_id })`. Under the non-blocking model this **records the human review** (stamps `reviewedAt` / `reviewedBy`) and advances; it is NOT a draft→approved promotion (the recs are already `approved`). The downstream artifacts were queued at rec-gen time, so this returns fast. Then show the completion rail and continue to Step 9.5:

```text
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · {Deliverable} · Implementation

Reviewed {N} recommendations.

Next: generate the {Deliverable}.
```

(The `{Deliverable}` stage stays unmarked, not `▶` — this screen records the review and names what's next; the stage flips to `●` only when brief generation actually starts. Render `{Deliverable}` as the job's `deliverableTemplate`, e.g. `Frontend Feature Brief`, never the literal "Build brief".)

**Pulse (recommendations reviewed):** emit a pulse — this is almost always a state-tier crossing into **Recommendation-ready**. Render full.

Continue to Step 9.5 (`Wait for requirements`).

#### Step 9.5 — Wait for requirements (auto-triggered by Step 9)

`accept_recommendations` fires requirement generation **fire-and-forget** the moment it succeeds. By the time you reach this step, generation is already in flight (or done, for fast LLM calls). The brief in Step 10 needs requirements ready, so wait here.

Steps:

1. **Tell the user once** that requirements are being generated:

   > Generating requirements for the build brief…

2. **Poll `get_requirement_set_status(exploration_id)` every ~5s.** The response shape:

   ```
   {
     exists: boolean,
     status: 'GENERATING' | 'READY' | 'FAILED' | null,
     icp, startedAt, completedAt, errorMessage
   }
   ```

   Polling rules:
   - **One poll per turn, at a constant cadence. Never escalate.** A short constant cadence keeps the user-facing progress feel live; a creeping one turns the loop into a stall.
   - **Update the user every ~3 polls** with a "still generating…" line so they know you haven't stalled.
   - If polling crosses ~5 minutes, keep the same constant cadence — a long operation is more polls, not longer waits.

3. **Exit conditions:**

   | Response | Action |
   |---|---|
   | `status === 'READY'` | Proceed to Step 10 |
   | `exists === false` (still null) for 3+ polls | The fire-and-forget hasn't reached the DB yet, OR `proceed` (accept_recommendations) hasn't run yet (no LLM call yet). After several polls either keep polling OR proceed to Step 10 — the API auto-triggers generation inline if the set is still missing when the brief is requested (adds ~30s to the brief call but never hard-fails). |
   | `status === 'GENERATING'` | Keep polling |
   | `status === 'FAILED'` | Surface `errorMessage` to the user; offer to retry by calling `generate_build_brief` directly (which will auto-trigger a fresh generation), OR by hitting `POST /requirements?force=true` via the web UI |

4. **Special case — `proceed` not yet called (accept_recommendations hasn't run):** if the user jumped ahead without the rec-review `proceed`, there's no fire-and-forget auto-trigger from that path. Skip the polling entirely and let Step 10's auto-trigger handle requirement generation inline. The brief call will take ~30s longer than it otherwise would. (Note: auto-finalize at rec-gen completion usually already queued requirements, so this case is rare.)

5. When `status === 'READY'`, render the approved status line `Requirements ready.` and continue to Step 9.6 (if anti-goals exist) OR directly to Step 10 (if no anti-goals, the audit step runs with NO user-visible output).

#### Step 9.6 — Audit the recommendations + requirements against declared anti-goals (load-bearing — audit-repair loop)

Run a constraint-survival audit on the typed Recommendation + Requirement substrate BEFORE brief generation. The audit answers the question: *"Did the anti-goal directives the user declared actually constrain the recs+reqs, or are they decorative?"* — the R4 operator (constraint-perturbation) applied to the (anti-goals, recs+reqs, R4) triple per the audit-triple-framing rule.

**Why this is load-bearing**: an inert anti-goal — declared but not actually constraining anything in the recs+reqs — propagates downstream as an unconstrained brief. By Step 11 (implementation) it's too late; the agent codes against a substrate whose forbidden states were never enforced. The audit catches inert directives at the upstream typed substrate where the fix is cheap (rec content edit), not at the brief markdown where the fix is expensive (full regen).

**Skip condition**: if the exploration has zero anti-goals (`set_anti_goals` was never called OR all anti-goals are `confidence < 0.4`) OR no APPROVED recommendations exist OR the latest RequirementSet isn't READY, skip this step with NO user-visible output and continue to Step 10. The audit tool returns 404 in any of those cases; check the substrate state first if unsure.

**Build modes** (set by the Step 0.1 flags) — the gate prompt below renders differently depending on which mode flag the user invoked:

| Mode | Prompt behavior | Default on enter |
|---|---|---|
| bare `/ritual build` | Compact opt-in: "Reply `audit` or `proceed`" | `proceed` |
| `/ritual build --audited` | Elevated: "Recommended: run constraint-survival audit. Reply `audit`, `proceed`, or `always audit for this build`" | Awaits user input (no implicit default) |
| `/ritual build --audit=strict` | Audit auto-runs; user sees results + repair menu, not the gate prompt | N/A (no gate prompt rendered) |

`auditMode` is read from working memory (set at Step 0 from the user's invocation flags). Mid-flow, `always audit for this build` upgrades the session to `--audit=strict` behavior for any remaining audit gates (brief verification at Step 10b.5 and plan audit at Step 11.1).

**Strict mode time budget**: each audit chain runs up to 3 iterations of verifier calls (~5-15s per iteration × 3 = ~15-45s typical). Hard wall-clock cap of 90s per chain — on timeout, the gate degrades to `--audited` behavior (surface findings, let user decide rather than block the build).

### Step 9.6.1 — Render the gate prompt (mode-aware)

**For `bare` mode:**

```text
Recommendations + requirements are ready. Optional constraint-survival audit available.

Reply `audit` to run, or `proceed` to skip the audit and generate the {Deliverable}.
```

**For `--audited` mode:**

```text
Recommendations + requirements are ready.

Recommended: run constraint-survival audit before brief generation.
This checks whether anti-goals survived into the recs + requirements.

Reply `audit` to run, `proceed` to skip and generate the {Deliverable}, or `always audit for this build`.
```

**For `--audit=strict` mode:** SKIP the prompt; jump directly to Step 9.6.2 (run the audit).

### Step 9.6.2 — Run the audit (when chosen or in strict mode)

Render:

```text
Auditing recs + requirements against {N} declared anti-goal{s}…
```

Call `audit_recommendations({ exploration_id })` with the default config (threshold mode, 80% acceptance threshold, max 3 iterations). The response shape:

```json
{
  "chain_id": "ac-...",
  "audit_status": "ok" | "needs_attention" | "blocked",
  "iteration": 1,
  "findings": [
    {
      "repair_id": "ri-...",
      "after_audit_id": "...",
      "severity": "blocker" | "high" | "medium" | "low",
      "directive_text": "Audit log must be append-only.",
      "status": "inert" | "omitted" | "weakened" | "contradicted",
      "gap_kind": "global_inert" | "local_gap" | "weak_coupling" | "contradiction",
      "affected_entities": [{"entity_type": "recommendation", "entity_id": "..."}],
      "message": "Anti-goal #2 is referenced but not by the entity it most-applies-to — ...",
      "auto_dispatchable": true | false
    }
  ],
  "summary": {
    "total_constraints": 7,
    "survival_rate_percent": 57,
    "by_severity": { "blocker": 1, "high": 0, "medium": 2, "low": 0 },
    "by_gap_kind": { "global_inert": 1, "local_gap": 2, "weak_coupling": 0, "contradiction": 0 }
  },
  "decision_reason": "...",
  "attestation_digest": "sha256:...",
  "next_step_hint": "..."
}
```

### Step 9.6.3 — Render the findings + repair-action menu

Render based on `audit_status`:

**`audit_status: "ok"`** — survival rate met threshold AND no blockers. Render one line and proceed to Step 10:

```text
✓ Audit passed: {survival_rate_percent}% of {total_constraints} anti-goals preserved. Chain accepted.
```

**`audit_status: "needs_attention"` or `"blocked"`** — surface the findings inline so the user sees them before deciding:

```text
⚠ Audit — {iteration} of {max_iterations} — {audit_status}

  {survival_rate_percent}% of {total_constraints} anti-goals preserved.
  Findings ({findings.length} total):
    {for each finding, severity-prefixed (⛔ blocker / ⚠ high / · medium / · low):}
    {severity_glyph} {repair_id} — {directive_text}
       status: {status} · gap: {gap_kind} · affects: {affected_entities.length} entit{ies/y}
       {message[:120]}…

Reply:
  · `resolve all`              — apply all auto-dispatchable repairs, re-audit
                                  (recommended — your config has blocker findings
                                   set to always_resolve)
  · `resolve {repair_id}`      — apply a single repair (good for inspection)
  · `waive {repair_id}: <reason>`
                                — record explicit acceptance of one finding;
                                  document the gap and continue
  · `accept`                   — accept current substrate, document all remaining
                                  findings as gaps (BLOCKED while any
                                  blocker-severity finding remains; the chain
                                  config enforces this)
  · `show chain`               — render the full audit chain trail
```

**On `resolve all`** — for each `auto_dispatchable: true` finding, call `apply_repair({ repair_id, chain_id, after_audit_id })`. Each call returns:

```json
{
  "action_id": "ra-...",
  "action": "apply",
  "status": "applied",
  "next_iteration_id": "...",
  "hint": "Re-audit ran (SurvivalReport ...). Call get_audit_chain with chain_id=... to see the updated trail and whether the chain accepted."
}
```

Apply-repair is sequential per finding; the server runs the next audit iteration inline after each successful apply, so call them in order.

**A timeout is NOT a failure — never re-dispatch the same repair on one.** The
inline re-audit is an LLM pass, and it routinely outruns the MCP client's 30s
hard timeout: the call returns `HTTP 0: timeout of 30000ms exceeded` while the
server finishes the work anyway. Re-sending the repair then applies it twice, or
lands on a chain that has already moved on.

On any timeout, recover by READING instead:

1. Call `get_audit_chain({ chain_id })`.
2. If the trail shows the repair applied, continue with the NEXT finding — the
   timeout cost you a response, not the work.
3. If it did not apply, re-dispatch that one repair once.

**Stop the moment `chain_status` is terminal.** `accepted`,
`halted_max_iterations`, `halted_unresolvable` and `halted_user_paused` all end
the chain, and the server rejects further iterations with
`400 … cannot run next iteration on a terminated chain`. Check the status after
every apply and after every timeout recovery, and when it is terminal render the
end state rather than dispatching the remaining findings. A 400 here is the flow
learning something it could have read. After the last `auto_dispatchable: true` finding, call `get_audit_chain({ chain_id })` to fetch the final state and re-render the loop UX with the new survival rate. If `chain_status === 'accepted'` after this round, proceed to Step 10; otherwise re-render the findings (the chain may have iterated and produced new findings the next iteration surfaces).

**On `resolve {repair_id}`** — single-finding apply. Same dispatch shape; render the next iteration's findings on completion.

**On `waive {repair_id}: <reason>`** — `apply_repair({ repair_id, chain_id, after_audit_id, action: 'waive', waive_reason: '<reason>' })`. No re-audit; render confirmation + return to the loop UX.

**On `accept`** — only allowed when no `blocker`-severity findings remain (the L1 tool returns `audit_status: "blocked"` while they do). Surface a single confirm: *"Accepting substrate with {findings.length} documented gap(s). Proceed?"* On yes, proceed to Step 10. The audit chain's final state is recorded; future `/ritual lineage` on this exploration surfaces the chain trail + the gaps the user explicitly accepted.

**On `show chain`** — render the full trail (iterations + repairs + status) from `get_audit_chain`. Keep it compact: one line per iteration + one line per repair. Then re-render the loop UX so the user can pick their next action.

**On `pause`** — stop here. Chain stays `in_progress`; resume via `/ritual resume`.

**On `halt_unresolvable`** (chain reached `max_iterations` with unresolved must-resolve findings) — the L1 tool returns `audit_status: "blocked"` and the chain is terminated. Surface:

```text
⛔ Audit halted after {max_iterations} iterations — {n_blockers} blocker(s) unresolved.

The repair loop didn't converge. Options:
  · `extend max-iterations <N>`  — re-run the audit with a higher cap (creates a new chain)
  · `force accept`               — proceed to Step 10 with the substrate as-is; remaining
                                   blockers are recorded on the chain trail but no longer
                                   gate the build flow
```

**Special: contradiction-class findings** — when a finding has `gap_kind: "contradiction"`, it surfaces as `auto_dispatchable: false`. The repair (`replace_recommendation`) IS implemented and CAN be applied via `apply_repair {repair_id}`, but `resolve all` skips it because replacing a rec is a structural change worth explicit user consent. The SKILL should render contradiction findings with an explicit "needs review" prefix:

```text
⛔ {repair_id} — CONTRADICTION — {directive_text}
   A rec actively violates this directive. `replace_recommendation` will regenerate the rec
   under the constraint. Confirm by replying `resolve {repair_id}` explicitly.
```

**Verifier-generator separation**: the audit's verifier model is automatically resolved by the server to a different family than whichever model generated the recs — agents don't need to manage this; it's enforced at the API. The audit's attestation digest records both model ids for post-hoc auditability.
