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

const TITLE_PROMPT = `\
Given the following text, output a concise 3-5 word title that captures the main topic.

Rules:
- Use plain lowercase words, no punctuation
- No articles (a, an, the) unless essential
- No quotes, colons, slashes, or special characters
- Output only the title, nothing else

Text:`;

const TAGS_PROMPT = `\
Given the following text, output 3-5 single-word tags that describe the main topics.

Rules:
- Each tag must be exactly one word, lowercase
- No punctuation, numbers, or special characters
- Output only the tags separated by spaces, nothing else

Text:`;


function runClaude(claudePath: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(claudePath, ['--print', prompt], {
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

export async function generateTitle(claudePath: string, text: string, date: string): Promise<string> {
  const raw = await runClaude(claudePath, TITLE_PROMPT + '\n\n' + text.slice(0, 2000));
  // Sanitize: remove characters invalid in filenames, collapse spaces
  const sanitized = raw
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return sanitized || date;
}


export async function generateTags(claudePath: string, text: string): Promise<string[]> {
  const raw = await runClaude(claudePath, TAGS_PROMPT + '\n\n' + text.slice(0, 2000));
  const tags = raw
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 0)
    .slice(0, 5);
  return ['session', ...tags.filter(t => t !== 'session')];
}

export function formatTranscript(claudePath: string, rawText: string): Promise<string> {
  return runClaude(claudePath, FORMAT_PROMPT + '\n\n' + rawText);
}
