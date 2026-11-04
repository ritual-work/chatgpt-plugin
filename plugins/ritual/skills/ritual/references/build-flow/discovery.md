<!-- GENERATED from references/build-flow.src.md by the Ritual monorepo internal guard — DO NOT EDIT. -->
<!-- source-sha: 1ed60b58b757af57 -->

# /ritual build — Discovery (generated; do not edit)

This file holds Steps 7 to 8.5 of `/ritual build`.
The previous phase is `references/build-flow/scope.md`.
Read `references/build-flow/recommendations.md` only when you reach its first step, and read it then in full. Reading it earlier loads text you do not need yet.
The index `references/build-flow.md` lists every phase with its step range. A step named here that lives in another phase is found through that index.

## In this phase

Read the step you are on by its line range; the file is long and the other steps wait their turn.

- Step 7 — Discovery questions (lines 21 to 477)
- Step 8 — Run discovery through recommendations (lines 478 to 712)
- Step 8.5 — Run Agentic Exploration (product/design answer-review mode only) (lines 713 to 797)

---

#### Step 7 — Discovery questions

Longest phase because generation is async + the user picks per-Area. (Internally the API field is `matter_id`; user-facing copy always says Area.)

**Step 6 → Step 7 transition anti-pattern (load-bearing):** after `create_exploration` succeeds in Step 6, you MUST NOT jump to Step 8's answering/run — discovery questions must be generated, picked, and committed first. Required next actions, in order, before Step 8 is allowed:

1. Call `suggest_discovery_questions(exploration_id)` (Step 7.1) — no user input needed; just kick it off.
2. Poll `get_discovery_state(exploration_id)` until `ready: true` (Step 7.2).
3. Render the **Area rail + Area 1's questions together** and walk Area-by-Area per § 7.3.1 (the rail orients; a rail with NO questions under it — a bare index — is the failure mode).
4. `[USER PAUSE]` — the suggested-12 landing (§ 7.3.1): the user replies `proceed` (commit the 12), `expert` (walk + adjust; floor 6 to run, aim 15–20, no cap), or `pause`.
5. Commit all picked Areas in ONE `accept_discovery_questions_batch` call (Step 7.4) — never one parallel call per Area.
6. Optionally capture anti-goals (Step 7.5), then proceed to Step 8 — but only **after the Step 7.4 `accept_discovery_questions_batch` response returns** (you need its `materialized[]` question ids to run against). For engineering/delivery/operations, then **auto-fire the run** (answer the picked questions + `submit_all_answers`, or the server fallback) — no `run` CTA, no pause. For product/design/PRD flows, render the `1`/`2` run-mode choice (stop-after-answers review vs run-through). Never start answering/running before the accept resolves.

**Picking is a deliberate step-through, not a bulk action (load-bearing):** the user going Area by Area and choosing the questions that matter IS the value of discovery — that per-question judgment shapes the whole downstream chain. So **nudge the user to step through and pick**; don't lead with bulk shortcuts.
- **Nudge to step through.** Walk the user Area-by-Area (drop into Area 1, `next`/`prev`) and invite deliberate picks per Area, with `show more` to expand an Area. The framing is "which of these should we dig into?", not "want all of them?".
- **Floor (HARD): at least 6 questions** across any Areas — below this, do NOT commit or proceed (tell them how many more to pick and keep them in the picker). There is NO "skip discovery" path — the agentic run needs a real question set to develop answers against. **Good coverage (SOFT): 15–20 questions** — nudge toward it on the Summary, but never block once ≥6. **No upper cap** — picking many (or all) is a legitimate explicit choice, never a default or fallback. (Uncovered scope is handled downstream when recommendations + requirements are generated and audited, so a thin set is the failure mode to prevent.)
- **CTAs never name a visual state.** No "marked ✓", no "already checked", no
  "the highlighted ones" — those are only true where a component rendered, and
  the same sentence has to work on a surface that shows plain numbered text.
  Name the RECOMMENDATION, which is true on both paths: *"reply `proceed` to
  answer the ones Ritual recommends"*, or *"reply with the numbers you want to
  keep — for example 1, 3, 5"*.

- **The default is the suggested 12, never "all."** `proceed` commits exactly that suggested set (not every generated question). An ambiguous reply (`proceed`, `go`, `ok`) at this gate means **accept the suggested 12** — never silently accept everything. (The landing summarizes rather than lists them; `expert` is the path to read/adjust the set before committing.)
- **Taking all IS allowed — but only as an explicit user choice, never the default or a fallback.** If the user genuinely says "take all" / "all of them", honor it and commit them; that's a legitimate choice, not an error. Just never *offer* "I'll take all" as the default, and never auto-fall-back to it. (Worth mentioning once, not as a gate: every accepted question is answered individually in the agentic run, so accepting all of them across every Area means many more questions to answer and a much longer run — but it's the user's call.)

**Forbidden behaviors:**

- Calling `start_discovery_run` before at least 6 discovery picks have been committed for this exploration (via `accept_discovery_questions_batch`, or `accept_discovery_questions`). There is no skip-discovery exception.
- Silently auto-picking all generated questions and proceeding to Step 8 — e.g. inventing an "engineering-mode default is to run, which skips the per-question picker." There is no such default; the picker is mandatory.
- **Offering "or I'll default to taking all of them" (or any accept-all fallback), then committing the full set on an ambiguous reply** — e.g. a `proceed` at this gate → `accept_discovery_questions_batch` with all 68 questions → a ~25-min run the user never chose. Accept-all is a legitimate choice **only when the user explicitly asks for it** — it is NEVER the default you offer, and NEVER the fallback. The default you offer + fall back to is always **the suggested 12 rendered on the landing**. An ambiguous reply (`proceed`/`go`/`ok`) at the pick gate means **accept those 12**, not the full set — structurally safe because the 12 are on screen in full.
- Starting Step 8 — auto-firing the answers (engineering) or rendering the product/design run-mode choice — anywhere in the chat before Step 7.4 has committed the picks.

The picker is **not** a UI suggestion — it's the load-bearing decision gate where the user expresses what to investigate. Skipping it converts the agentic run into an automated "answer everything" pass and erases the user's judgment.

##### 7.1 — Kick off

Call `suggest_discovery_questions(exploration_id)`. Returns immediately with `task_id`. Tell the user with the full rail (we just entered the Discovery phase):

```text
Ritual build
✓ Scope · ▶ Discovery · Recommendations · {Deliverable} · Implementation

Generating discovery questions…
```

