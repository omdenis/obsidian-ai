import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface ObsidianAISettings {
  inboxFolder: string;
  sessionsFolder: string;
}

const DEFAULT_SETTINGS: ObsidianAISettings = {
  inboxFolder: 'inbox',
  sessionsFolder: 'sessions',
};

export default class ObsidianAIPlugin extends Plugin {
  settings: ObsidianAISettings;

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new ObsidianAISettingTab(this.app, this));

    this.addCommand({
      id: 'test-plugin',
      name: 'Test: show plugin status',
      callback: () => {
        new Notice(
          `Obsidian AI active\nInbox: ${this.settings.inboxFolder}\nSessions: ${this.settings.sessionsFolder}`
        );
      },
    });

    console.log('Obsidian AI plugin loaded');
  }

  onunload() {
    console.log('Obsidian AI plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ObsidianAISettingTab extends PluginSettingTab {
  plugin: ObsidianAIPlugin;

  constructor(app: App, plugin: ObsidianAIPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Inbox folder')
      .setDesc('Folder to watch for new audio files')
      .addText(text =>
        text
          .setPlaceholder('inbox')
          .setValue(this.plugin.settings.inboxFolder)
          .onChange(async value => {
            this.plugin.settings.inboxFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Sessions folder')
      .setDesc('Folder where transcripts will be saved')
      .addText(text =>
        text
          .setPlaceholder('sessions')
          .setValue(this.plugin.settings.sessionsFolder)
          .onChange(async value => {
            this.plugin.settings.sessionsFolder = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
