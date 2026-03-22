import { promises as fs } from 'fs';
import * as https from 'https';
import * as path from 'path';

// Parses https://t.me/c/1449070803/3816/3817 → { chatId: '-1001449070803', threadId: '3816' }
export function parseTelegramThreadUrl(url: string): { chatId: string; threadId: string | undefined } | null {
  const match = url.match(/t\.me\/c\/(\d+)\/(\d+)(?:\/\d+)?/);
  if (!match) return null;
  return {
    chatId: `-100${match[1]}`,
    threadId: match[2],
  };
}

export async function sendFileToTelegram(
  token: string,
  chatId: string,
  threadId: string | undefined,
  filePath: string
): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const fileName = path.basename(filePath);
  const boundary = `----FormBoundary${Date.now()}`;

  const parts: Buffer[] = [];

  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`
  ));

  if (threadId) {
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="message_thread_id"\r\n\r\n${threadId}\r\n`
    ));
  }

  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`
  ));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendDocument`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.ok) {
            reject(new Error(`Telegram API error: ${json.description}`));
            return;
          }
          const messageId: number = json.result.message_id;
          // Strip -100 prefix for t.me/c/ URLs (private groups)
          const numericId = chatId.replace(/^-100/, '');
          const url = threadId
            ? `https://t.me/c/${numericId}/${threadId}/${messageId}`
            : `https://t.me/c/${numericId}/${messageId}`;
          resolve(url);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
