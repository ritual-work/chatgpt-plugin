<!-- GENERATED from references/build-flow.src.md by the Ritual monorepo internal guard — DO NOT EDIT. -->
<!-- source-sha: 1ed60b58b757af57 -->

# /ritual build — Scope (generated; do not edit)

This file holds Steps 2 to 6.5 of `/ritual build`.
The previous phase is `references/build-flow/entry.md`.
Read `references/build-flow/discovery.md` only when you reach its first step, and read it then in full. Reading it earlier loads text you do not need yet.
The index `references/build-flow.md` lists every phase with its step range. A step named here that lives in another phase is found through that index.

## In this phase

Read the step you are on by its line range; the file is long and the other steps wait their turn.

- Step 2 — Template selection (server-side, no user-facing output) (lines 27 to 30)
- Step 3 — Code reconnaissance moved (no step here) (lines 31 to 39)
- Step 3.5 — Stage knowledge sources (PRDs / tickets / transcripts / etc.) (lines 40 to 125)
- Step 3.9 — Work item settled at the Scope-entry gate (no step here) (lines 126 to 161)
- Step 4 — Generate sub-problems (lines 162 to 213)
- Step 5 — Generate problem frame (lines 214 to 349)
- Step 5.7 — Context grounding (internal only — runs AFTER the frame locks) (lines 350 to 577)
- Step 6 — Lock scope: promote the draft to LIVE (lines 578 to 652)
- Step 6.5 — Preserve unpicked considerations without cluttering the workspace (lines 653 to 679)

---

#### Step 2 — Template selection (server-side, no user-facing output)

The server resolves the deliverable template. Use the returned deliverable label; do not ask for a separate persona or template selection. Continue to Step 3. Request corrections follow the Scope gate's correction path.

#### Step 3 — Code reconnaissance moved (no step here)

> **Recon does not run before sub-problem generation (context-at-create).** It runs
> AFTER the user locks the problem frame, as **Step 5.7**, so the first
> product output (sub-problems + frame) lands seconds after the Scope-entry gate instead of waiting on
> repo reads. Step 4 generates sub-problems from the user's ask alone; grounding arrives at
> discovery via the `additional_context` persisted at create. Nothing to do here — continue to
> Step 3.5.

#### Step 3.5 — Stage knowledge sources (PRDs / tickets / transcripts / etc.)

Code grounding happens silently after the frame locks (Step 5.7). Most real features ALSO have non-code context — PRDs, Jira/Linear tickets, design specs, meeting transcripts, Slack threads, customer-research notes — that get paraphrased into the problem statement and lose detail. Step 3.5 ingests those as first-class **knowledge sources** attached to the exploration BEFORE generating sub-problems, so the priorContext you'll see in Step 4 (`generate_sub_problems`) and downstream is grounded in what the user actually brought, not the paraphrase.

##### 3.5.1 — Reactive only — do NOT prompt for non-code context

