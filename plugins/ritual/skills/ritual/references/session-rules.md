# Session rules

The mechanics behind the rules the dispatcher states. The dispatcher holds each
rule's one sentence; this file holds how to carry it out. Read it once per session.

## Decisions, one at a time

A decision point is any place a flow waits for the user. Waiting means ending the
turn with the decision rendered and nothing after it. The host's auto-accept or
bypass-permissions mode does not change this: it approves tool calls, not product
decisions, and the flow's value is that the user shaped the inputs.
`references/lite-flow.md` names the decisions lite resolves on its own; no other
flow resolves any.

Before any tool call that changes an exploration's wording or scope (refining
sub-problems, reframing scope, adding an anti-goal), restate what will change and
confirm. `references/change-preflight.md` owns the shape.

After the user edits a local build brief, sync the change to Ritual so the two
copies never diverge. `references/refine-flow.md` § Step 5.5 owns the mechanics
and applies in every flow.

## Report state you have read

State means an exploration's step, recommendation count and status, and
requirement and brief status. When unsure which exploration is meant, call
`list_explorations` to see them side by side. Before stating what one contains,
call `get_exploration_status`. Memory and earlier turns settle identity only.

During repository discovery answering, an unresolved product choice is recorded in the
answer and carried into the dependent recommendation as an open question. Do not turn
it into an additional user gate. Distinguish a proposed default from an approved decision.
A real execution failure or unverifiable factual claim still needs honest handling.

## Host plans and file reads

The Ritual workflow rail reports saved workflow progress. A host-native plan is not
another authority for that progress. Before the brief is accepted, do not create a
whole-build task list containing future recommendation review, implementation or
verification tasks. Use the Ritual rail. If the host requires a turn plan, include only
the work achievable before the current user gate. Leave interrupted work incomplete;
never use a bulk completion or advance action to clear future workflow stages when
ending a turn at a gate. Implementation tasks begin after brief acceptance.

Read installed skill files individually with the host's file-read tool and resolved
absolute paths. Do not rely on shell working-directory changes or combine multiple
long file reads into one command: truncated output can hide the error and the rules.
Avoid decorative shell separators, especially unquoted equals signs that zsh interprets
as command-path expansion. A failed read is not proof of missing content. Inspect the error, verify the path, and
read the required file successfully before proceeding. If it remains unavailable,
explain the missing prerequisite rather than silently skipping its instructions.

## When the user corrects you

When the user contradicts something you said, rules a direction out of scope,
repeats an instruction, or asks whether you are sure and you then check, call
`record_correction` with what was wrong, what is right and why it happened, then
carry on. Say what changed in one sentence and continue the work. Do not announce
the call, and if it errors, ignore the error.

## Skill freshness

The frontmatter of the dispatcher may carry `stamp:`, `cli_version:` and
`channel:` values, set when the bundle was built. On the first `ping` of a session
pass them as `skill_stamp`, `cli_version` and `skill_channel`. If the response says `skillFreshness: "stale"`, say once, no pause, then continue with the current flow: "A newer Ritual skill is available. Run `codex plugin marketplace upgrade`, then `codex plugin add ritual@ritual`, and restart to pick it up." Otherwise say nothing. Never block on it.

## When Ritual's tools are not callable

Check the host's connection status before diagnosing. Say: Ritual's tools are
unavailable in this session. If authentication is required, use the host's own
authentication flow. If the connection is missing, disabled or unreachable, report
that and follow the host's connection guidance. If the cause cannot be determined,
say so. If you cannot inspect the status,
have the user open the host's MCP settings (in Claude Code, `/mcp`) and report
Ritual's status. For a Codex CLI connection named `ritual` that needs login, the
command is `codex mcp login ritual --oauth-client-registration cimd --scopes openid,profile,email,offline_access`.
Do not ask the user to resend their request, do not prescribe reinstalling without
evidence, do not fabricate results, and do not retry an unavailable connection
repeatedly. Resume the requested flow once the tools are callable.

## Output

Supporting detail is shown when asked, or when it changes the decision. Product
vocabulary is the workflow (Scope, Discovery, Recommendations, Build brief,
Implementation) and the user's workspace. `references/cli-output-contract.md`
owns the render rules.
