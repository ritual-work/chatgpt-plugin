<!-- GENERATED from references/build-flow.src.md by the Ritual monorepo internal guard — DO NOT EDIT. -->
<!-- source-sha: 1ed60b58b757af57 -->

# /ritual build — Build brief (generated; do not edit)

This file holds Steps 10 to 10.5 of `/ritual build`.
The previous phase is `references/build-flow/recommendations.md`.
Read `references/build-flow/implement.md` only when you reach its first step, and read it then in full. Reading it earlier loads text you do not need yet.
The index `references/build-flow.md` lists every phase with its step range. A step named here that lives in another phase is found through that index.

## In this phase

Read the step you are on by its line range; the file is long and the other steps wait their turn.

- Step 10 — Generate the build brief (lines 20 to 290)
- Step 10.5 — Optional UX brief review (entered ONLY when the user picks `ux-review` at Step 10d) (lines 291 to 387)

---

#### Step 10 — Generate the build brief

Before choosing 10a or 10e, read `get_exploration_status`. If `groundingRunsEnabled === true`
and this session can run the CLI in the exploration's bound checkout, follow
`references/grounded-deliverable-flow.md` for this step. That path owns generation and checks;
do not also run 10a–10b.5. On success return to 10c (implementation jobs) or the file-writing
part of 10e (other jobs), then the unchanged 10d confirmation. Missing/false capability or
no local checkout keeps the existing path below. Never infer support from the URL or client name.

**Branch on the job's `terminal` first.** `implement` (every classic build): run 10a–10d below. Any other terminal (`generate-evals`, `execute-plan`, `record-decision`, `investigate`, `deliver`): there is NO Build Brief for this job — skip 10a–10c and run **10e** (fetch the deliverable), then 10d.

The Build Brief is the markdown document the engineer reads RIGHT BEFORE writing code. It bridges accepted recommendations + synthesized requirements with the implementation. It opens with **READ THIS FIRST — These Will Block Review If Missing** (the RB-numbered table of must-haves); the sections after it are the ones the server defines for this job, so read them from the generated brief rather than from a list here. Two of them matter to the inputs you pass below: **Codebase Anchors** is grounded in Step 3's recon, and **Previously Deferred — Worth Addressing?** is present only when `sources` overlap prior implementations with open deferrals.

##### 10a — Call `generate_build_brief`

Call `generate_build_brief` with:

- `exploration_id`
- `icp` — **omit this.** The brief sources from the requirement set the flow already generated (on accept), whose ICP the server resolves from the exploration's persona/template. Passing a different ICP here forces a redundant requirement regeneration and a slow cold start. The engineering flavor is already baked into the server-resolved template — you do not need to (and should not) pass `TECH_PM` or any other ICP.
- `recon_context` — the Step 3 `codebase_context_packet` plus any explicit phase/later candidates from discovery. Do not pass raw recon notes. This grounds "Codebase Anchors" in real file paths while keeping agent hypotheses auditable and non-authoritative.
- `sources` — the **same** file-path array passed to `generate_sub_problems` and `generate_scope` in Steps 4–5. Critical for knowledge graph consistency: the brief's "Previously Deferred" section only populates when overlapping prior implementations exist on these files.

Returns **immediately** with `status: 'GENERATING'` (synthesis runs in the background — poll per Step 10b) UNLESS it's a cache hit, which returns `status: 'READY'` with the brief markdown directly. The brief is **idempotent on (exploration, icp)** — same recommendation+requirement hashes return the cached READY row. Pass `force: true` only when a prompt-version update requires re-generation (also returns `GENERATING` → poll).

##### 10b — Status polling

`generate_build_brief` is **fire-and-poll**: it returns almost immediately with `status: 'GENERATING'` (the synthesis runs server-side in the background) — NOT the finished brief. A cache hit returns `status: 'READY'` directly; treat that as done. So you no longer wait on a local timeout — you poll the status from the start.

**Don't treat the GENERATING response as the brief, and don't re-call generate to "check".** Poll the status:

