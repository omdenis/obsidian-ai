"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ObsidianAIPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/settings.ts
var WHISPER_MODELS = ["turbo", "base", "small", "large"];
var DEFAULT_SETTINGS = {
  inboxFolder: "inbox",
  sessionsFolder: "sessions",
  whisperModel: "turbo",
  whisperPath: "whisper",
  telegramThreadUrl: "",
  telegramBotToken: "",
  claudePath: "claude"
};

// src/SettingsTab.ts
var import_obsidian = require("obsidian");
var ObsidianAISettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Inbox folder").setDesc("Folder to watch for new audio files").addText(
      (text) => text.setPlaceholder("inbox").setValue(this.plugin.settings.inboxFolder).onChange(async (value) => {
        this.plugin.settings.inboxFolder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Sessions folder").setDesc("Folder where transcripts will be saved").addText(
      (text) => text.setPlaceholder("sessions").setValue(this.plugin.settings.sessionsFolder).onChange(async (value) => {
        this.plugin.settings.sessionsFolder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Whisper path").setDesc('Full path to the whisper executable (run "which whisper" in terminal to find it)').addText(
      (text) => text.setPlaceholder("/home/user/.local/bin/whisper").setValue(this.plugin.settings.whisperPath).onChange(async (value) => {
        this.plugin.settings.whisperPath = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Whisper model").setDesc("Larger models are more accurate but slower").addDropdown((drop) => {
      WHISPER_MODELS.forEach((model) => drop.addOption(model, model));
      drop.setValue(this.plugin.settings.whisperModel).onChange(async (value) => {
        this.plugin.settings.whisperModel = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Claude path").setDesc('Full path to the claude CLI executable (run "which claude" in terminal)').addText(
      (text) => text.setPlaceholder("claude").setValue(this.plugin.settings.claudePath).onChange(async (value) => {
        this.plugin.settings.claudePath = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Telegram bot token").setDesc("Bot API token from @BotFather").addText(
      (text) => text.setPlaceholder("123456:ABC-DEF...").setValue(this.plugin.settings.telegramBotToken).onChange(async (value) => {
        this.plugin.settings.telegramBotToken = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Telegram thread URL").setDesc("Paste any message link from the target thread (e.g. https://t.me/c/1449070803/3816/3817). Bot token is read from TELEGRAM_BOT_TOKEN env var.").addText(
      (text) => text.setPlaceholder("https://t.me/c/1449070803/3816/3817").setValue(this.plugin.settings.telegramThreadUrl).onChange(async (value) => {
        this.plugin.settings.telegramThreadUrl = value.trim();
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/InboxWatcher.ts
var import_obsidian2 = require("obsidian");
var import_child_process2 = require("child_process");
var import_fs2 = require("fs");
var path2 = __toESM(require("path"));
var import_util = require("util");

// src/TelegramService.ts
var import_fs = require("fs");
var https = __toESM(require("https"));
var path = __toESM(require("path"));
function parseTelegramThreadUrl(url) {
  const match = url.match(/t\.me\/c\/(\d+)\/(\d+)(?:\/\d+)?/);
  if (!match)
    return null;
  return {
    chatId: `-100${match[1]}`,
    threadId: match[2]
  };
}
function telegramGet(token, method, params) {
  const query = new URLSearchParams(params).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${token}/${method}?${query}`,
      method: "GET"
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}
async function checkTelegramAccess(token, chatId) {
  var _a, _b, _c;
  const res = await telegramGet(token, "getChat", { chat_id: chatId });
  if (!res.ok)
    throw new Error((_a = res.description) != null ? _a : "unknown error");
  return (_c = (_b = res.result.title) != null ? _b : res.result.username) != null ? _c : chatId;
}
async function sendFileToTelegram(token, chatId, threadId, filePath) {
  const fileBuffer = await import_fs.promises.readFile(filePath);
  const fileName = path.basename(filePath);
  const boundary = `----FormBoundary${Date.now()}`;
  const parts = [];
  parts.push(Buffer.from(
    `--${boundary}\r
Content-Disposition: form-data; name="chat_id"\r
\r
${chatId}\r
`
  ));
  if (threadId) {
    parts.push(Buffer.from(
      `--${boundary}\r
Content-Disposition: form-data; name="message_thread_id"\r
\r
${threadId}\r
`
    ));
  }
  parts.push(Buffer.from(
    `--${boundary}\r
Content-Disposition: form-data; name="document"; filename="${fileName}"\r
Content-Type: application/octet-stream\r
\r
`
  ));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r
--${boundary}--\r
`));
  const body = Buffer.concat(parts);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${token}/sendDocument`,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (!json.ok) {
            reject(new Error(`Telegram API error: ${json.description}`));
            return;
          }
          const messageId = json.result.message_id;
          const numericId = chatId.replace(/^-100/, "");
          const url = threadId ? `https://t.me/c/${numericId}/${threadId}/${messageId}` : `https://t.me/c/${numericId}/${messageId}`;
          resolve(url);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// src/ClaudeFormatter.ts
var import_child_process = require("child_process");
var FORMAT_PROMPT = `You are formatting a raw voice transcript into a clean Obsidian note.

Rules:
- Fix punctuation, capitalization, and obvious transcription errors
- Split into logical paragraphs
- Add markdown headings (##) only where there is a clear topic shift
- Preserve the original meaning and voice \u2014 do not summarize or add content
- Output only the formatted body text, no preamble, no commentary

Transcript to format:`;
var TITLE_PROMPT = `Given the following text, output a concise 3-5 word title that captures the main topic.

Rules:
- Use plain lowercase words, no punctuation
- No articles (a, an, the) unless essential
- No quotes, colons, slashes, or special characters
- Output only the title, nothing else

Text:`;
var TAGS_PROMPT = `Given the following text, output 3-5 single-word tags that describe the main topics.

Rules:
- Each tag must be exactly one word, lowercase
- No punctuation, numbers, or special characters
- Output only the tags separated by spaces, nothing else

Text:`;
function runClaude(claudePath, prompt) {
  return new Promise((resolve, reject) => {
    const child = (0, import_child_process.spawn)(claudePath, ["--print", prompt], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => stdout += d.toString());
    child.stderr.on("data", (d) => stderr += d.toString());
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0)
        reject(new Error(stderr.trim() || `Claude exited with code ${code}`));
      else
        resolve(stdout.trim());
    });
  });
}
async function generateTitle(claudePath, text, date) {
  const raw = await runClaude(claudePath, TITLE_PROMPT + "\n\n" + text.slice(0, 2e3));
  const sanitized = raw.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return sanitized || date;
}
async function generateTags(claudePath, text) {
  const raw = await runClaude(claudePath, TAGS_PROMPT + "\n\n" + text.slice(0, 2e3));
  const tags = raw.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).filter((t) => t.length > 0).slice(0, 5);
  return ["session", ...tags.filter((t) => t !== "session")];
}
function formatTranscript(claudePath, rawText) {
  return runClaude(claudePath, FORMAT_PROMPT + "\n\n" + rawText);
}

// src/InboxWatcher.ts
var execAsync = (0, import_util.promisify)(import_child_process2.exec);
var AUDIO_EXTENSIONS = /* @__PURE__ */ new Set(["mp3", "m4a", "wav", "ogg", "flac", "webm", "aac", "mp4"]);
function formatSeconds(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds % 3600 / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
async function getMediaDuration(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    const seconds = parseFloat(stdout.trim());
    return isNaN(seconds) ? void 0 : formatSeconds(seconds);
  } catch (e) {
    return void 0;
  }
}
function renderStatsBlock(stats) {
  const lines = [
    "## Transcription Statistics",
    `* File: ${stats.fileName}`,
    `* Size: ${stats.sizeMB}`,
    ...stats.duration ? [`* Media duration: ${stats.duration}`] : [],
    `* Processing time: ${stats.processingTime}`,
    `* Output: ${stats.characters.toLocaleString()} characters, ${stats.words.toLocaleString()} words, ${stats.lines} lines`,
    `* Model: ${stats.model}`,
    `* Language: ${stats.language}`
  ];
  return lines.join("\n");
}
var InboxWatcher = class {
  constructor(plugin) {
    this.queue = [];
    this.processing = false;
    this.plugin = plugin;
  }
  register() {
    this.plugin.registerEvent(
      this.plugin.app.vault.on("create", (file) => {
        if (file instanceof import_obsidian2.TFile) {
          this.enqueue(file);
        }
      })
    );
  }
  enqueue(file) {
    if (!this.isDirectlyInInbox(file))
      return;
    if (!this.isAudioFile(file) && file.extension.toLowerCase() !== "md")
      return;
    this.queue.push(file);
    if (!this.processing)
      this.processNext();
  }
  async processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    this.processing = true;
    const file = this.queue.shift();
    try {
      if (this.isAudioFile(file)) {
        await this.handleAudioFile(file);
      } else {
        await this.handleMdFile(file);
      }
    } catch (err) {
      console.error("[obsidian-ai]", err);
    }
    this.processNext();
  }
  isAudioFile(file) {
    return AUDIO_EXTENSIONS.has(file.extension.toLowerCase());
  }
  isDirectlyInInbox(file) {
    const inbox = this.plugin.settings.inboxFolder.replace(/\/$/, "");
    return path2.dirname(file.path) === inbox;
  }
  getVaultPath() {
    const adapter = this.plugin.app.vault.adapter;
    if (adapter instanceof import_obsidian2.FileSystemAdapter) {
      return adapter.getBasePath();
    }
    throw new Error("FileSystemAdapter not available");
  }
  async handleAudioFile(file) {
    const vaultPath = this.getVaultPath();
    const audioPath = path2.join(vaultPath, file.path);
    const date = new Date().toISOString().slice(0, 10);
    const sessions = this.plugin.settings.sessionsFolder;
    const srcDir = path2.join(vaultPath, sessions, "src");
    await import_fs2.promises.mkdir(srcDir, { recursive: true });
    new import_obsidian2.Notice(`[AI] Transcribing: ${file.name}...`);
    console.log(`[obsidian-ai] Transcribing: ${file.path}`);
    try {
      const { whisperPath, whisperModel } = this.plugin.settings;
      const stat = await import_fs2.promises.stat(audioPath);
      const sizeMB = `${(stat.size / (1024 * 1024)).toFixed(2)} MB`;
      const duration = await getMediaDuration(audioPath);
      const startTime = Date.now();
      const { stderr } = await execAsync(
        `"${whisperPath}" "${audioPath}" --model ${whisperModel} --output_dir "${srcDir}" --output_format txt`
      );
      const processingTime = formatSeconds((Date.now() - startTime) / 1e3);
      const langMatch = stderr.match(/Detected language:\s*(\w+)/i);
      const language = langMatch ? langMatch[1].toLowerCase() : "unknown";
      const whisperOutput = path2.join(srcDir, `${file.basename}.txt`);
      const transcript = (await import_fs2.promises.readFile(whisperOutput, "utf8")).trim();
      await import_fs2.promises.unlink(whisperOutput);
      const stats = {
        fileName: file.name,
        sizeMB,
        duration,
        processingTime,
        characters: transcript.length,
        words: transcript.split(/\s+/).filter(Boolean).length,
        lines: transcript.split("\n").length,
        model: whisperModel,
        language
      };
      const inbox = this.plugin.settings.inboxFolder.replace(/\/$/, "");
      const doneDir = path2.join(vaultPath, inbox, "done");
      await import_fs2.promises.mkdir(doneDir, { recursive: true });
      const doneFileName = `${date}-${file.name}`;
      const donePath = path2.join(doneDir, doneFileName);
      await import_fs2.promises.rename(audioPath, donePath);
      console.log(`[obsidian-ai] Moved to done: ${doneFileName}`);
      let telegramUrl;
      const token = this.plugin.settings.telegramBotToken;
      const tgTarget = parseTelegramThreadUrl(this.plugin.settings.telegramThreadUrl);
      if (token && tgTarget) {
        try {
          telegramUrl = await sendFileToTelegram(token, tgTarget.chatId, tgTarget.threadId, donePath);
          new import_obsidian2.Notice(`[AI] Uploaded to Telegram: ${doneFileName}`);
          console.log(`[obsidian-ai] Telegram message: ${telegramUrl}`);
        } catch (tgErr) {
          const msg = tgErr instanceof Error ? tgErr.message : String(tgErr);
          new import_obsidian2.Notice(`[AI] Telegram upload failed: ${msg}`);
          console.error("[obsidian-ai] Telegram error:", tgErr);
        }
      }
      const audioRef = `${inbox}/done/${doneFileName}`;
      await this.saveSession(transcript, file.basename, date, sessions, vaultPath, { audioRef, telegramUrl, stats });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      new import_obsidian2.Notice(`[AI] Whisper error: ${message}`);
      console.error("[obsidian-ai] Whisper error:", err);
    }
  }
  async handleMdFile(file) {
    const vaultPath = this.getVaultPath();
    const filePath = path2.join(vaultPath, file.path);
    const date = new Date().toISOString().slice(0, 10);
    const sessions = this.plugin.settings.sessionsFolder;
    const srcDir = path2.join(vaultPath, sessions, "src");
    await import_fs2.promises.mkdir(srcDir, { recursive: true });
    new import_obsidian2.Notice(`[AI] Processing: ${file.name}...`);
    console.log(`[obsidian-ai] Processing MD: ${file.path}`);
    try {
      const raw = await import_fs2.promises.readFile(filePath, "utf8");
      const fmMatch = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
      const transcript = (fmMatch ? fmMatch[1] : raw).trim();
      const srcFileName = `${date}-${file.basename}-src.md`;
      const destPath = path2.join(srcDir, srcFileName);
      await import_fs2.promises.rename(filePath, destPath);
      console.log(`[obsidian-ai] Moved to src: ${srcFileName}`);
      await this.saveSession(transcript, file.basename, date, sessions, vaultPath, {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      new import_obsidian2.Notice(`[AI] MD processing error: ${message}`);
      console.error("[obsidian-ai] MD error:", err);
    }
  }
  async saveSession(transcript, basename2, date, sessions, vaultPath, opts) {
    const srcDir = path2.join(vaultPath, sessions, "src");
    const srcFileName = `${date}-${basename2}-src.md`;
    const srcFilePath = `${sessions}/src/${srcFileName}`;
    const srcDest = path2.join(srcDir, srcFileName);
    const srcExists = await import_fs2.promises.access(srcDest).then(() => true).catch(() => false);
    if (!srcExists) {
      const srcFrontmatter = [
        "---",
        `created: ${date}`,
        `type: session-src`,
        ...opts.audioRef ? [`audio: "[[${opts.audioRef}]]"`] : [],
        ...opts.telegramUrl ? [`telegram: "${opts.telegramUrl}"`] : [],
        "---"
      ];
      const statsBlock = opts.stats ? [renderStatsBlock(opts.stats), ""] : [];
      await import_fs2.promises.writeFile(srcDest, [...srcFrontmatter, "", ...statsBlock, transcript, ""].join("\n"), "utf8");
      console.log(`[obsidian-ai] Saved src: ${srcFileName}`);
    } else {
      const srcFrontmatter = [
        "---",
        `created: ${date}`,
        `type: session-src`,
        "---"
      ];
      const existing = await import_fs2.promises.readFile(srcDest, "utf8");
      await import_fs2.promises.writeFile(srcDest, [...srcFrontmatter, "", existing.trim(), ""].join("\n"), "utf8");
    }
    const claudePath = this.plugin.settings.claudePath;
    let body = transcript;
    let title = basename2;
    let tags = ["session"];
    if (claudePath) {
      try {
        new import_obsidian2.Notice(`[AI] Formatting with Claude...`);
        body = await formatTranscript(claudePath, body);
        [title, tags] = await Promise.all([
          generateTitle(claudePath, body, date),
          generateTags(claudePath, body)
        ]);
        console.log(`[obsidian-ai] Title: ${title}, Tags: ${tags.join(", ")}`);
      } catch (fmtErr) {
        const msg = fmtErr instanceof Error ? fmtErr.message : String(fmtErr);
        new import_obsidian2.Notice(`[AI] Claude format failed: ${msg}`);
        console.error("[obsidian-ai] Claude format error:", fmtErr);
      }
    }
    await import_fs2.promises.mkdir(path2.join(vaultPath, sessions), { recursive: true });
    const finalOutput = path2.join(vaultPath, sessions, `${date} ${title}.md`);
    const frontmatter = [
      "---",
      `created: ${date}`,
      `type: session`,
      `tags: [${tags.join(", ")}]`,
      ...opts.audioRef ? [`audio: "[[${opts.audioRef}]]"`] : [],
      `transcript: "[[${srcFilePath}]]"`,
      ...opts.telegramUrl ? [`telegram: "${opts.telegramUrl}"`] : [],
      "---"
    ];
    await import_fs2.promises.writeFile(finalOutput, [...frontmatter, "", body, ""].join("\n"), "utf8");
    console.log(`[obsidian-ai] Saved: ${date} ${title}.md`);
    new import_obsidian2.Notice(`[AI] Done: ${date}-${title}.md`);
  }
};

// src/ClaudeLauncher.ts
var import_obsidian3 = require("obsidian");
var TERMINALS = [
  { bin: "xfce4-terminal", args: (cmd, cwd) => ["--default-working-directory", cwd, "-e", cmd] },
  { bin: "gnome-terminal", args: (cmd, cwd) => ["--working-directory", cwd, "--", "bash", "-c", cmd] },
  { bin: "konsole", args: (cmd, cwd) => ["--workdir", cwd, "-e", "bash", "-c", cmd] },
  { bin: "alacritty", args: (cmd, cwd) => ["--working-directory", cwd, "-e", "bash", "-c", cmd] },
  { bin: "kitty", args: (cmd, cwd) => ["--directory", cwd, "bash", "-c", cmd] },
  { bin: "xterm", args: (cmd, cwd) => ["-e", `cd ${cwd} && ${cmd}`] }
];
var ClaudeLauncher = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  register() {
    this.plugin.addRibbonIcon("terminal", "Launch Claude", () => {
      this.launch();
    });
  }
  launch() {
    const { spawn: spawn2, execSync } = require("child_process");
    const fs3 = require("fs");
    const path3 = require("path");
    const vaultPath = this.plugin.app.vault.adapter.basePath;
    const claudeMdPath = path3.join(vaultPath, "CLAUDE.md");
    const hasClaudeMd = fs3.existsSync(claudeMdPath);
    const claudeCmd = hasClaudeMd ? "claude" : "claude /init";
    const terminal = TERMINALS.find((t) => {
      try {
        execSync(`which ${t.bin}`, { stdio: "ignore" });
        return true;
      } catch (e) {
        return false;
      }
    });
    if (!terminal) {
      new import_obsidian3.Notice("No supported terminal emulator found");
      return;
    }
    const proc = spawn2(terminal.bin, terminal.args(claudeCmd, vaultPath), {
      detached: true,
      stdio: "ignore"
    });
    proc.unref();
    new import_obsidian3.Notice(hasClaudeMd ? "Claude launched" : "Claude launched with /init");
  }
};

// src/HealthCheck.ts
var import_obsidian4 = require("obsidian");
var import_child_process3 = require("child_process");
var import_util2 = require("util");
var execAsync2 = (0, import_util2.promisify)(import_child_process3.exec);
async function checkExecutable(bin) {
  var _a, _b;
  try {
    const { stdout } = await execAsync2(`"${bin}" --version`);
    return stdout.trim().split("\n")[0] || bin;
  } catch (err) {
    if ((err == null ? void 0 : err.code) === "ENOENT" || ((_a = err == null ? void 0 : err.message) == null ? void 0 : _a.includes("not found")) || ((_b = err == null ? void 0 : err.message) == null ? void 0 : _b.includes("No such file"))) {
      return null;
    }
    const out = ((err == null ? void 0 : err.stdout) || (err == null ? void 0 : err.stderr) || "").trim().split("\n")[0];
    return out || bin;
  }
}
async function runHealthCheck(plugin) {
  const failures = [];
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
  const ffprobeVersion = await checkExecutable("ffprobe");
  if (ffprobeVersion) {
    console.log(`[obsidian-ai] ffprobe ok: ${ffprobeVersion}`);
  } else {
    console.warn("[obsidian-ai] ffprobe not found \u2014 media duration will be skipped in stats");
    new import_obsidian4.Notice("[AI] ffprobe not found \u2014 audio duration stats will be unavailable", 6e3);
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
    const msg = "[AI] Health check failed:\n" + failures.map((f) => `\u2022 ${f}`).join("\n");
    new import_obsidian4.Notice(msg, 1e4);
    console.warn("[obsidian-ai]", msg);
  } else {
    new import_obsidian4.Notice("[AI] All tools available", 4e3);
  }
}

// src/main.ts
var ObsidianAIPlugin = class extends import_obsidian5.Plugin {
  async onload() {
    try {
      await this.loadSettings();
      this.addSettingTab(new ObsidianAISettingTab(this.app, this));
      new InboxWatcher(this).register();
      new ClaudeLauncher(this).register();
      runHealthCheck(this).catch((err) => console.error("[obsidian-ai] healthcheck error:", err));
    } catch (err) {
      console.error("[obsidian-ai] onload error:", err);
      new import_obsidian5.Notice(`[obsidian-ai] Failed to load: ${err}`);
      return;
    }
    this.addCommand({
      id: "test-plugin",
      name: "Test: show plugin status",
      callback: () => {
        new import_obsidian5.Notice(
          `Obsidian AI active
Inbox: ${this.settings.inboxFolder}
Sessions: ${this.settings.sessionsFolder}`
        );
      }
    });
    this.addCommand({
      id: "debug-env",
      name: "Debug: show environment",
      callback: async () => {
        const { exec: exec3 } = require("child_process");
        const { promisify: promisify3 } = require("util");
        const execAsync3 = promisify3(exec3);
        try {
          const { stdout } = await execAsync3('python3 --version && which python3 && python3 -c "import sys; print(sys.path)"');
          console.log("[obsidian-ai] env:", stdout);
          new import_obsidian5.Notice(stdout, 1e4);
        } catch (err) {
          console.log("[obsidian-ai] env error:", err.message);
          new import_obsidian5.Notice(err.message, 1e4);
        }
      }
    });
    console.log("Obsidian AI plugin loaded");
  }
  onunload() {
    console.log("Obsidian AI plugin unloaded");
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
