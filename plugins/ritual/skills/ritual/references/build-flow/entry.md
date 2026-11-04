<!-- GENERATED from references/build-flow.src.md by the Ritual monorepo internal guard — DO NOT EDIT. -->
<!-- source-sha: 2d7be8fda1fc2644 -->

# /ritual build — Entry (generated; do not edit)

This file holds Steps 0 to 1.1 of `/ritual build`.
Start here: read this file in full before the first gate.
Read `references/build-flow/scope.md` only when you reach its first step, and read it then in full. Reading it earlier loads text you do not need yet.
The index `references/build-flow.md` lists every phase with its step range. A step named here that lives in another phase is found through that index.

## In this phase

Read the step you are on by its line range; the file is long and the other steps wait their turn.

- Step 0 — Auto-mode heads-up (informational, NOT a pause) (lines 192 to 358)
- Step 0.7 — The Scope-entry gate: confirm what you're building (lines 359 to 490)
- Step 1 — Workspace (auto-resolved — a confirmation, not a pick) (lines 491 to 537)
- Step 1.1 — No-arg `/ritual build` entry (lines 538 to 560)

---

Walks the engineer from a free-form problem statement to vetted, accepted Ritual recommendations using the Ritual MCP tool surface.

Output: a fully-closed loop — **exploration in COMPLETE state, recommendations accepted (or explicitly handed off to an admin), the job's deliverable generated, its terminal carried out (code implemented for a build; the eval suite generated, the plan executed, the decision recorded, or the investigation run for the other development jobs), and `sync_implementation` called to register the result in the knowledge graph**. The engineer stays in the driver's seat through concise status updates and explicit pauses only at real decision gates.

### ON ENTRY — do this FIRST, then stay on the pipeline (load-bearing)

The instant `/ritual build` is selected (including the no-subcommand default that treats the whole ask as the scope), your **next tool call** is the Step 0.7 **Scope-entry gate**: call `prepare_build` with the user's ask (plus the repo-key + bound-workspace signals — see Step 0.7), then render that gate from the result. `prepare_build` does three things server-side in one call — classifies the job, **auto-resolves the workspace the build belongs in (the user never picks by default)**, and creates the build DRAFT (or resumes one). Everything between here and Step 0.7 — the vocabulary map, the build rail, the runtime contracts — is reference you apply *while* running the flow; it is **not** a reason to delay that first tool call.

**The pipeline — you are in the PLANNING phase until the build brief is accepted.** It runs as the six build-rail stages below, **in order**. **Advance through the numbered Steps exactly as written — do not skip ahead or reorder them.** The exact tool sequence lives in the Steps; follow them, don't reconstruct it from memory.

```
Job (classify) -> Scope -> Discovery -> Recommendations -> Build brief (Step 10) | Implementation (Step 11+)
[------------------------------- planning phase -------------------------------] [---- implementation ----]
```

**The exploration is born as a DRAFT when the build starts, and LOCKED to LIVE at the end of Scope.** `prepare_build` creates that DRAFT and returns its `explorationId` in the same call that classifies the job and resolves the workspace — so the draft exists the moment the Scope-entry gate appears, and the Ritual plugin board resolves it by repo+branch and lights up the Scope scaffold *as the gate renders*. No separate `create_draft_exploration` call. Hold the returned `explorationId` for Scope. Scope = sub-problems (Step 4) → problem frame (Step 5) → `lock_exploration_scope` (Step 6, on `use`) which promotes the draft to LIVE. The exploration id is stable across Scope; do NOT call `create_exploration` or `create_draft_exploration` in the `/ritual build` flow.

**The most common failures: (a) freelancing your own questions before classify, and (b) jumping ahead — LOCKING scope or touching discovery before Scope is built. Creating the DRAFT up front is correct; locking it (go-LIVE) before the user validates the scope is the failure. Do the next numbered Step; nothing else.**

**Forbidden for EVERY turn of the planning phase — not just the first (hard violations):**

- Inventing your own clarifying / scoping / "which option did you mean" questions, or using your agent's own question or prompt UI to gather scope. Scope is captured ONLY inside the flow, via `generate_scope` (Step 4). The flow's own gates (Scope-entry gate, discovery, rec review) are the only pauses.
- Running ANY **implementation-phase** tooling before the build brief is generated and accepted (Step 10): file writes/edits, package installs, component/scaffold generators, design-asset generators, todo/task lists. (Examples by agent — v0: `GenerateDesignInspiration`, `TodoManager`, `shadcn add`; Cursor/Claude/etc. have equivalents.) Pulling implementation forward is a hard violation. These resume — and are expected — at **Step 11**.
- Reading repo files or calling `list_workspaces` before the Scope-entry gate is confirmed (Step 0.7). (Code-recon *reads* are fine later, at their step inside the planning phase; this only forbids them up front.) **Narrow exception:** before the `prepare_build` call you MAY gather the signals it takes (without narrating) — `.ritual/config.json` for an already-bound workspace id (passed as `bound_workspace_id`), `ritual repo-key --json` for the repo key/scheme/name/branch, and `.ritual/plugin.local.json` to decide plugin-attached rendering (see *Plugin-attached rendering* below). Never narrate these reads, and never `list_workspaces` here — `prepare_build` resolves the workspace itself; `list_workspaces` is only reached if the user invokes `change` (Step 1).
- Emitting an empty, "let me think…", or narration-only turn with no tool call (e.g. "I'll start the build flow", "Let me gather context first"). Start the next step; don't announce it.

"Proceed with your best judgment" / "no clarification needed" does **not** mean skip the flow — it means run the flow with sane defaults and pause only at the real pause gates.

### Vocabulary mapping (engineer-tone)

The Ritual data model uses product-research terminology. This skill translates to engineer-natural terms when speaking to the user. The underlying API still uses original names — keep this table mental when you read tool inputs / outputs:

| User-facing term (the skill says) | Tool field name (the API uses) |
|---|---|
| **scope** | `problemStatement` |
| **sub-problem** | `consideration` |
| **Area** (NOT "matter") | `matter` |
| **discovery question** | `question` |
| **recommendation** | `recommendation` |

