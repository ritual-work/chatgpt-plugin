<!-- GENERATED from references/build-flow.src.md by the Ritual monorepo internal guard — DO NOT EDIT. -->
<!-- source-sha: 2d7be8fda1fc2644 -->

# /ritual build — Implementation (generated; do not edit)

This file holds Steps 11 to 13 of `/ritual build`.
The previous phase is `references/build-flow/brief.md`.
This is the last phase.
The index `references/build-flow.md` lists every phase with its step range. A step named here that lives in another phase is found through that index.

## In this phase

Read the step you are on by its line range; the file is long and the other steps wait their turn.

- Step 11 — Implement (lines 21 to 477)
- Step 12 — Close the loop with `sync_implementation` (lines 478 to 645)
- Step 13 — Suggest the next request (lines 646 to 759)

---

#### Step 11 — Implement

**Dispatch on the job's `terminal` (from `prepare_build`) before anything below:**

| `terminal` | What Step 11 is | Where |
|---|---|---|
| `implement` | slice the Build Brief and code it | 11.0.0 onward, this file |
| `generate-evals` | generate the eval suite the Eval Specification describes, run it once | `references/terminal-flows.md` § Generate evals |
| `execute-plan` | execute the Migration Plan step by step, verifying each checkpoint | `references/terminal-flows.md` § Execute plan |
| `record-decision` | commit the Architecture Decision Record to the repo, open the PR | `references/terminal-flows.md` § Record decision |
| `investigate` | run the investigation the Debugging Brief lays out, confirm the root cause | `references/terminal-flows.md` § Investigate |
| `deliver` | nothing to run — the document is the outcome; `keep` commits it to the repo's docs first | `references/terminal-flows.md` § Deliver |

Every terminal flow ends the same way: Step 11.0's branch safety, commits with the `Ritual-Exploration:` trailer, Step 12's `sync_implementation`, then Step 13. The rest of this step is the `implement` path.

This step happens **inside** the same `/ritual build` chat if the agent is also the coding agent (Claude Code / Cursor / etc.), or hand-off if the user is implementing themselves.

**Keep the lineage sketchpad from the first edit** (`references/readback-flow.md` § The lineage sketchpad): logged with `ritual readback log` — the brief's problem statement as the request (`--source exploration`), the scope once, a step as you take it, and a decision the moment you make it with the lines behind it (`--files path:start-end`). Silent, never narrated. It is the decision log the developer reviews: a log, not a recollection.

The Implementation phase landing — full rail (the rail moves to Implementation for the first time):

```text
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · ✓ Build brief · ▶ Implementation

Implementation

The build brief is on disk. From here, your agent builds against its
requirements.

Next: I'll make sure the branch is safe to build on, then draft a plan
grounded in BUILD-BRIEF.md for you to review before any file is edited.
```

##### 11.0.0 — Slice the brief into a work-list (load-bearing — [USER PAUSE])

