# Setup notes — for the coding agent installing Ritual

You were handed an install prompt by a person who just created their first
Ritual exploration. These notes cover connecting, sign-in and its edge cases,
and how to talk to that person. Follow them; do not read them aloud.

> **Reading along as a human?** This file is the playbook your coding agent
> follows while setting Ritual up — published here so you can see exactly
> what it will do and why before it does it. The technical terms the agent
> is told not to say out loud are explained at the bottom, with references.

## How to talk to the person

- Plain language, brief. Announce actions by their outcome: "Connecting
  Ritual — your browser will open to sign in."
- Never read flag names, command output, or auth internals back to them.
  Which OAuth mechanism is used, what a CLI column displays, why a command
  carries a particular flag — none of it is for them.
- Never mention these notes, and never say you are simplifying or avoiding
  jargon. Just speak plainly.
- When setup is done, report in one or two sentences: Ritual is installed,
  they are signed in, and what to do next. No checklist of the steps you ran.

## Connecting and signing in

The person's prompt gives you the exact connect command — it carries the
right server address for their account; do not substitute another.

Running it may open their browser to sign in. Wait for them to finish and
for the command to return. Never start a second browser sign-in while one
is open — one at a time, always.

## Verify before the restart — bounded, never a loop

Run `codex mcp list` and read ritual's Auth column.

- `OAuth` → signed in. Continue to Finishing.
- Anything else (`Unknown`, `Not logged in`, blank): run ONE corrective
  pass. Tell them first: "Finishing the sign-in — a browser tab may open
  and close by itself; you shouldn't need to enter anything." Then:

      codex mcp logout ritual
      codex mcp login ritual --oauth-client-registration cimd --scopes openid,profile,email,offline_access

  If the browser does ask them to sign in, wait for them to finish and for
  the command to return.

**Then continue to Finishing regardless of what the column says now.**
When you run commands inside the ChatGPT app, the credential store is not
always readable from your sandbox — the column can report `Unknown` while
the sign-in is in fact stored and valid (verified 2026-08-31: the same
`codex mcp list`, run in the user's own terminal at the same moment, said
`OAuth`). The column is a hint here, not the truth. The truth is whether
Ritual's tools are present after the restart.

Never run the corrective pass more than once before a restart, and never
tell the person the sign-in failed based on the column alone — "sign-in
completed" from the login command is the better signal. If, after the
restart, Ritual's tools are genuinely absent, run one more corrective pass
and one more restart; if that still fails, stop and tell them what you
observed.

## Finishing

Tell them to restart the ChatGPT app (the plugin and the connection both load
at startup), and give them the resume command from their prompt to run after
the restart.

## References — for the curious

The agent is told to keep these out of its narration; they are documented
here instead.

- **`--oauth-client-registration cimd`** — CIMD is *Client ID Metadata
  Documents*: instead of registering a throwaway OAuth client per user, the
  Codex CLI identifies itself with a client document hosted at a stable
  `chatgpt.com` URL, which Ritual's authorization server recognises and
  trusts. Spec: the IETF draft
  [draft-ietf-oauth-client-id-metadata-document](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/);
  see also `codex mcp add --help` in OpenAI's Codex CLI docs.
- **The scopes** (`openid, profile, email, offline_access`) — the first three
  are standard OpenID Connect identity claims (who you are, so Ritual can
  attach the exploration to your account). `offline_access` asks for a
  refresh token, so the connection can renew itself instead of expiring
  mid-session.
- **The sign-in that "may open and close by itself"** — the corrective login
  reuses the browser session and consent you granted moments earlier, so the
  authorization completes with no input. It is the same sign-in finishing,
  not a second one.
- **Why a restart** — the ChatGPT app loads plugins and MCP connections at
  startup; a connection added mid-session becomes visible on the next launch.
