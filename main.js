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
  whisperPath: "/home/denis/.local/bin/whisper"
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
  }
};

// src/InboxWatcher.ts
var import_obsidian2 = require("obsidian");
var import_child_process = require("child_process");
var import_fs = require("fs");
var path = __toESM(require("path"));
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process.exec);
var AUDIO_EXTENSIONS = /* @__PURE__ */ new Set(["mp3", "m4a", "wav", "ogg", "flac", "webm", "aac"]);
var InboxWatcher = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  register() {
    this.plugin.registerEvent(
      this.plugin.app.vault.on("create", (file) => {
        if (file instanceof import_obsidian2.TFile) {
          this.handleNewFile(file).catch(
            (err) => console.error("[obsidian-ai]", err)
          );
        }
      })
    );
  }
  isAudioFile(file) {
    return AUDIO_EXTENSIONS.has(file.extension.toLowerCase());
  }
  isInInbox(file) {
    const inbox = this.plugin.settings.inboxFolder.replace(/\/$/, "");
    return file.path.startsWith(inbox + "/");
  }
  getVaultPath() {
    const adapter = this.plugin.app.vault.adapter;
    if (adapter instanceof import_obsidian2.FileSystemAdapter) {
      return adapter.getBasePath();
    }
    throw new Error("FileSystemAdapter not available");
  }
  async handleNewFile(file) {
    if (!this.isAudioFile(file) || !this.isInInbox(file))
      return;
    const vaultPath = this.getVaultPath();
    const audioPath = path.join(vaultPath, file.path);
    const date = new Date().toISOString().slice(0, 10);
    const outputDir = path.join(vaultPath, this.plugin.settings.sessionsFolder, "src");
    await import_fs.promises.mkdir(outputDir, { recursive: true });
    new import_obsidian2.Notice(`[AI] Transcribing: ${file.name}...`);
    console.log(`[obsidian-ai] Transcribing: ${file.path}`);
    try {
      const model = this.plugin.settings.whisperModel;
      const whisper = this.plugin.settings.whisperPath;
      await execAsync(
        `"${whisper}" "${audioPath}" --model ${model} --output_dir "${outputDir}" --output_format txt`
      );
      const whisperOutput = path.join(outputDir, `${file.basename}.txt`);
      const finalOutput = path.join(outputDir, `${date}-${file.basename}.md`);
      const transcript = await import_fs.promises.readFile(whisperOutput, "utf8");
      const content = [
        "---",
        `created: ${date}`,
        `source: "[[${file.path}]]"`,
        "---",
        "",
        transcript.trim(),
        ""
      ].join("\n");
      await import_fs.promises.writeFile(finalOutput, content, "utf8");
      await import_fs.promises.unlink(whisperOutput);
      new import_obsidian2.Notice(`[AI] Done: ${date}-${file.basename}.md`);
      console.log(`[obsidian-ai] Saved: ${finalOutput}`);
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
    const { spawn, execSync } = require("child_process");
    const fs2 = require("fs");
    const path2 = require("path");
    const vaultPath = this.plugin.app.vault.adapter.basePath;
    const claudeMdPath = path2.join(vaultPath, "CLAUDE.md");
    const hasClaudeMd = fs2.existsSync(claudeMdPath);
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
    const proc = spawn(terminal.bin, terminal.args(claudeCmd, vaultPath), {
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
    await this.loadSettings();
    this.addSettingTab(new ObsidianAISettingTab(this.app, this));
    new InboxWatcher(this).register();
    new ClaudeLauncher(this).register();
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