##### 7.2 — Poll until ready

**Readiness is the server's signal — never infer it from the payload.** Matters are persisted BEFORE their questions, so a state that already carries matters does NOT mean generation finished. Read `ready`; the accompanying `status` tells you *why* it isn't ready and whether waiting will help.

Loop:
- Call `get_discovery_state(exploration_id)`
- `ready: false`, `status: pending` (nothing generated yet) or `generating` (questions still being written) → wait 10 seconds, poll again
- `ready: false`, `status: stalled` → generation stopped making progress. This is **not** a wait-longer state — polling on will never clear it. Call `suggest_discovery_questions(exploration_id)` once to re-enqueue (a stalled state is retry-able; it releases the stale claim and starts over), then resume the loop. If it stalls a **second** time, stop and surface it as an anomaly — offer `/ritual status` or the web app. Never retry a third time.
- `ready: true` → exit loop

If ~10 minutes pass still `generating`, surface it as an anomaly rather than polling on silently.

Don't poll faster than every 10 seconds. Follow the global polling rule above: a constant ~10s cadence and a one-line update every ~2 polls (~20s). Polling heartbeats are exempt from the Build rail rule per `references/cli-output-contract.md` § Build progress anchor — does NOT apply to.

##### 7.3 — Question picking: the suggested-12 landing (default) + the expert walk (on request)

The state contains `matters[]`, each with `id`, `name`, and `questions[]`. Internally these are `matter`s; user-facing copy ALWAYS calls them **Areas**.

**Landing-first.** The default render is NOT the Area walk — it is the **suggested-12 landing**: Ritual's 12 suggested questions across all Areas, listed IN FULL (never truncated), grouped by Area, pre-selected. One word (`proceed`) commits them; `expert` opens the Area-by-Area walk with the 12 already selected (toggle to adjust). The walk is an Area rail, the current Area's questions, and a Summary before commit, and remains the place to push toward the 15–20 good-coverage range — it's just opt-in now instead of mandatory.

The two failure modes this contract prevents:
- **A bare Area index** — the rail (or a "pick an Area" menu) with **no questions under it**. The rail without its current Area's questions is exactly the removed model; always render the questions inline.- **A full dump** — every Area's questions in one message. Only the **current** Area's questions render per turn.

**Turn boundaries (load-bearing — this is a multi-turn walk, not a one-shot render).** Render the rail + **exactly ONE Area's questions per turn**. After rendering, **STOP and end your turn** — wait for the user's reply (`numbers` / `next` / `prev` / `skip` / `done`). Each of `next` / `prev` / `done` produces the **next render in a NEW turn**, never appended to the current message. You already hold every Area's questions from `get_discovery_state` — that is NOT license to render the whole walk or multiple Areas' questions in a single message. The rail lists Area *names + counts* (cheap orientation); only the current Area's *questions* render. One Area → STOP → reply → next Area. The Summary (§ 7.3.3) is likewise its own turn.

###### 7.3.0 — Compute the suggested 12 + per-Area recommendations (internal, not user-facing)

Three things are computed up front, **none auto-committed**:
- **(a) The suggested 12** — 12 questions TOTAL across all Areas, the landing's content. Selection rubric (a rule, not vibes): guarantee at least one question from every Area that contains a genuinely hard question; fill the rest by leverage, biased toward questions that probe **tradeoffs, constraints, and the scope-pressure/boundary items** the exploration's additional context surfaced. If fewer than 12 questions clear the bar, suggest fewer (floor 6) — never pad to hit the number.

- **(b) The Area rail** (expert mode) — every Area's name + its running picked count, shown above the current Area's questions.
- **(c) The per-Area ★ recommended set** (3–4 questions, expert mode) — computed for the Area currently showing.

The user always confirms; nothing is committed without their reply.

**Per-Area recommended set** (the ★ set, for the Area currently shown):

- Pick the top 3–4 questions per Area most likely to shape the recommendations, based on the problem statement, locked sub-problems from Step 4, and the codebase context read at Step 3. Bias toward questions whose absence would force later stages to invent consequential facts.
- Area has **< 4 questions**: all are recommended.
- Area has **4–7 questions**: top 3 are recommended.
- Area has **8+ questions**: top 4 are recommended.

Input aliases for this picker are defined under **Input compatibility** below.

**Record the suggested set before rendering.** Once (a) is chosen, call
`select_discovery_questions(exploration_id, state_id, picks)` where `picks`
names every chosen question by position: `[{ area: n, questions: [i, j, …] }, …]`, 1-based,
in the order `get_discovery_state` listed the Areas and their questions. Pass the suggested
set IN FULL, never a delta, because the call REPLACES the stored selection. The server
resolves positions to question ids; never transcribe an id yourself. Nothing is committed by this: no questions are materialized and the step does
not advance; `accept_discovery_questions_batch` is still the only committer.

Two reasons it is not optional. It makes the set DURABLE, so a resumed build reads the
same twelve rather than depending on them surviving in context. And on a surface that
renders the picker it is what draws your set pre-checked — skip it and the user sees every
question unchecked while your text says twelve are recommended, which is the one thing the
pick gate must never do.

###### 7.3.1 — First render: the suggested-12 landing (the default)

Render the **compact landing**: a one-line stake, THREE sample questions, a remainder line, and the action bar. Full phase rail on this message (we just entered Discovery).

**Three, never twelve, never none.** Listing all twelve is too verbose; listing none asks the user to approve twelve questions they had not read, which is the blindest gate in the flow. Three concrete questions make the twelve credible at a glance and stay short. Pick them from DIFFERENT Areas — three from one Area reads as a narrow run.

**Report the artifact, not the effort.** The counts are Ritual's numbers, not the developer's: lead with what the questions DECIDE, and let the totals land as a remainder line. Never "we've generated N…" — write in second person about their build, not first-person plural about our work.

**Plugin-attached:** this landing can be a plugin-owned surface (see *Plugin-attached rendering*). **Two triggers, and each has its OWN exact rendering below — render one of them, never the full landing block that follows.**

- **`.ritual/plugin.local.json` `active: true`** → the board carries progress. Suppress the rail AND the landing. Render EXACTLY these two lines (with the rail suppressed, the first line is the readiness signal; `Discovery questions ready.` is the approved status — never `Recommendations ready.`, which belongs to Step 9):

```text
Discovery questions ready.
↳ Pick discovery questions in the Ritual panel, then reply `proceed`.
```

