# Obsidian AI

Obsidian plugin for automatic audio transcription via Whisper.

## Development

### Install dependencies

```bash
npm install
```

### Dev mode (watch)

Rebuilds `main.js` automatically on every `.ts` file save:

```bash
npm run dev
```

After changes, reload the plugin in Obsidian: `Ctrl+P` → `Reload app without saving`.

### Production build

```bash
npm run build
```

## Enable in Obsidian

1. `Settings → Community plugins → Turn on community plugins`
2. Find **Obsidian AI** in the installed plugins list → enable

## Structure

```
src/main.ts        ← source code
manifest.json      ← plugin metadata
main.js            ← compiled output (do not edit, in .gitignore)
```
