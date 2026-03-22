import { spawn } from 'child_process';

const FORMAT_PROMPT = `\
You are formatting a raw voice transcript into a clean Obsidian note.

Rules:
- Fix punctuation, capitalization, and obvious transcription errors
- Split into logical paragraphs
- Add markdown headings (##) only where there is a clear topic shift
- Preserve the original meaning and voice — do not summarize or add content
- Output only the formatted body text, no preamble, no commentary

Transcript to format:`;

export function formatTranscript(claudePath: string, rawText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(claudePath, ['--print', FORMAT_PROMPT + '\n\n' + rawText], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => stdout += d.toString());
    child.stderr.on('data', (d: Buffer) => stderr += d.toString());
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `Claude exited with code ${code}`));
      else resolve(stdout.trim());
    });
  });
}