- **`select_discovery_questions` returned `componentAttached: true`** → the picker rendered inline. Keep the rail, collapse the landing. Render EXACTLY this:

```text
Ritual build
✓ Scope · ▶ Discovery · Recommendations · {Deliverable} · Implementation

Key questions that decide this build. They're the ones your agent would
otherwise guess at.

↳ Pick discovery questions in the Ritual panel, then reply `proceed`.
```

**Where the total lives, as a placement rule rather than a prohibition:** the
question total is BODY TEXT on the all-text path only. It never appears beside
the rail, and it never appears when a component is carrying the questions —
there, the accordion's per-Area headers are the live count and anything you
author is stale the moment the user ticks something.

The stake line itself stays on every path. Only the number moves. Without a
stake line the user is handed a checklist and no reason to care, which is what
this template used to do: it omitted the line entirely while the rule below said
to state one, and "render EXACTLY this" is the more imperative of the two — so
the framing silently vanished on every component-attached run.

- **Neither** → render the full landing block below.

**Do not restate the questions on either plugin-attached path.** The panel is already showing them; a text list beside it is the same information twice, and the counts drift apart the moment the user ticks anything.

The drawer drives selection; the pick gate, its `proceed`/`expert`/`pause` tokens, and the §7.4 commit are unchanged.

```text
Ritual build
✓ Scope · ▶ Discovery · Recommendations · {Deliverable} · Implementation

Twelve questions decide this build — the ones your agent would otherwise guess at.

{Area A}
{question text}

{Area B}
{question text}

{Area C}
{question text}

+ 9 more across {remaining Areas}. {M-12} other questions stay on file.

Next
`proceed` — answer all 12 and turn them into recommendations
`expert` — read all 12, swap in your own, pull from the other {M-12}
```

**First, record the choice — then act on it.** Call
`record_gate_choice(gate: 'discovery', choice: <what they asked for>, exploration_id)`
before branching, and continue without waiting for it. It returns at once, gates
nothing, and nothing downstream reads it. **If it errors, ignore the error and
carry on** — it must never cost the user their turn.

Why: `expert` and `pause` produce no other tool call, so without this a user
choosing either leaves NO trace, and a `proceed` you misread looks identical to
silence. Every incident so far was diagnosed from tool-call rows; this is the one
row that says what was actually asked for.

Branch on reply:
- **`proceed`** (or an ambiguous `ok`/`go`): commit exactly the suggested 12 via § 7.4's single batch call (grouped per Area), then continue to § 7.5 → Step 8. Ambiguous replies (`ok`/`go`) map here. Only three are shown at this landing — a user who wants to read or change the full set uses `expert`.
- **`expert`**: enter the Area walk below with the suggested 12 **pre-selected** (`picked so far: 12`, ✓ on each suggested row). Numbers TOGGLE in expert mode — typing a selected question's number unselects it.
- **`pause`**: stop here; nothing committed.

###### 7.3.1b — Expert mode: the Area walk (entered via `expert`)

**Plugin-attached:** this Area walk can be a plugin-owned surface (see *Plugin-attached rendering*). Check the trigger for THIS block — a component that rendered on some earlier block says nothing here:

- **`.ritual/plugin.local.json` `active: true`** → suppress the rail + Area UI (the board carries progress).
- **`select_discovery_questions` returned `componentAttached: true`** → the picker rendered inline. Keep the rail, suppress the Area UI. Render EXACTLY this:

  ```text
  Ritual build
  ✓ Scope · ▶ Discovery · Recommendations · {Deliverable} · Implementation

  ↳ Pick discovery questions in the Ritual panel, then reply `proceed`.
  ```

- **Neither** → render the rail + Area UI in full.

Either way render `↳ Pick discovery questions in the Ritual panel, then reply \`proceed\`.` — but **what the panel can DO differs, and the difference is load-bearing:**

- **Board + drawer (marker file)** — a SELECT surface. The questions are grouped-by-matter in the bottom-panel drawer and **each toggle persists live to discovery state**. On `proceed` the user has already curated: call § 7.4's batch **with no `picks`** and let the server commit the stored selection — do NOT re-read the state and re-send ids (the server ignores them), and do NOT re-run the in-chat Area walk.

- **Inline component (`componentAttached`)** — a real SELECT surface. The checkboxes toggle, the per-Area header count updates live, and each toggle persists to the discovery state (debounced, full set). So on `proceed` the user has already curated: call § 7.4's batch **with no `picks`** — the server commits the stored selection and ignores picks anyway, so re-sending ids cannot change the outcome, only mislead you about what committed. Do NOT re-read the state and re-send ids, and do NOT re-run the in-chat Area walk. If they name changes in chat ("add 3 and 7"), write that with `set_question_selection` FIRST, then commit.

  **The total is body text on the all-text path only — never beside the rail, never when a component carries the questions.** A count you author is stale the instant they tick anything, and the accordion's per-Area headers are already live. Say `Ritual has generated questions across {A} areas.` and let the component carry the numbers. With no component, the totals have to come from you: `{S} of {T} questions are selected. They decide this build — they're the ones your agent would otherwise guess at.`

The pick gate, its tokens, and `proceed` are unchanged.

Open ON Area 1 with the **rail above and Area 1's questions below it** — never the rail alone. The rail lists every Area (current one marked, picked count per Area); the questions are Area 1's ★ recommended set, with ✓ already on rows that are in the suggested 12. Subsequent Area messages use the in-phase chip. The 15–20 soft nudge lives here: the user arrives with 12 — the walk is where they push toward broader coverage (floor 6 HARD if they unselect).

```text
Ritual build
✓ Scope · ▶ Discovery · Recommendations · Build brief · Implementation

Question picking · Area 1 of {N} · {Area name}          picked so far: 12

Areas   ▶ {Area name 1} · {Area name 2} · {Area name 3} · {Area name 4} · {Area name 5}
        ▶ current · ✓N after a name = picked in that Area · move with `next` / `prev`

Expert mode — the suggested 12 are pre-selected (✓). Numbers toggle;
aim for 15–20 total (6 minimum to run, no cap).

Showing the {k} most likely to change the plan ({total} in this Area):

  1. {recommended question 1, wrapped readably}
  2. {recommended question 2, wrapped readably}
  3. {recommended question 3, wrapped readably}

