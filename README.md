# Obsidian AI

Obsidian plugin for automatic audio transcription via Whisper.

## Requirements

For the best experience, I’d recommend getting Obsidian Sync for $8. It doesn’t have a strict audio file size limit.
The $4 plan only allows audio files up to 5 MB.

- [Obsidian](https://obsidian.md/) (see Linux installation notes below)
- [openai-whisper](https://github.com/openai/whisper) installed on the host system:
  ```bash
  pip install openai-whisper
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

## Usage

The plugin watches the **inbox folder** (configurable in settings) for new audio files (mp3, m4a, wav, ogg, flac, webm, aac) and automatically transcribes them via Whisper.

### Option 1: Copy files manually

Copy or move audio files into the `inbox` folder inside your vault. The plugin will detect them and start transcription.

### Option 2: Set inbox as Obsidian attachments folder

1. `Settings → Files and links → Default location for new attachments` → select `In the folder specified below`
2. Set the folder to `inbox`

Now any file you drag & drop, paste, or record in Obsidian will land in `inbox` and get transcribed automatically.

### Option 3: Share audio from mobile

On your phone, tap **Share** on any audio file and choose **Obsidian**. It will be saved into the attachments folder (i.e. `inbox`). Once Obsidian syncs, the plugin picks it up and runs Whisper.

> Make sure Obsidian Sync (or your sync tool) is set up between mobile and desktop, since Whisper runs on the desktop.

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
src/main.ts        ← source code
src/settings.ts    ← settings interface and defaults
src/SettingsTab.ts ← settings UI
src/InboxWatcher.ts ← file watcher + whisper runner
manifest.json      ← plugin metadata
main.js            ← compiled output (do not edit, in .gitignore)
```