When the user says "tighten the scope," call `generate_scope(...)` with their refinement. When you tell the user "I picked these sub-problems," you mean the items you put in `considerations[]`. The tools don't change; only the language to the user does.

**On "Area" vs "matter":** the API field is `matter` for historical reasons. The user-facing label is **Area** because it's plainer and reads less research-y in a developer flow. NEVER surface "matter" or "matter.name" in user-facing copy — use "Area" / "Area name" instead.

### Runtime contracts

Before running this flow, apply `references/cli-output-contract.md` and `references/async-polling.md`. Keep raw recon internal, pass the `codebase_context_packet` downstream, and show the user only the compact `recon_digest`.

**Fenced render blocks are content to output, not code — never echo the fence (load-bearing).** User-facing gate renders throughout this flow are shown inside a ` ```text ` fence so the exact copy is unambiguous. When you render one, output the *content* of the block as plain text in your message — **never** include the ` ``` ` fence markers or the `text` language tag themselves. Wrapping a rendered gate in a code block is a render leak (it shows the user a grey code box instead of clean terminal text). This applies ONLY to ` ```text ` render blocks; ` ```bash `, ` ```json `, and ` ```markdown ` blocks are commands to run or content to WRITE to a file — handle those as written, never as a user-facing render.

**Build rail is load-bearing.** Every top-level user-facing message below MUST begin with the build rail per `references/cli-output-contract.md` § Build progress anchor — FIVE stages for a development job whose terminal is `implement` (the last is `Implementation`), FIVE for the other development terminals (the last is named for the terminal — see `references/cli-output-contract.md` § Canonical stage table), FOUR for `deliver` jobs (no last stage); stage 4 is named for the job's deliverable (`deliverableTemplate` from the Scope-entry gate) and the last stage for its `terminal`. The literal `Build brief` in this file's examples is the generic-build label; substitute the confirmed job's deliverable name. Examples in this file show the rail in context; the canonical stage table + `progressHeader(stage)` spec lives in the output contract. Do not drop the rail to save space.

**Render the FULL five-stage rail by default.** The **compact progress anchor** (`references/cli-output-contract.md` § Build progress anchor — the `Ritual build · 1/5 Scope` chip) is for a surface that is GENUINELY narrow: a phone-width chat, or a terminal you know is narrow. It is NOT a per-message judgement about how wide the panel looks — you cannot see the panel, and guessing per turn is what produced a run that alternated between the full rail and the chip from one message to the next. If you do not positively know the surface is narrow, render the full rail. Same contract either way; pick ONE for the whole run and keep it. **When the Ritual plugin is attached (see *Plugin-attached rendering* below), the rail is plugin-owned — omit it entirely; the board renders live progress.**

### Plugin-attached rendering (load-bearing)

When the **Ritual plugin** is attached, its board + drawer own surfaces this flow otherwise prints — so you render a one-line pointer instead of the full block and let the UI carry the detail.

**Detecting it (silent).** Before rendering a plugin-owned surface, read `.ritual/plugin.local.json` at the repo root (same no-narrate rule as `.ritual/config.json` — never mention the file, never narrate the check). Treat the plugin as **attached** when `active === true` — the live plugin sets `active: false` (or removes the file) the moment it disconnects, so this is the primary signal. `heartbeatAt` is only a coarse staleness backstop: ignore the marker if its timestamp is *obviously* old (hours or days, e.g. a different calendar day) — do NOT do precise minute-math. Absent, malformed, `active: false`, or obviously-stale → **not attached**: render every surface in full, exactly as today. This is a render decision only — it never changes which tools you call or which gates you pause at.

**A tool result can say so for ONE surface — and only that surface.** When a
tool result carries `componentAttached: true`, the host has already been handed
a rendering of **the block that tool feeds**, so replace *that block* with its
pointer. It says nothing about any other message, and it does NOT mean a plugin
owns the session.

**It never suppresses the build rail.** The rail is omitted only for the marker
file, because the Ritual board is a persistent surface showing live progress
beside the chat. A component rendered inline in the conversation replaces one
block and shows no progress, so every message still opens with its rail as
normal. Treating one `componentAttached` as session-wide is a real failure, not
a hypothetical: it drops the rail from every subsequent gate and flattens
renders that no component ever touched.

So, per block:

- marker file says attached → that surface is plugin-owned (rail included)
- the tool result for THIS block says `componentAttached` → this block only
- neither → render in full, exactly as today

**Gates are unchanged.** Plugin-attached rendering is purely cosmetic. Every pause gate, its option tokens, and the universal `proceed` alias stay exactly as written. The drawer is a SELECT surface — the user still advances by replying `proceed` to you; you never skip a gate and you never wait on the plugin.

**Write the rail and the one-line explainer BEFORE the call that renders a
component.** The host paints a component above your reply, so anything written
after the call lands underneath the frame — the user meets the component with no
idea what it is or what happens next, and the rail shows up below it looking
like a footer. Say where they are and what this step decides, THEN make the call.

**Every component, not just the picker.** Cards arrive as cold as questions do.

**The three plugin-owned surfaces** — when attached, render the pointer and omit the full block:

| Surface | Full render (no plugin) | Plugin pointer (attached) |
|---|---|---|
| **Build rail** (`▶ Scope · Discovery …`, every message) | the five/four-stage rail | *omit it* — the board shows live progress |
| **Discovery questions** (§ 7.3.1 landing + § 7.3.1b expert walk) | the landing block / Area-by-Area pick UI | the stake line, then `↳ Pick discovery questions in the Ritual panel, then reply \`proceed\`.` **The stake line's shape depends on whether a component rendered — see below.** |
| **Recommendations review** (Step 9 — category walk, `expert` / `drill` / `edit` detail) | the per-category rec render | `↳ Review recommendations in the Ritual panel, then reply \`proceed\`.` |

Everything else renders identically. When in doubt (marker unreadable, surface not in this table), render in full.

### When to use