pick   numbers (e.g. `1,3`)  ·  `suggested` (these ★)  ·  `add <your question>`  ·  `show more` ({total−k} more)
walk   `next`  ·  `prev`  ·  `skip`  ·  `done` (≥6)
```

**Single numbering stream — number the QUESTIONS only; the rail Areas are NOT numbered.** Numbering Areas AND question previews in one view makes a reply of `5` ambiguous. Here the rail uses `▶` / unmarked markers + names (no numbers) and you move it with `next`/`prev` — the only numbered list is the current Area's questions, so a bare number is never ambiguous. Wrap long question text readably. The `picked so far` count, the rail markers/`✓N` counts, and the `Area i of N` breadcrumb all update on every render of the walk.

**Vocabulary split:** the landing's `proceed` commits the suggested 12 (questions); Step 9's `proceed` continues recommendation review. Inside expert mode, the ★ marks the per-Area recommended set and `suggested` picks it; input aliases follow **Input compatibility** below.

###### 7.3.2 — Within an Area (pick → auto-advance)

**Picking IS progress.** A pick reply (`numbers` or `suggested`) ADVANCES to the next Area — never re-render the same Area and wait for `next` (each pick advances the walk; navigation preserves the selection). `prev` is the way back if they want to adjust; `next` still exists for moving WITHOUT picking.

**Every render in this section keeps the `Areas …` rail line on top** (current Area marked, `✓N` counts updated) — it's omitted from the snippets below only for brevity. Never re-render an Area's questions without the rail above them.

- **`numbers`** (e.g. `1,3` or `1,2,5`): TOGGLE those questions — unselected ones join the picked set, already-✓ ones (including pre-selected suggested-12 rows) leave it. Then **ADVANCE: render the NEXT Area** (rail + its questions), opening with a one-line ack of the Area just left — `{Area name}: {n} picked ✓` — and the updated `picked so far`. On the LAST Area, a pick advances to the Summary (§ 7.3.3). Do NOT re-render the same Area after a pick; `prev` returns if the user wants to adjust.
- **`suggested`**: pick this Area's recommended (★) set in one go — then advance exactly like `numbers`.
- **`show more`**: reveal the rest, grouped Recommended / More (lazy per-Area expansion — never a global dump):

```text
Question picking · {Area name}                          picked so far: {T}

Recommended:
  1. {recommended question 1}      ✓
  2. {recommended question 2}
  3. {recommended question 3}

More questions:
  4. {non-recommended question 1}
  5. {non-recommended question 2}
  ...

Reply numbers (e.g. `1,4`), `next`, `prev`, or `skip`.
```

- **`next` / `prev`**: move to the next / previous Area (picks preserved). At the last Area, `next` goes to the Summary (§ 7.3.3).
- **`skip`**: leave this Area with no picks, advance to `next`.
- **`done`**: jump straight to the Summary (allowed from any Area).
- **`pause`**: stop here — state is saved, nothing committed.
- **`show all`**: accepted as a reply (expands every Area's questions into one long list) but NOT advertised on the CTA line — per-Area `show more` is the default, not a global wall.
- **`add <your question>`** (e.g. `add How should we handle partial refunds?`): add a USER-AUTHORED question to THIS Area. **Pre-flight format-validate it locally first:** it must read as a single, clear question (non-empty, interrogative or ends with `?`, ≤ ~200 chars). If it's malformed (a statement, a fragment, multiple questions, too long), say what's off and ask them to rephrase — do NOT hold a malformed one. When valid, **hold it locally** for this Area and re-render the Area (rail + questions) with it shown as `＋ (your)  {text}` beneath the questions, `picked so far` incremented. It counts toward the floor/target like any pick. It is NOT written to the server yet — every custom question is persisted in ONE batch at `commit` (§ 7.4).

###### 7.3.3 — Summary (after the last Area, or on `done`) — the review-before-commit gate

Render all picks grouped by Area. This is the Summary gate, where the user confirms before the run. Use `✓` picked / `—` none / `□` untouched. NEVER strikethrough (renders inconsistently across terminals).

```text
Question picking · Summary                              {T} picked

  ✓ 1. {Area name 1}        {n} picked
        – {picked question}
        – {picked question}
  — 2. {Area name 2}        none picked
  ✓ 3. {Area name 3}        {n} picked
        – {picked question}
  ...

{if T < 15}   A good set is usually 15–20 — you've picked {T}. Reply an Area
              number to add more, `more` to suggest new Areas, or `commit`
              (run discovery → recommendations).
{if T ≥ 15}   Reply `commit` to run discovery on these {T} questions
              (answers → recommendations, ~a few minutes), an Area number
              to adjust, `more` for new Areas, or `pause` to stop.
