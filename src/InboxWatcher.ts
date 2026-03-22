import { FileSystemAdapter, Notice, TFile } from 'obsidian';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import type ObsidianAIPlugin from './main';
import { sendFileToTelegram, parseTelegramThreadUrl } from './TelegramService';
import { formatTranscript } from './ClaudeFormatter';

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
    const inInbox = this.isDirectlyInInbox(file);
    if (!inInbox) return;
    if (!this.isAudioFile(file) && file.extension.toLowerCase() !== 'md') return;
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
      if (this.isAudioFile(file)) {
        await this.handleAudioFile(file);
      } else {
        await this.handleMdFile(file);
      }
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
    return path.dirname(file.path) === inbox;
  }

  private getVaultPath(): string {
    const adapter = this.plugin.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
      return adapter.getBasePath();
    }
    throw new Error('FileSystemAdapter not available');
  }

  private async handleAudioFile(file: TFile): Promise<void> {
    const vaultPath = this.getVaultPath();
    const audioPath = path.join(vaultPath, file.path);
    const date = new Date().toISOString().slice(0, 10);
    const sessions = this.plugin.settings.sessionsFolder;
    const srcDir = path.join(vaultPath, sessions, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    new Notice(`[AI] Transcribing: ${file.name}...`);
    console.log(`[obsidian-ai] Transcribing: ${file.path}`);

    try {
      const { whisperPath, whisperModel } = this.plugin.settings;
      await execAsync(
        `nice -n 10 "${whisperPath}" "${audioPath}" --model ${whisperModel} --output_dir "${srcDir}" --output_format txt`
      );

      const whisperOutput = path.join(srcDir, `${file.basename}.txt`);
      const transcript = await fs.readFile(whisperOutput, 'utf8');
      await fs.unlink(whisperOutput);

      // Move audio to inbox/done
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

      const audioRef = `${inbox}/done/${doneFileName}`;
      await this.saveSession(transcript.trim(), file.basename, date, sessions, vaultPath, { audioRef, telegramUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      new Notice(`[AI] Whisper error: ${message}`);
      console.error('[obsidian-ai] Whisper error:', err);
    }
  }

  private async handleMdFile(file: TFile): Promise<void> {
    const vaultPath = this.getVaultPath();
    const filePath = path.join(vaultPath, file.path);
    const date = new Date().toISOString().slice(0, 10);
    const sessions = this.plugin.settings.sessionsFolder;
    const srcDir = path.join(vaultPath, sessions, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    new Notice(`[AI] Processing: ${file.name}...`);
    console.log(`[obsidian-ai] Processing MD: ${file.path}`);

    try {
      const raw = await fs.readFile(filePath, 'utf8');

      // Strip existing frontmatter if present, keep only body
      const fmMatch = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
      const transcript = (fmMatch ? fmMatch[1] : raw).trim();

      // Move original into sessions/src with prefix+suffix
      const srcFileName = `${date}-${file.basename}-src.md`;
      const destPath = path.join(srcDir, srcFileName);
      await fs.rename(filePath, destPath);
      console.log(`[obsidian-ai] Moved to src: ${srcFileName}`);

      await this.saveSession(transcript, file.basename, date, sessions, vaultPath, {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      new Notice(`[AI] MD processing error: ${message}`);
      console.error('[obsidian-ai] MD error:', err);
    }
  }

  private async saveSession(
    transcript: string,
    basename: string,
    date: string,
    sessions: string,
    vaultPath: string,
    opts: { audioRef?: string; telegramUrl?: string }
  ): Promise<void> {
    const srcDir = path.join(vaultPath, sessions, 'src');
    const srcFileName = `${date}-${basename}-src.md`;
    const srcFilePath = `${sessions}/src/${srcFileName}`;

    // Write -src.md (only if not already moved there by handleMdFile)
    const srcDest = path.join(srcDir, srcFileName);
    const srcExists = await fs.access(srcDest).then(() => true).catch(() => false);
    if (!srcExists) {
      const srcFrontmatter = [
        '---',
        `created: ${date}`,
        `type: session-src`,
        ...(opts.audioRef ? [`audio: "[[${opts.audioRef}]]"`] : []),
        ...(opts.telegramUrl ? [`telegram: "${opts.telegramUrl}"`] : []),
        '---',
      ];
      await fs.writeFile(srcDest, [...srcFrontmatter, '', transcript, ''].join('\n'), 'utf8');
      console.log(`[obsidian-ai] Saved src: ${srcFileName}`);
    } else {
      // MD file was already moved there — prepend frontmatter
      const srcFrontmatter = [
        '---',
        `created: ${date}`,
        `type: session-src`,
        '---',
      ];
      const existing = await fs.readFile(srcDest, 'utf8');
      await fs.writeFile(srcDest, [...srcFrontmatter, '', existing.trim(), ''].join('\n'), 'utf8');
    }

    // Format with Claude
    const claudePath = this.plugin.settings.claudePath;
    let body = transcript;
    if (claudePath) {
      try {
        new Notice(`[AI] Formatting with Claude...`);
        body = await formatTranscript(claudePath, body);
        console.log(`[obsidian-ai] Formatted: ${date}-${basename}.md`);
      } catch (fmtErr) {
        const msg = fmtErr instanceof Error ? fmtErr.message : String(fmtErr);
        new Notice(`[AI] Claude format failed: ${msg}`);
        console.error('[obsidian-ai] Claude format error:', fmtErr);
      }
    }

    // Write final session MD
    await fs.mkdir(path.join(vaultPath, sessions), { recursive: true });
    const finalOutput = path.join(vaultPath, sessions, `${date}-${basename}.md`);
    const frontmatter = [
      '---',
      `created: ${date}`,
      `type: session`,
      `tags: [session]`,
      ...(opts.audioRef ? [`audio: "[[${opts.audioRef}]]"`] : []),
      `transcript: "[[${srcFilePath}]]"`,
      ...(opts.telegramUrl ? [`telegram: "${opts.telegramUrl}"`] : []),
      '---',
    ];
    await fs.writeFile(finalOutput, [...frontmatter, '', body, ''].join('\n'), 'utf8');
    console.log(`[obsidian-ai] Saved: ${date}-${basename}.md`);
    new Notice(`[AI] Done: ${date}-${basename}.md`);
  }
}
