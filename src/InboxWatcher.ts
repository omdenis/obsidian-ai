import { FileSystemAdapter, Notice, TFile } from 'obsidian';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import type ObsidianAIPlugin from './main';

const execAsync = promisify(exec);

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'ogg', 'flac', 'webm', 'aac', 'mp4']);

export class InboxWatcher {
  private plugin: ObsidianAIPlugin;

  constructor(plugin: ObsidianAIPlugin) {
    this.plugin = plugin;
  }

  register() {
    this.plugin.registerEvent(
      this.plugin.app.vault.on('create', (file) => {
        if (file instanceof TFile) {
          this.handleNewFile(file).catch(err =>
            console.error('[obsidian-ai]', err)
          );
        }
      })
    );
  }

  private isAudioFile(file: TFile): boolean {
    return AUDIO_EXTENSIONS.has(file.extension.toLowerCase());
  }

  private isInInbox(file: TFile): boolean {
    const inbox = this.plugin.settings.inboxFolder.replace(/\/$/, '');
    return file.path.startsWith(inbox + '/');
  }

  private getVaultPath(): string {
    const adapter = this.plugin.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    throw new Error('FileSystemAdapter not available');
  }

  private async handleNewFile(file: TFile): Promise<void> {
    if (!this.isAudioFile(file) || !this.isInInbox(file)) return;

    const vaultPath = this.getVaultPath();
    const audioPath = path.join(vaultPath, file.path);

    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const outputDir = path.join(vaultPath, this.plugin.settings.sessionsFolder, 'src');

    await fs.mkdir(outputDir, { recursive: true });

    new Notice(`[AI] Transcribing: ${file.name}...`);
    console.log(`[obsidian-ai] Transcribing: ${file.path}`);

    try {
      const model = this.plugin.settings.whisperModel;
      const whisper = this.plugin.settings.whisperPath;
      await execAsync(
        `nice -n 10 "${whisper}" "${audioPath}" --model ${model} --output_dir "${outputDir}" --output_format txt`
      );

      // whisper saves the file as <basename>.txt — rename to YYYY-MM-DD-<basename>.md
      const whisperOutput = path.join(outputDir, `${file.basename}.txt`);
      const finalOutput = path.join(outputDir, `${date}-${file.basename}.md`);

      const transcript = await fs.readFile(whisperOutput, 'utf8');
      const content = [
        '---',
        `created: ${date}`,
        `source: "[[${file.path}]]"`,
        '---',
        '',
        transcript.trim(),
        '',
      ].join('\n');

      await fs.writeFile(finalOutput, content, 'utf8');
      await fs.unlink(whisperOutput);

      new Notice(`[AI] Done: ${date}-${file.basename}.md`);
      console.log(`[obsidian-ai] Saved: ${finalOutput}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      new Notice(`[AI] Whisper error: ${message}`);
      console.error('[obsidian-ai] Whisper error:', err);
    }
  }
}