- The user describes a new feature, refactor, migration, or implementation-heavy change that needs planning before coding
- The user wants the coding agent to gather codebase context, prior decisions, sub-problems, discovery questions, recommendations, and a build brief before implementation
- The user describes a problem they want explored ("we need to figure out X", "let's scope Y", "I want recommendations on Z")
- The user wants the full pipeline — sub-problems → scope → discovery → recommendations → build brief — not just one step
- The user runs `/ritual build` from inside a repo with a build already in progress on this branch — `prepare_build` auto-resumes it (a teleport into the existing exploration), so a continuation needs no manual picker

When **not** to use:
- The user already has a specific exploration id and just wants a quick status check — call `get_exploration` directly
- The user wants to *implement* a feature from a build brief that's already been generated and accepted — that's a separate downstream coding-agent task (the build brief itself is the input)

### Workflow — 13 steps (Steps 10-13 cover the build-brief → implement → sync close-the-loop phase; unpicked considerations are preserved as later candidates by default)

Use explicit **[USER PAUSE]** only at decision gates. Pause when the user must choose among options, approve creation or acceptance, resolve ambiguity, authorize implementation, accept cost/time, or provide missing non-code context. Do **not** pause for status-only steps, safe defaults, internal recon, or silent checks.

**Pauses are not optional even in auto-mode** (load-bearing). When the host agent has auto-accept / bypass-permissions enabled, the SKILL must still honor every `[USER PAUSE]` as a hard stop. Inferring an answer from context, choosing a default, or pressing on without an actual user reply defeats the build flow's value: Ritual is producing aligned recommendations because the human shaped the inputs, not because the agent guessed plausibly. We do not surface a heads-up about this to the user (Step 0) — we simply enforce the gates regardless of the host's auto-accept mode.

---

### CLI and async guardrails

Follow `references/cli-output-contract.md` for terminal output, dense-list formatting, user-facing vocabulary, and the no-internal-step-label rule. Follow `references/async-polling.md` for every long-running server operation. Whenever the user asks to **change or add** something via free text (refine sub-problems, reframe scope, add an anti-goal), follow `references/change-preflight.md` — restate the request and show the exact instruction before calling the mutating tool, and wait for confirmation. It is a hard pause even in auto-mode.

#### When the user corrects you — `record_correction`

Call `record_correction` as soon as any of these happens, then carry on with the work:

- the user contradicts something you asserted
- the user says a topic or direction is out of scope
- the user repeats an instruction they already gave
- the user asks whether you are sure, and you then go and check
- you notice yourself that something you stated was wrong

**Record it even when you turn out to be right.** A claim that survives a challenge means you asserted it without showing your evidence, and that is worth knowing.

**Trigger on what they SAID, not on their mood.** Do not try to detect whether the user is annoyed — a person can be short with you about a slow build or a real bug, and neither is drift.

`why_it_happened` is the field that earns this call. Reach for the habit rather than the artifact: *"I answered from a summary instead of reading the source it summarised"* travels to the next build; *"that doc was stale"* is about one file.

This is telemetry. It returns at once, changes nothing, and nothing reads it yet. **Never announce it, never apologise for the correction, and never let it interrupt the work** — fix the thing, say what changed in a sentence, keep going. If the call errors, ignore the error.

#### Step 0 — Auto-mode heads-up (informational, NOT a pause)

> **This is NOT a blocking pause — never ask the user to confirm their mode.** A mode meta-question hits a brand-new user before they have any context for what Ritual does: friction without value. And no reliable programmatic signal exists for "is the agent in auto-mode" — every coding agent represents the state differently and the MCP request carries no mode flag — so a confirmation pause would force the user to assert something the agent has no way to verify.
>
> The new shape: one informational line in the FIRST user-visible message of the flow. No pause. No `[USER PAUSE]` here. If the user IS in auto-mode, the next genuine decision pause (workspace pick, scope pick, etc.) is the natural place they'll notice it racing past. The line below gives them the right cue + remediation.

Do NOT show an auto-mode / "~N decisions" / Shift+Tab heads-up. It reads as meta-instruction clutter at the start of the flow — just begin the flow plainly. (The pausing discipline below is enforced regardless of the host's auto-accept mode; we simply don't preface it with a lecture.)

Pausing discipline is still load-bearing — every `[USER PAUSE]` later in the flow is a hard stop regardless of whether the user reads it. The agent's contract is unchanged from the preamble: never infer an answer, never pick a default, never press on without an actual user reply. Auto-mode collapsing those pauses is the user's risk to accept; the SKILL enforces the gates regardless.

**Voice — render gates plainly, add NOTHING (load-bearing, applies to EVERY message in the flow).** Output the gate copy this skill prescribes and nothing else. In particular, NEVER:
- **Preface a tool call with narration.** Don't say "I'll start by classifying the job…", "Let me kick off an exploration…", "I'll create the exploration and pull questions…". Just make the tool call; report the result plainly after.
- **Editorialize about the work.** Don't add commentary like "this is exactly the kind of ambiguous, cross-cutting work where it pays to surface context before writing code", "the design decisions still aren't settled", or any "here's why this step matters" justification. The user knows why they ran `/ritual build`.
- **Narrate internal mechanics or paraphrase the gate copy into process-talk.** Don't say "You're framed. Grounding in the codebase, then I'll…" or describe what Ritual's research agents do under the hood. Lead with the plain meaning for the user; surface mechanism only if they ask.

Every message should be the prescribed gate copy (rail + content + CTA) — terse, plain, no preamble, no sign-off commentary.

