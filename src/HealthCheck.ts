import { Notice } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';
import type ObsidianAIPlugin from './main';
import { checkTelegramAccess, parseTelegramThreadUrl } from './TelegramService';

const execAsync = promisify(exec);

async function checkExecutable(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`"${bin}" --version`);
    return stdout.trim().split('\n')[0] || bin;
  } catch (err: any) {
    // ENOENT means the binary doesn't exist at all
    if (err?.code === 'ENOENT' || err?.message?.includes('not found') || err?.message?.includes('No such file')) {
      return null;
    }
    // Non-zero exit (e.g. whisper has no --version flag) still means binary exists
    const out = (err?.stdout || err?.stderr || '').trim().split('\n')[0];
    return out || bin;
  }
}

export async function runHealthCheck(plugin: ObsidianAIPlugin): Promise<void> {
  const failures: string[] = [];

  const whisperVersion = await checkExecutable(plugin.settings.whisperPath);
  if (whisperVersion) {
    console.log(`[obsidian-ai] whisper ok: ${whisperVersion}`);
  } else {
    failures.push(`whisper not found at: ${plugin.settings.whisperPath}`);
  }

  const claudeVersion = await checkExecutable(plugin.settings.claudePath);
  if (claudeVersion) {
    console.log(`[obsidian-ai] claude ok: ${claudeVersion}`);
  } else {
    failures.push(`claude not found at: ${plugin.settings.claudePath}`);
  }

  const token = plugin.settings.telegramBotToken;
  const tgTarget = parseTelegramThreadUrl(plugin.settings.telegramThreadUrl);
  if (token && tgTarget) {
    try {
      const title = await checkTelegramAccess(token, tgTarget.chatId);
      console.log(`[obsidian-ai] telegram ok: ${title}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`telegram: ${msg}`);
    }
  }

  if (failures.length > 0) {
    const msg = '[AI] Health check failed:\n' + failures.map(f => `• ${f}`).join('\n');
    new Notice(msg, 10000);
    console.warn('[obsidian-ai]', msg);
  } else {
    new Notice('[AI] All tools available', 4000);
  }
}
