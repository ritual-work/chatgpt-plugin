## /ritual readback

Read back what was built against the problem scope and recommendations from discovery.
Surface consequential choices the coding session left implicit and what the implementation
covers. This is not a general code review: unrelated defects do not lower a recommendation's
grade, and a choice the user never specified is not automatically wrong.

This file owns the readback flow. Use the shared phase references for their named steps;
these readback-specific instructions take precedence over their build continuation.

### Readback presentation

This flow starts only when the user invokes readback. Completing a build or creating a PR
is not permission to start it. Keep the title **Ritual readback** from Scope onward,
including task lists and compact progress labels. The stages are
**Scope → Discovery → Recommendations → Assessment → Brief**. Mark only completed
stages complete; a generated brief is not checked until the verification receipt succeeds.

When using the shared Scope-entry, Scope or Discovery templates, pass
`workflow: "readback"` in `render_gate` fields. Do not infer the workflow from `terminal`:
other jobs can also end in `settle`. If an older renderer returns a `Ritual build` heading,
use the shared template fallback with this readback title and rail instead. Scope explains
that Ritual is surfacing hidden implementation decisions and gaps in coverage; Discovery
explains that its questions clarify intended behavior before assessing what was built.
Keep the shared gate's choices and pauses. Recommendations and the final result follow
this file's assessment sequence, not the build flow's implementation continuation.

Use the product-facing progress language in `references/render-contract.md`, including
shell-command descriptions and task-list labels. The command names below remain literal
technical instructions, not suggested user-facing narration.

### Entry and scope

1. This path requires the actual repository checkout, a working Ritual CLI, and MCP tools
   exposing `prepare_build.readback_executor` and `sync_implementation.diff` / `head_sha`.
   Check `ritual ground answer --help` and `ritual ground verify --help` for the batch,
   apply, sync and prepare-deliverable options before starting work. If unavailable, explain
   which client/server needs updating and retain the current session; do not simulate the
   missing harness or substitute host-authored grades. Without repository access, link to
   the existing Ritual web readback experience instead.
2. Follow `references/build-flow/entry.md` for repository identity, workspace binding and
   the scope-entry confirmation. Override its first `prepare_build` call with
   `jtbd: "readback-pr"` and `readback_executor: "harness"`, preserving the user's actual
   ask and repository signals. Keep the returned exploration ID throughout. Never create
   another build exploration to get around a readback resume. An executor mismatch on resume
   needs the existing job continued in its assigned surface, not an automatic reassignment.
3. After scope-entry confirmation, establish the implementation being assessed: repository,
   current commit, resolved base commit and the committed diff between them. Use the PR's
   actual base when a PR exists; otherwise resolve the branch's base from repository context.
   Ask only if that boundary cannot be established. Do not commit, reset, discard or stash
   user changes to make this work. Uncommitted work is not evidence for a committed snapshot;
   explain that limitation if it is part of what the user wants assessed.
4. Read the existing `.ritual/lineage.local.json` and this session's implementation history.
   Preserve the original request, steps, decisions and any real verification results. Use
   `lineage_source: "session"` only for an account recorded by the implementing session;
   when reconstructed from commits/diff, say `"reconstructed"`. Do not invent rationale,
   test execution, a passed gate, or a brief version that was never used.
5. Call `sync_implementation` on the readback exploration with its workspace, repository,
   branch, commits, original request, steps and decisions. Include the exact committed
   unified `diff` and `head_sha`; include PR fields and brief version/hash only when known.
   Respect the tool's payload limit rather than silently truncating evidence. This records
   the work being assessed; it does not implement anything or mark a human review complete.
   The server derives the as-built discovery source from this evidence.
6. Continue the scope steps in `references/build-flow/scope.md`, keeping the scope about
   what the implementation was meant to accomplish. Complete the sync before
   `lock_exploration_scope`, so discovery can wait for the declared source. Follow the
   existing scope decisions; do not silently widen the request into a code-quality audit.
   A linked original brief is optional. The server proves the parent/implementation link
   and carries the pinned version; a nearby brief or the current version is not a substitute.

### Discovery and assessment

7. Use `references/build-flow/discovery.md` for discovery questions and the user's choices.
   Await `accept_discovery_questions_batch` before answering the committed question IDs.
   For this repository path, replace the host's per-question answering loop with:

   ```text
   ritual ground answer --exploration <exploration_id>
   ```

   Keep the configured harness provider/model. Read its receipt, resolve failed or missing
   answers through the automatic recovery policy in Build Step 8; never offer a
   retry-or-swap question gate. Only call `submit_all_answers` when every committed
   question has a saved answer containing supported facts and any explicit open choice.
   The command saves answers but does not submit them. Do not fill failed answers with
   invented certainty to keep the flow moving. Product intent the code cannot settle
   follows the shared discovery policy: save the known facts and open choice, then carry
   it into the relevant recommendation rather than pausing for a user decision.
   Then use the shared recommendation wait;
   ready, empty and failed are terminal states, not reasons to keep polling indefinitely.
