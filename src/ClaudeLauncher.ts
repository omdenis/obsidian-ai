import { Notice } from 'obsidian';
import type ObsidianAIPlugin from './main';

const TERMINALS = [
  { bin: 'xfce4-terminal', args: (cmd: string, cwd: string) => ['--default-working-directory', cwd, '-e', cmd] },
  { bin: 'gnome-terminal', args: (cmd: string, cwd: string) => ['--working-directory', cwd, '--', 'bash', '-c', cmd] },
  { bin: 'konsole',        args: (cmd: string, cwd: string) => ['--workdir', cwd, '-e', 'bash', '-c', cmd] },
  { bin: 'alacritty',      args: (cmd: string, cwd: string) => ['--working-directory', cwd, '-e', 'bash', '-c', cmd] },
  { bin: 'kitty',          args: (cmd: string, cwd: string) => ['--directory', cwd, 'bash', '-c', cmd] },
  { bin: 'xterm',          args: (cmd: string, cwd: string) => ['-e', `cd ${cwd} && ${cmd}`] },
];

export class ClaudeLauncher {
  private plugin: ObsidianAIPlugin;

  constructor(plugin: ObsidianAIPlugin) {
    this.plugin = plugin;
  }

  register() {
    this.plugin.addRibbonIcon('terminal', 'Launch Claude', () => {
      this.launch();
    });
  }

  private launch() {
    const { spawn, execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');

    const vaultPath = (this.plugin.app.vault.adapter as any).basePath as string;
    const claudeMdPath = path.join(vaultPath, 'CLAUDE.md');

    const hasClaudeMd = fs.existsSync(claudeMdPath);
    const claudeCmd = hasClaudeMd ? 'claude' : 'claude /init';

    const terminal = TERMINALS.find(t => {
      try {
        execSync(`which ${t.bin}`, { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    });

    if (!terminal) {
      new Notice('No supported terminal emulator found');
      return;
    }

    const proc = spawn(terminal.bin, terminal.args(claudeCmd, vaultPath), {
      detached: true,
      stdio: 'ignore',
    });

    proc.unref();
    new Notice(hasClaudeMd ? 'Claude launched' : 'Claude launched with /init');
  }
}