```

**The minimum model — floor 6 HARD, good 15–20 SOFT, no cap:**

- **`commit` with T < 6** → REFUSE (hard floor). *"Pick at least 6 to run discovery — you have {T}, choose {6−T} more,"* then return to the Summary (or the Area they were on). No skip path; do NOT call `accept_discovery_questions_batch` or `start_discovery_run`.
- **`commit` with 6 ≤ T < 15** → allowed. Proceed to § 7.4 after the one-line "good is 15–20" nudge — do NOT re-nag or block.
- **`commit` with T ≥ 15** → proceed to § 7.4.
- **An Area number** at the Summary → re-open that Area's questions (picks preserved), then return here.

**Held custom questions + pending new Areas render in the Summary** so the user reviews everything before `commit`: a held custom question shows under its Area as `＋ (your) {text}`; a pending agent-suggested new Area shows at the bottom as `＋ (new) {name}  {n} questions`. They count toward `{T}`. All are persisted at `commit` (§ 7.4).

- **`more`** at the Summary → the user wants broader coverage. **Suggest 2–3 NEW candidate Areas inline yourself** — each a short name + 3–4 questions — authored from the problem statement, the locked scope, and the Areas already shown, chosen to fill **gaps** the current Areas miss. Label the candidates with **LETTERS (`A`, `B`, `C`) — not numbers** — to avoid colliding with the question-number stream, and ask which to add (`letters`, e.g. `A` or `A,C`, or `none`). Picked candidates become **pending new Areas held locally** (persisted at `commit`). Do NOT call a server "generate-more" endpoint — you have the context, so propose directly (it's faster). **Never auto-add — the user picks.**

###### 7.3.4 — Power paths (available from any Area or the Summary)

- **`accept shortlist`**: follow **Input compatibility** below.
- **`show all`**: accepted as a reply but NOT advertised on the CTA line. Expands every Area's questions into one long list. Use only when the user explicitly asks — the per-Area `show more` is the default.
- **`done`**: jump to the Summary from any Area to review + `commit`.
- **Below the floor** (fewer than 6 picked on `commit`): do NOT proceed. Reply with how many more are needed and return to the Summary — e.g. *"Pick at least 6 to run discovery — you've picked 3, choose 3 more."* There is no skip path. (6–14 is allowed with the soft nudge; ≥15 is the good-coverage target — see § 7.3.3.)

###### 7.3.5 — What NOT to say

- DO NOT add machinery copy like *"The answer engine will then investigate them by reading the codebase and surface clarifying questions for you to review."* The user only needs to know that picking them triggers investigation.
- DO NOT use `Press Enter` anywhere in this picker (see § Surface-aware continuation prompts).
- DO NOT say `lock` for the picking confirmation; use `done` (to the Summary) then `commit`.
- DO NOT number Areas and questions in the same view — one numbering stream (the current Area's questions). The breadcrumb `Area i of N` carries position; it is not a pickable number.

###### Input compatibility

Accept these replies without advertising additional options:

- `accept shortlist` or `accept recommended`: use the landing's `proceed` action.
- `suggest`: use the current Area's `suggested` action.
- `all`: ask for explicit question numbers or the suggested set; do not select every question automatically.

##### 7.4 — Commit picks (ONE batch call across all Areas)

**load-bearing — forbidden behavior:** use one batch call for the whole selection.
Do not substitute per-Area calls when the batch tool is available. The unavailable-tool
fallback below is the only exception; never run its per-Area calls in parallel.

Call `accept_discovery_questions_batch` **once** with `state_id`
only — **OMIT `picks`.** The server commits the selection it already holds:
the set you recorded via `select_discovery_questions` (kept current by the
user's replies during the walk), or the panel's own toggles where a picker
component rendered. Passing ids makes you a second copy of a fact you do not
own, and a stale copy commits the wrong set. `picks` exists only for callers
that never mark a selection at all; this flow always does.

```ts
// ONE call, no picks. The server owns the selection; the response reports it.
await accept_discovery_questions_batch(state_id);
```

**The response is the truth of what was committed (load-bearing).** If you
reference the committed set anywhere downstream — the anti-goals lead-in, the
run kickoff, an answer to "how many?" — use the accept response's
`materialized[]` count, never the number you suggested or last rendered. On a
panel surface the user may have grown or shrunk the selection after your
render; when the counts differ, the response is right and your context is
stale — say so plainly if asked, without exposing the machinery.

Use the single-Area `accept_discovery_questions` ONLY as a fallback when the
batch tool is unavailable — and then **sequentially** (`await` each in turn),
never in parallel.

User-facing: emit NOTHING for the commit — not per Area, and not once for the
whole batch. The pick is the user's decision and it is already on screen; a line
about what we do with it afterwards reports our storage, not their build, and
the call is fast enough that it buys no reassurance. The next thing the user
sees is the next gate.

The batch call is all-or-nothing — validation fails the whole request if any
pick is malformed, so there's no partial-success state to reconcile. Areas the
user chose not to pick from are simply left unpicked.

**If there are NO held custom questions or pending new Areas, proceed to anti-goals.**

###### 7.4.1 — Persist held custom questions + new Areas (only if any were held)

Custom questions (`add`, § 7.3.2) and pending new Areas (`more`, § 7.3.3) were held
LOCALLY during the walk because `add_discovery_question` needs a **workspace** matter id,
which only exists after the batch above materialized the picked Areas. Persist them now,
AFTER the batch call:

1. **Resolve workspace matter ids.** Call `get_exploration(exploration_id)` and
   map each Area **name** → its workspace `matters[i].id`. (The batch only materialized Areas
   the user picked AI questions in.)
2. **For each Area that has held custom questions:**
   - if a workspace matter for that name exists → use its id;

   - if not (a custom-only Area, or a pending new Area) → `create_discovery_area(exploration_id, name)` first, use the returned id.
   - then call `add_discovery_question(exploration_id, matter_id, text)` for each held question — **SEQUENTIALLY** (`await` each), never in parallel (same connection-pool caution as the batch).
3. **For each pending new Area** (from `more`): `create_discovery_area(...)` then `add_discovery_question(...)` per its questions, sequentially.

One status line for the whole persist step (not one per question):

```text
Adding your {M} question(s) across {K} Area(s)…
```

Only after all holds are persisted, proceed to anti-goals. The floor (≥6) counts
custom + AI questions together — never `start_discovery_run` before the held questions are
written.

##### 7.5 — Optional: capture out-of-scope items

If the user mentioned things they DON'T want investigated ("don't touch enterprise SSO", "skip pricing"), capture them as anti-goals.

**Pre-flight (mandatory):** before calling `set_anti_goals`, run the change pre-flight in `references/change-preflight.md` — restate the out-of-scope items you heard and show the exact anti-goal `text` array you're about to send, then wait for `yes`. A misread anti-goal poisons rec-gen and the R4 audit downstream, so this hard pause (even in auto-mode) applies even when the user's phrasing seemed clear. Do not call the tool until the user confirms.

Call `set_anti_goals(exploration_id, [{ text, reason? }, ...])`.

If no anti-goals were mentioned, skip this with NO user-visible output. (No mention = nothing to confirm; the pre-flight only runs when the user actually states out-of-scope items.)

**Pulse (Step 7.4 done — and again after 7.5 if anti-goals were set):** Emit a pulse — decision resolution and (if 7.5 ran) assumption safety just moved. Compact format unless this crosses Under-specified → Exploration-safe.

#### Step 8 — Run discovery through recommendations

The pipeline runs answers → recommendations. **Choose the answerer by whether you
actually have the code to ground answers in — this is NOT decided by the fact
it's `/ritual build`.**

**The SERVER decides this, not you.** `get_exploration` returns `answerer`:

- **`answerer: 'agent'`** — a repo is bound to this exploration (`repoKey` is
  set, from `prepare_build`). There IS a codebase to ground answers in, so
  run **`ritual ground answer` from the bound checkout**, validate its saved receipt,
  then `submit_all_answers` only when all committed questions are answered. Verification
  uncertainty is handled inside Ritual: retain supported facts and an explicit open
  point, without asking the user to retry or swap questions. If an execution failure
  leaves missing answers, reconcile the receipt/saved state and retry only those IDs
  once automatically. Do not run successful answers again. If recovery cannot finish,
  report the concrete blocker and ask only for access or input actually required;
  do not offer routine retry/replacement approval cards or fabricate completed answers.
- **`answerer: 'server'`** — no repo is bound. There is no codebase to read, so
  use the **server agentic run** (`start_discovery_run`), which sources answers
  from the knowledge graph + registered sources.

Read the field; do not judge yourself against it. A previous version asked you
to decide whether you were "genuinely repo-linked" and to "pick the path
honestly" — an honest answer to a question you cannot verify. A live run took
the server path (correct) while announcing it was answering from the codebase
(false), and nothing could tell the two apart.

**`answerer: 'agent'` is permission, not proof.** It means a repo is bound, not
that answering ran. The repository executor must inspect the bound checkout;
if that checkout is unavailable, explain the missing access and stop the handoff.
Never replace repository verification with answers from incomplete chat context.

**The answering contract** (every Ritual surface's skill carries this same block — it is synced from one source, never edited in place):

- **Answer honestly from real grounding.** Whoever actually holds the grounding answers: an agent that read the repo answers from the code; without that grounding, answering falls to the user or the server run. Never claim grounding you don't have — say what you verified and what you inferred.
- **Surface what the code cannot answer.** Some questions genuinely need a person — intent, priorities, appetite, constraints that live outside the repo. **Never guess silently.** Resolve them one of two ways: **ask**, where the person is answering alongside you and a pause costs little; or **answer with a stated assumption**, naming it as an assumption inside the answer itself ("the repo has no team model today, so this assumes X"), where stopping would cost more than a correction after the recommendations land. Your surface's own answering step says which of the two it wants. Either way the basis of the answer stays visible — that is the part that must never be lost.
- **Length:** keep each answer to **~300–600 words by default** — tight and grounded, not an essay. Go longer only when the question genuinely needs it.
- **Prose, not code.** The answer itself is prose. Code is **optional reference, never part of the answer**: attach a snippet only when it helps a future reader reason about the answer — a fenced code block with a language tag and the `file/path`, the minimal illustrative lines, never a whole-file paste.
- **Never leak secrets or sensitive data.** A snippet is illustrative, not a verbatim copy — simplify and elide freely. **NEVER** include API keys, tokens, passwords, connection strings, credentials, `.env` values, real customer data, or PII — even if they are literally in the file you read. Replace them with obvious placeholders (`process.env.X`, `"<api-key>"`, `"user@example.com"`). The same goes for prose: describe constraints without pasting secret values.
- **Sources are repo-relative paths** exactly as they appear in the repo (never `./`-prefixed or absolute), kept focused — 5–10 is the sweet spot. Recon stays silent: it exists to sharpen the questions; never narrate it.

For `engineering`, `delivery`, and `operations` roles there is **no run confirmation**: the user already chose "generate answers and recommendations" when they proceeded from the discovery pick gate (§ 7.3.1), so a second "ready to run?" prompt is redundant friction. **Auto-proceed with no `run`/`pause` CTA and no wait for a reply.**

**Strict ordering (load-bearing — do NOT skip, reorder, or parallelize):** the run begins **only after the Step 7.4 `accept_discovery_questions_batch` call has RETURNED its response**. That accept is what commits the picks and returns `materialized[]` (the committed question rows + their `id`s); you answer those exact ids. Do NOT call `save_answer_context`, `submit_all_answers`, or `start_discovery_run` before the accept resolves, and never fire them in parallel with it — there is no committed question set to run against until the accept returns. Removing the old `run` gate removed a human turn, NOT this dependency: await the accept, read `materialized[]`, then run. Once you have the accept response, print one non-blocking status line so the hand-off isn't silent, then begin. **Do NOT first narrate the accept outcome** — a line like `12 questions saved across 8 areas.` / `N questions picked` is a forbidden step-outcome leak (`references/render-contract.md`). Go STRAIGHT to the hand-off render below; the accept itself emits nothing:

```text
Ritual build
✓ Scope · ▶ Discovery · Recommendations · Build brief · Implementation

