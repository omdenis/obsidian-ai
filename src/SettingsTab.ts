import { App, PluginSettingTab, Setting } from 'obsidian';
import { WHISPER_MODELS } from './settings';
import type ObsidianAIPlugin from './main';

export class ObsidianAISettingTab extends PluginSettingTab {
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

    new Setting(containerEl)
      .setName('Whisper model')
      .setDesc('Larger models are more accurate but slower')
      .addDropdown(drop => {
        WHISPER_MODELS.forEach(model => drop.addOption(model, model));
        drop
          .setValue(this.plugin.settings.whisperModel)
          .onChange(async value => {
            this.plugin.settings.whisperModel = value as typeof WHISPER_MODELS[number];
            await this.plugin.saveSettings();
          });
      });
  }
}
