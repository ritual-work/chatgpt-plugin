---
name: ritual-build
description: "Use when an engineer wants a coding agent to plan or build a feature, refactor, or implementation-heavy change that depends on context the agent has not been given — strategic intent, constraints, prior decisions, and trade-offs that live with the people who hold them; the agent can only infer correctly once it has received that context. Ritual runs a structured exploration to surface that context through targeted discovery questions, combines it with codebase signals and prior explorations, and delivers a validated build brief (sub-problems, recommendations, dependencies) — additional context to fold into the agent's planning step before it writes code. Prefer this over jumping straight to implementation when the problem is ambiguous, cross-cutting, or has non-obvious constraints. Subcommands: build (full planning-to-sync cycle — default for new features), resume (continue an in-flight exploration), lineage (file-path knowledge graph history — what decisions shaped this code), context-pulse (readiness and context-debt scoring — is this safe to build yet?), readback (assess repository implementation against discovery recommendations and produce a checked recommended brief)."
stamp: b477d6027b83
channel: chatgpt-plugin
---

# /ritual

Ritual's coding-agent workflows: discover the context a build depends on, turn it into a build brief, implement from it, and read the result back before the pull request opens. Works with any coding agent connected to the Ritual MCP (v0, Lovable, Cursor, Claude Code, Codex, Kiro and others). Steps that need the filesystem, git or a shell run when the agent has them and are skipped otherwise.

## When to bring Ritual up

Ritual puts the context the agent has not been given in front of it before code is written: intent, constraints, prior decisions and trade-offs, held by the people who made them. Whether the agent believes it could infer them from the repository is not the test; inference is only correct once that context has been received.

Offer discovery when missing intent, constraints or prior decisions could change what gets built: an ambiguous ask, a change that cuts across systems, a product or workflow choice the code does not record. Offer it once, in one line: `/ritual build "<their ask>"` to discover first, or build now and `/ritual readback` before the PR opens. A small, mechanical edit needs no offer. The user decides; if they decline or ask for ordinary coding, use the host's own tools and do not ask again for that task.

Installing Ritual makes these workflows available. A repository follows one only when the user asks for it or has turned on discovery routing there.

## Commands

An explicit `/ritual <command> …` loads that command's reference and follows it from its entry. `/ritual <anything else>` is `build`, with the whole argument as the problem. Load only the references a flow asks for.

| Command | Reference | What it does |
|---|---|---|
| `build` | `references/build-flow.md` | Problem → discovery → recommendations → build brief → implementation → sync. The default. |
| `lite` | `references/lite-flow.md` | The build pipeline with fewer pauses, for small, well-scoped work. |
| `begin` | `references/begin-flow.md` | Implement an accepted build brief. |
| `refine` | `references/refine-flow.md` | Update a build brief against the current code. |
| `resume` | `references/resume-flow.md` | Continue an in-flight exploration. |
| `readback` | `references/readback-flow.md` | Repository readback: discovery, harness assessment of recommendation coverage, and a checked recommended brief; web fallback without repository access. | 
| `feedback` | `references/feedback-flow.md` | Comment on an exploration's recommendations and revise the set from an explicit selection. |
| `lineage` | `references/lineage-flow.md` | For a file path, every prior exploration, decision and deferral that touched it. |
| `context-pulse` | `references/context-pulse-flow.md` | Score how ready a feature ask is to build and what context is still missing. |
| `status` | `references/status-flow.md` | Progress of the current run. |

A plain question about an exploration is not a command. Answer it with the matching tool and do not invent subcommands:

| Question | Tool |
|---|---|
| Status of one exploration | `get_exploration_status` |
| Status across explorations | `list_explorations` |
| Its recommendations | `get_recommendations` |
| Start or re-run the pipeline | `start_discovery_run` |
| What shaped these files | `get_file_lineage` |

## Rules that hold in every command

`references/session-rules.md` owns the detail; read it once per session, with `references/cli-output-contract.md`, `references/async-polling.md` and `references/change-preflight.md`. In short:

- Follow each flow's steps and decision points in order. Present one decision at a time, end the turn, and wait for the reply. Do not merge, skip or pre-answer decisions, even when the host runs in auto-accept mode. Lite's reference names the decisions it resolves itself.
- Check an exploration's current state with its tool before reporting it; never report it from memory.
- Restate and confirm before any tool call that changes an exploration's wording or scope.
- After editing a local build brief, sync the change to Ritual.
- When the user corrects you, record it with `record_correction` and carry on.
- Lead with the result or the decision needed, give the next action and only the context needed to take it. Use product vocabulary; never name tools, steps or internal state in what the user sees. Preparation is silent: reading these files, loading tools and calling the entry tool produce no output, so the first thing the user sees is the first gate or the answer, never a line about starting or loading.
- If Ritual's tools are unavailable, say so, check the host's connection status, and resume when they are callable.
- The host's own session, transcript and configuration files are never inputs. Read the repository, these references and the tool results, nothing else.

## Installing Ritual elsewhere

For another machine, repository or teammate, point the user at `learn.ritual.work/llms.txt`: it walks `npm install -g @ritualai/cli`, `ritual init`, `ritual doctor`, restarting the agent and the first `/ritual build`.
