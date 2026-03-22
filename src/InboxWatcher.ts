import { FileSystemAdapter, Notice, TFile } from 'obsidian';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import type ObsidianAIPlugin from './main';
import { sendFileToTelegram, parseTelegramThreadUrl } from './TelegramService';

const execAsync = promisify(exec);

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'ogg', 'flac', 'webm', 'aac', 'mp4']);

export class InboxWatcher {
  private plugin: ObsidianAIPlugin;
  private queue: TFile[] = [];
  private processing = false;

  constructor(plugin: ObsidianAIPlugin) {
    this.plugin = plugin;
  }

  register() {
    this.plugin.registerEvent(
      this.plugin.app.vault.on('create', (file) => {
        if (file instanceof TFile) {
          this.enqueue(file);
        }
      })
    );
  }

  private enqueue(file: TFile) {
    if (!this.isAudioFile(file) || !this.isDirectlyInInbox(file)) return;
    this.queue.push(file);
    if (!this.processing) this.processNext();
  }

  private async processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    this.processing = true;
    const file = this.queue.shift()!;
    try {
      await this.handleNewFile(file);
    } catch (err) {
      console.error('[obsidian-ai]', err);
    }
    this.processNext();
  }

  private isAudioFile(file: TFile): boolean {
    return AUDIO_EXTENSIONS.has(file.extension.toLowerCase());
  }

  private isDirectlyInInbox(file: TFile): boolean {
    const inbox = this.plugin.settings.inboxFolder.replace(/\/$/, '');
    // Only files directly in inbox/, not in subfolders like inbox/done/
    return path.dirname(file.path) === inbox;
  }

  private getVaultPath(): string {
    const adapter = this.plugin.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    throw new Error('FileSystemAdapter not available');
  }

  private async handleNewFile(file: TFile): Promise<void> {

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

      // whisper saves the file as <basename>.txt
      const whisperOutput = path.join(outputDir, `${file.basename}.txt`);
      const finalOutput = path.join(outputDir, `${date}-${file.basename}.md`);
      const transcript = await fs.readFile(whisperOutput, 'utf8');
      await fs.unlink(whisperOutput);

      // Move audio to inbox/done with YYYY-MM-DD prefix
      const inbox = this.plugin.settings.inboxFolder.replace(/\/$/, '');
      const doneDir = path.join(vaultPath, inbox, 'done');
      await fs.mkdir(doneDir, { recursive: true });
      const doneFileName = `${date}-${file.name}`;
      const donePath = path.join(doneDir, doneFileName);
      await fs.rename(audioPath, donePath);
      console.log(`[obsidian-ai] Moved to done: ${doneFileName}`);

      // Upload to Telegram (non-fatal)
      let telegramUrl: string | undefined;
      const token = this.plugin.settings.telegramBotToken;
      const tgTarget = parseTelegramThreadUrl(this.plugin.settings.telegramThreadUrl);
      if (token && tgTarget) {
        try {
          telegramUrl = await sendFileToTelegram(token, tgTarget.chatId, tgTarget.threadId, donePath);
          new Notice(`[AI] Uploaded to Telegram: ${doneFileName}`);
          console.log(`[obsidian-ai] Telegram message: ${telegramUrl}`);
        } catch (tgErr) {
          const msg = tgErr instanceof Error ? tgErr.message : String(tgErr);
          new Notice(`[AI] Telegram upload failed: ${msg}`);
          console.error('[obsidian-ai] Telegram error:', tgErr);
        }
      }

      // Write transcript MD
      const doneFilePath = `${inbox}/done/${doneFileName}`;
      const frontmatter = [
        '---',
        `created: ${date}`,
        `source: "[[${doneFilePath}]]"`,
        ...(telegramUrl ? [`telegram: "${telegramUrl}"`] : []),
        '---',
      ];
      const content = [...frontmatter, '', transcript.trim(), ''].join('\n');

      await fs.writeFile(finalOutput, content, 'utf8');
      new Notice(`[AI] Done: ${date}-${file.basename}.md`);
      console.log(`[obsidian-ai] Saved: ${finalOutput}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      new Notice(`[AI] Whisper error: ${message}`);
      console.error('[obsidian-ai] Whisper error:', err);
    }
  }
}
