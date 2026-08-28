# Ritual — ChatGPT / Codex plugin marketplace

[Ritual](https://ritual.work) frames real work before you build it: a rough
idea becomes a sharp problem statement, targeted discovery questions you pick
from, and explainable build-ready recommendations — the context a coding agent
cannot infer on its own.

This repository is the plugin marketplace for the ChatGPT desktop app and the
Codex CLI. It contains the Ritual plugin: the `ritual-build` skill and the
slash commands that route into it.

## Install

Add the marketplace and the plugin:

```
codex plugin marketplace add ritual-work/chatgpt-plugin
codex plugin add ritual@ritual
```

Then connect Ritual's MCP server and sign in:

```
codex mcp add ritual --url https://mcp.ritualapp.cloud/mcp --oauth-client-registration cimd
codex mcp login ritual --oauth-client-registration cimd --scopes openid,profile,email,offline_access
```

Restart the app afterwards. In ChatGPT desktop: Plugins → Add plugin
marketplace → source `ritual-work/chatgpt-plugin`, ref `main`.

Using Ritual requires a Ritual account; `codex mcp login` opens the browser to
create one or sign in.

## What you get

The `ritual-build` skill, plus slash commands for the rest of the workflow:

| Command | What it does |
| --- | --- |
| `/ritual-build` | Full planning-to-sync cycle — the default for new work |
| `/resume` | Pick up an in-flight exploration where it left off |
| `/lite` | Fast, unattended pipeline for small, well-scoped work |
| `/lineage` | Every prior exploration and decision that touched a file path |
| `/context-pulse` | Score readiness and context debt before building |
| `/status` | Read-only progress check on the current run |

## What's in here

- `plugins/ritual/` — the installable plugin: manifest, skill, commands.
- `.agents/plugins/marketplace.json` — the marketplace index.

This repository is a generated distribution: releases are published to it as
single versioned commits. Issues and feedback: https://ritual.work
