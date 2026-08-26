# Ritual plugin (ChatGPT + Codex)

Bundle: the ritual-explore skill + the Ritual MCP connector mapping.

- `.codex-plugin/plugin.json` — plugin manifest (skills + app compatibility).
- `.app.json` — maps this plugin to the registered ChatGPT app. NOTE: in dev
  the `plugin_asdk_app_…` id changes on every connector delete/re-add; update
  it after each re-add. In production this becomes the published app's stable id.
- `skills/ritual-explore/` — synced from `extraction/skills/ritual-explore/`
  (that copy is the source of truth; re-copy after skill edits).

Install locally: ChatGPT desktop → Plugins → Add plugin marketplace →
Source: this repo (`ritual-work/chatgpt-plugin`) or the local folder path,
Git ref `main`, Sparse paths empty. Or from Codex CLI:
`codex plugin marketplace add ritual-work/chatgpt-plugin`.
