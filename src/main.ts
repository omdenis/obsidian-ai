import { Notice, Plugin } from 'obsidian';
import { ObsidianAISettings, DEFAULT_SETTINGS } from './settings';
import { ObsidianAISettingTab } from './SettingsTab';
import { InboxWatcher } from './InboxWatcher';
import { ClaudeLauncher } from './ClaudeLauncher';

export default class ObsidianAIPlugin extends Plugin {
  settings!: ObsidianAISettings;

  async onload() {
    try {
      await this.loadSettings();
      this.addSettingTab(new ObsidianAISettingTab(this.app, this));
      new InboxWatcher(this).register();
      new ClaudeLauncher(this).register();
    } catch (err) {
      console.error('[obsidian-ai] onload error:', err);
      new Notice(`[obsidian-ai] Failed to load: ${err}`);
      return;
    }

    this.addCommand({
      id: 'test-plugin',
      name: 'Test: show plugin status',
      callback: () => {
        new Notice(
          `Obsidian AI active\nInbox: ${this.settings.inboxFolder}\nSessions: ${this.settings.sessionsFolder}`
        );
      },
    });

    this.addCommand({
      id: 'debug-env',
      name: 'Debug: show environment',
      callback: async () => {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        try {
          const { stdout } = await execAsync('python3 --version && which python3 && python3 -c "import sys; print(sys.path)"');
          console.log('[obsidian-ai] env:', stdout);
          new Notice(stdout, 10000);
        } catch (err: any) {
          console.log('[obsidian-ai] env error:', err.message);
          new Notice(err.message, 10000);
        }
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
