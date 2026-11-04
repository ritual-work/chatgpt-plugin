<!-- GENERATED from references/build-flow.src.md by the Ritual monorepo internal guard — DO NOT EDIT. -->
<!-- source-sha: 1ed60b58b757af57 -->

## /ritual build

The build flow in six phase files, read as you reach them. A pointer to `build-flow.md` and a step number lands here; the table says which phase file holds that step.

Read `references/build-flow/entry.md` in full first and follow it. Each phase file says when to read the next one; read a phase when you reach its first step and not before.

| Phase | Steps | File | Read |
|---|---|---|---|
| Entry | Steps 0 to 1.1 | `references/build-flow/entry.md` | before anything else |
| Scope | Steps 2 to 6.5 | `references/build-flow/scope.md` | on reaching 2 |
| Discovery | Steps 7 to 8.5 | `references/build-flow/discovery.md` | on reaching 7 |
| Recommendations | Steps 9 to 9.6.3 | `references/build-flow/recommendations.md` | on reaching 9 |
| Build brief | Steps 10 to 10.5 | `references/build-flow/brief.md` | on reaching 10 |
| Implementation | Steps 11 to 13 | `references/build-flow/implement.md` | on reaching 11 |

Rules that hold across phases (one gate per turn, grounding, corrections, output) are the dispatcher's and `references/session-rules.md`'s; the phase files assume them.
