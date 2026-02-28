import { Notice, Plugin } from 'obsidian';
import { ObsidianAISettings, DEFAULT_SETTINGS } from './settings';
import { ObsidianAISettingTab } from './SettingsTab';

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