**Arriving at implementation — by ANY path — start HERE, never at file edits.** Whether you reached the build brief through the continuous flow (Step 10d `go`) OR out of band (you resumed a build, drove the tools directly, or the user simply said "implement from the brief"), the implementation phase ALWAYS begins at this work-list, and you do NOT edit a single file until a per-slice plan is approved at 11.0.5 → 11.1. This is load-bearing and **not optional even in auto-accept / bypass mode** (same enforcement as the preamble's pauses): a brief may contain multiple implementation slices, and starting to code without slicing it and getting a per-slice plan approved is exactly the failure this step prevents.

A build brief is rarely one PR. Slice it into an **ordered work-list** — one coherent implementation chunk per slice, grouped into independently reviewable PRs — derived from the brief's **Suggested Implementation Order**, its **Phase Candidates / Deferrable Items**, and its **RB-N** requirements. Each slice names the brief requirements (RB-N / in-scope ids) it covers, so the per-slice plan (11.1) and audit (11.1.6) can scope to that subset; the other slices' requirements are *deferred to a later PR*, not missing.

**Rendering contract:**

```text
Build brief is on disk. Here's the slice plan:

  1. {slice title} — {one line; requirements RB-1, RB-4}
  2. {slice title} — {one line; requirements RB-2}
  …

Slices 1-{n} land as commits on one branch, then open as one PR — {why that
boundary: what becomes testable once they're all in}.

Reply `proceed` to start slice 1, `reslice: <how>` to adjust the breakdown,
or `pause` to stop here.
```

**Commit each slice. Group dependent slices into the smallest independently reviewable PR.**

The test is not a judgement call — the brief already answers it. A slice is
PR-ready when the RBs it claims have become **verifiable**: someone can run their
`How to verify` column against real code. A slice whose RBs stay unverifiable
until a later slice lands is not reviewable on its own, and shipping it alone
asks a reviewer to approve an API with no caller.

So at the end of each slice: **commit, say what became verifiable, and continue.**
Offer the PR at the declared boundary, not before.

**Name the boundary and the reason up front**, in the slice plan above — a PR
boundary with no stated "this is what becomes testable here" is just a number,
and the user cannot tell whether it was chosen or fell out of the loop.

`sync_implementation` still runs **per slice at commit** (§ 12). Logging per
commit is right regardless of PR grain, so Ritual's record never becomes coarser
than the work.

[USER PAUSE] Branch on response:

- **`proceed`** (or `1` / `start`): the work-list is the plan of record. Set slice 1 as the **current slice** and continue to 11.0 (branch) → 11.0.5 (plan-mode handoff) for it.
- **`reslice: <how>`**: adjust the breakdown per the user's steer, re-render the list, and pause again.
- **`pause`**: stop here; the brief + work-list remain on disk for a later session (which re-enters at THIS step).

**One slice at a time.** Implement, commit, and sync the current slice before continuing. Keep dependent slices on the same branch. Reach 11.4–11.5 only at the declared PR boundary; otherwise continue through 11.6.

##### 11.0 — Branch strategy (never commit to main)

**Never commit to `main` / `master` from an agent workflow.** Before writing a single line of code:

1. Check for uncommitted user work:
   ```bash
   git status --porcelain
   ```
   If there are unrelated user changes, pause before editing and ask whether to keep working on this branch, stash, or abort. Do not overwrite or mix with user work silently.

2. Check the current branch:
   ```bash
   git branch --show-current
   ```

3. If on `main` / `master` / `trunk` / `develop` (or any branch named in the repo's default-branch protections): **create a feature branch FIRST.** Do not ask whether to commit to trunk. Branch creation is free and reversible. Naming heuristic:
   - `feat/<exploration-slug>` when the slug is short (≤ 4 words)
   - `ritual/<exploration-short-id>` as a fallback (e.g. `ritual/exp-7a2b9c`)
   - If the user already named one in chat ("call it `feat/conversions-tracking`"), use that.

   User-visible:

   > Created branch `{branch}` for this Ritual implementation.
   > Override with `branch: <name>` before implementation begins.

4. If already on a feature branch and the working tree is clean or only contains this flow's changes: stay there. Don't switch.

**Never offer "commit to `main` directly" as an option in any user prompt.**

##### 11.0.5 — Plan-mode handoff (load-bearing — [USER PAUSE])

**Branch is created, working tree is safe — now hand off to plan mode.** Plan mode is user-invoked (the agent can't toggle it programmatically in Claude Code / Cursor / etc.), so without an explicit prompt the implementation phase starts with the agent improvising file edits instead of producing a reviewable plan grounded in `BUILD-BRIEF.md`. This step happens AFTER branch creation (Step 11.0) because plan mode in Claude Code blocks Bash, so branch creation has to happen first.

**Rendering contract — verbatim:**

```text
Branch ready. Switch to plan mode so the first pass is a reviewable plan
grounded in BUILD-BRIEF.md, not file edits.

Reply `ready` once you're in plan mode, or `skip` if yours doesn't have one.
```

**`skip` skips PLAN MODE, never the scope audit.** On the skip branch you still
hold a plan — the slice breakdown you just rendered. Audit THAT: pass the slice's
RB list and intended file changes to `audit_plan` as `plan_content`,
and the slice's in-scope requirement ids as `slice_requirement_ids`, before
editing anything.

 The audit exists to catch work that drifts outside the
brief's frozen scope contract, and that risk does not go away because the host
has no plan-mode affordance. A gate that only runs on one branch of an optional
mode is not a gate.

**Never enumerate agents (load-bearing).** The user is in exactly ONE agent and
knows which — listing Claude Code / Cursor / "other agents" makes them read three
lines to find their own, and it dates the skill every time a surface changes. You
know your own host: if its plan-mode affordance is unambiguous, you MAY append it
as **one short parenthetical on the reply line** (e.g. `` Reply `ready` once
you're in plan mode (Shift+Tab), … ``). If you're unsure what host you're on,
omit it entirely — the generic line stands on its own. Never a bulleted list,
never another agent's instructions, never a footer explaining the modes.

This rule generalizes: any per-agent instruction in user-facing copy collapses to
"your agent" plus, at most, one parenthetical about the host you're actually in.

[USER PAUSE] Branch on response:

- **`ready`**: continue to Step 11.1 (plan generation).
- **`skip`**: log a one-line note ("Plan mode skipped — agent has no plan-mode equivalent or user opted out. Proceeding directly to implement; risk: less reviewable first pass.") and skip Step 11.1 + 11.1.5, jumping straight to Step 11.2 (implement). This is an escape hatch, not the default.
- Any other response: re-render the prompt once. If still not `ready` / `skip` after two tries, default to `skip` with the warning line.

**Why this is load-bearing:**

1. Plan mode is the only mechanism that produces a reviewable plan BEFORE file edits. Skipping it means the user is reviewing a diff, not a plan — a more expensive correction loop.
2. `BUILD-BRIEF-VERIFICATION.md` contradictions are most valuable when they become explicit plan constraints, not when they're discovered during implementation.
3. Without an explicit prompt, the agent typically goes straight from "build brief ready" to file edits — this pause is what prevents that.

##### 11.1 — Plan mode generates the implementation plan

The user is now in plan mode (from Step 11.0.5). The agent must:

1. **Load `BUILD-BRIEF.md`** as the first input. If `BUILD-BRIEF-VERIFICATION.md` exists, load it too — every `contradicted` and `not_found` entry becomes an explicit constraint in the plan ("the brief claimed X but the code does Y; the plan must reconcile / not assume X"). If `UX-REVIEW.md` exists alongside `BUILD-BRIEF.md` (the user opted into Step 10.5), use the "Plan Mode Prompt" block at its bottom as the FIRST input — its numbered list of mismatches / gaps / new-work surfaces is the tailored agenda. The generic plan-mode template is the fallback for when only the brief exists.

2. **Load the SCOPE CONTRACT as hard constraints (the load-bearing step — prevention, not just detection).** The brief read (`get_build_brief_status` → `scopeContractResolved`, or the `generate_build_brief` response) carries the SAME typed contract Ritual will audit your plan against at Step 11.1.6. Treat it as binding and put it at the TOP of the plan-mode prompt verbatim:

   > **Scope contract — your plan must honour this (it will be audited):**
   > - **MUST cover** (one or more plan steps each, and cite the requirement): {each `scopeContractResolved.inScope[].text`}
   > - **Do NOT implement — deferred to a LATER PR** (out of scope for this change): {each `deferred[].text`}
   > - **Do NOT cross — non-goals**: {each `antiGoals[].text`}
   > - **Open questions — do NOT silently implement; flag if you must touch**: {each `discoveryGates[].text`}

   This is what makes plan mode deliver on the promise of the brief (which delivers on the recs). Feeding the contract in UP FRONT prevents the divergences Step 11.1.6 would otherwise have to catch and send back.

   **For a sliced build (11.0.0):** scope the plan to the CURRENT slice — cover only the in-scope requirements assigned to this slice, and put the other slices' requirements under the "Do NOT implement — deferred to a LATER PR" line so plan mode does not touch them. That line is for plan mode's eyes only: the audit (11.1.6) does NOT read deferral out of the plan text. Deferral reaches the audit as the typed `slice_requirement_ids` argument — the `inScope[].id`s this slice covers — which is what makes the other slices' requirements audit as deferred rather than missing.

   **Non-goals come in two grades.** `antiGoals[]` are binding: crossing one blocks the audit. `antiGoalCandidates[]` (when present) are UNCONFIRMED — verbatim text from a rejected recommendation's title or a comment, with a `provenance` saying so. List them to plan mode as "unconfirmed non-goal candidates — do not treat as decisions", never under the binding non-goals line.

3. **Produce a numbered implementation plan** that:
   - has **one or more steps covering EVERY in-scope requirement** above (map each step to the requirement id it implements — this is the coverage the audit checks),
   - implements **none** of the deferred items and crosses **none** of the non-goals,
   - puts the RBs, any verification contradictions, and any UX "new work" surfaces at the top,
   - names the specific files / functions / new modules each step touches — concrete enough that the user can spot a mistake before any edit.

4. **Stay in plan mode until the user accepts the plan.** Do NOT switch to edit/auto-accept mode until the user explicitly approves the plan in plan mode (Claude Code's "accept plan" affordance, or the user typing `accept` / `looks good` / `go`).

##### 11.1.5 — Optional: save the implementation plan as a markdown artifact

After plan mode produces the implementation plan, **but before any code edits**, ask whether to save it.

**Rendering contract — verbatim:**

```text
Plan ready

Your agent generated an implementation plan from BUILD-BRIEF.md
{and BUILD-BRIEF-VERIFICATION.md / UX-REVIEW.md if those exist}.

Save this plan to `IMPLEMENTATION-PLAN.md` before coding? (y/N)
```

[USER PAUSE] Branch on response (default is no — not every plan is worth committing):

- **`y` / `yes` / `save`**: write `IMPLEMENTATION-PLAN.md` alongside `BUILD-BRIEF.md` in the repo root (or `.ritual/IMPLEMENTATION-PLAN.md` if the repo prefers tooling artifacts out of the top level — check `.gitignore` first). Prepend the Ritual attribution header:

  ```markdown
  <!--
  Generated by Ritual via plan mode
  Exploration: {exploration_url}
  Build brief: BUILD-BRIEF.md (Ritual requirements)
  This file: agent's concrete execution strategy
  Do not remove this header; it preserves implementation lineage.
  -->
  ```

  Then continue to Step 11.2.
- anything else (`n` / `no` / empty / any other text): continue to Step 11.2 without writing the file. Do not re-prompt.

**Rules:**

- **Do not ask this before plan mode has produced the plan.** The question is for the assembled plan, not "do you want me to write a plan in advance."
- **Do not dump the full plan into the chat when saving.** The plan markdown belongs in the file the user can open, search, share, and revisit — same pattern as `BUILD-BRIEF.md` and `BUILD-BRIEF-VERIFICATION.md` (files for detail, CLI for decisions).
- **Default is `no`** — explicit `y` is required. Most quick implementations don't need a committed plan; saving by default would clutter the repo.
- If the user later opens the PR (Step 11.5), include `IMPLEMENTATION-PLAN.md` in the PR body's Exploration section if it was saved (see Step 11.5 template).

**Why this matters:** `BUILD-BRIEF.md` is the Ritual requirements artifact (what + why). `IMPLEMENTATION-PLAN.md` is the agent's concrete execution strategy (how). For non-trivial implementations, saving both gives reviewers a useful bridge from requirement to code — and gives `/ritual lineage` queries a richer trail to surface on future builds touching the same files.

##### 11.1.6 — Optional: audit the plan against the brief (Audit 3 / plan-fidelity)

After plan mode produces the plan and **before any code edits**, you can audit the plan against the build brief's frozen **scope contract** (its in-scope requirements, discovery-gate requirements, and anti-goals). This is **Audit 3 / R6** — the downstream bookend to the Step 9.6 recs audit. It's non-circular by construction: the contract derives from discovery/recs, never the plan, so a flagged divergence is a real drift, not a tautology.

**Gate behavior by build mode** (from Step 0.1's `auditMode`):

- **`normal` (default):** offer it; default is to skip (most plans are faithful).
- **`audited`:** recommend it (default yes).
- **`strict`:** run it automatically (no prompt), and treat an `anti_goal_violation` as blocking.

**Rendering contract — verbatim (normal / audited modes):**

```text
Plan ready — audit it against the brief before coding?

Ritual can check this plan against BUILD-BRIEF.md's scope contract — flagging
anything the plan drops (a brief requirement no step covers), sneaks in
(out-of-scope work), or that crosses a non-goal — before you write code.

Reply `audit-plan` to run it, or `proceed` to start implementing.
```

[USER PAUSE] Branch on response:

- **`audit-plan`** (or auto, in `strict` mode): call
  `audit_plan(exploration_id, plan_content, slice_requirement_ids?)`
  where `plan_content` is the implementation plan plan mode just produced (the
  same text you'd save to `IMPLEMENTATION-PLAN.md`) and, for a sliced build,
  `slice_requirement_ids` is the list of `inScope[].id`s the CURRENT slice
  covers (omit it for a whole-brief plan). The server normalizes the plan to
  plan operations, audits the other slices' requirements as deferred, and runs
  R6 against the brief's scope contract. It's async — the tool polls to
  completion and returns a thin payload:

  - `audit_status: "ok"` (no divergences) → tell the user the plan is faithful to
    the brief and continue to Step 11.2.
  - `audit_status: "needs_attention"` → render each divergence (`divergence_kind`
    + the `plan_op` and/or `brief_reference` it concerns + `rationale`). Group by
    kind: **missing_brief_decision** ("the brief asked for X; no plan step covers
    it" — computed deterministically from coverage), **out_of_scope_addition**
    ("step N does X, which maps to nothing in the brief"), **premature_implementation**
    ("step N implements X, which the brief deferred to a LATER phase/PR — not this
    one"), **scope_creep** ("step N covers X but does substantially more"). Then
    pause: *"Revise the plan to address these (back to plan mode), or proceed and
    accept the divergences? Reply `revise` or `proceed`."*
  - `audit_status: "blocked"` (a BINDING `anti_goal_violation`) → surface it prominently:
    *"⚠ The plan advances something the brief explicitly forbids: {evidence}. This
    crosses a non-goal you set during discovery."* In `strict` mode this blocks —
    require `revise` or an explicit `override` with a one-line justification. In
    other modes, strongly recommend `revise`.
  - A divergence with `advisory: true` is an `anti_goal_violation` against an
    UNCONFIRMED candidate — read `brief_reference.provenance` and say where the
    text came from: *"The plan does {X}. Ritual holds '{text}' as a non-goal
    candidate ({source}, {proposalStatus}) — nobody confirmed it. Keep it as a
    non-goal, or drop the candidate?"* It never blocks and it never counts as a
    decision the brief made; the fix is to settle the candidate (confirm or
    dismiss it), not to bend the plan.
  - On `revise`: the audit response carries a ready-to-paste **`revision_directive`**
    (assembled from the structured `revisions[]`, blockers first — each is a
    `request_plan_revision` repair keyed to a specific divergence). Feed that
    directive **verbatim** back into plan mode as the revision agenda (back to
    Step 11.1, keeping the scope contract from 11.1's step 2 in force), let plan
    mode produce a revised plan, then **re-run `audit_plan` on the revised plan**.
    This is the runtime repair loop: `audit_plan` → `revise` → `audit_plan`.
    - **Cap it at 2 revision rounds.** If divergences remain after the 2nd
      revision, stop looping and surface the residual divergences to the user with
      a decision: *"These divergences persist after 2 revisions — accept them
      (they'll be logged), or stop here? Reply `accept` or `pause`."* Don't churn.
  - On `proceed` / `override` / `accept`: continue to Step 11.2. Treat each
    accepted divergence as a **`confirm_intentional_divergence`** — record it as a
    Step 12 `sync_implementation` decision (`area` = the requirement/anti-goal,
    `choice` = "intentionally diverged: {why}", `source_recommendation_id` = the
    `brief_reference.id`) so the override is captured in lineage rather than lost.
    A persistent *anti-goal violation* the user keeps overriding is a signal the
    BRIEF (or its anti-goals) is wrong — surface that, don't just bury it.
- **`proceed`** (or anything else): skip the audit and continue to Step 11.2. Do
  not re-prompt.

**Rules:**

- **Requires a READY BuildBrief with a scope contract.** Briefs synthesized before
  the scope-contract feature lack one; if `audit_plan` returns a 400 about a
  missing contract, regenerate the brief (`generate_build_brief force:true`) or
  skip the audit — don't block the build on it.
- **Advisory, not auto-repair.** R6 surfaces divergences; the fix is always a
  human-in-the-loop plan revision or an explicit accept. Never silently rewrite
  the plan.
- **Don't dump the raw normalized plan ops** into the chat — surface the
  divergences (the signal), not the methodology.

##### 11.2 — Implement

1. Use the standard coding-loop tools (Edit/Write/Bash/etc.) to execute the accepted plan.
2. Run tests, lint, build per the repo's conventions.
3. Track each architectural decision as you go — the input to Step 12's `sync_implementation` call. Per decision, write down: `area`, `choice`, `alternatives_considered`, `rationale`, `source_recommendation_id` (the RB-N or recommendation id the decision implements). This is what makes lineage queryable later — don't skip it.

##### 11.3 — Commit (Ritual attribution)

Commit on the feature branch from Step 11.0. One-or-many commits is fine; conventional-commit prefixes preferred (`feat:`, `fix:`, `test:`, etc.). Include a Ritual footer on the FINAL commit of the implementation so the trace from code → exploration is visible in `git log`:

```
feat(<area>): <one-line headline>

<short body — what changed, why, key trade-off>

Ritual-Exploration: <exploration_id>
Ritual-Exploration-Url: <EXPLORATION_URL>
Ritual-RBs-Satisfied: RB-1, RB-2, RB-7
```

Include the footer on the final commit of each slice. Run Step 12 for that slice, then return to 11.4 if the PR boundary is reached, or 11.6 otherwise. Do not repeat a successful sync for the same commit.

##### 11.4 — Post-implementation summary (files for detail, CLI for decisions)

**Don't dump a per-file changelog into the chat.** The full diff lives in `git diff <branch>..HEAD` and the eventual PR body. The CLI summary should be **≤ 8 lines** and surface only what's load-bearing for the user's next decision:

```
✓ Implementation done (your agent) — {exploration name}
  Branch: {branch}, {N} commits, {M} files changed
  Tests: {tests_added} added, all passing
  RBs satisfied: {comma-joined list of RB-N from the brief, ALL or a count}
  Open deferrals logged for Step 12: {count}

Next: push + open PR? (y / show me what changed / abort)
```

If the user picks "show me what changed", THEN run `git diff --stat HEAD~N..HEAD` or open per-file diffs interactively — on request, not by default.

##### 11.5 — Push + PR (single recommended action)

If the user says "y" / "push" / "open PR":

1. `git push -u origin <branch>` (single command, no `--force` ever in this flow).
2. Build the PR body from the template below (it carries the Ritual attribution).
3. `gh pr create --base <default-branch> --title <…> --body <…>`.
4. Surface the PR URL to the user.

**Write the PR body for a maintainer who has never heard of Ritual.** Lead with what changed, *where to look* (in review order), *why*, and *how to verify* — so a reviewer can move fast and trust the change. Ritual lineage goes at the bottom, not the top. Fill every section from real artifacts (brief decisions, the diff, the test files); never leave a `<placeholder>` in the posted body.

**PR body template:**

```markdown
## What this PR does

<2-3 plain sentences: the change + the problem it solves, derived from the build brief's Goal>

## Where to look (review order)

1. `<path>` — <the load-bearing change; start here>
2. `<path>` — <how it integrates>
3. `<path>` — <schema/data changes, if any>
   <ordered load-bearing → plumbing, so review time goes where it matters>

## Why / key decisions

- <decision + the trade-off / alternative rejected — the 1-3 calls a reviewer might second-guess, taken from the brief's decisions>

## How to verify

- Automated: <test files + how to run them>
- Manual: <steps a reviewer runs locally to see it work>

## Scope & follow-ups

- In scope: <what this PR delivers>
- Out of scope / deferred: <intentional punts, one line each — so reviewers don't flag them as gaps>

## Risk / blast radius

- <backward-compat, migration ordering, perf — what could break in prod>

## Ritual lineage

- Exploration: [<exploration name>](<EXPLORATION_URL>) · Build brief: `BUILD-BRIEF.md` (committed for reviewer reference) · Requirements satisfied: <N/M>
- Implementation plan: see `IMPLEMENTATION-PLAN.md` *(only if Step 11.1.5 wrote it)*

Ritual-Exploration: <exploration_id>

🪷 Generated via [Ritual](https://ritual.work) — closing the loop with `sync_implementation` after merge.
```

> **`<EXPLORATION_URL>` MUST be environment-correct — never hardcode `app.ritualapp.cloud`.** Use the server-resolved exploration URL the MCP returns (built from the server's `WEB_URL`). Hardcoding production breaks the link for **dev** builds (the exploration lives in the dev DB) and for **self-hosted / single-tenant enterprise** deployments (the exploration lives on the customer's own Ritual instance, not Ritual's SaaS). If the MCP response does not carry a URL, derive the base from your Ritual auth issuer rather than assuming production. Same rule for the `Ritual-Exploration-Url` commit trailer.

If the user is implementing manually: hand off the brief + the branch-strategy note ("create a feature branch off `main` — don't commit to trunk"), tell them you'll be ready to run `sync_implementation` when they're done.

##### 11.6 — Next slice or done (loop back — [USER PAUSE])

The current slice is committed and synced. At a PR boundary, complete 11.4–11.5 before returning here. Mark the slice done, then continue on the same branch within a PR group or choose the next group's branch according to repository conventions. Do not start a dependent group from a base missing its prerequisites.

**Rendering contract:**

```text
✓ Slice {n}/{N} committed — {commit SHA; PR URL if opened}

Remaining:
  {n+1}. {next slice title} — {requirements}
  …

Reply `next` to plan slice {n+1}, or `pause` to stop.
```

[USER PAUSE] Branch on response:

- **`next`**: set the next slice as the current slice. Within the same PR group, keep the current branch and re-enter **11.0.5** (plan-mode handoff) → 11.1. At a new PR group, enter **11.0** and satisfy its branch and prerequisite checks first. The per-slice plan-mode gate fires again — a fresh plan, scoped to this slice, before any edit. Do NOT carry the prior slice's plan forward.
- **`pause`**: stop; remaining slices stay on the work-list for a later session (which re-enters at 11.0.0).

**When no slices remain**, confirm each slice has synced, retry only pending syncs through Step 12, then continue to Step 13. Do not duplicate successful commit-level records.

For example, a shared module and its first consumer can form two slices in one PR group: commit and sync the module, plan the consumer on the same branch, then commit and sync it before opening their shared PR.

#### Step 12 — Close the loop with `sync_implementation`

**Reach this step per SLICE, at COMMIT — not once at the end after a PR.** A
multi-slice build commits real code long before any PR exists, and until the sync
lands Ritual does not know that code exists: `get_brief_drift` has nothing to
compare, and a brief can go stale against a repo that already moved. Sync when a
slice's commit is in, and pass that slice's `rb_id`s in `deferrals`/`decisions`
so the link from shipped code back to the requirement survives.

**After the sync, read the drift back — `get_brief_drift(exploration_id)`.**
It returns `in_sync` / `brief_ahead` / `code_ahead` / `drift_unknown` plus the
pinned-vs-current brief version. One read, and it is the only way to know the
loop actually closed: a sync that lands and a sync that silently did nothing look
identical from the calling side. `drift_unknown` after a sync means the pin did
not take — say so rather than moving on.

Waiting for the PR also loses the cheapest evidence: `decisions[].choice` and
`alternatives_considered` are freshest at the moment you chose, not after review.

##### 12.0 — What this step does (in product terms)

Before asking for permission, frame the call in language the user can act on. `sync_implementation` is not just an API call — it's the moment the workspace's knowledge graph absorbs what you just shipped. Full rail (this is a top-level decision gate that ends the build flow):

```text
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · ✓ Build brief · ▶ Implementation

Log implementation

I'm about to log this implementation into the workspace's knowledge graph. After this:

  · The exploration's state flips to ✓ done (or ⚠ implemented-ahead if
    any recs weren't approved when shipped).
  · The implementation gets linked back to the recommendations it
    implements — so future `/ritual build` calls touching
    `{first 2 of filesChanged}` will see this implementation as priorContext.
  · The {M} follow-ups you intentionally punted get logged with
    their reasons — peers can see them in `/ritual lineage` on these
    files later.

Reply `log` to confirm, `hold off`, or `adjust` to edit the list first.
```

This framing replaces "I need to call sync_implementation, OK?" — which is jargon. The user should know what they're approving in product terms (cite the specific signal). Note the vocabulary rule in `cli-output-contract.md` — do not surface "decisions" / "{N} decisions" as a user-facing label here; frame the moment as logging the **implementation** itself.

##### 12.1 — Make the call

Call `sync_implementation` with:
- `workspace_id`, `exploration_id`
- `repo`, `branch`, `pr_url`, `pr_number`, `pr_status`
- `commits[]` — each with `sha`, `message`, `timestamp`, `files_changed`
- `decisions[]` — each with `area`, `choice`, `alternatives_considered[]`, `rationale`, optionally `source_recommendation_id` (anchor each decision to the rec it implements when possible — this is what enables future "shipped X to satisfy rec Y" queries)
- `deferrals[]` — for things you intentionally punted (`rb_id`, `description`, `reason`, `severity`, `related_files[]`, `related_modules[]`)
- `gate_verdict`, `adherence_rate` — your own self-reported quality signals

The A1.5 snapshot column auto-captures each linked recommendation's status at the moment of sync — so if you implemented before the rec review's `proceed` (while the rec was still un-reviewed), the timeline is preserved automatically.

When sync_implementation succeeds, the response includes:

- `decisions: [{ decisionId, area, choice, recommendationStatusAtImplementation }, ...]` — IDs of every architectural decision logged + the rec-status snapshot (A1.5)
- `deferrals: [{ deferralId, rbId, severity }, ...]` — IDs of every deferral
- `decisionsCount`, `deferralsCount` — totals for the summary line
- `webUrl` — clickable link to the exploration's implementation record in the web UI

**Surface ALL of this to the user**, not just "ok logged." This is the visible signal that the loop closed. Full rail (this is the completion state for the whole `/ritual build` flow):

```text
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · ✓ Build brief · ✓ Implementation

✓ Logged implementation for {exploration name}

  · Implemented: {first 2 area:choice pairs from decisions[],
    e.g. "auth: OAuth not SAML; data-model: tenant-scoped indexes"}
  · {deferralsCount} deferral{s} registered: {first 1, e.g. "[major]
    Rate-limit per-tenant — out of scope for v1"}
  · View: {webUrl}

Future `/ritual build` calls touching `{first 2 of filesChanged}` will
now see this implementation in their priorContext block.

Next: nothing required — the loop is closed. Run `/ritual lineage` on
any touched file to trace this back later.
```

The `Implemented:` line surfaces a representative slice of WHAT got implemented (concrete area:choice pairs from the underlying `decisions[]` payload) rather than a labeled count. Per the vocabulary rule in `cli-output-contract.md`: the word "decisions" is not surfaced as a user-facing label; the artifacts ARE the signal.

If any anchor's `recommendationStatusAtImplementation` is NOT `approved` (i.e. implemented before the rec review's `proceed`), add a callout — still frame in implementation/recommendation terms. Append this block BELOW the completion message (no separate rail; the rail is already rendered at the top):

```text
⚠ {M} of the recommendations were implemented while still in {status}
state — the exploration now shows `implemented_ahead`. An admin should
review + accept the recs to close the gap.
```

The closing sentence is the most important one: it tells the user **what just happened in the system** in product-level terms. Without it, sync_implementation feels like a write-only black hole. With it, the user understands they just contributed to the workspace's memory.

**If `sync_implementation` fails:** do not drop the structured implementation data. Write the intended payload to `.ritual/pending-sync/<exploration-id>.json` and tell the user exactly what was not logged.

User-visible (full rail — sync failure is a top-level state):

```text
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · ✓ Build brief · ▶ Implementation

Sync failed (recoverable)

`sync_implementation` failed: {error summary}

Saved the intended sync payload to `.ritual/pending-sync/<exploration-id>.json`.
Nothing about your implementation was lost — the failure is on the
logging side, not the code side.

Next: run `/ritual resume` later to see + retry pending syncs, or
re-run `sync_implementation` now if the cause was transient.
```

Create `.ritual/pending-sync/` if needed. **Ensure the directory is gitignored** — the saved payload contains `decisions[].rationale` text the user typed and commit-level data that shouldn't end up in shared repo history. On the first failed sync, also write `.ritual/pending-sync/.gitignore` with `*` so the directory itself is committed but its contents aren't (gives teammates the breadcrumb that pending syncs exist without leaking contents):

```bash
mkdir -p .ritual/pending-sync
[ -f .ritual/pending-sync/.gitignore ] || echo '*' > .ritual/pending-sync/.gitignore
[ -f .ritual/pending-sync/.gitignore ] && ! grep -q '^!\.gitignore$' .ritual/pending-sync/.gitignore && echo '!.gitignore' >> .ritual/pending-sync/.gitignore
```

That two-line `.gitignore` (`*` then `!.gitignore`) follows the standard pattern: ignore everything in this directory EXCEPT the gitignore file itself. Most teams already use this idiom for `.cache/`, `node_modules/`, etc.

##### 12.2 — Staleness check before retry

When retrying a pending sync from `.ritual/pending-sync/<id>.json`, the user may have committed more code since the failure. The saved payload's `commits[]` is a frozen snapshot — re-uploading it after additional commits land would mis-attribute the new work as "not part of this exploration."

Before re-invoking `sync_implementation` on a saved payload:

1. Read the payload's `commits[]` (each has a `sha`).
2. Run `git log --pretty=format:%H` against the payload's `branch`.
3. Compare: if there are commit SHAs in `git log` that AREN'T in the payload's `commits[]`, the payload is stale.

If stale, surface to the user with the full rail (top-level decision gate):

```text
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · ✓ Build brief · ▶ Implementation

Pending sync is stale

This pending sync was saved {N} day(s) ago. Since then you've added
{M} more commit(s) to `{branch}` that aren't in the saved payload.
Retrying as-is would log a partial picture — the work done since the
failure would NOT be attributed to this exploration.

Options:

  1. Retry as-is — log what was saved; you can sync the new commits later.
  2. Regenerate — re-run from scratch with the current state. This is
     usually right when there's been substantive work since the failure.
  3. Show me — print the {M} new commits so I can decide.

Reply `1`, `2`, or `3`.
```

**[USER PAUSE — required, do not auto-answer]** Wait for response. Option 2 is usually right when there's been substantive work; option 1 is fine for small follow-up commits the user wants attributed to the next sync.

If the saved payload's `commits[]` matches current git state, proceed to the retry.

#### Step 13 — Suggest the next request

The loop just closed (Step 12). Rather than stop cold and make the user
re-bootstrap context for whatever they do next, offer the **next best job to be
done** — a NEW discovery exploration in THIS workspace, so the knowledge graph,
deferrals, and prior explorations you just built keep compounding. This is
forward motion, never required work.

##### 13.1 — Generate the suggestion set

Call `suggest_next_request` with `{ exploration_id }` (the
just-finished exploration). It returns 1 primary + up to 2 alternatives. Each is
a NEW exploration that runs its own discovery — it is **never** "go implement the
recommendations you already have" (that's the coding agent's job — `/ritual
resume` on this same exploration). Each suggestion carries:

- `jtbd` + `label` — the job, already picked
- `reasoning` — the concrete signal it cites (a deferral, an unaddressed recommendation, or the natural lifecycle continuation)
- `descriptionSeed` — a first-person "what to explore" framing to pre-fill the next exploration's problem box
- `recommendedPersona`, `sourceRecommendationId`, `id`

Also returned: `recommendationsAddressed` (false ⇒ this exploration still has
clear-to-implement work that ships via `resume`, not a next request).

- **If `suggestions` is empty** (or the call errors) → say nothing about next requests; drop straight to 13.3. Never block the closed-loop completion on this.

##### 13.2 — Present the picker

**[USER PAUSE]** Render the standard list-picker (primary first, marked ★):

```text
Next job to be done

{exploration name} is shipped and logged. To keep building on what this
workspace now knows, here's the next discovery worth running:

★ 1. {primary label}
     {primary reasoning}

  2. {alt1 label}
     {alt1 reasoning}

  3. {alt2 label}
     {alt2 reasoning}

Reply `1`, `2`, or `3` to start it — the job's already picked, so you'll go
straight to framing what to explore. Reply `skip` to stop here.
```

Only render lines for the suggestions actually returned (there may be just a
primary, or a primary + 1). If `recommendationsAddressed` is `false`, add ONE
line below the picker — lean on the coding agent, don't turn Ritual into a
backlog manager:

```text
({N} item{s} from this exploration are clear to implement — say `resume` to continue shipping them here.)
```

**[USER PAUSE — required, do not auto-answer]** Wait for the user's reply.

##### 13.2.1 — On pick (`1` / `2` / `3`)

The picked suggestion is a NEW exploration in the SAME workspace with the job
already chosen — so **advance, don't re-bootstrap**:

1. Skip the work-item / job pick entirely (Steps 0–4) — `jtbd` is already set by the suggestion.
2. Go to **Step 5 (problem frame)** using the suggestion's `descriptionSeed` as the DRAFT "what are you trying to explore?" — present it as an editable starting point, not a blank box. Let the user refine it.
3. At **Step 6 (`create_exploration`)**, pass `from_next_job_suggestion_id` = the picked suggestion's `id`. The server links the new exploration to its parent + source recommendation, defaults the `jtbd` from the suggestion, and marks the suggestion started (it stops showing as an open next request, and the originating recommendation now reads as handed off).
   - If `create_exploration` returns **409** (this next request was already started), don't create a duplicate — tell the user it's already in progress and offer to open that exploration instead.
4. Continue the normal flow from **Step 7 (discovery)**.

##### 13.2.2 — On `skip`

Acknowledge and drop to 13.3. The suggestion set is persisted — a later `ritual
graph status` or re-run of `/ritual build` in this workspace can surface it
again; nothing is lost.

##### 13.3 — Follow-up pointer

If they want to check the state at any time, point them at:

> `ritual graph status` (in their CLI) — shows the workspace's current knowledge graph counts + recent implementations.

Or: re-run `/ritual build` in this workspace later — the existing-work check will surface this exploration with its new `done` state badge, and any future build whose `sources` overlap will pull in the decisions + deferrals you just logged as priorContext.

### Failure modes & recovery

**Discovery generation hangs (>5 min polling without `ready: true`)**: ask the user — wait longer, or retry (`suggest_discovery_questions` again, new task)? Discovery questions are required (the user must pick at least 6 to run), so there is no skip-and-proceed option; if generation can't produce questions, surface the failure rather than running with none.

**Agentic run fails or stalls**: surface the error, offer retry or stop.

**Discovery state ready=true with zero matters**: rare but possible if the LLM produced a malformed state. Retry by calling `suggest_discovery_questions` again.

**LLM-cost / quota errors (HTTP 429)**: tell the user explicitly. Do NOT auto-retry — quota issues need a human decision (different model tier, wait, top up).

### Tools used

Use the tools named in the executable steps above. `audit_anti_goals` validates a proposal against the current anti-goals in one call; `audit_recommendations` starts an audit with a reviewable repair loop.

### After this subcommand

When `/ritual build` completes, the exploration is in COMPLETE state with accepted recommendations AND the job's deliverable has been generated (a build brief for an `implement` job; the deliverable document otherwise) AND (if the agent carried out the terminal in-chat) `sync_implementation` has been called. The workflow includes the terminal — implementation, eval generation, plan execution, decision recording, or investigation — and synchronization.

Variants:
- One person runs the whole flow: Steps 1 → 13, no handoff. Step 9 is a uniform non-blocking review (recs are auto-accepted; `proceed` records the review and continues).
- Implementation lands before the rec review/`proceed`: the `sync_implementation` snapshot freezes that timeline and the exploration shows `⚠ implemented_ahead` until reconciled (see Step 12).
- Resume mid-flow: the existing-work check surfaces explorations with state badges and jumps directly to the right phase. (Or, for the "I just want to pick up" intent, see `/ritual resume` below.)

---