Answering your picked questions, then generating recommendations.
```

(Match the line to the path you'll actually take: repo-linked → "Answering your picked questions from the codebase…"; fallback → "Ritual is sourcing answers for the picked questions…". Don't claim to answer from code if you're taking the server path.)

**If you're genuinely repo-linked (per the check above), Ritual answers from the repository.**
Do not write the answers yourself through `save_answer_context`, and do not call
`start_discovery_run` for this path. A displayed label is not evidence that behavior exists;
Ritual's repository checks own the answering procedure.

1. Await Step 7.4's `accept_discovery_questions_batch` response. Its `materialized[]`
   contains the saved question IDs. Preserve the accepted set; do not substitute drafts.
2. From the bound checkout, run:

   ```text
   ritual ground answer --exploration <exploration_id>
   ```

   Keep the configured provider/model. Wait for that command; do not launch parallel
   host answering, substitute your own answers, or start another command while it runs.
   Use the product-facing status in `references/render-contract.md`. If the installed CLI
   lacks this command or configuration is missing, explain the setup needed and stop this
   handoff rather than bypassing verification. Never invent credentials.
3. Read the saved receipt and current answer state. The command saves answers but does
   not submit them. If any committed question remains missing or failed, explain what
   remains; do not manufacture certainty or submit a partial set. An unresolved product
   choice is not a missing answer: explain the observed behavior and the choice still
   to confirm in ordinary English, retaining any proposed default as an assumption.
   Do not pause discovery to ask the user to choose. Retain timing, usage and partial receipts.
4. Only when every committed question has a saved answer, call
   `submit_all_answers(exploration_id)` and use the agent-answered recommendation
   wait in Step 8.1. Existing user gates are unchanged; this handoff is not another gate.

**Product choices continue into recommendations.** For repository Build, Lite and Readback,
use the answering contract's stated-assumption path, not its ask-the-person path. The
answer states what is known, what remains a product choice, and why a proposed default
is reasonable; it does not claim the user approved that default. Preserve that open choice
in the saved answer and its structured open/assumption data. Do not hold an otherwise
complete answer back merely because the repository cannot establish product intent.
The recommendation that depends on the choice must keep it visible as an open question,
alongside the proposal and what would change with the alternative. Do not silently settle
it or create a new discovery choice gate. The existing recommendation review remains
the place for the user to inspect or resolve it.

For example: “Each sitting starts with three hints. Leaving and sitting again creates a
new hand and restores them. The code does not establish whether players should be told
about that reset. For now, the proposed message says ‘No hints left this sitting’; whether
to explain the reset remains to confirm.” The dependent recommendation carries the open
question: “Should the Hint message explain that starting a new sitting restores hints?”
This does not permit fabricated current-behavior claims or skipping verification failures.

**Fallback — server answers (no repo / nothing to ground in):** only after the Step 7.4 accept has returned (the run needs the committed question set it produced), call `start_discovery_run` with `scope_type: 'exploration'` + `exploration_id`, then follow the server polling path (8.0 → 8.1).

For `product`, `design`, or explicitly PRD-style flows where answer review is useful, offer two choices without time estimates (this path uses the SERVER answer engine so the user can review each generated answer — Step 8.5):

```text
Ritual build
✓ Scope · ▶ Discovery · Recommendations · Build brief · Implementation