1. After `generate_build_brief` returns `GENERATING` (or on the rare local timeout), call `get_build_brief_status(exploration_id, icp)`.
2. Poll using the standard async polling rule: one poll per turn at a constant cadence, then a fresh status call. Print a brief "still generating…" update every ~3 polls when the status is unchanged.
3. Exit conditions:

   | Response | Action |
   |---|---|
   | `exists === false` for 3+ polls | The fire-and-forget never landed — try calling `generate_build_brief` once more (it will likely succeed now that requirements are ready). |
   | `status === 'GENERATING'` | Keep polling. |
   | `status === 'READY'` | Read `content` field — proceed to Step 10b.5 for verification. |
   | `status === 'FAILED'` | Surface `errorMessage` to the user. Propose a single action: *"The brief failed: {errorMessage}. Retry with a fresh generation? (y/N)"*. On yes: call `generate_build_brief` again with `force: true`. |

You can ALSO call `get_build_brief_status` **proactively** before `generate_build_brief` — if `exists === true && status === 'READY'` and the hashes haven't changed, you've saved a write-tool roundtrip. Tradeoff: tiny read cost for skipping a maybe-slow write.

##### 10b.5 — Verify brief assertions against the actual code

**This step is mandatory, not opt-in.** The brief generator runs server-side and does NOT have repo access — it writes assertions about cited files / functions / classes based on the agent's earlier recon summary (which is text, not code). Brief assertions that contradict the actual code are invisible to the brief generator AND to the user reading the brief. Step 10b.5 closes that gap before the user is asked to approve the brief at Step 10d.

Verification runs in the calling agent; the persistence calls below save its results without generating new content. The verification happens locally in the calling agent because the agent is the one with repo access. The canonical instruction set is at `references/brief-verification-checklist.md` (methodology + output schema + worked example). This Step 10b.5 prose is the thin orchestration layer.

Steps:

If the brief makes no code citations, skip verification persistence and continue to Step 10c with verification marked not applicable.

1. **Tell the user what's about to happen** (one line, not a multi-line pre-roll):

   > Verifying brief assertions against the actual codebase. Reading cited functions / classes / files, comparing against the brief's claims — about 20–60 seconds.

2. **Read `references/brief-verification-checklist.md`** for the methodology, output schema, and verdict definitions. **Walk the methodology in order — do NOT skip to the output schema.**

