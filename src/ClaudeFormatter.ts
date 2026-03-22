import { promises as fs } from 'fs';
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

function runClaude(claudePath: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(claudePath, ['--print', FORMAT_PROMPT + '\n\n' + input], {
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

// Rewrites the body of the MD file in-place, preserving frontmatter.
export async function formatTranscriptFile(claudePath: string, mdFilePath: string): Promise<void> {
  const original = await fs.readFile(mdFilePath, 'utf8');

  // Split frontmatter from body
  const match = original.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  if (!match) return;
  const [, frontmatter, body] = match;

  const formatted = await runClaude(claudePath, body.trim());

  await fs.writeFile(mdFilePath, `${frontmatter}\n${formatted}\n`, 'utf8');
}
