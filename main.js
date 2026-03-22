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
var import_obsidian4 = require("obsidian");

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
var import_fs3 = require("fs");
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
var import_fs2 = require("fs");
var import_child_process = require("child_process");
var FORMAT_PROMPT = `You are formatting a raw voice transcript into a clean Obsidian note.

Rules:
- Fix punctuation, capitalization, and obvious transcription errors
- Split into logical paragraphs
- Add markdown headings (##) only where there is a clear topic shift
- Preserve the original meaning and voice \u2014 do not summarize or add content
- Output only the formatted body text, no preamble, no commentary

Transcript to format:`;
function runClaude(claudePath, input) {
  return new Promise((resolve, reject) => {
    const child = (0, import_child_process.spawn)(claudePath, ["--print", FORMAT_PROMPT + "\n\n" + input], {
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
async function formatTranscriptFile(claudePath, mdFilePath) {
  const original = await import_fs2.promises.readFile(mdFilePath, "utf8");
  const match = original.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  if (!match)
    return;
  const [, frontmatter, body] = match;
  const formatted = await runClaude(claudePath, body.trim());
  await import_fs2.promises.writeFile(mdFilePath, `${frontmatter}
${formatted}
`, "utf8");
}

// src/InboxWatcher.ts
var execAsync = (0, import_util.promisify)(import_child_process2.exec);
var AUDIO_EXTENSIONS = /* @__PURE__ */ new Set(["mp3", "m4a", "wav", "ogg", "flac", "webm", "aac", "mp4"]);
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
    if (!this.isAudioFile(file) || !this.isDirectlyInInbox(file))
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
      await this.handleNewFile(file);
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
  async handleNewFile(file) {
    const vaultPath = this.getVaultPath();
    const audioPath = path2.join(vaultPath, file.path);
    const date = new Date().toISOString().slice(0, 10);
    const outputDir = path2.join(vaultPath, this.plugin.settings.sessionsFolder, "src");
    await import_fs3.promises.mkdir(outputDir, { recursive: true });
    new import_obsidian2.Notice(`[AI] Transcribing: ${file.name}...`);
    console.log(`[obsidian-ai] Transcribing: ${file.path}`);
    try {
      const model = this.plugin.settings.whisperModel;
      const whisper = this.plugin.settings.whisperPath;
      await execAsync(
        `nice -n 10 "${whisper}" "${audioPath}" --model ${model} --output_dir "${outputDir}" --output_format txt`
      );
      const whisperOutput = path2.join(outputDir, `${file.basename}.txt`);
      const finalOutput = path2.join(outputDir, `${date}-${file.basename}.md`);
      const transcript = await import_fs3.promises.readFile(whisperOutput, "utf8");
      await import_fs3.promises.unlink(whisperOutput);
      const inbox = this.plugin.settings.inboxFolder.replace(/\/$/, "");
      const doneDir = path2.join(vaultPath, inbox, "done");
      await import_fs3.promises.mkdir(doneDir, { recursive: true });
      const doneFileName = `${date}-${file.name}`;
      const donePath = path2.join(doneDir, doneFileName);
      await import_fs3.promises.rename(audioPath, donePath);
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
      const doneFilePath = `${inbox}/done/${doneFileName}`;
      const frontmatter = [
        "---",
        `created: ${date}`,
        `source: "[[${doneFilePath}]]"`,
        ...telegramUrl ? [`telegram: "${telegramUrl}"`] : [],
        "---"
      ];
      const content = [...frontmatter, "", transcript.trim(), ""].join("\n");
      await import_fs3.promises.writeFile(finalOutput, content, "utf8");
      console.log(`[obsidian-ai] Saved: ${finalOutput}`);
      const claudePath = this.plugin.settings.claudePath;
      if (claudePath) {
        try {
          new import_obsidian2.Notice(`[AI] Formatting with Claude...`);
          await formatTranscriptFile(claudePath, finalOutput);
          console.log(`[obsidian-ai] Formatted: ${finalOutput}`);
        } catch (fmtErr) {
          const msg = fmtErr instanceof Error ? fmtErr.message : String(fmtErr);
          new import_obsidian2.Notice(`[AI] Claude format failed: ${msg}`);
          console.error("[obsidian-ai] Claude format error:", fmtErr);
        }
      }
      new import_obsidian2.Notice(`[AI] Done: ${date}-${file.basename}.md`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      new import_obsidian2.Notice(`[AI] Whisper error: ${message}`);
      console.error("[obsidian-ai] Whisper error:", err);
    }
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
    const fs4 = require("fs");
    const path3 = require("path");
    const vaultPath = this.plugin.app.vault.adapter.basePath;
    const claudeMdPath = path3.join(vaultPath, "CLAUDE.md");
    const hasClaudeMd = fs4.existsSync(claudeMdPath);
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

// src/main.ts
var ObsidianAIPlugin = class extends import_obsidian4.Plugin {
  async onload() {
    try {
      await this.loadSettings();
      this.addSettingTab(new ObsidianAISettingTab(this.app, this));
      new InboxWatcher(this).register();
      new ClaudeLauncher(this).register();
    } catch (err) {
      console.error("[obsidian-ai] onload error:", err);
      new import_obsidian4.Notice(`[obsidian-ai] Failed to load: ${err}`);
      return;
    }
    this.addCommand({
      id: "test-plugin",
      name: "Test: show plugin status",
      callback: () => {
        new import_obsidian4.Notice(
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
        const { exec: exec2 } = require("child_process");
        const { promisify: promisify2 } = require("util");
        const execAsync2 = promisify2(exec2);
        try {
          const { stdout } = await execAsync2('python3 --version && which python3 && python3 -c "import sys; print(sys.path)"');
          console.log("[obsidian-ai] env:", stdout);
          new import_obsidian4.Notice(stdout, 1e4);
        } catch (err) {
          console.log("[obsidian-ai] env error:", err.message);
          new import_obsidian4.Notice(err.message, 1e4);
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