Run discovery

How do you want to run discovery?

  1. Stop after answers — review and refine the generated answers
     before recommendations.
  2. Run through recommendations — fastest path to a recommendation set.

Reply `1` or `2`.
```

If they pick 1, call `start_discovery_run` with `stop_after: 'answers'` and continue to Step 8.5 when it pauses. If they pick 2, call without `stop_after` and continue to Step 9 when complete.

##### 8.0 — "You're unblocked" pre-roll (once server-side work is running)

This pre-roll is for the **rec-generation wait** — fire it once server-side work is running: on the agent-answered path, right after `submit_all_answers` returns (recommendation generation is now queued); on the server fallback, right after `start_discovery_run` returns the run_id. (On the agent-answered path the *answering itself* is your active work — don't show the pre-roll until you've submitted.)

**Lock the product promise BEFORE you enter the polling loop.** Recommendation generation continues server-side; the user is free to step away. The polling loop becomes the agent's job, not the user's obligation.

Tier the pre-roll by projected duration. Latency baseline: ~15s/question (V5.2 + knowledge graph injection, calibrate quarterly against `recs-pipeline.ts` eval results). Multiply the picked-question count by 15s, divide by 60 to get minutes.

**Projected ≤ 2 min** — skip the pre-roll entirely. The polling micro-copy below covers the framing.

**Projected 2–20 min** — warm framing:

```text
Deep reasoning run started — this may take ~{minutes} minutes.

You're unblocked: the run continues server-side while you do other work.
Grab coffee, switch tasks, or close the terminal safely.

For live progress, open a NEW terminal and run:
  ritual status --watch          # terminal command, not a slash-command

Or check inside this session:
  /ritual status                 # SKILL subcommand (in-chat)

Come back later:
  /ritual resume
```

**Projected 20+ min** — longer framing:

```text
Long reasoning run started — this one may take 20+ minutes.

You can safely step away; the run continues server-side even if this terminal
closes. For live progress:

  ritual status --watch          # in a separate terminal (not /ritual status)

Or check inside this session:
  /ritual status                 # SKILL subcommand for in-chat status

To come back later:
  /ritual resume
```

**Two surfaces, two contexts:**

- `ritual status [--watch]` — **terminal command** (CLI 0.7.14+). Run from a separate shell. Survives this session closing; supports `--watch` for live tail.
- `/ritual status` — **SKILL subcommand** inside Claude Code / Cursor / your agent. Read-only mirror; useful when the user wants a quick check without context-switching to a terminal. Defined in `references/status-flow.md`.

Pick whichever fits the user's flow — they're equivalent in content. Do not introduce a `reply watch` mode in this SKILL; the CLI command IS the live-tail affordance.

##### 8.1 — Polling loop

**Read `recommendationsStatus` from EITHER `get_exploration_status` or `get_recommendations` — both carry it, and the states below mean the same thing on both.** `get_recommendations` is the heavier call, so prefer `get_exploration_status` while waiting; but if you are already holding a `get_recommendations` result, its readiness block is authoritative and there is nothing further to poll. **Once either reports `ready`, STOP — calling again cannot change the answer.**

**Both answerers converge here — once the run is underway, poll until recommendations are READY.** The job from this point on is the SAME regardless of who produced the answers. **Poll the authoritative signal: `get_exploration_status(exploration_id).recommendationsStatus`.** Do not infer readiness from row counts — this signal is unambiguous:
- `not_started` / `generating` → **keep polling.** A zero `recommendationCount` here is NORMAL — generation is enqueued/in flight, NEVER a "miss." (Older servers may omit the field; if `recommendationsStatus` is absent, fall back to polling `get_recommendations_preview` until ≥1.)
- `ready` → recommendations exist. Fetch them (`get_recommendations_preview`) and continue to Step 9.
- `empty` → generation FINISHED with genuinely zero recs (rare, real terminal state). Surface it plainly — do NOT render a fake Step 9 landing, do NOT re-run.
- `failed` → generation exhausted its auto-retries (terminal). Surface it with the one-line `recommendationsError` if present, and **offer to retry** — on a `yes`, call `retry_recommendations(exploration_id)` (re-enqueues ONLY rec-gen on the existing answers; status returns to `generating`, resume polling). Do NOT call `start_discovery_run` (that re-answers the whole exploration) and do NOT auto-retry without asking.

The *only* difference between the two answerer paths — **local coding agent** (you, repo-linked) vs **Ritual's server agentic run** — is how you reach this wait (agent-answered → straight to the status poll; server → poll the run to `COMPLETED` first, then the status). Never render the Step 9 landing, and never call `accept_recommendations`, from anything but `ready`.

**Agent-answered path (default):** you already wrote + `submit_all_answers`'d, so there's no agentic run to poll — go straight to the recommendation wait: poll `get_exploration_status(exploration_id).recommendationsStatus` (a constant ~20s cadence, a "still generating recommendations…" line every ~3 polls) until it reads `ready`, then fetch + continue to Step 9. `generating` → keep polling; `empty` → genuine zero-rec terminal; NEVER render the Step 9 landing or call `accept_recommendations` from anything but `ready`; if 10+ min pass still `generating`, surface it as an anomaly. (Skip the `get_discovery_run` polling below — that's the server-fallback path.)

**Server fallback path** (you called `start_discovery_run`): poll `get_discovery_run(run_id)` using `references/async-polling.md`: **a constant ~20s cadence** (never escalate), then a fresh status call. Even if the run takes 2+ minutes the cadence stays constant. Agentic runs CAN exceed 5 min for large explorations — keep the same constant cadence and keep polling; if status is still running past ~10 min, surface it as an anomaly rather than escalating the wait.

**On the FIRST poll only** (not every poll), prepend one line that locks the "background execution is default" mental model:

> I'll keep working in the background. For a live tail, run `ritual status --watch` in a separate terminal — or type `/ritual status` here for an in-chat snapshot.

Then print progress only when `progress_pct` or `current_step` changes, or every ~3 polls if unchanged:

> Agentic run: {progress_pct}% — {current_step}

When `status` is `COMPLETED`: **wait for `recommendationsStatus: ready` before Step 9.** The run reporting
`completed` does NOT mean recommendations exist yet — rec generation is a separate queued job that
lands MINUTES later (the premature-accept failure mode — acting on `completed` before
recommendations exist). Poll `get_exploration_status(exploration_id).recommendationsStatus` on
the standard cadence (a constant ~20s cadence, "still generating recommendations…" line every
~3 polls): `generating` → keep polling; `ready` → continue to Step 9; `empty` → genuine zero-rec
terminal, surface it. NEVER render the Step 9 landing — and never call `accept_recommendations` —
from anything but `ready`. If 10+ minutes pass still `generating`, surface that as an anomaly
instead of proceeding.

**A zero-rec read is NEVER a "generation miss," and re-running is NOT a recovery (load-bearing).** The run reporting `completed` only means *answering* finished — recommendation synthesis is a SEPARATE async job that may still be in flight, so zero rows means **not yet**, never **failed**. Do NOT relabel it a "generation miss" / "the synthesizer came back empty" / "0 recommendations" and act on that: do NOT call `start_discovery_run` again to "regenerate" (the answers are already committed — a re-run re-answers the whole exploration from scratch, burns a full pipeline, and can double-generate), and do NOT propose "routing around" synthesis by building a plan from the raw discovery answers. Just keep polling `get_exploration_status.recommendationsStatus` until `ready` (or `empty` — the rare genuine terminal). The synthesizer is almost never the problem — being early in the async window (`generating`) is. The ONLY escalation, and only after the 10-min ceiling still `generating`, is to surface it as an anomaly and offer `/ritual status` or the web app — never an automatic re-run, never a reroute.
When `status` is `COMPLETED_WITH_ERRORS`: tell the user, then apply the same wait-for-rows rule — partial recommendations may still be useful.
When `status` is `FAILED`: surface the error message, ask if they want to retry (`start_discovery_run` again with same exploration_id) or stop.
When `status` is `PAUSED_FOR_REVIEW` (product/design answer-review mode only): continue to Step 8.5.

If user wants to abort mid-flight: `cancel_discovery_run(run_id)`.

#### Step 8.5 — Run Agentic Exploration (product/design answer-review mode only)

When the pipeline pauses at `PAUSED_FOR_REVIEW`, the exploration is at step `REVIEWING_ANSWERS`. Every Area's questions have v1 answers + at least one clarifying question per consideration, but nothing has been committed for recommendation generation yet.

**The agent walks the user through each question one at a time as part of the running agentic exploration.** Render the full rail at the **landing** (the first answer-review message), then use the in-phase chip on subsequent per-question views.

**On naming:** label this stage **Run Agentic Exploration** in user-facing copy.

Landing (first question, full rail + intro):

```text
Ritual build
✓ Scope · ▶ Discovery · Recommendations · Build brief · Implementation