**Copy rules (the calm-CLI-wizard contract — every gate obeys these):**
1. **Never print process/eval labels, platform-object lifecycle, tool/field internals, OR step-transition narration.** No `GATE N`, no `Step N`, no `Auto-decision: …`, no `LLM confidence`, no async-polling-contract talk. **Never name the exploration's internal lifecycle — no "draft", "draft started/created", "exploration created", "going LIVE", "locked".** **Never echo tool names, response fields, or directives — no "binding.action", "binding", "prepare_build", "resumed", "honoring binding…", "gate renderer", "render_gate", "render gate", "the gate did not render", "writing config.json". **When the gate renderer is absent or declines a frame (a field is missing), compose the gate from the template below and show the gate. Which mechanism produced a screen is never part of the conversation.**** **Never narrate the step transition — no "now continuing to Scope", "moving on to discovery", "next I'll…".** (Honoring the binding directive — writing `.ritual/config.json` — is SILENT: do it, never announce it. SILENT means the message does not exist at all — a one-liner announcing that you are being silent, e.g. "I'll honor the binding directive silently and load the gate renderer.", IS the leak, and it is the most common form of it: the flow's very first visible output must be the Scope-entry gate itself, never a preamble.) The user is building something; the only vocabulary they ever see is the workflow (Scope → Discovery → Recommendations → Build brief → Implementation) and their workspace. The DRAFT→LIVE exploration and the `prepare_build` machinery are internal Ritual plumbing. The rail already shows where we are — use the rail or a compact header (`Ritual build · 1/5 Scope`), never both, and never a `GATE N` banner.
2. **One decision per message.** Never bundle two gates (e.g. workspace-bind + overlap check) into one visible block. Render one gate, take the reply, then the next.
3. **End every decision gate with one clear CTA line.** A single `Reply …` / `Next: …` line, not a paragraph of options.
4. **Lead with "Recommended: …"** instead of multi-line justification. State the recommendation; don't explain why across several lines.
5. **Status updates are one sentence, no rail** (unless the stage changed). "Still preparing the brief — retrying safely." — never "Timeout on generate call — polling status (per async-polling contract)."
6. **Use user nouns, not internal shorthand:** workspace history (not knowledge graph), build requirements (not RB list), follow-ups (not deferrals), recommendations (not recs), signed-in user (not principal), "saves this selection" (not "commits the set"), strong/likely/possible match (not a confidence %).
7. **Hide mechanism unless it changes what the user should do.** Names of engine internals, scoring tiers, citation ids, and contracts stay out of gate copy.

7a. **Never send the user's work to another tool unprompted.** Do not write to
Notion, Linear, Jira, a doc, a ticket, or any external surface unless the user
asked for that specific thing in this conversation. A model did exactly this
mid-flow — wrote to Notion, unasked — and the failure is not a tidiness problem:
their material left for a destination they never chose. Staying inside the
workflow is the rule; the brief is the hand-off point, and building starts from
the brief, not before.

7c. **Name ONE deliverable, the same one every time.** The rail's stage 5 carries
the confirmed job's deliverable name — use that name, and only that name, in the
promise and again in the payoff. Never offer a stack of brief types or rename it
between messages; two names for one artifact reads as product jargon and makes
the user wonder which one they are getting.

7d. **A pre-selected question is pre-selected because the server says so.** The
recommended set comes from the `selected` flag on the discovery state, never
from position and never from a fixed count. This matters because the visible
default and what a bare `proceed` commits must be the SAME VALUE — if you infer
the default from the first N questions, the user sees one set ticked and commits
another.

7b. **Name the workflow correctly:** *Ritual's discovery-to-recommendations
workflow*. Never "repository discovery" — the repo is where answers come from,
not what the workflow is about. Calling it repository discovery tells the user
this is a code-scanning tool, which is the wrong promise entirely.

