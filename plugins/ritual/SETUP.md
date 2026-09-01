# Setup notes — for the coding agent installing Ritual

You were handed an install prompt by a person who just created their first
Ritual exploration. These notes cover connecting, sign-in and its edge cases,
and how to talk to that person. Follow them; do not read them aloud.

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

## Verify before the restart

Run `codex mcp list` and read ritual's Auth column.

- `OAuth` → they are signed in. Continue.
- Anything else (`Not logged in`, `Unknown`, blank) → the sign-in did not
  stick, whatever the connect command reported. Tell them: "Finishing the
  sign-in — a browser tab may open and close by itself; you shouldn't need
  to enter anything." Then run:

      codex mcp logout ritual
      codex mcp login ritual --oauth-client-registration cimd --scopes openid,profile,email,offline_access

  If the browser does ask them to sign in, wait for them to finish and for
  the command to return. Then re-check the column.

Do this BEFORE telling them to restart — a restart with a stuck sign-in
strands them in a session with no Ritual tools and no way out but another
sign-in and another restart.

## Finishing

Tell them to restart the ChatGPT app (the plugin and the connection both load
at startup), and give them the resume command from their prompt to run after
the restart.