Run Agentic Exploration

Ritual drafted answers for {totalQuestions} questions across {N} Areas.
For each question, you can submit the v1 answer or iterate with a
follow-up. When all questions are submitted, Ritual generates
recommendations.

────────────────────────────────────────────────────────────────────

Discovery — question 1 of {total}: {Area name}

Q: {question.text}

v1 answer:
{currentDraft, first 400 chars …}

My follow-up: {first consideration's latest assistant message}

Reply `submit` to lock in v1, or reply with text to iterate.
```

Each subsequent per-question view uses the in-phase chip only (no full rail):

```text
Discovery — question 2 of {total}: {Area name}

Q: {question.text}

v1 answer:
{...}

My follow-up: {...}

Reply `submit` or reply with text to iterate.
```

For each question's loop:

1. **Fetch the state.** Call `get_answer_state({ question_id })`. Returns:
   - The question text
   - The current draft answer (v1)
   - The considerations (sub-aspects) with their chat sessions
   - The latest assistant message per consideration — this is the **first clarifying question** the answer engine already generated during Phase 3

2. **Present using the landing-or-chip shape above.** Two choices, that's it (no "skip"):

   - **submit** — happy with v1; lock it in and move to the next question
   - **iterate** (any free-text reply) — answers the follow-up OR explains what's wrong with v1; the answer engine regenerates

3. **Branch on user's choice:**

   - **If "submit":** call `submit_answer({ question_id })`. The question advances to COMPLETED. Move to the next question's Step 8.5 loop iteration.

   - **If "iterate" (any free-text reply):** call `refine_answer({ consideration_id, message: user_text })`. The answer engine:
       - Persists the user message in the consideration's chat
       - Generates a new AI response (which is either the next clarifying question OR a recognition that the answer is now complete)
       - The new response is **automatically knowledge graph-aware**: the answer engine reads the exploration's persisted `sources` and pulls in relevant prior decisions + open deferrals when forming the next question

     **Loop back to step 2 with the updated state.** Fetch fresh state via `get_answer_state` (the considerations array now reflects the new chat message + AI response), show v_N+1, prompt again. Cap at ~5 iterations per consideration before suggesting "let's submit and move on" — keeps cost bounded.

4. **When ALL questions are submitted:** call `resume_discovery_run({ run_id })`. Pipeline runs Phase 4 (submit all answers — the per-question submits above already advanced individual questions, but submit_all_answers is the canonical batch checkpoint) + Phase 5 (recommendations). Poll as in Step 8. When `status` becomes `COMPLETED`, continue to Step 9.

**Skip-the-iteration escape hatch:** the user can say "just resume" at any point. Call `resume_discovery_run` immediately. Recs generate from whatever state the answers are in (whether v1 or partially iterated). Equivalent to having picked Mode A from the start, just with the option to iterate later via the web UI.

**Abandon:** `cancel_discovery_run(run_id)`. The exploration stays at `REVIEWING_ANSWERS` — the user can come back later and either resume or start fresh.

**Pulse (Step 8 done):** Emit a pulse — decision resolution moved significantly (answers complete, draft recommendations now exist). Render full if this crosses Under-specified → Exploration-safe, else compact.