8. **Only three kinds of message may be user-visible — nothing else (allowlist, load-bearing).** The canonical, authoritative definition of this allowlist lives in **`references/render-contract.md`** (single source of truth, planning-phase scope, full forbidden-token list); this rule is its in-flow summary — when they differ, render-contract.md wins. Between gates you output EITHER nothing, OR exactly one approved status line, OR the next gate (which OPENS with its rail — no preamble before it). **In particular, NEVER announce a render or an action before you do it, and never narrate a step's outcome** — these are the most common leaks: no "Now I'll render the gate" / "I'll render the {Scope-entry / Scope} gate", no "Rendering the workspace pick" / "Rendering the Scope gate", no "{Problem frame} generated. Rendering …", no bare section labels like "Sub-problems for the scope.", and no lifecycle status like "Scope locked." / "problem frame locked." (the gate's rail + body IS the only output; the locking/generating step emits NOTHING). Never narrate machinery: no "I'll read the reference files…", no "Classifying the job…", no "Running silent recon…", no "Polling / Fetching / Computing / Committing / Submitting / Triggering …", no "skipping … silently", no "I’ll … silently" / "I’ll do X, then Y" plan narration — the word **silently/silent** must NEVER appear in a user-visible line (a step marked *silent* emits NOTHING; never announce it), no step numbers, no tool / schema / phase names. The **only** status lines that may appear between gates — render one of these verbatim, or stay silent:
   - `Generating discovery questions…`
   - `Discovery questions ready.` (plugin-attached only — the terse discovery render's lead-in, replacing the rail the landing would otherwise open with; NEVER `Recommendations ready.`, which belongs to Step 9)
   - `Answering {N} questions from the codebase…`
   - `{N} answers saved. Generating recommendations…`
   - `Generating recommendations…`
   - `Recommendations ready.`
   - `Requirements ready.`
   - `Still generating…` / `Still preparing…` (while a slow step runs)
   - `Reading the codebase…` (once, before `ritual ground scope` at §3.9.5)
   - `No related prior runs in this workspace — starting a new run.` (empty-overlap case only)

   A gate must OPEN with its rail. Do **not** print "Computing the suggested 12…", "Rendering the landing", or any "here's what I'm about to show you" line before the rail. And never advance the rail to a stage that hasn't started — mark a stage active (▶) only once its work is actually running.

   **Render-allowlist precedence (load-bearing — this rule outranks every example below).** This allowlist overrides every local example in the rest of this file. If a later section says to "tell the user", "emit one line", "print", "surface", or "render" a status that is **not** in the list above, treat that instruction as **stale** and do not render it — unless it is a full gate template that begins with the rail. **Never render transition narration after a user reply.** After any reply, the next visible message is exactly one of: the next gate, one approved status line, or nothing. A line that announces what you just did or are about to do ("Workspace selected. Now checking…", "Moving to scope", "Job confirmed. Now…") is forbidden even though no example prescribes it — the rail already shows where we are.

**8.1 — Compose, check, THEN emit (the pre-emit self-check, load-bearing).** The rule-#8 allowlist is only as good as the moment you apply it. Render-leak prevention can happen at exactly one place — **your own output boundary, before the first token reaches the user** — because the leaked text is your assistant output and never transits an MCP result or the CLI, so nothing downstream can catch it. So for **every user-visible message in the planning phase** — starting at the **very first visible output after `/ritual build` is invoked** (before the Scope-entry gate renders there is NO valid message at all; tool calls run silently) and running through Build-brief confirm: first **compose the FULL message**, then **check every line against the render contract** (`references/render-contract.md`): each line must be a gate (opening with the rail), exactly one approved status, or nothing. If any line is preamble, step/render narration, a stop-reason, mechanics, a forbidden token, or a bare code-fence delimiter, **rewrite or drop it before you emit**; if it still won't conform, fall back to the gate's **rail + CTA only**. **Never self-correct mid-stream** — some hosts have already shown the user the prefix by the time you notice, so the check must complete *before* the first token (compose → check → emit, never emit → fix). A non-conformant message is a **hard error**, not "basically fine." (This is the agent-side, host-agnostic FLOOR; where a host supports it, the `render_gate` tool (rule #8.2) returns the canonical bytes so there is nothing to self-check — see `render-contract.md` § Enforcement layers.)

**8.2 — Prefer `render_gate` for the five planning gates when it's available (deterministic rendering).** For the **Scope-entry** (Step 0.7), **Scope** (§5.1), **Discovery landing** (§7.3.1), **Recommendations review** (Step 9.1), and **Build-brief confirm** (Step 10d) gates ONLY: **if `render_gate` is in your available tools**, call `render_gate(kind, fields)` and emit the returned `rendered` string **VERBATIM** — that IS the gate (do NOT also compose it from the template, do NOT add a line around it). **If `render_gate` is NOT in your tools, OR the call errors**, compose the gate from its template in the section below and run the rule-#8.1 compose-then-check before emitting (the floor). Capability detection is simply *"is `render_gate` in my tool list?"* — no flag, no probe. The floor (rule #8.1) is never removed; render_gate is the stronger ceiling where available. The `kind` + the `fields` (which you already hold from the prior tool result — do not recompute) per gate:

| Gate | `kind` | `fields` (from) |
|---|---|---|
| Scope-entry (Step 0.7) | `scope_entry` | `{ workflow?, variant: '2b', deliverable, showImplementation, terminal, restatement, clarifyingQuestion? }` — from `prepare_build` / `classify_request`. **2b only** — 2a and 2c render nothing, so a call for either is a caller error, not a gate. |

| Scope (§5.1) | `scope` | `{ workflow?, deliverable, showImplementation, terminal, ask, workspaceName, subProblems: [{n,title,blurb}], problemFrame, commitments? }` — from `prepare_build` + `generate_sub_problems` + `generate_scope`; `commitments` is the `concerns[].concern` list from the §3.9.5 receipt, omitted when there is none |
| Discovery landing (§7.3.1) | `discovery` | `{ workflow?, deliverable, showImplementation, terminal, samples: [{area,text}], remainingAreas, totalQuestions, areaCount, pluginAttached }` — from `get_discovery_state` (+ the plugin-attached marker). `samples` is 1–3 of the suggested questions as `{area, text}`; `remainingAreas` is the names of the Areas not sampled, as prose (`access control, naming, and testability`), never a count |
| Recommendations (Step 9.1) | `recs_review` | `{ deliverable, showImplementation, terminal, intro, recCount, categories: [{name,titles}], explorationUrl }` — `intro` is one short agent-authored sentence grounded in the current scope and recommendation set, explaining what the user is looking at; categories and counts from `get_recommendations`; `explorationUrl` from the current `get_exploration_status` response. Omit the URL if unavailable; never invent a host. Legacy `scopeLine` and `pulseVerdict` are accepted but not displayed |
| Deliverable confirm (Step 10d) | `brief_confirm` | `{ deliverable, terminal }` — from `prepare_build`. Omit both only for a generic build (renders the classic "Build brief ready … move to coding"). |

`workflow` is optional for Scope-entry, Scope and Discovery; the readback flow passes `readback`, while build callers omit it. See `references/readback-flow.md` for its presentation overrides.

**Every field listed for a `kind` is REQUIRED** (apart from `workflow`, the only optionals are `clarifyingQuestion` on `scope_entry`, `commitments` on `scope`, `terminal` — pass it whenever `prepare_build` returned one — and `brief_confirm`'s two fields; `recs_review.explorationUrl` and `recs_review.intro` are optional for older callers). `render_gate` HARD-FAILS on any missing field (never a partial gate) — so build the **complete** `fields` object before you call. Two values are easy to drop because they aren't in the per-gate tool's primary payload, so source them deliberately every time:

- **`ask`** (scope gate only) — the user's ask restated in ONE short clause, e.g. `saved views on the users table`. You author it from what they actually said; no tool returns it. Omit it and the gate rejects the whole frame, leaving you to compose the screen by hand — the variance `render_gate` exists to remove.
- **`terminal`** — the job's ending, verbatim from `prepare_build` (`implement` | `generate-evals` | `execute-plan` | `record-decision` | `investigate` | `deliver`). It names the rail's last stage and decides what Step 11 does. Thread it into every gate's fields.
- **`showImplementation`** — `true` when `terminal` is anything but `deliver` (the rail carries a last stage); `false` for product / marketing / prototyping jobs, whose terminal is `deliver`. You already know the function from the Scope-entry classification (`prepare_build`) — thread the same boolean into *every* gate's fields, not just the first.
- **`workspaceName`** (scope gate only) — the resolved workspace's display name from `prepare_build` (`workspace.name`). It is **not** in `generate_sub_problems` / `generate_scope` output, so carry it forward from the prepare_build result; don't expect the sub-problem call to supply it.

If `render_gate` returns an error (fields incomplete, or the tool is absent), compose the gate from its template below and run the rule-#8.1 floor check. The error names the fields that were missing, so complete the frame or compose from the template; what the user sees is the gate, never the mechanism that produced it (rule #1).

This is deterministic rendering (#75 Slice 4): the server owns the gate's exact bytes, so you cannot perturb them; the byte output is identical to the template you'd compose on the floor (a CI parity matrix pins them equal).

**Per-agent indicators** (informational, for the SKILL's own awareness — NOT to gate behavior):

| Agent | Where the mode shows up |
|---|---|
| **Claude Code** | TUI footer shows `auto-accept edits` or `bypass permissions`. Toggled with **Shift+Tab**. |
| **Cursor** | "Auto" / "Yolo" toggle in the Composer/Agent panel. |
| **Codex** | `--full-auto` CLI flag or the equivalent setting in the IDE extension. |
| **Kiro** | Per-server `autoApprove[]` arrays in `mcp.json`, plus any global "auto" toggle in the Agent panel. |
| **Windsurf / VS Code Copilot / Gemini CLI** | Each has its own auto-accept mode in settings. |

The heads-up names Claude Code's Shift+Tab specifically because that's the dominant client; the table above covers the equivalents so the same guidance can be rendered for whichever agent is hosting.

##### Step 0.1 — Parse build-mode flags (load-bearing for Step 9.6, future Audit 2/3 gates)

`/ritual build` accepts three audit-mode levels:

```text
/ritual build <problem>                  → auditMode = 'normal'    (today's behavior, default proceed)
/ritual build --audited <problem>        → auditMode = 'audited'   (recommend at each gate)
/ritual build --audit=strict <problem>   → auditMode = 'strict'    (auto-run with 90s/chain time budget)
```

Aliases the SKILL accepts (for agent-friendly UX):
- `--audit` (no-equals form, treated identically to `--audited`)
- `audited` (bareword form, agent-friendly when users type conversationally)

At Step 0 (or whenever the agent first parses the user's `/ritual build` invocation), extract the audit-mode flag and store as `auditMode` in working memory. Default to `'normal'` if no flag present. The audit gate at Step 9.6 (and future Audits 2/3 at Steps 10b.5 + 11.1, ships in PRs B/C) read this variable to choose between three prompt styles.

If the user types `always audit for this build` mid-flow at the Step 9.6 prompt, upgrade `auditMode` from `'normal'` or `'audited'` → `'strict'` for any remaining audit gates in the same session. The upgrade is session-scoped (doesn't persist across `/ritual build` invocations).

Persist `auditMode` to `Exploration.metadata.auditMode` at `create_exploration` time (additive JSONB key — no schema migration) so `/ritual resume <exploration-id>` picks up the same mode the original build started with, and `/ritual lineage <exploration-id>` can render which gates ran + their outcomes.

#### Step 0.7 — The Scope-entry gate: confirm what you're building

**The FIRST tool call of a fresh build.** The server — not you — classifies the user's raw ask into
one canonical job-to-be-done (the full catalog: development, product, marketing, prototyping). Your
job is to relay the result and get an explicit confirmation before ANYTHING else happens. This gate
opens the `Scope` stage of the build rail (see `references/cli-output-contract.md`).

When this gate runs:
- **`exploration_id` is ALREADY set on entry** (the flow was invoked internally by `/ritual resume`, or
  the user picked an exploration in the Ritual plugin) → do **NOT** call `prepare_build`. That exploration
  already has its job, workspace, and scope. Teleport straight into it and skip to the step its state badge
  maps to (`get_exploration` for the current state). No Scope-entry gate, no draft creation, no workspace step.
- `/ritual build <ask text>` (no pre-set `exploration_id`) → run it IMMEDIATELY (the `prepare_build` call below resolves the workspace itself).
- Bare `/ritual build` (no ask) → ask for the feature/problem first (Step 1.1); the moment a FRESH ask
  is captured, run this gate.
- `prepare_build` returns `resumed: true` → same teleport, but here the resume was *discovered* by repo+branch rather than pre-selected; skip this gate, the exploration's job is already set.

**Before the Scope-entry gate is confirmed (load-bearing, forbidden behavior — this rule is internal; never name it to the user).** For `/ritual build <ask>`, `prepare_build` is the FIRST tool call, and **until the Scope-entry gate is confirmed you must NOT** mention workspace/config state or narrate where the build landed. The workspace is resolved *inside* `prepare_build`; you render its done-line only AFTER the Scope-entry gate is confirmed (Step 1). Narrating the upcoming step — e.g. *"Now I have the classification, it landed in the Payments workspace, next I'll…"* — is a forbidden process-leak: render the Scope-entry gate's prescribed copy and nothing else (no plan narration, no "I'll … next", no workspace name yet). This rule only constrains what you may say *before* confirmation — the normal gate rules govern pausing/turn-handling, unchanged.

1. **Call `prepare_build`** with `raw_input` = the user's ask, verbatim, plus the signals
   only you can supply (gather them first (without narrating) — the narrow exception above): `bound_workspace_id`
   from `.ritual/config.json` if the repo is bound, and `repo_key` / `repo_key_scheme` / `repo_name` /
   `branch` / `is_default_branch` from `ritual repo-key --json` if your agent can run shell + git (omit
   all of these for a hosted / browser-only agent or an unbound repo). Read `.ritual/config.json` with a
   command that succeeds when the file is absent (an unbound repo has none); a failing read there is a
   tool error, not a signal. Do NOT classify yourself, do NOT
   pre-filter to development jobs, do NOT pick a workspace. One call classifies the job, AUTO-RESOLVES
   the workspace, and creates the DRAFT. It returns
   `{ resumed, jtbd, requestLabel, deliverableTemplate, terminal, why, confidence, isGenericFallback, clarifyingQuestion?, personaCoverage, workspace, binding, explorationId }`.
   Hold `explorationId` for Scope and `terminal` for the rail and Step 11 (`implement` for a classic build; `generate-evals`, `execute-plan`, `record-decision`, `investigate` for the jobs whose deliverable is acted on rather than implemented; `deliver` for a document-only job). `isGenericFallback` (and `confidence`) are the typed-uncertainty
   signal: when it's `true`, the result is the catch-all (`build-feature` / `produce-deliverable`) or
   the classifier wasn't sure — it is NOT a confident match, and which render variant you use in step 2
   depends on it. On that generic path the response also carries `clarifyingQuestion` — a plain-language
   question generated from the user's ask, which step 2b renders verbatim to disambiguate toward a
   specific job.

   **If `resumed` is `true`** — a build already exists on this repo+branch. Do NOT render the Scope-entry gate.
   Teleport into the existing `explorationId` (its job + scope are already set) and resume at the right
   downstream step based on its state badge (`get_exploration` for the current state). Otherwise continue
   to step 2 (the draft already exists; the board lights up as the gate renders).

2. **Render the validation prompt** (rail stage `Scope`). This gate is a plain-language VALIDATION of
   what you're about to build: restate the ask + the matched job in the user's words, then let them
   confirm or correct. Route to a variant by the response: a **`clarifyingQuestion`** present → **2b**
   (we're genuinely unsure — ask, but let them proceed); else `isGenericFallback` true → **2c** (a
   confident generic build — accept and proceed); else → **2a** (a confident specific match).

   **2a — Confident match** (`isGenericFallback` is `false`): the classifier matched a specific job.
   **Render NOTHING and do NOT pause.** Go straight on to Step 4 — the Scope gate at Step 5 is the
   first thing the user sees, and it carries `deliverable` for correcting the job there.

   Asking a confident classifier to be confirmed spends a whole turn to hear "yes" almost every time,
   and the correction it protects is still available one screen later, where the user has the
   sub-problems in front of them and can actually judge whether the deliverable fits. Confirming
   before there is anything to confirm against is the weakest possible moment to ask.

   **2b — Genuinely unsure: ask, but let them proceed** (the response carries a **`clarifyingQuestion`**
   — the server sets it ONLY when it was essentially guessing: numeric confidence below 20, or it
   failed to classify and defaulted). A generic result alone does NOT land here — only a *low-confidence*
   one does; a confident generic build goes to **2c**. The clarifying question is a single plain-language
   question the server generated FROM the user's specific ask. **Render it verbatim** — it is grounded in
   their words and leak-free. Do not rephrase it, do not append a menu, do not mention classification /
   jobs / categories / confidence. The user has TWO ways out: answer to focus it, OR reply `proceed` to
   continue with the deliverable. **Leak rule (load-bearing):** the rendered copy must NEVER say
   "generic", "I couldn't classify", "fallback", "catch-all", or otherwise reveal that classification was
   uncertain — that is internal state. Present it as a normal question about their ask.

   ```text
   Ritual build
   ▶ Scope · Discovery · Recommendations · Feature Brief

   You're looking to: {restate the ask in one short clause}

   {clarifyingQuestion — verbatim}

   Answer in a sentence — or reply `proceed` and I'll continue with a {Deliverable}.
   ```

   (Rare degraded case — you reached 2b but `clarifyingQuestion` is missing: ask which KIND of work it
   is, with the same `proceed` option — • a coding-agent / MCP / skill capability • a backend service
   or API • a frontend / UI feature • a refactor, migration, or infra change • something else, in your
   own words.)

   If the user ANSWERS, call `classify_request` AGAIN with the same `raw_input` plus
   `correction` = their reply (and `previous_jtbd`), then re-render: **2a** if it now matched a specific
   job, otherwise **2c**. If the user replies `proceed`, go straight to **2c** (accept the generic).

   **2c — Accept and proceed** (`isGenericFallback` is `true` with NO `clarifyingQuestion` — a
   confident-enough generic build — OR the user chose to proceed from 2b, OR a re-classification is still
   generic): do NOT interrogate. Present the deliverable as a normal accept-and-proceed — **same clean
   shape as 2a**. Internally the job stays generic and is renamable later, but **the rendered copy must
   NEVER say "generic", "couldn't classify", "fallback", or otherwise reveal that** — that is internal
   state. Just name what Ritual will produce for their ask. (Never show a function-specific deliverable
   like "Frontend Web" for an unclassified build — only the function-agnostic `Feature Brief`.)

   **Render NOTHING and do NOT pause**, exactly as 2a — a confident generic build is still confident.
   Continue to Step 4; `deliverable` at the Scope gate is the correction path.

   Do not render `personaCoverage` — persona representation is handled server-side now; only surface
   it if the user explicitly asks who's involved.

   Rail naming (deliverable-named rail): render `{Deliverable}` as the PROPOSED job's
   `deliverableTemplate` from the classify result (e.g. `Launch Brief`, `PRD`, `Service Build Brief`;
   `Feature Brief` for the generic `build-feature`), and name the LAST stage for the proposed job's
   `terminal` (`Implementation` for `implement`; `Eval run` / `Execution` / `Record` / `Investigation`;
   none for `deliver`, whose rail has FOUR stages ending at the deliverable). A correction that changes the job updates the rail on the next render. Spec:
   `references/cli-output-contract.md` § Canonical stage table.

3. **[USER PAUSE] — 2b ONLY.** There is no confirmation pause on 2a or 2c; those flow straight to
   Step 4. This pause exists solely for the case where the server told us it was **guessing**
   (`clarifyingQuestion` present — confidence below 20, or it failed to classify and defaulted).
   That is the one moment where continuing silently means running the whole of Scope on a
   coin-flip, and where `deliverable` at the Scope gate would only be reachable after the work is
   already done.

   Wait for the user's actual reply. Never infer confirmation from the original
   ask, auto-mode, or silence. `proceed` / `yes` / `ok` confirms. ANY other substantive reply is a
   correction: call `classify_request` AGAIN with the same `raw_input`, plus
   `correction` (the user's words) and `previous_jtbd` (the rejected slug), then re-render step 2.
   The clarifying QUESTION (2b) is asked AT MOST ONCE per gate — if the re-classification after the
   user's answer is still generic, render **2c** (proceed as a generic `Feature Brief`); do not ask
   the clarifying question again. Loop until the user proceeds.

4. **Remember the confirmed `jtbd`** — you pass it to `lock_exploration_scope` at Step 6 (the draft
   already exists from `prepare_build`; lock carries the final, possibly-corrected job). Only after the
   user proceeds does the flow surface the resolved workspace (Step 1 — a one-line confirmation, not a
   pick) and enter the `Scope` stage.

#### Step 1 — Workspace (auto-resolved — a confirmation, not a pick)

`prepare_build` already resolved the workspace and created the draft (from `workspace` + `binding` + `explorationId` in its result) — **you do NOT pick one.** After the Scope-entry gate proceeds, render a single confirmation line, act on the `binding` directive, and move on; the only pause here is the optional `change` escape, and only if the user invokes it.

**Connection freshness check (one-time, warn-only).** On your FIRST MCP call this session (the `prepare_build` call at Step 0.7), also call `ping` **once** and inspect the returned identity:

- If the response is **missing `gitSha` or `toolContractHash`**, or reports **`version: "1.0.0"`** (the legacy hardcoded value), the user is connected to an **outdated / legacy Ritual MCP** — emit exactly ONE line, then continue normally (warn-only, never block):

  `⚠ Connected to an outdated Ritual MCP (no build identity) — some build features may be unavailable. Run \`ritual doctor\` to check, then \`ritual init\` if it flags a refresh.`

- Otherwise (identity present and not legacy), say nothing and proceed. **At most once per session.**

1. **The workspace is resolved — do NOT emit a standalone workspace message (load-bearing).** `prepare_build` already resolved the workspace; you do NOT pick one. **Do NOT render a workspace line of its own.** A standalone "Working in X" message reads as a turn-end and stalls the flow (the agent stops, waiting, instead of building scope). Instead, **hold `workspace.name` and surface it as the LEAD line of the Scope gate** (Step 5 §5.1) — so the very next thing the user sees after the Scope-entry gate IS the Scope gate, with the workspace named at its top. Between the Scope-entry gate and the Scope gate the only user-facing output is the approved line `Still generating…`, rendered once, verbatim, before `generate_sub_problems` (Step 4): honor the binding directive (step 2), render that line, make the call, emit nothing else, then render the Scope gate. Do NOT call `list_workspaces`, do NOT pause.

   The workspace name is the only workspace vocabulary the user sees, and only as that Scope-gate lead line — **never** a platform-object lifecycle event. **NEVER say "draft", "started", "created an exploration", "going live", or any exploration lifecycle word: the user is building something; the only vocabulary they ever see is the workflow (Scope → Discovery → Recommendations → Build brief → Implementation) and their workspace. The draft/LIVE exploration is internal Ritual plumbing the user must not be made aware of.**

2. **Honor the `binding` directive (no pause; emit no message — act, do not announce).** The server cannot write your `.ritual/config.json`, so `prepare_build` returns `binding: { action, workspaceId }` telling you whether to:

   - `action === 'write'` → write `.ritual/config.json` binding this repo to `binding.workspaceId` (first binding).
   - `action === 'rewrite'` → overwrite the stale binding with `binding.workspaceId`.
   - `action === 'none'` → do nothing (already bound, hosted/no-repo agent, or a resume).

   Write it yourself if you have filesystem write access; otherwise show the user the JSON to save.

3. **`change` — optional user-invoked workspace switch (surfaced on the Scope gate, not here).** The workspace's `change` affordance rides on the Scope-gate context line (Step 5 §5.1) — there is no separate workspace prompt. If the user replies `change` at the Scope gate, THEN: call `list_workspaces`, render the numbered picker (id, name) plus a "create new" option, and **[USER PAUSE]** for the pick. On a pick, re-run `prepare_build` with `bound_workspace_id` = the chosen workspace (`binding.action: none`); on "create new", call `create_workspace` (name after the repo, confirm it) then re-run `prepare_build` bound to it. Re-write `.ritual/config.json` to the chosen workspace, then re-render the Scope gate for the new workspace. This is the only user-invoked pause in the Step 1 → Scope span, and only when the user types `change`.

**`.ritual/config.json` is committed to the repo — it is shared, not per-user.** Same model as `.eslintrc.json` or `tsconfig.json`: it binds this codebase to a Ritual workspace (`workspaceId` / `workspaceName`) so everyone working on this repo resolves the same place. It holds ONLY repo-level facts — write nothing per-user into it. Persona and template defaults are user-scoped (your Ritual account's `user.persona`, set during `ritual init`), NOT stored here; PATs and auth tokens live in `~/.config/ritual/` and never in this file.

When you write the config, also write `.ritual/.gitignore` if it doesn't already exist so any future per-user state files in this directory get ignored while `config.json` itself stays tracked:

```
# .ritual/.gitignore — auto-generated by the SKILL.
# config.json is repo-shared and meant to be committed (workspace
# binding + team defaults). Per-user state files go below.
*
!.gitignore
!config.json
```

When you later see `.ritual/config.json` in `git status` output (modified or untracked), it's correct to commit it — don't ask the user whether it's per-user state; this comment is the answer.

#### Step 1.1 — No-arg `/ritual build` entry

`prepare_build` needs the ask, so a no-arg `/ritual build` cannot run the Scope-entry gate yet. Ask for the feature/problem first (no internal step labels), then run Step 0.7 (`prepare_build`) with their reply as `raw_input`:

```text
Ritual build
▶ Scope · Discovery · Recommendations · Build brief · Implementation

What do you want to build? Any granularity works, and any job — not just code:
  "audit log for admin actions"
  "Add soft-delete for projects. Restorable 30 days, then purge via the
   existing background-job system. Don't touch billing records; exports
   must exclude deleted data."
  "draft the launch brief for the new pricing tier"
A few words → discovery extracts the detail. Constraints and exclusions
you type become binding scope.

Reply with a feature/problem description, or `pulse <ask>` to scope-check an idea first.
```

For `pulse <ask>`, route to `/ritual context-pulse <ask>` — an optional side path; do not make context-pulse feel like the required first move. Once the user gives an ask, run Step 0.7 (`prepare_build`) with it; everything else (workspace, draft, branch-resume) is resolved there.
