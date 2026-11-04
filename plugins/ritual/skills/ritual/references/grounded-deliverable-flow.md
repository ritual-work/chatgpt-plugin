
# Repository-grounded deliverable handoff

Use this branch only when Step 10's live status advertises `groundingRunsEnabled: true`
and you can run the CLI in the bound repository. Capability is not readiness. The user's
recommendation `proceed` has already authorized the next artifact; it does not authorize
implementation. Keep the existing brief confirmation gate.

1. Check `ritual ground verify --help` for `--batch`, `--sync`, `--prepare-deliverable`,
   and `--brief-context`. If the installed CLI lacks them, explain that the CLI needs an
   update and stop this handoff. Do not bypass a failed check by switching to legacy
   generation. Use the same configured provider/model as the earlier harness steps;
   do not invent credentials or change providers to bypass a failure.
2. Give one concise transition: “I’m checking the recommendations against your code,
   then preparing and checking the {Deliverable}.” Keep the workflow on the brief step.
   This is progress, not another approval question.
3. Choose the kind from the job: `brief` for terminal `implement`, `document` otherwise.
   For `brief`, write a JSON file under `.ritual/local/build-briefs/{exploration_id}/`
   containing only `reconContext` (the existing codebase context packet plus explicit
   later candidates) and `sources` (the same paths used upstream). Preserve those inputs;
   do not expand the packet into raw repository content. Pass the file with `--brief-context`.
4. Run once from the bound checkout:

   ```text
   ritual ground verify --batch --apply --sync --exploration <exploration_id> --prepare-deliverable <kind>
   ```

   Append `--brief-context <json-path>` for `brief`. Properly quote actual arguments for
   the shell. Wait for the running command rather than starting another one. The harness
   checks recommendations, reviews corrections, applies them through their queues,
   regenerates/rechecks affected recommendations, prepares or updates the artifact, and
   checks its fidelity. It retains timing, usage, and partial results in its receipt.
5. Continue only when the command succeeds, `status === 'grounding_checked'`, `error`
   is null, `fidelity.status === 'checked'`, and `serverRun.status === 'checked'`.
   Read the receipt before making these claims. `recommendations_checked`, an artifact's
   READY/COMPLETED status, or a successful local check without server completion is insufficient.
   On failure or an uncertain write, retain the receipt and follow Interrupted check
   recovery below. Do not waive findings, force generation, or start implementation.
   Linked changes or exhausted repair budget need resolution first.
6. Read the artifact through `get_build_brief_status` or
   `get_deliverable_document` as appropriate. Compare the returned identity
   and version to the receipt's fidelity target (`id`/`version` for briefs,
   `documentId`/`versionNumber` for documents). Compute the SHA-256 of the returned
   `content` (brief), encoded as UTF-8 without rewriting whitespace, or read the
   projected `contentHash` (document), and compare it to `fidelity.contentHash` before saving the handoff. If metadata is missing or different,
   stop the handoff rather than describing an unchecked revision as checked. Preserve
   `scopeContractResolved` when reading a Build Brief. For a document, use the projected markdown from that same checked HTML revision
   for the existing file-writing step; do not fetch a different revision merely to format it. Use the checked content for the
   existing local-file and brief-confirmation steps; do not regenerate it.
7. For the existing brief summary, use “Verification: recommendations and document checked
   against the repository” only after the successful receipt above. Do not invent the
   legacy per-citation verification counts or repeat the host's old grounding pass.
   Preserve the concise recommendation review presentation and the existing `proceed`
   confirmation. `implementationReady: false` is intentional: the user still chooses
   whether to begin the next job step.

This same reference is used by generated Build/Lite/plugin bundles. Lite may proceed through
its existing non-blocking recommendation review, but it must not skip the checks or treat
an incomplete receipt as success.

## Interrupted check recovery

This is an execution state, not a Readback grade. Sound, Fragile and Unsound describe
assessments; an interrupted check does not change a saved grade. Keep completed stages
completed only when saved evidence proves them. Never mark the brief complete without
successful verification. Use Ritual in progress and recovery messages.

Execution recovery is automatic, not a user decision gate. The CLI sends uncertain
findings through independent review, queues supported corrections, regenerates affected
recommendations and rechecks them before checking the artifact. Do not ask the user to
approve a routine check, adjudicate verifier output or choose whether to retry it.

If a command is interrupted after its internal correction budget, reconcile saved state
as described below and make at most one automatic recovery attempt for this handoff.
Keep the same configured provider/model. Give a short progress sentence when useful,
such as “Ritual is resolving a check before finishing your brief.” Do not render a retry
question, action card or a new gate. Track that recovery attempt in the current handoff;
never loop indefinitely or repeat a settled write. Real product choices remain explicit
in the recommendations; they do not become discovery gates.

If recovery still cannot finish, report the specific blocker in ordinary English and
keep the saved work. Ask only for a concrete decision or access that is actually needed
(for example, restoring provider credits), not permission to run another verification.
Do not claim the brief is checked. Receipts retain technical diagnostics for inspection;
do not expose IDs, receipt paths or model copying errors by default. An interruption
is not an Unsound or Fragile grade.

Before automatic recovery (or an explicit user-requested retry), read the previous receipt and current saved
exploration, recommendations, grounding run and artifact state. Confirm the repository
binding and current version. If another run is active, wait for it. If a write outcome is
unknown (including `start_unknown` preparation), reconcile its current server state before
issuing any command; uncertainty is not authorization to duplicate a write. Explain the
specific unresolved condition if reconciliation cannot establish a safe next action.

For a settled existing artifact, use `ritual ground verify --batch --apply --sync` with
`--exploration`, `--deliverable-kind` and `--deliverable-id` for that saved artifact;
do not also pass `--prepare-deliverable`. If no artifact exists and no pending or uncertain
generation remains, use the original preparation command and preserved brief context.
This checks current inputs again and reuses saved assessments only when still current;
it does not promise to skip every previously completed computation. Keep the configured
provider/model. Wait for one command, then apply the same receipt and artifact validation
above. A user-requested retry does not waive findings or authorize implementation.