8. Once recommendations exist, read the live exploration status. Require
   `groundingRunsEnabled: true`. Hand the recommendation check and coverage assessment to
   Ritual with the assessment status from `references/render-contract.md`. Run:

   ```text
   ritual ground verify --batch --apply --sync --exploration <exploration_id> --prepare-deliverable brief
   ```

   Readback's artifact is a brief even though its terminal is review. Wait for this command;
   do not start a second command, call `generate_build_brief`, or run a separate host grading
   pass. The harness grounds and rechecks recommendations, assesses the resulting versions,
   saves grades, then waits for the server-owned recommended brief and checks its fidelity.
   Missing/stale evidence may yield Fragile; evidence contradicting the core may yield
   Unsound. Neither is an infrastructure error or a reason to suppress the finding.
9. Require the successful receipt checks in `references/grounded-deliverable-flow.md`
   steps 5–6, plus `readback.persistence` and no incomplete readback assessments. Existing
   saved grades may be reused; do not present those as newly evaluated. A CLI exit, a READY
   brief or recommendations alone does not prove the whole run finished. On failure,
   preserve the receipt and follow Interrupted check recovery in
   `references/grounded-deliverable-flow.md`. Do not fall back to direct generation,
   auto-rerun uncertain writes, or claim grounding is complete.

### Present the readback

10. Read the checked brief and current saved recommendations. Fetch `get_recommendations`
    with `verbose: true` internally when the lean projection omits the saved readback fields;
    extract only category, title, saved grade, finding and evidence for this presentation.
    Never dump the raw response or its internal metadata into chat. Use saved grades and their
    evidence; do not replace them with the host's opinion. Use the current exploration URL
    from the server. Explain the result in ordinary English, not grader field names.
    Keep the workflow rail and one sentence below it. For example, with actual counts:

    ```text
    Ritual readback
    ✓ Scope → ✓ Discovery → ✓ Recommendations → ✓ Assessment → ✓ Brief
    The readback shows where the controls match the intended behavior and where choices remain open.

    6 recommendations across 2 categories
    3 Sound · 2 Fragile · 1 Unsound

    [Review in Ritual ↗](<returned exploration URL>) · `show recommendations` in chat

    `proceed` — plan follow-up changes from the recommended brief
    ```

    Counts must come from saved results. An ungraded recommendation is not Sound. Omit an
    unavailable URL rather than inventing one. If the host already displayed the matching
    native component, use a concise pointer instead of duplicating its full contents.
11. `show recommendations` is read-only: show the complete set grouped by category, with
    each saved grade, one plain-language finding and relevant evidence. Opening the web link
    does not record review. When the original is present, Ritual can compare it with the
    recommended brief; otherwise describe only the recommended brief, not a fabricated diff.
12. Stop at the result. The readback does not authorize editing the repository. If the user
    chooses `proceed`, record the human review with `accept_recommendations`, reread the
    checked brief/version and plan the scoped follow-up with the user. Do not invoke the
    build flow's implementation or final sync steps automatically. If content changed since
    verification, use the current version's checks before handing it to implementation.

### The lineage sketchpad — kept while you build

The lineage is a decision log the developer reviews, kept as the work happens rather than
reconstructed afterwards. From the first prompt of any session that changes code — a
`/ritual build` implementation or a plain request — log it with `ritual readback log`, run
from the repo root. The verb writes `.ritual/lineage.local.json` (the `.ritual/.gitignore`
the flow writes already ignores it), stamps each entry, and refuses anything the readback
would reject. Never edit the file by hand.

```bash
ritual readback log request --text "<the first prompt, verbatim>"
ritual readback log scope --in "…" --out "…" --unsaid "…"
ritual readback log step --label "Schema + migration"
ritual readback log decision --title "Invite tokens never expire" --area auth \
  --choice "A random 32-byte token saved as-is" --instead "TTL of 7 days" "Signed JWT" \
  --because "The request said nothing about expiry" --files server/invites/token.ts:12-30
```

Four habits, none of them narrated to the user:

- **Request and scope at the start** — before the first edit. `--source exploration` with the
  brief's problem statement when you are executing a build brief.
- **A step as you take it** — when a stretch of work begins, at the altitude a reviewer would
  recognise (`Schema + migration`, not `edit line 40`). Put a test result on the step that ran
  it (`--meta "41 passing"`).
- **A decision the moment you make it** — every time there was another way: what you chose, the alternatives, and what it rests on — the request, a constraint,
  a file, a prior decision. Write `--choice` as the sentence you would say to a reviewer
  ("long lesson names are cut off with … and the full name shows on hover"), not the
  implementation — the implementation is the excerpt `--files` cuts. Leave it as logged; if it rested on "the request said nothing
  about expiry", that is what it rests on. If you later change the choice, log a new decision
  saying what changed and why rather than rewriting the old one.
- **The lines with the decision** — `--files path:start-end` cuts the lines that embody the
  choice from disk as its excerpt (at most 40; `path:line` cuts one line): the allow-list, the
  guard, the tie-break — never the file. The developer reads the excerpt beside the decision.

The file is per-user and never committed.