**Do NOT proactively ask the user to attach PRDs/tickets/designs/transcripts.** This is a pure capability, not a gate — surfacing an "Optional: add non-code context" prompt before the user has even framed the problem is front-of-flow friction we deliberately removed (it also tends to over-justify *why* it matters, which is internal reasoning the user doesn't need). There is **no pause here.**

Handle knowledge sources **only reactively**: if the user *spontaneously* pastes a file/URL/text or says "use this PRD/ticket," ingest it via 3.5.2–3.5.4 below. Otherwise say nothing and proceed to Step 4 with code context only. The user can always attach context later via `/ritual context-pulse <exploration>` or by dragging refs in mid-flow.

##### 3.5.2 — Read the content

For each item the user provided, use the agent's local tools to obtain the text content. Different routes by what the user supplied:

| What the user provided | What to do |
|---|---|
| Local file path (PDF, markdown, txt, png, pptx, docx) | `Read` the file. For binary files (PDF/image/pptx) the agent's Read tool returns extracted text or visual description; for text files just read the bytes. |
| URL (Confluence / Notion / Jira / Linear / public web) | `WebFetch` the URL to get the text content. |
| Pasted text | Use the pasted text directly. |
| Local directory | `Glob` for likely docs (`*.md`, `*.pdf`, `*.docx`), then Read each. Cap at 5 files unless user says otherwise. |

Detect each item's **`source_content_type`** from format + content cues:

- Filename + content shape: `prd.md` with "Problem statement" → `PRD`; `*.pdf` with "Slide 1" markers → could be `PRD` or `SPEC` depending on body; user research notes with multiple speakers + timestamps → `TRANSCRIPT`.
- URL host: `*.atlassian.net` / `linear.app` / GitHub issue URL → `TICKET`; generic blog/docs URL → `URL`; Slack/Discord export → `CHAT`.
- Content signal: presence of `endpoints` / `paths:` / `openapi:` → `SPEC`; image binary → `IMAGE`; multi-speaker + timestamps → `TRANSCRIPT`.
- If ambiguous: prefer the broader category (`DOC` over `OTHER`; ask user when in doubt for high-leverage items).

##### 3.5.3 — Stage each source for registration after exploration creation

For each item, create a staged source record in working memory. Do **not** call `add_knowledge_source` yet because no `exploration_id` exists until exploration creation.

Staged record shape:

```json
{
  "source_content_type": "PRD | TICKET | URL | CHAT | TRANSCRIPT | SPEC | DOC | IMAGE | OTHER",
  "content": "<full text content the agent obtained>",
  "title": "<explicit title | first H1 | filename | TYPE from date>",
  "source_url": "<original URL if applicable>",
  "source_path": "<original local path if applicable>",
  "origin_feature": "DISCOVERY"
}
```

Surface only a staging summary:

> Staged **{title}** ({source_content_type}) for this exploration. I'll register it after the exploration is created; the content is already in my context for planning.

##### 3.5.4 — Update the augmented `raw_input` + score impact

The content the agent collected in Step 3.5.2 also gets folded into the augmented `raw_input` for Step 4's `generate_sub_problems` so the LLM sees the references inline:

```
{original user problem}

--- Codebase context ---
{codebase_context_packet from Step 3}

--- Reference context (provided by user) ---
[PRD — billing-export.md]
{first ~2000 chars of content, marked with type + title}

[TRANSCRIPT — billing planning sync]
{...}

[TICKET — LINEAR-1234]
{...}
```

Cap the inline reference context at ~10000 chars total (priority: PRD/SPEC > TRANSCRIPT/TICKET > CHAT/DOC > URL > IMAGE). Longer refs stay accessible via `get_knowledge_source` after extraction completes, but for THIS build the inline summary keeps the LLM call bounded.

##### 3.5.5 — Pulse impact

Each registered knowledge source contributes to **Repo Grounding** (which, despite the name, covers BOTH code grounding from Step 3 AND reference grounding from Step 3.5). For scoring (per `/ritual context-pulse` § CP3):

- Repo Grounding gets +5 points per registered knowledge source, capped at +15 total (so 3+ refs is the cap).
- Combined with code-recon signals already in the dimension, Repo Grounding stays in the 0-100 range.
- After Step 3.5 completes, fire the standard Step 3 pulse — the user will see Repo Grounding jump if they attached refs.

##### 3.5.6 — Skip path

If the user says "skip" / "none" / "later", proceed to Step 4. Do NOT pressure for more — refs are a feature multiplier, not a requirement.

The user can always come back later with `/ritual context-pulse <exploration>` to see the current Reference Grounding score, OR drag refs in mid-flow (e.g. at Step 8 if the agentic run surfaces a question that a PRD would have answered).

#### Step 3.9 — Work item settled at the Scope-entry gate (no step here)

> **There is no lead-persona picker here (JTBD-first entry).** Classification lives at the front of
> the flow — the Scope-entry gate at Step 0.7 (server-side `classify_request`, user-confirmed) — and
> persona is not a user choice. The server resolves
> the job's full persona set (lead + contributors, weighted) and guarantees balanced representation
> in what it generates — discovery questions first. Nothing to render and nothing to ask here;
> continue to Step 4 with the `jtbd` confirmed at Step 0.7.

##### 3.9.5 — Ground the scope in the codebase (runs before Step 4; no user-visible output but one status line)

Right after the Scope-entry gate (Step 0.7) and before `generate_sub_problems`, a Ritual-owned harness reads the codebase and grounds the draft, so the sub-problems are generated against a verified problem model and the few concerns the code makes load-bearing for this change — instead of from the ask alone.

**Run it when all three hold** (otherwise skip this sub-step entirely and let Step 5.7 ground after the frame locks, as before):
1. `prepare_build` returned an `explorationId` and the repo link was sent with it (a bound repository — the server refuses the step otherwise);
2. you can run a shell command, `ritual` is on PATH, and `.ritual/config.json` exists in the working tree (the binding `ritual init` wrote);
3. the user did not ask you to skip reading the code ("just generate, don't read the code").

Render the approved line `Reading the codebase…` once, verbatim, then run from the repository root:

```bash
ritual ground scope --exploration <explorationId>
```

The command takes about a minute. It verifies the earlier packet against the code, writes the problem model, proposes **at most three** active concerns, each anchored `path:line`, and posts all of it to the draft; stdout is one JSON receipt: `{ exploration, packet_corrections, concerns: [{concern, why, anchor}], deferral_notes: [{note, anchor?}], sources, engine, model, duration_ms, cost_usd }`. Hold `concerns` for the Scope gate (§5.1). Nothing else from the receipt is shown; the model's prose is never read by you — the server already has it.

- **A refusal receipt (`{ exploration, refused }`) or a non-zero exit** means the harness did not ground: say nothing about it, and continue to Step 4 with Step 5.7 as the grounding step after the frame locks.
- **A success receipt means Step 5.7 is DONE for this build**: do not read the repository again before the lock, and at Step 6 **omit** `additional_context` and `sources` so the server keeps the verified model and the files the harness anchored.

- The model is Ritual's unless the person set their own (`RITUAL_GROUND_PROVIDER` / `RITUAL_GROUND_MODEL` in their environment); never pass `--provider` or `--model` yourself. When this deployment does not offer Ritual's model, or today's budget for it is spent (the organization's or the person's share), the command refuses and falls back like any other.
- `deferral_notes` are work outside the confirmed scope the harness noticed: recorded on the exploration, never rendered here, never turned into a consideration.
- The harness also reads the references Ritual suggests for the job (its kit, served with the draft) as background for that judgment only — the person's own knowledge sources outrank them, and they never become questions or considerations.

#### Step 4 — Generate sub-problems

##### 4.1 First draft

This call takes tens of seconds. Render the approved line `Still generating…` once, verbatim, before it, so the user is not looking at silence after confirming the ask; then call `generate_sub_problems` with:
- `workspace_id`
- `raw_input` — the user's problem/ask, **verbatim** (plus any reference context the user spontaneously supplied). **Recon does NOT feed this call (context-at-create):** sub-problems are deliberately generated from the ask alone so the first product output lands fast; repo grounding enters at Step 5.7 and reaches discovery via the persisted `additional_context`.
- `template_id` — **OPTIONAL.** Per Step 2 (server-side template resolution), the agent does NOT pick a template_id. Omit this field unless the user explicitly passed `--template-id` on the CLI; the server resolves the right template from `user.persona` → `workspace.defaultTemplateId` → system default and uses the same resolution chain `create_exploration` will use at Step 6. Passing it explicitly only matters when overriding the default.
- `sources` — **OMIT** (recon hasn't run yet; it happens at Step 5.7 after the frame locks). Also omitted when §3.9.5 grounded the draft: the server reads the model, the concerns and the files from the draft itself through `exploration_id`.
- `exploration_id` — the build's draft `exploration_id` (held from `prepare_build` at Step 0.7). Passing it PERSISTS the generated sub-problems as the exploration-scoped canonical selection snapshot (seeded select-all), so the Ritual plugin's sub-problems drawer can read/toggle them. Harmless when no plugin is attached — nothing narrows, so the snapshot stays select-all and behavior is identical to today. Omit only in the rare fallback where no draft exploration exists yet. When §3.9.5 grounded the draft, this is also what lets the server generate the sub-problems against the job's purpose, the verified problem model and the active concerns — a concern surfaces the consideration that handles it and never adds one, so the count stays the same.

LLM call, ~5–10s. Returns 5–6 sub-problems — different framing axes the system should investigate. Track each one as `{ text, version: 1 }` in your working memory.

**If the response includes `kg_context_used` with `implementationCount > 0`:** surface this to the user BEFORE presenting the considerations. It's the visible signal that prior shipped work shaped this draft.

> Prior Ritual work on these files may shape this draft:
>  - **"Anonymous checkout opt-in"** (shipped {date}) · 1 open deferral
>  - **"Payment-method routing"** (shipped {date})
>  - **"Session-data persistence"** (shipped {date})
>
> The sub-problems below account for them.

(Drop the per-exploration decision count from this listing — recommendations + ship status are the user-facing signals, not decision counts. Keep `· N open deferral{s}` when `deferrals > 0` since open deferrals are scope-warning notes the user cares about. If `deferrals === 0`, just show `(shipped {date})` with no trailing segment.)

If `implementationCount === 0`: don't mention the knowledge graph check (silent — would just be noise on a cold knowledge graph).

**No pause, and no separate render — auto-accept all generated sub-problems** as `considerations[]` and proceed to Step 5. **Do NOT render the sub-problems on their own here.** A sub-problems-only screen has no decision on it; scope is only meaningfully reviewable once the assembled problem frame sits beside it. So the sub-problems are presented **together with the frame as one Scope gate at Step 5** (§5.1). Store the set (each as `{ text, version: 1 }`) for that combined render. (No `[USER PAUSE]` here — sub-problems are not their own gate. If you surfaced the prior-work knowledge graph note above, render it just before the Step 5 Scope gate, not as its own turn.)

**Rationale for auto-accept:** sub-problem selection is a SCOPE-LOCKING decision, and per the SKILL's own rule "`all` is a legitimate declarative choice — often the right one when the agent has surfaced a tight 3-5 sub-problem set." Asking the user to pick before they've seen the problem frame is theater — the problem statement is the assembled artifact where scope is meaningfully visible, and the refine_scope loop at Step 5 accepts arbitrary change prompts ("drop the observability angle", "make this contract-first") that round-trip through the same sub-problem refinement under the hood. Surfacing the sub-problems as info preserves visibility; dropping the pause keeps a first-time user moving.

##### 4.2 Sub-problem refinement (only when user explicitly asks)

The user may, at the Step 5 problem-statement gate, say something like "rethink the sub-problems" or "the framing is off — show me other angles." When that happens, call `refine_sub_problems` and re-render the sub-problem set + a fresh problem statement. In the default flow this path is unreachable; it exists for the explicit "rethink scope" escape hatch.

**Pre-flight (mandatory):** before calling `refine_sub_problems`, run the change pre-flight in `references/change-preflight.md` — restate the change in the user's terms, show the exact `change_prompt` you're about to send, and wait for `yes`. This is a hard pause (even in auto-mode) and fires on every such request, including one-word ones. Do not call the tool until the user confirms.

Call `refine_sub_problems` with:
- `workspace_id`, `raw_input`, `sources` — unchanged from the generate call. Critical: pass the SAME `sources` array each iteration so the knowledge graph-injected priorContext stays consistent.
- `template_id` — same rule as Step 4: omit unless the user explicitly overrode it. If you passed `template_id` to the original `generate_sub_problems` call, pass the same value here for symmetry; otherwise leave it off and let server-side resolution stay consistent across iterations.
- `change_prompt`: the user's request verbatim
- `selected`: items from prior versions the user kept (track `{ text, from_version }`, send just `text`)
- `dismissed`: items the user explicitly rejected
- `session_id`: omitted on the first refinement; pass the `session_id` from the previous refine response on subsequent ones to chain context

Track the new items as `{ text, version: N+1 }`. After the refinement, regenerate the problem statement and present it. The user's next pause is again the problem-statement gate.

**Critical**: never re-call `generate_sub_problems` for a refinement. That endpoint is stateless and re-rolls a fresh seed; you'll lose what the user just told you. The whole point of `refine_*` is the LLM sees the iteration context.

Store the final sub-problems for Step 5 — they go into `considerations[]`.

#### Step 5 — Generate problem frame

##### 5.1 First draft

Call `generate_scope` with:
- `workspace_id`
- `raw_input` (same augmented version from Step 4)
- `considerations` (the picks from Step 4)
- `template_id` — OPTIONAL, same rule as Step 4. Omit unless the user explicitly overrode; server resolution stays consistent across `generate_sub_problems` → `generate_scope` → `create_exploration`.
- `sources` (the same file-path list passed to generate_sub_problems — keeps the knowledge graph anchor consistent)

Returns a candidate problem statement plus optional follow-up questions and quality scores. For engineering / agentic-coding templates, translate the returned statement into a developer-oriented **problem frame** before showing it. Do not default to "How might we…" unless the selected template is product/design oriented or the user asks for HMW phrasing.

Engineering style:
- `Problem frame: {verb/outcome} while preserving {constraints}.`
- `Build/enable {capability} without {key failure modes}.`
- `Scope: {implementation objective} across {surfaces}.`

Keep RB IDs, recommendation IDs, prior exploration IDs, and source links OUT of the frame — the frame is one clean sentence. Provenance is not shown at this gate (it's persisted on the exploration and surfaced where it's actionable, not re-printed here). If the response includes `kg_context_used` with `implementationCount > 0`, that prior-work signal is surfaced by the Step 4 prior-work note above the Scope gate — do not add it to the frame.

**[USER PAUSE]** Present like this:

```text
Ritual build
▶ Scope · Discovery · Recommendations · {Deliverable} · Implementation

{workspace.name} workspace · change to switch

Building {the ask in one short clause} into a {Deliverable} — the decisions and edge cases your coding agent has not been told.

{N} things have to be understood before we can recommend what to build.

1. {Sub-problem title} — {one-clause gloss}
2. {Sub-problem title} — {one-clause gloss}

Framed as one build: {developer-oriented problem frame}

This scope commits the build to handle {concern X}, {concern Y}, {concern Z}.

Next
`use` — lock these {N} and draw up discovery questions
`deliverable` — want something other than a {Deliverable}

Narrow it — `drop {N-1},{N}` or `keep 1,2`. Reshape the frame — `tighten`, `broaden`, `focus on {the first sub-problem's title, lowercased}`.
```

**Explain the deliverable and scope at this gate.** Use the returned deliverable label and the proposed sub-problems to help the user assess the scope.

**Sub-problem titles are sentence case with a dash gloss**, one line each — `View purpose —
segmenting, repeat checks, or sharing?`. Title-case headings with an indented explanation underneath
read as six section headers; a titled line with a gloss reads as a list you can scan and reference by
number.

**Say what has to be UNDERSTOOD, not what Ritual produced.** `{N} things have to be understood before
we can recommend what to build.` tells the developer what the list is and why it exists — these are
the gaps, and closing them is what earns a recommendation. `Scope — {N} sub-problems` is Ritual
naming its own artifact instead.

**`deliverable` — the job correction, moved here.** The Scope-entry gate used to ask the user to
confirm the deliverable before anything existed to judge it against. That confirmation is gone for a
confident classification; the correction lives here instead, where the sub-problems and the frame are
on screen and the user can actually tell whether the deliverable fits. On `deliverable`: ask what they
expected in one plain question, then re-call `classify_request` with `correction` = their
reply and `previous_jtbd` = the current slug, update the rail, and re-render this gate. The workspace
stays sticky — only the job changes.

Rules:
- **Render the combined Scope gate exactly as shown — and nothing else:** the build rail, the one-line `Working in the {workspace} workspace · change to switch` context line (the resolved workspace from `prepare_build`; this is the ONLY place the workspace is surfaced — there is no standalone workspace message), the numbered sub-problems (from Step 4's `considerations[]`), a one-sentence `Problem frame`, and the Reply line. Nothing more — no "Optimize for" block, no "References" block, no constraints list. The sub-problems carry the scope; the frame is the one-sentence lock-point. The sub-problems and the frame are one gate now — never split them across two turns. The `generate_scope` response may include `follow_up_questions` and quality scores: those are for YOUR internal awareness, never for display. Do NOT add an "Open questions" / "what discovery will resolve" section, do NOT preview or list discovery questions here, and do NOT editorialize about what's "still fuzzy" or "what the next step pins down." Discovery is the next step and owns open questions; the frame is a lock-point, not a discovery preview. Surfacing them here both pre-empts Step 7 and clutters the gate.
- **Number the sub-problems in render order** (1..N) — the numbers are the handles the user references in `drop {N}` / `keep {N}`. Title line gets the number; one-line explanation underneath; blank line between items. No version labels like `(v1)`.
- **The commitment line** (`This scope commits the build to handle …`) renders ONLY when §3.9.5 returned one or more `concerns`: list each receipt `concern` verbatim, in receipt order, comma-separated with no "and"; with `render_gate`, pass them as `commitments: [...]`. With no concerns (or no harness run) the line is OMITTED — never render it empty, never invent a concern, and never add a consideration because a concern exists.
- Use the scope heading in the template below.
- Do not show `Engineering problem:` as the heading; use `Problem frame`.
- Do not say `ship it` unless the user used that language first.
- Visible CTA is `use`. Accept `lock scope`, `lock`, `l`, `go`, `continue`, or `next` as aliases for backwards-compat — do NOT display them. Per `references/cli-output-contract.md` § Surface-aware continuation prompts, do NOT treat empty input as proceed inside agent chat.
- `lock` / `lock scope` are demoted to alias only: "lock" sounded final/irrevocable for a frame that's very much iterable; `use` carries the right tone. (`lock scope` is the word the Ritual plugin's board surfaces on its Lock-scope step — accept it, but the chat CTA stays `use`.)
- **`change` (workspace switch)** is also accepted here — it triggers the workspace-switch flow (Step 1 step 3): pick a different workspace, re-run `prepare_build`, then re-render this Scope gate for the new workspace. It's the affordance on the `Working in the {workspace} workspace` context line; rare, and only when the user types it.

##### 5.1a Narrow the scope — `drop {N}` / `keep {N}` (subset pick)

The numbered sub-problems are selectable at this gate. A **numeric subset pick** is a precise, unambiguous instruction — handle it directly; it does NOT go through the §5.2 change pre-flight (there is nothing fuzzy to restate, unlike an NL edit such as "make it contract-first").

- **`drop {N}`** / **`drop {N,M,…}`** — remove those sub-problems, by their rendered number, from `considerations[]`.
- **`keep {N,M,…}`** — keep only those; drop the rest.
- Guard: never empty the set. If a pick would drop every sub-problem, decline in one line ("Keep at least one sub-problem.") and re-render the gate unchanged.

After filtering `considerations[]` to the kept set, **re-derive the frame so it matches the narrower scope** — call `refine_scope` with `considerations` = the kept set, `previous_problem_statement` = the current draft, and `change_prompt` = `"Narrow scope to these sub-problems: {kept titles}."` (This is the one refine call that SKIPS the pre-flight, per above — the pick already states the change precisely.) Then **re-render the combined Scope gate** (§5.1) with the reduced sub-problem list + the re-derived frame, and pause again. The user can narrow again, reshape with an NL edit (§5.2), or `use`.

##### 5.1b Plugin-attached: the drawer narrows sub-problems (the GUI equivalent of `drop`/`keep`)

When the Ritual plugin is attached (see *Plugin-attached rendering*), the numbered sub-problems at the Scope gate are **also selectable in the bottom-panel drawer** — toggling one there is the GUI equivalent of `drop {N}` / `keep {N}`, and each toggle persists live to the exploration's canonical selection snapshot (seeded select-all at Step 4). Still render the Scope gate (§5.1) in full — the frame is the lock-point and the gate is unchanged; the drawer just gives the user a click target for the same narrowing.

**On `use` (plugin-attached), reconcile the drawer's STAGED EDITS before locking** — the drawer stages two things to the canonical exploration: the sub-problem `selected` set AND, via "Request adjustment," a refined `problemStatement`. The agent is the sole committer, so at `use` it **commits from the canonical state, never from chat memory** — it re-reads, reconciles, then locks. Mirror the discovery on-proceed pattern (§7.3.1b):

1. Call `get_exploration(exploration_id)` and read the canonical `problemStatement` — the drawer's "Request adjustment" (or an edit from another surface) may have changed it **out of band** since you rendered the frame. Call `get_sub_problems(exploration_id)` and read `selected`.
2. If `selected` is a **strict subset** of the rendered sub-problem set (the user de-selected some in the drawer): filter `considerations[]` to `selected`, then run the SAME §5.1a re-derive — `refine_scope` with `considerations` = `selected`, `previous_problem_statement` = the **canonical `problemStatement` from step 1** (so any out-of-band refinement is the BASIS and is preserved through the re-derive), `change_prompt` = `"Narrow scope to these sub-problems: {selected titles}."` — and surface the one-line approved status `Sub-problems narrowed to {N}.`
3. Else if the canonical `problemStatement` **differs from the frame you rendered** (the user refined the statement in the drawer without narrowing): adopt the canonical text as the lock text and surface the one-line approved status `Problem statement updated from your edits.`
4. Else (`selected` is the full set and the statement is unchanged, or `get_sub_problems` returns `ready:false` — non-plugin path): proceed to Step 6 unchanged.

Whatever this resolves to is the `problem_statement` you pass to `lock_exploration_scope` at Step 6 — **the lock ALWAYS commits the canonical text, not your in-context draft.** This adds no gate: `use` is the existing Scope-gate token, and the drawer never advances the flow on its own (the user still replies `use`). The agent stays the sole committer — the drawer only stages; the lock at Step 6 commits the reconciled canonical state.

`drop {by name}` (e.g. `drop dashboard`) stays an **NL reshape**, not a numeric pick — it's fuzzy intent, so it routes through §5.2 (with the pre-flight). Only bare numbers are the direct subset path.

When the user replies `use`, carry the surviving `considerations[]` — whatever subset remains — into Step 5.7 / `create_exploration`. `use` always means "lock the scope exactly as shown."

##### 5.2 Iteration loop

If the user asks for a refinement:

**Pre-flight (mandatory):** before calling `refine_scope`, run the change pre-flight in `references/change-preflight.md` — restate the change in the user's terms, show the exact `change_prompt` you're about to send, and wait for `yes`. This is a hard pause (even in auto-mode) and fires on every refinement request, including a one-word `tighten`/`broaden`. Do not call the tool until the user confirms.

Call `refine_scope` with:
- `workspace_id`, `raw_input`, `considerations`, `sources` — unchanged. (Same `sources` as the original generate call — keeps the knowledge graph anchor stable.)
- `template_id` — same rule as Step 4 / Step 5.1: omit unless the user explicitly overrode; if you passed it to the original `generate_scope` call, pass the same value here for symmetry.
- `previous_problem_statement`: the FULL TEXT of the current best draft
- `change_prompt`: the user's request verbatim
- `version`: optional telemetry only; do not show version labels to the user
- `session_id`: omitted on the first refinement; chain on subsequent ones

The returned text becomes the new current draft. Show it using the same `Problem frame` format above, still without version labels.

**Critical**: each refinement's `previous_problem_statement` is the LATEST draft, not the original. Otherwise the LLM keeps refining the same starting point and the user can't compose multiple refinements.

When the user locks the frame, store the final text as `problem_statement` for Step 6.

**No pulse here.** The context pulse appears only from the curate-questions step onward (cli-output-contract § Inline pulses) — early on the score is low/noisy and the line clutters the gate. The first pulse is at Step 7.4.

#### Step 5.7 — Context grounding (internal only — runs AFTER the frame locks)

**Never render this section's title, its step number, or the word "recon" to the user.** This step produces ZERO user-visible output — no "running…", no "grounding…", no "reading the codebase…". It happens between the problem-frame gate and the first product output; the user sees nothing until the next gate or an approved status line.

**Skip only if the user explicitly asks ("just generate, don't read the code") OR if you're operating outside a codebase context — OR if §3.9.5 already grounded this draft (a success receipt from `ritual ground scope`): then this step is done, read nothing, and go straight to Step 6.** This section is the prose path for hosts that cannot run the command.

**When this runs (context-at-create):** AFTER the user locks the problem frame at Step 5 and BEFORE `create_exploration` at Step 6 — the natural "creating your exploration…" beat, so the user never waits on repo reads before seeing product output. Sub-problems (Step 4) were deliberately generated from the ask alone; THIS step is where grounding enters: the `codebase_context_packet` you build here is passed to `create_exploration` as `additional_context`, persisted on the exploration, and injected by the server into discovery-question generation (the questions surface the most important tradeoffs the context implies) and the build-brief fallback. The goal is not to show the user what you found; the goal is to ground downstream generation.

**Capability Boundary Check (load-bearing):** If recon detects a mismatch between the user's ask and what THIS repo can actually implement — typically because the feature spans systems (backend service, mobile app, billing provider, email worker, schema migrations) that aren't present in the current checkout — DO NOT invent the missing systems and DO NOT continue as if the repo is complete. Apply the boundary heads-up rule in § 5.7.1 below (one line, no pause) before creating the exploration. Frame the missing half as a normal architecture boundary, not a failure: *"This repo looks like the frontend side of a larger feature,"* not *"I could not find backend dependencies."* The user has not done anything wrong; the agent is asking how to scope the work.

Common boundary mismatches to detect:

- Full-stack feature ask + frontend-only repo (UI present, no API/service code)
- Mobile feature ask + no API client contract or backend
- Billing/payments feature + no payment service / subscription code
- Email/notification feature + no worker / job / email-provider integration
- Auth/session feature + no user mutation / session backend
- Data/analytics feature + no schema, migration, or storage layer

##### 5.7.0 — Check for a pre-build context seed

Before doing fresh recon, check whether the user already seeded one via `/ritual context-pulse`. Glob for `CONTEXT-*.md` at the repo root.

If a `CONTEXT-<slug>.md` is found AND its `## The ask` section close-matches the current `raw_input`:

- **Use it to seed `codebase_context_packet`.** Parse the file's `## Candidate files` list — those become the seed for `sources[]`. Parse `## Prior knowledge graph context` as evidence inside the packet, not as final prioritization.
- **Skip fresh recon** unless the seed is stale or obviously incomplete. If you skip fresh recon, still normalize the seed into the packet structure below before calling MCP tools.
- **Surface a compact note**:
  > Code recon
  > Found `CONTEXT-<slug>.md` from `/ritual context-pulse`.
  > Using {N} candidate files + {M} related prior exploration{s} as the recon base. Override with `recon: refresh`.
- Proceed directly to 5.7.2.

If no seed file is found, OR the seed's `## The ask` doesn't match the current `raw_input`, do fresh recon. For mismatch, mention the ignored seed in one line and do not delete it.

##### 5.7.1 — Fresh recon

1. **Read the README + top-level project structure.** Use `ls` / Glob to see top-level files. Identify the language, framework, key directories, and likely entry points.

2. **Glob for relevance.** Derive patterns from the user's problem. Examples:
   - User says "auth flow" → `**/auth/**`, `**/login*`, `**/user*`, `**/session*`
   - User says "checkout" → `**/checkout/**`, `**/cart/**`, `**/order/**`, `**/payment*`
   - User says "notifications" → `**/notif*`, `**/email/**`, `**/sms/**`, `**/push/**`
   Cap at ~15 hits per pattern.

3. **Skim 3–5 most-relevant files.** For each, read the first ~100 lines + scan for class/function names. Triangulate whether the behavior lives there or calls into another area.

4. **Build three recon artifacts.**

   A. `raw_recon_notes` — internal evidence only
   - files read and why they were selected
   - symbols/classes/functions inspected
   - relevant comments, schema details, tests, migrations, and config
   - knowledge graph hits, prior deferrals, and prior implementation references
   - uncertain observations, false leads, and things not found
   - do **not** show this by default and do **not** pass it as the main MCP planning input

   B. `codebase_context_packet` — downstream planning input
   - this is the synthesized artifact passed into `raw_input`, context pulses, and any MCP field named `recon_context`
   - it helps MCP understand what the coding agent observed locally without deciding the final considerations itself
   - separate factual observations from agent hypotheses
   - include confidence levels for hypotheses
   - use neutral labels like `agent_observed_scope_pressure` or `candidate_scope_pressure`, not `priority_considerations`
   - never present the packet as authoritative; MCP/tooling decides final sub-problems, recommendations, and scope

   C. `recon_digest` — **internal-only by default; NOT surfaced to the user.** Recon
      is silent plumbing at the lock→create boundary: we do NOT dump repo signals /
      constraints / a recon summary back to the user. Keep a compact digest in
      working memory for your own use (and to render ONLY if the user explicitly
      asks "what did you find?"), but by default show nothing — the only render is
      the one-line boundary heads-up (§ 5.7.1) on a hard capability mismatch. The
      `codebase_context_packet` feeds `create_exploration.additional_context`
      silently.
   - keep it tight if ever shown: key surfaces, hard constraints, scope corrections
   - never list every file read; never quote non-load-bearing comments

   `codebase_context_packet` structure:

   ```markdown
   --- Codebase context packet ---

   ## User intent
   {verbatim or lightly normalized ask}

   ## Observed relevant surfaces
   - `path` — observed role in this feature or constraint
   - `path` — observed extension point, lifecycle, model, or integration seam

   ## Evidence
   - `path:symbol` — factual observation from code
   - Prior Ritual signal: {exploration / PR / RB / deferral}, if available
   - Missing or not-found evidence when it corrects the user's framing

   ## Agent hypotheses
   - This may make {candidate area} important because {evidence-backed reason}
     Confidence: low / medium / high

   ## Agent-observed scope pressure
   - Privacy / lifecycle / migration / compatibility / async / ownership / testing risk
   - Only include pressure that intersects with the feature intent and code evidence

   ## Scope corrections
   - The ask says X, but the code suggests Y
   - Missing fields, renamed concepts, or assumptions the code contradicts

   ## Open questions for discovery
   - Questions the code cannot answer and the user/Ritual exploration should resolve
   ```

   Example `codebase_context_packet` excerpt:

   ```markdown
   ## Observed relevant surfaces
   - `apps/conversions/abstract_models.py` — append-only conversion event model; lifecycle changes are modeled as follow-up rows.
   - `apps/conversions/outbox.py` — async publish/retry surface; payload shape may affect erasure semantics.
   - `apps/order/models.py` — raw guest email appears to live on the order side, not in conversion events.

   ## Agent hypotheses
   - Erasure semantics may need to cover both mutable raw PII and append-only pseudonymous digests.
     Confidence: high; supported by model fields and schema comments.
   - Outbox purge/replay behavior may be a scope pressure because retries can outlive the original conversion write.
     Confidence: medium; verify worker idempotency before scoping implementation.

   ## Scope corrections
   - No `guest_session_id` column was found in the inspected conversion models; scope may need to use the actual guest attribution identifiers.
   ```

   Example `recon_digest` — single-path case (low ambiguity):

   ```text
   Code recon

   Repo signals:
   - `apps/conversions/abstract_models.py` — append-only conversion events.
   - `apps/conversions/outbox.py` — async publish/retry lifecycle.
   - `apps/order/models.py` — raw guest email surface.

   Constraint:
   - Erasure likely needs to handle mutable raw PII separately from pseudonymous conversion digests.

   Scope correction:
   - I did not find `guest_session_id` in the inspected models.

   Next: attach PRDs/tickets if they should shape scope, or `proceed` to continue.
   ```

   **No explore-directions picker here.** The problem frame is already
   locked — direction ambiguity was resolved by the user's own framing at Step 5. If recon
   contradicts the locked frame outright, use the boundary heads-up rule below; never re-open
   a picker.

   Capability Boundary Check (feature spans systems not in this repo) — **internal/packet-only; NOT displayed:**

   When the user's ask requires capabilities that aren't present in this repo (frontend-only repo asked for full-stack feature, mobile repo with no API contract, etc.), capture the boundary + the inferred default scope **into the `codebase_context_packet`**, then surface exactly ONE heads-up line (no pause — see below). The persisted packet drives discovery-question generation to probe the boundary; the locked frame stays as-is unless the user reacts. NEVER continue as if the repo can implement the missing half; NEVER invent the missing systems. The block below is a **reference for what to capture in the packet**, not something to print.

   ```text
   Code recon

   Action needed

     This feature likely spans another repo or service.
     Add the backend/API context, or choose a narrower scope.

   Repo boundary:
   - This repo contains the checkout UI and guest checkout flow.
   - I found no backend account-creation endpoint, user/order linking
     mutation, email job, or migration layer.
   - So the full "join while booking" feature likely spans this repo plus
     an API/backend service.

   Can build here:
   - Checkout/thank-you page UI
   - Password capture or account-claim form
   - API client integration point
   - Mocked frontend tests
   - Empty/error/success states

   Needs outside context:
   - Endpoint that creates or claims the account
   - Contract for linking a guest order to a user
   - Auth/session behavior after claim
   - Email/verification behavior, if required

   Scoping inferred: contract-first (default for unsettled API)

     This repo can build: UI integration, API client surface, mocked tests
     This repo cannot build: account-creation endpoint, order-linking, email job
     Considerations will be scoped to what this repo can ship.

   Pulse: Reasoning Readiness ~30% · Context Debt 70% (repo boundary unresolved)

   (lift bridge) The plan isn't grounded in your code yet — scoping to what this
   repo can actually ship is what the next step settles.

   ```

   With the frame already locked, the user-facing output of a boundary hit is ONE line, no pause:

   > Heads-up: this repo covers {the in-repo half} — I've scoped the exploration's context
   > accordingly. Say `re-frame` to widen the scope, or just continue.

   Notes on the boundary-check shape:
   - **No pause.** One heads-up line, then continue to Step 6. The boundary information is preserved in the `codebase_context_packet` (persisted as `additional_context`), where discovery-question generation reads it; the user can say `re-frame` to reopen the frame, and discovery itself will probe the boundary.
   - **"Scoping inferred:" not "How should I scope this?"** — the agent makes the default narrowing (contract-first when API unsettled; repo-side-only when the missing half is clearly out-of-tree) and names what it picked. The user corrects at Step 5 if it was wrong.
   - **"This repo can build:" + "This repo cannot build:"** are paired one-liners — they document the IN/OUT split so the inferred scoping is auditable. Keep them compact (one line each); the full lists live in `codebase_context_packet`.
   - **Default narrowing logic:** if the user's ask names a backend/API endpoint, choose **contract-first**. If the user's ask is clearly UI/UX-shaped or the missing systems are obviously out-of-tree (mobile app, separate billing service), choose **repo-side only**. If ambiguous, default to **contract-first** — it preserves more of the user's intent in the downstream artifacts than narrowing to repo-side does.
   - **The pulse line stays parenthetical** with a user-facing reason (`repo boundary unresolved`), per the Pulse tier labels rule in `references/cli-output-contract.md`.
   - **Internal classification (not user-facing):** track each candidate piece against the boundary as `in_repo_buildable`, `external_dependency_known`, `external_dependency_unknown`, `needs_additional_repo`, or `contract_first_candidate`. These shape how downstream scoring + build-brief generation handle the missing half. Stamp the inferred default scope as `inferred_scope` in the packet so discovery generation and the build brief see it. None of these labels should appear in user-facing copy.

##### 5.7.2 — Recon is silent

**Recon runs silently.** Do NOT surface the recon digest, repo signals, constraints, or the `codebase_context_packet` to the user by default — recon is plumbing at the lock→create boundary. The packet feeds `create_exploration.additional_context` (Step 6); the user sees nothing here.

**There is no explore-directions picker** — the frame the user just locked IS the direction. For a crisp single-direction repo read: render nothing and go straight to Step 6.

**Capability boundary detection does NOT pause.** When recon shows the feature spans systems not in this repo, fold the boundary + the inferred default scope into the `codebase_context_packet` (see § 5.7.1 internal classification), pick the default per the "Default narrowing logic" rule, surface the ONE-line heads-up from § 5.7.1, and proceed to Step 6.

If the user explicitly asks "what did you find?", you may show a tight digest then — otherwise stay silent.

**No pulse here** (pre-curate — see cli-output-contract § Inline pulses; the first pulse is at Step 7.4).

##### 5.7.3 — Collect the `sources` array

Collect the file paths you actually read and consider load-bearing for this problem — exactly as they appear in the repo (e.g. `"apps/checkout/views.py"`, not `"./apps/checkout/views.py"` or absolute paths). This list is passed to `create_exploration` (Step 6) — persisted on the exploration so the answer engine, context pulses, and `generate_build_brief` anchor priorContext consistently without you re-passing it.

Keep the list focused. 5–10 is the sweet spot; >20 dilutes the knowledge graph signal.

#### Step 6 — Lock scope: promote the draft to LIVE

The exploration already exists as a DRAFT (created at Step 0.7, or at Step 1 when the workspace wasn't bound) — Step 6 doesn't create anything, it LOCKS the scope the user just validated (`use` at Step 5) and flips the draft to LIVE. Read the codebase silently (Step 5.7) first, then lock. The job was confirmed at the Step 0.7 Scope-entry gate, so do not add a *further* confirmation here. (If you ever reach Step 6 without a draft `exploration_id` — e.g. an older flow or a skipped Step 0.7 create — fall back to `create_exploration` with the same inputs.)

User-visible before the call, if needed:

```text
Locking scope: **T2 churn reduction (Q3)**
```

Call `lock_exploration_scope` with:
- `exploration_id` — the draft id you held since Step 0.7 (or Step 1).
- `problem_statement` — the scope the user locked at Step 5. **Plugin-attached: pass the canonical text reconciled at §5.1b** (re-read from the exploration so an out-of-band "Request adjustment" is committed), NOT your in-context draft. When no plugin is attached, this is simply the frame the user accepted.
- `jtbd` — pass the FINAL job ONLY if the user ADJUSTED it at the Step 0.7 Scope-entry gate, so go-LIVE records the correction; otherwise OMIT (the draft already carries the slug confirmed at the gate). The job still drives the build-brief → code-plan → implement → PR deliverable phase across every surface.
- `additional_context` — the full `codebase_context_packet` from Step 5.7 (omit only if recon was skipped, **and omit when §3.9.5 grounded the draft**: the server keeps the verified problem model the harness posted, and sending a packet here would overwrite it). Persisted on the exploration; the server injects it into discovery-question generation as evidence (the questions cover the important tradeoffs it implies) and uses it as the build-brief recon fallback — so it survives `/ritual resume`.
- `sources` — the file-path list from Step 5.7.3 (omit when §3.9.5 grounded the draft, for the same reason).
- the repo-key link — pass the same `ritual repo-key --json` object you used at draft create (`repo_key`/`branch`/`repo_key_scheme`/`repo_name`/`is_default_branch`); the server sanitizes it + links nothing on a default branch. (No `name` / `template_id` / `agentic` — the draft already has its name + forked template, and discovery stays per-step; persona is server-resolved.)

The `exploration_id` is unchanged (the draft you held, now LIVE). Move the progress header from Scope to Discovery:

```text
Ritual build
✓ Scope · ▶ Discovery · Recommendations · Build brief · Implementation

Scope locked.

Next: generate discovery questions to resolve the implementation trade-offs.
```

##### 6.1 — Promote the pre-build seed (if one was consumed in Step 5.7.0)

If Step 3.0 consumed a `CONTEXT-<slug>.md` seed file, promote it into the exploration's artifact trail now that an exploration id exists. Move + rename the file from `CONTEXT-<slug>.md` to `.ritual/exploration-notes/<exploration-id>.md` using the Bash tool:

```bash
mkdir -p .ritual/exploration-notes
git mv CONTEXT-<slug>.md .ritual/exploration-notes/<exploration-id>.md 2>/dev/null \
  || mv CONTEXT-<slug>.md .ritual/exploration-notes/<exploration-id>.md
```

Surface to the user as a one-line note:

> Promoted `CONTEXT-<slug>.md` → `.ritual/exploration-notes/<exploration-id>.md` so it stays tied to this exploration.

This keeps the repo root clean (files for reference, not clutter) and preserves the seed's content for future `/ritual lineage` or audit lookups. The file remains git-tracked at the new path.

If `git mv` fails (file wasn't tracked yet): use plain `mv` instead — same outcome, the user just commits the move whenever they next commit.

##### 6.2 — Register staged knowledge sources (load-bearing)

If Step 3.5 staged any knowledge sources in working memory (PRDs / tickets / transcripts / etc.), register them NOW that `exploration_id` exists. The staging step deliberately deferred the MCP call because `add_knowledge_source` requires an exploration to attach to — this is where the deferral resolves.

For each staged record from § 3.5.3, call `add_knowledge_source` with:

- `exploration_id` (from Step 6)
- `source_content_type` (from the staged record)
- `content` (the full text the agent obtained)
- `title` (from the staged record)
- `source_url` / `source_path` (whichever applies, optional)
- `origin_feature: 'DISCOVERY'`

Fire these in parallel — they're independent inserts + async extraction kickoffs. Cap concurrency at 5 if the user staged more than that (rare).

Surface a single compact summary after all registrations resolve:

> Attached {N} knowledge source{s} to the exploration: {comma-separated titles, truncated to 80 chars total}. Extraction running in the background.

**Failure handling:** if any `add_knowledge_source` call fails (network / 4xx / 5xx), retry once. On a second failure, surface a one-line note and continue — do NOT block the build flow on a knowledge-source registration failure:

> ⚠ Couldn't register `{title}` ({error in 1 sentence}). The exploration is still usable; you can re-add the ref later with `/ritual context-pulse <exploration> --add-ref {path}`.

**Skip path:** if Step 3.5 was skipped (user said "skip" / "none" / "later"), there are no staged records and this step is a silent no-op. Do NOT prompt the user again — they already declined at Step 3.5.

**Why this lives at 6.2, not inside `create_exploration`:** sources are deliberately decoupled from the exploration row so a partial source-registration failure doesn't block exploration creation. Step 6 must always succeed if the underlying validation passes; Step 6.2 is best-effort on top.

#### Step 6.5 — Preserve unpicked considerations without cluttering the workspace

Unpicked or dismissed considerations are useful signal, but automatically creating sibling explorations can clutter the workspace. Do **not** fork sibling explorations by default.

Default behavior:

1. If `dismissed[]` or unpicked considerations are empty, skip silently.
2. If there are unpicked considerations, preserve them in working memory as `phase_later_candidates[]` for the current build.
3. Append the concise set to the build brief's `recon_context` payload under a heading like `Explicit phase/later candidates from discovery` so they can appear in **Phase Candidates / Deferrable Items** if relevant. Keep the base of `recon_context` as the `codebase_context_packet`, not raw notes.
4. Surface at most one compact line:

   > Saved {N} unpicked sub-problem{s} as later candidates for the brief.

Only call `fork_sibling_explorations` when the user explicitly asks to save separate tracks, or when an unpicked item maps cleanly to a known open deferral / existing exploration and the user confirms.

If sibling creation is confirmed, call:

```
{
  primary_exploration_id: <id from Step 6>,
  unpicked_considerations: dismissed.map(d => d.text)
}
```

Then summarize the created siblings in the dense-list format. Do not pause after creation; return to the primary build flow.