3. **Read `BUILD-BRIEF.md`** (the version just generated in Step 10a/10b but NOT YET written to disk — keep it in-memory; you'll write to disk AFTER verification at Step 10c). Extract every specific code citation: symbol + file + assertion. Cap at 15 citations (highest-leverage first).

4. **For each citation, read the actual code** via Grep / Glob / Read. Assign a verdict per citation:
   - `verified` — brief claim matches the code.
   - `contradicted` — brief claim is wrong; the code does something different.
   - `not_found` — symbol couldn't be located.

   **Narrating a finding (if you surface one before the summary): frame it as resolving drift, not as an error report.** Lead with *resolving drift between the brief and the codebase*, then ONE plain sentence describing the drift and where the real pattern lives. Do **not** lead with "X doesn't exist" / "references a function that doesn't exist" — a `not_found` / `contradicted` verdict is the verification working as intended (it caught a brief-vs-code gap before you shipped), not a failure to alarm the user about.

   ❌ `get_core_apps is not in the codebase — the brief's RB-1 references a function that doesn't exist. The actual pattern is direct INSTALLED_APPS manipulation (index + replace), as seen in tests/settings.py.`
   ✅ `Resolving drift between the brief and the codebase: RB-1 cites get_core_apps, but the repo edits INSTALLED_APPS directly (index + replace — see tests/settings.py). Noting it in the verification.`

   This is a progress line, not a gate — keep it to one sentence and continue; the structured findings land in `BUILD-BRIEF-VERIFICATION.md` and the Step 10d gate.

5. **Write `BUILD-BRIEF-VERIFICATION.md`** into the SAME per-exploration directory as the brief (`.ritual/local/build-briefs/{exploration_id}/`) using the schema in `references/brief-verification-checklist.md`. Cite file + line range + actual code snippet on every contradiction. Do not fabricate evidence.

6. **Sync the verification to Ritual's knowledge graph** — call `sync_brief_review` with:

   ```
   {
     exploration_id,
     review_type: 'BRIEF_VERIFICATION',
     content: <full BUILD-BRIEF-VERIFICATION.md markdown>,
     cited_files: <union of every file path cited across the verification>,
   }
   ```

   This persists the verification as a durable `BriefReview` row attached to the exploration. Future briefs on overlapping files will inherit the verified facts via `priorContext`; `/ritual lineage` on any cited file will surface this verification.

7. **Reconcile findings with the current brief.** If any RB is `contradicted`, `conflicts`, or `not_found`, preserve the original brief prose and append a **Reconciled against codebase** section plus inline finding markers. Call `save_brief_version(exploration_id, content, source_review_id, reconciliation_summary)` with that deterministically assembled content and the review ID returned by `sync_brief_review`. Use the saved content as the current `BUILD-BRIEF.md` in Step 10c; the server preserves the original in version history. Do not re-synthesize the brief with an LLM. If every RB is `verified` or `unverifiable`, keep the current brief without creating an unchanged version.

8. **Print a compact CLI summary** (≤ 8 lines):

   ```text
   ✓ Verification complete — saved `BUILD-BRIEF-VERIFICATION.md`.

   Checked {N + M + K} of {T} citations · Verified: {N}  ·  Contradicted: {M}  ·  Not found: {K}  ·  Need runtime verification: {U}

   {If M > 0:}
   Top contradictions:
     ⚠ {cited_symbol} — brief says "{brief_assertion[0:60]}…"
        actual: "{code_reality[0:60]}…"
     ⚠ {next contradiction, if M > 1}
   ```

   Rules:
   - **{T} is every citation the brief makes; {U} is the `unverifiable` verdicts.** The summary always shows the coverage, so a pass that could check five of twelve never reads as complete.
   - **If M = 0 AND K = 0 AND U = 0:** print one line, *"✓ Verification complete — all {T} citations checked and verified. `BUILD-BRIEF-VERIFICATION.md` synced."*
   - **If M = 0 AND K = 0 AND U > 0:** print one line, *"✓ Verification complete — {N} of {T} citations verified; {U} need runtime verification. `BUILD-BRIEF-VERIFICATION.md` synced."*
   - **If M > 0:** print up to 3 top contradictions inline; rest are in the file. At the Step 10d gate, surface the contradictions count + note that plan mode will read them via knowledge graph priorContext.
   - **If brief made zero citations:** print *"✓ Verification skipped — the brief makes no specific code citations to verify."* Skip the sync call (nothing to persist). Proceed to Step 10c.

9. **Continue to Step 10c** with `BUILD-BRIEF.md` + `BUILD-BRIEF-VERIFICATION.md` both ready to write to disk and the verification synced to knowledge graph.

**Step 10d integration:** show the verification summary before the user's decision. Plan mode reads the current brief, including any reconciled findings, and the synced reviews via `priorContext`.

**Anti-patterns:**

- ❌ Skipping Step 10b.5 because "the brief looks fine." Brief-quality is invisible from reading the brief alone — the verification compares against the code.
- ❌ Treating the brief's hedge ("*may deviate if codebase has a stronger pattern*") as license to skip. The hedge means *"go verify"* — exactly what this step does.
- ❌ Padding the `verified` list. Only enumerate citations the brief actually made.
- ❌ Re-synthesizing the brief during verification. Preserve original prose and attach findings as Step 7 above specifies.
- ❌ Skipping the `sync_brief_review` call. The local `BUILD-BRIEF-VERIFICATION.md` alone benefits this session only; the knowledge graph sync is what lets future briefs on overlapping files inherit the verified facts.

##### 10c — Write to `.ritual/local/build-briefs/{exploration_id}/{DELIVERABLE}.md` + CLI summary

**`{DELIVERABLE}.md` is the deliverable's name upper-cased with hyphens** — `BUILD-BRIEF.md` for a generic build, `REFACTOR-PLAN.md` for a refactor, `TEST-STRATEGY-BRIEF.md` for a testing job. Same rule Step 10e uses, and the same directory whatever the job. **When reading an existing file, try `{DELIVERABLE}.md` first and fall back to `BUILD-BRIEF.md`** — repos hold the old name from earlier runs, and a developer may have edited it. Never rename a file already on disk.

When the brief content is in hand (from generate OR polling), **don't dump 300 lines of markdown into the terminal**. The brief belongs in a file the user can open, search, share, and revisit; the CLI surface is for the decision.

1. **Write the markdown to `.ritual/local/build-briefs/{exploration_id}/{DELIVERABLE}.md`** — one directory per exploration, named by the full exploration id. Create it if it does not exist. **The build brief is a LOCAL, per-build working file — never commit it.** It's a throwaway the coding agent reads to plan THIS build; the moment the code lands it's stale. The DURABLE record lives in Ritual — every version is kept there and readable with `get_build_brief_versions`, so nothing is lost by keeping it out of git. **Before writing, ensure it's gitignored:** if `.gitignore` does not already ignore `.ritual/local/`, append that ONE line under a `# Ritual build artifacts (local, do not commit)` comment. Idempotent: skip if already ignored. One directory ignore covers every artifact this flow writes, now and later — a filename list has to be chased each time a new one is added. Prepend a Ritual attribution header before writing:

   ```markdown
   <!--
   Generated by Ritual
   Exploration: {exploration_slug}
   Link: {exploration_url}
   Brief version: {version}
   Do not remove this header; it preserves implementation lineage.
   -->
   ```

   **The header is for humans — identify the exploration by its slug, never a raw UUID.** `{exploration_slug}` is the human-readable identifier tool responses return as `slug` (e.g. `slack-dashboard-quiet-harbor`); every Ritual tool and link accepts it interchangeably with the UUID. If no slug came back for this exploration, fall back to the id. `{version}` is the brief version the serving tool reported; omit the line if you never saw one. When the brief arrived through `merge_briefs` and the exploration you were handed differs from the one it served, add one line after `Exploration:` — `Source handoff: {the ref you resumed with}` — so the lineage from deep link to durable brief stays visible. UUIDs still belong in the one machine-read place: the `Ritual-Exploration:` commit trailer keeps the UUID exactly as the `<EXPLORATION_URL>` note specifies — lineage lookups grep for it.

   **`{exploration_url}` is environment-specific — resolve it, never assume production.** Until a tool returns it, derive the base from your Ritual auth issuer: a dev build's exploration does not exist on the production host, and a self-hosted deployment is not on Ritual's SaaS at all. The full rule, including the commit trailer, is in the `<EXPLORATION_URL>` note further down this file.

   A brief already at that path is necessarily the SAME exploration — the directory is keyed by exploration id, so a different exploration writes a different directory and cannot overwrite this one. Overwrite silently and note in the summary that you refreshed it. There is no confirm to ask: the collision it guarded against can no longer happen.

2. **Print a compact CLI summary** — the top-of-mind information, the verification result, plus a single line pointing at the file:

   ```
   ✓ Build brief ready — discovery has become an implementation path.

   Signal: {N} accepted recommendations were converted into {M} code-time requirements.
   File: .ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md ({line_count} lines, {file_kb_size} KB)
   Verification: {V} verified · {C} contradicted · {NF} not found  (from Step 10b.5; see BUILD-BRIEF-VERIFICATION.md)

   Goal: {first line of Goal section, ≤ 100 chars}

   Top review-blockers (must address):
     RB-001 — {RB-001 title} → {one-line "what's required"}
     RB-002 — {RB-002 title} → {one-line "what's required"}
     RB-003 — {RB-003 title} → {one-line "what's required"}

   Top codebase anchors:
     {path1} — {pattern to extend, ≤ 60 chars}
     {path2} — {pattern to extend, ≤ 60 chars}
     {path3} — {pattern to extend, ≤ 60 chars}

   What changed:
   {per-requirement one-liners from the Step 10b.5 pass: verified / sharpened / contradicted / not found, user nouns only}

   What this changed for me (your coding agent):
   » {2–3 lines per the agent-debrief rules in refine-flow.md — same block, same rules}

   {ONLY IF Previously Deferred section is non-empty:}
   ⚠ {N} previously-deferred item{s} overlap this scope — see "Previously Deferred" section in BUILD-BRIEF.md
   ```

   Rules for the summary (CLI Tenets #3, #6):
   - **The two debrief sections ("What changed" / "What this changed for me (your coding agent)") are mandatory and follow refine-flow.md's rules** — that file owns the agent-debrief contract (baseline = the user's original raw ask, 2–3 `»` lines, near-miss framing, calibrated `Net:`); do not restate its rules here, read them there. In this flow the per-requirement one-liners come from the Step 10b.5 verification outcomes instead of a grounding diff — same sections, same voice, so the brief-ready render reads identically whether the brief arrived via build or via refine.
   - **The `Verification:` line is mandatory** — for the synchronized harness branch, use the receipt-based line in `references/grounded-deliverable-flow.md`; otherwise render the actual numbers from Step 10b.5. If 10b.5 was legitimately skipped (brief made zero specific code citations), render `Verification: n/a — brief made no code citations to verify` instead of omitting the line. The line existing-but-zero is fine; the line being MISSING is a structural signal that 10b.5 was skipped without justification. Reviewing this summary should let the user (and a future SKILL self-check) catch a skipped-verification regression by spotting the missing line. The failure this guards: Step 10b.5 silently skipped on a brief that cites real symbols — exactly the case 10b.5 is supposed to verify.
   - **Cap RBs and anchors at top 3 each.** Engineers don't read 12-row tables in terminals.
   - **Omit any section that's empty.** No "Previously Deferred: none" lines — just don't render that line. (The `Verification:` line is exempt — it's always rendered, see above.)
   - If `kgContextUsed.implementationCount > 0`, append one line above the goal: *"Grounded in {N} prior implementation{s}: {top match name}, …"* (cite the specific signal).

3. **Offer to open the file** (OS-aware affordances — available, not mandatory):

   ```bash
   # Detect, in order: VS Code on PATH, JetBrains `idea` on PATH, $EDITOR set, macOS `open` available.
   command -v code >/dev/null && code .ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md
   command -v idea >/dev/null && idea .ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md
   [ -n "$EDITOR" ] && "$EDITOR" BUILD-BRIEF.md
   command -v open >/dev/null && open BUILD-BRIEF.md   # macOS
   ```

   If any of these are detectable, offer: *"Open `BUILD-BRIEF.md` in your editor? (y/N)"* — single yes/no, never a 4-way picker. If none are detectable, omit the offer entirely; the path is still clickable in most terminals.

##### 10e — Fetch the deliverable (every terminal but `implement`)

The job's deliverable — the Eval Specification, Migration Plan, Architecture Decision Record, Debugging Brief, or the document a `deliver` job produces — is generated server-side when the recommendations were accepted (Step 9.5). Read it with `get_deliverable_document` (`exploration_id`): it returns `{ exists, status, name, markdown }`. Poll every ~5s while `status` is `PENDING` or `GENERATING` (up to ~2 minutes; it usually lands in 30–60s); `FAILED` → say so and offer one retry via `accept_recommendations` with `force: true`. When `status` is `COMPLETED`, write `markdown` to `.ritual/local/build-briefs/{exploration_id}/{DELIVERABLE}.md`, where `{DELIVERABLE}` is the deliverable name upper-cased with hyphens (`EVAL-SPECIFICATION.md`, `MIGRATION-PLAN.md`, `ARCHITECTURE-DECISION-RECORD.md`, `DEBUGGING-BRIEF.md`). That file is what the terminal flow acts on; the render is the same rail + a one-line summary of its sections, then 10d. The directory is the staging copy (gitignored, per-user); whether the document also lands in the repo is the terminal's default, named on the 10d confirm line and flipped by one word (`references/terminal-flows.md` § Where each deliverable lives).

##### 10d — Confirm and proceed

End Step 10 with a single recommended action plus a cheap escape hatch — never a 3-way option bloom.

**Rendering contract (load-bearing — see SKILL.md § Contract strength):** for an `implement` job the user-facing block below is **verbatim**. For any other terminal, call `render_gate` with `kind: 'brief_confirm'` and `{ deliverable, terminal }` and emit the result verbatim (its heading is `{Deliverable} ready` and its `proceed` line names that terminal's next move); without `render_gate`, compose the same shape from `references/terminal-flows.md` § Confirm lines. Render the text inside the fenced block exactly as written — same option name (`proceed`), same one-line description, same order.

```text
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · ▶ Build brief · Implementation

Build brief ready

`BUILD-BRIEF.md` is on disk. Skim the requirements and anchors, then decide:

  · `proceed` — ready to implement; move to coding
```

Branch by user response. The CTA on screen is `proceed`, but accept these as synonyms so a user typing the obvious intent doesn't get penalized for word choice:

- **`proceed` / `go` / `y` / `yes` / `continue` / `next` / `implement` / `ship`**: continue to Step 11 — which dispatches on the terminal (an `implement` job enters 11.0.0; every other terminal enters its flow in `references/terminal-flows.md`; `deliver` goes straight to Step 13). For `implement`, plan mode reads the current `BUILD-BRIEF.md`, including any reconciled findings, plus synced verification and UX reviews via `priorContext`.
- **`ux-review` / `review` / `ux`**: continue to Step 10.5 (writes `UX-REVIEW.md`, syncs it to knowledge graph via `sync_brief_review`, then continues to Step 11 with the tailored plan-mode prompt). Opt-in; absence is the existing path.
- **`local`** (shown only for `generate-evals` / `execute-plan` jobs): continue to Step 11 exactly as `proceed`, with the deliverable kept out of git (`references/terminal-flows.md` § Where each deliverable lives).
- **`keep`** (shown only for `deliver` jobs): commit the document to the repo's docs first (`references/terminal-flows.md` § Deliver), then Step 13.
- **`pause`** / `hold` / `stop`: stop here. The brief is on disk; the user can resume with `/ritual resume`.

**Routing line (once per session, only when you can read the repository):** after the user replies at Step 10d, if no file in this repository carries Ritual's marked routing block (the comment line `Begin: ritual init — skill routing` in `CLAUDE.local.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` or `.github/copilot-instructions.md`), add one line before moving on: `Discovery routing is off in this repository. To have me offer discovery before planning here: \`ritual init --memory-rule\`.` Say it once per session. Never edit those files yourself; the CLI previews that write and records it so it can be undone.

**No `refine` action at Step 10d.** Verification reconciliation is completed in Step 10b.5. If the user changes the underlying recommendations or requirements, regenerate with `generate_build_brief` and `force: true`; this is distinct from saving verification findings.

**Pulse (Step 10 done):** Emit a pulse — this often crosses into **Implementation-ready** (90%+). Render full when that crossing happens. Use the build-brief celebration line: `✓ Build brief ready — discovery has become an implementation path.` If still below 90% (e.g. brief flagged residual debt), surface that in the pulse line itself and propose addressing it before coding.

#### Step 10.5 — Optional UX brief review (entered ONLY when the user picks `ux-review` at Step 10d)

This step is opt-in. If the user picked `go` at Step 10d, skip directly to Step 11. The `ux-review` path is reached only when the user explicitly asks for it at the Step 10d gate — there is no auto-gating — the `ux-review` path is only ever user-invoked.

Purpose: make the coding agent reason about the experience BEFORE it reasons about files. Plan mode otherwise interrogates the user for the same 10-question UX checklist on every UI-shaped feature. Paying for it once at the right moment — with the brief and the codebase both available — is cheaper than paying it implicitly through plan-mode interrogation.

This step is **SKILL-only — no MCP tool, no LLM-cost on Ritual's API.** The analysis happens locally in the calling agent because the agent is the one with repo access. The reference `references/ui-ux-checklist.md` is the canonical instruction set (methodology + output schema + plan-mode prompt template); this Step 10.5 is the thin orchestration layer that drives the agent through it.

Steps:

1. **Tell the user what's about to happen** (one line, not a multi-line pre-roll):

   > Running a design-quality pass on the brief. Reading `BUILD-BRIEF.md`, mining the repo for existing UI patterns, writing `UX-REVIEW.md` — about 30–60 seconds.

2. **Read `references/ui-ux-checklist.md`** for the review procedure, output schema, and plan-mode prompt template. **Walk the review procedure in order — do not skip to the output schema.** The review procedure's six steps (read brief → identify UI surfaces → find repo analogues → compare brief vs analogues → fill schema with evidence → generate tailored plan-mode prompt) are load-bearing; the output schema only gets filled correctly when the analysis upstream is done.

3. **Read `BUILD-BRIEF.md`** end-to-end. Classify what it covers vs what it's silent on. The brief itself is the input signal — the review's value is on the gaps and codebase-grounding, not on re-deriving brief content.

4. **Mine the repo for existing UI analogues.** Use Grep / Glob / Read against the implied UI surfaces from the brief. Cite file paths in the review; every claim must trace back to either a brief line or a real repo file. **Do not fabricate analogues** — if `Grep` returns nothing, the surface is "new work," not a hallucinated path.

5. **Write `UX-REVIEW.md`** to disk alongside `BUILD-BRIEF.md` (same directory — repo root or `.ritual/`, whichever the brief landed in). Use the exact output schema from the reference file. Prepend the Ritual attribution header:

   ```markdown
   <!--
   Generated by Ritual — UX brief review
   Exploration: {exploration_url}
   Source brief: BUILD-BRIEF.md
   Do not remove this header; it preserves implementation lineage.
   -->
   ```

   If a `UX-REVIEW.md` already exists:
   - **Same exploration**: silent overwrite + one-line note in the summary.
   - **Different exploration**: confirm before overwriting (same convention as `BUILD-BRIEF.md` in Step 10c — *"A `UX-REVIEW.md` already exists from `{previous}`. Overwrite, or save-to-`UX-REVIEW-{slug}.md`?"*).

5a. **Sync the UX review to Ritual's knowledge graph** — call `sync_brief_review` with:

   ```
   {
     exploration_id,
     review_type: 'UX_REVIEW',
     content: <full UX-REVIEW.md markdown>,
     cited_files: <union of every file path cited across the review's Screen/Component, Design System Fit, and other sections>,
   }
   ```

   Persists the UX review as a durable `BriefReview` row attached to the exploration. Plan mode reads it via `priorContext` so the plan-mode prompt's mismatches / gaps / new-work items are knowledge graph-grounded, not just session-local. `/ritual lineage` on any cited UI file surfaces this review.

   **Anti-pattern:** skipping the sync because *"UX-REVIEW.md is right here on disk."* The local file benefits this session only; the knowledge graph sync is what lets future briefs / explorations on overlapping files inherit the findings.

6. **Print a compact CLI summary** — the file path + the load-bearing findings only, capped at ≤ 10 lines :

   ```
   ✓ UX review ready — `UX-REVIEW.md` is on disk.

   Mismatches surfaced: {N}
     {first mismatch one-liner — brief X vs analogue Y}
     {second mismatch one-liner}

   Gaps surfaced: {M}
     {first gap one-liner — brief silent on Z, codebase default is W}

   New-work surfaces: {K}
     {first new-work surface one-liner}

   Plan mode will read this first when you proceed to `go`.
   ```

   Rules:
   - Cap each list at 3 entries. The full set is in the file.
   - Omit any list that's empty (e.g. "Mismatches surfaced: 0" → don't print the line).
   - If ALL THREE lists are empty: the brief is unusually complete. Print one line: *"Brief is unusually complete — no mismatches, gaps, or new-work surfaces. Plan mode will verify state coverage against codebase."*

7. **Offer to open the file** — same OS-aware affordance as Step 10c (VS Code → idea → $EDITOR → macOS open). Single yes/no, never a multi-way picker.

8. **Return to the Step 10d gate** with the updated framing — `UX-REVIEW.md` is now part of the implementation context:

   ```text
   Reply `go` to start implementation with the UX review as plan-mode input,
   or `drill {N}` / `pause` per the earlier options.
   ```

   When the user replies `go`, continue to Step 11 with the explicit instruction (passed to plan mode) to read both `BUILD-BRIEF.md` AND `UX-REVIEW.md`, and to use the "Plan Mode Prompt" block at the bottom of `UX-REVIEW.md` as its first numbered list — not a generic plan.

**Anti-patterns to avoid in this step:**

- **Don't render the full `UX-REVIEW.md` to the terminal.** It belongs in the file; the CLI surface is the summary plus the path.
- **Don't auto-`go` after writing the file.** The user explicitly opted into the review — let them open the file and decide when to proceed.
- **Don't enter plan mode mid-step.** Plan mode is Step 11. This step writes the artifact plan mode will read.
- **Don't propose visual designs.** This is a planning packet, not a design tool. Where the codebase has no design system, surface that fact and route back to the user.

**Pulse (Step 10.5 done):** Re-emit the Step 10 pulse if the review surfaced material gaps or mismatches — Readiness can dip back below 90% when significant UX work is flagged that the brief didn't capture. If the review came back clean (zero mismatches, zero gaps, zero new-work), keep the existing pulse — the brief was already implementation-ready.
