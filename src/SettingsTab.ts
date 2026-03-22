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
      .setName('Whisper path')
      .setDesc('Full path to the whisper executable (run "which whisper" in terminal to find it)')
      .addText(text =>
        text
          .setPlaceholder('/home/user/.local/bin/whisper')
          .setValue(this.plugin.settings.whisperPath)
          .onChange(async value => {
            this.plugin.settings.whisperPath = value;
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

    new Setting(containerEl)
      .setName('Telegram bot token')
      .setDesc('Bot API token from @BotFather')
      .addText(text =>
        text
          .setPlaceholder('123456:ABC-DEF...')
          .setValue(this.plugin.settings.telegramBotToken)
          .onChange(async value => {
            this.plugin.settings.telegramBotToken = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Telegram thread URL')
      .setDesc('Paste any message link from the target thread (e.g. https://t.me/c/1449070803/3816/3817). Bot token is read from TELEGRAM_BOT_TOKEN env var.')
      .addText(text =>
        text
          .setPlaceholder('https://t.me/c/1449070803/3816/3817')
          .setValue(this.plugin.settings.telegramThreadUrl)
          .onChange(async value => {
            this.plugin.settings.telegramThreadUrl = value.trim();
            await this.plugin.saveSettings();
          })
      );
  }
}
