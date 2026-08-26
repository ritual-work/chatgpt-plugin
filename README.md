# Ritual — ChatGPT / Codex plugin marketplace

[Ritual](https://ritual.work) frames real work before you build it: a rough
idea becomes a sharp problem statement, targeted discovery questions you pick
from, and explainable build-ready recommendations — the context a coding agent
cannot infer on its own.

This repository is the plugin marketplace for the ChatGPT desktop app and the
Codex CLI. It contains the Ritual plugin (the `build` skill) and the app
attachment for the Ritual connector.

## Install

From the Codex CLI:

```
codex plugin marketplace add ritual-work/chatgpt-plugin
codex plugin add ritual@ritual
```

Then restart the app. In ChatGPT desktop: Plugins → Add plugin marketplace →
source `ritual-work/chatgpt-plugin`, ref `main`.

Using Ritual requires a Ritual account — the app connects to Ritual's service
and signs you in on first use.

## What's in here

- `plugins/ritual/` — the installable plugin: manifest, skills, app attachment.
- `.agents/plugins/marketplace.json` — the marketplace index.

This repository is a generated distribution: releases are published to it as
single versioned commits. Issues and feedback: https://ritual.work
