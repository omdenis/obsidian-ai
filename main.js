"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ObsidianAIPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  inboxFolder: "inbox",
  sessionsFolder: "sessions"
};
var ObsidianAIPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ObsidianAISettingTab(this.app, this));
    this.addCommand({
      id: "test-plugin",
      name: "Test: show plugin status",
      callback: () => {
        new import_obsidian.Notice(
          `Obsidian AI active
Inbox: ${this.settings.inboxFolder}
Sessions: ${this.settings.sessionsFolder}`
        );
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
  }
};
