# Obsidian AI

Obsidian plugin for automatic audio transcription via Whisper, AI-powered formatting via Claude, and archiving to Telegram.

## Requirements

For the best experience, I'd recommend getting Obsidian Sync for $8. It doesn't have a strict audio file size limit.
The $4 plan only allows audio files up to 5 MB.

- [Obsidian](https://obsidian.md/) (see Linux installation notes below)
- [openai-whisper](https://github.com/openai/whisper) installed on the host system:
  ```bash
  pip install openai-whisper
  ```
- [Claude CLI](https://github.com/anthropics/claude-code) installed and authenticated:
  ```bash
  npm install -g @anthropic-ai/claude-code
  ```

Set inbox as Obsidian attachments folder

1. `Settings → Files and links → Default location for new attachments` → select `In the folder specified below`
2. Set the folder to `inbox`

### Linux: Obsidian installation

On Linux, Obsidian must be installed as **AppImage** (not Flatpak or Snap). Flatpak and Snap run in a sandbox with their own Python, which prevents the plugin from calling host-installed tools like Whisper.

```bash
mkdir -p ~/Applications
wget -O ~/Applications/Obsidian.AppImage \
  "https://github.com/obsidianmd/obsidian-releases/releases/download/v1.8.10/Obsidian-1.8.10.AppImage"
chmod +x ~/Applications/Obsidian.AppImage
~/Applications/Obsidian.AppImage
```

## Plugin installation

1. Download `main.js` and `manifest.json` from the latest release
2. Create the plugin folder in your vault:
   ```bash
   mkdir -p <your-vault>/.obsidian/plugins/obsidian-ai
   ```
3. Copy `main.js` and `manifest.json` into that folder
4. In Obsidian: `Settings → Community plugins → Turn on community plugins`
5. Find **Obsidian AI** in the installed plugins list → enable

## How it works

The plugin watches the **inbox folder** for new files and processes them one at a time (sequential queue, never in parallel).

### Audio files (mp3, m4a, wav, ogg, flac, webm, aac, mp4)

1. **Transcribe** — Whisper converts the audio to text
2. **Archive audio** — file is moved to `inbox/done/YYYY-MM-DD-filename.ext`
3. **Upload to Telegram** — file is sent to the configured thread (optional)
4. **Save raw transcript** — written to `sessions/src/YYYY-MM-DD-basename-src.md`
5. **Format with Claude** — raw transcript is rewritten into clean, structured markdown
6. **Save session note** — formatted result written to `sessions/YYYY-MM-DD-basename.md`

### Markdown files

Drop any `.md` file into `inbox/` to run it through the same formatting pipeline without transcription:

1. **Read content** — existing frontmatter is stripped, body is extracted
2. **Move to src** — file is renamed to `sessions/src/YYYY-MM-DD-basename-src.md`
3. **Format with Claude** — body is rewritten into clean, structured markdown
4. **Save session note** — formatted result written to `sessions/YYYY-MM-DD-basename.md`


## Settings

| Setting | Description |
|---|---|
| **Inbox folder** | Folder to watch for new files (default: `inbox`) |
| **Sessions folder** | Where transcripts and session notes are saved (default: `sessions`) |
| **Whisper path** | Full path to the `whisper` executable (`which whisper`) |
| **Whisper model** | Model size: `turbo`, `base`, `small`, `large` |
| **Claude path** | Full path to the `claude` executable (`which claude`) |
| **Telegram bot token** | Bot API token from [@BotFather](https://t.me/BotFather) |
| **Telegram thread URL** | Paste any message link from the target thread, e.g. `https://t.me/c/1449070803/3816/3817` |

## Usage

### Option 1: Copy files manually

Copy or move audio or markdown files into the `inbox` folder inside your vault. The plugin will detect them and start processing.

### Option 2: Set inbox as Obsidian attachments folder

1. `Settings → Files and links → Default location for new attachments` → select `In the folder specified below`
2. Set the folder to `inbox`

Now any file you drag & drop, paste, or record in Obsidian will land in `inbox` and get processed automatically.

### Option 3: Share audio from mobile

On your phone, tap **Share** on any audio file and choose **Obsidian**. It will be saved into the attachments folder (i.e. `inbox`). Once Obsidian syncs, the plugin picks it up and runs Whisper.

> Make sure Obsidian Sync (or your sync tool) is set up between mobile and desktop, since Whisper and Claude run on the desktop.

## Health check

On every plugin load, a health check verifies that:
- `whisper` is reachable at the configured path
- `claude` is reachable at the configured path
- The Telegram bot can access the configured chat (if token and URL are set)

A notice is shown on startup — green if all pass, with details on anything that failed.

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

## Structure

```
src/main.ts             ← plugin entry point and health check trigger
src/settings.ts         ← settings interface and defaults
src/SettingsTab.ts      ← settings UI
src/InboxWatcher.ts     ← file watcher, queue, audio and MD processing
src/ClaudeFormatter.ts  ← Claude CLI integration and formatting prompt
src/TelegramService.ts  ← Telegram Bot API upload and URL parser
src/HealthCheck.ts      ← startup checks for whisper, claude, telegram
manifest.json           ← plugin metadata
main.js                 ← compiled output (do not edit)
```
