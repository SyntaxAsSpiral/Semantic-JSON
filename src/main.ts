import { Notice, Plugin, TFile } from 'obsidian';
import { compileCanvasAll } from './compile';
import {
  DEFAULT_SETTINGS,
  SemanticJsonSettingTab,
  SemanticJsonSettings,
} from './settings';

export default class SemanticJsonPlugin extends Plugin {
  settings: SemanticJsonSettings = { ...DEFAULT_SETTINGS };
  private isCompiling = false;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SemanticJsonSettingTab(this.app, this));

    this.addCommand({
      id: 'compile-active-canvas',
      name: 'Compile active canvas',
      callback: () => void this.compileActive(),
    });

    this.addCommand({
      id: 'export-canvas-to-json',
      name: 'Export canvas to .json',
      callback: () => void this.exportToJson(),
    });

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (!this.settings.autoCompile) return;
        if (!(file instanceof TFile) || file.extension !== 'canvas') return;
        void this.compileFile(file, false);
      })
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async compileActive() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'canvas') {
      new Notice('No active canvas file');
      return;
    }
    await this.compileFile(file, true);
  }

  async exportToJson() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'canvas') {
      new Notice('No active canvas file');
      return;
    }

    try {
      const raw = await this.app.vault.read(file);
      const parsed = JSON.parse(raw);
      const output = compileCanvasAll({ input: parsed });
      const serialized = JSON.stringify(output, null, 2) + '\n';

      // Create .json filename (replace .canvas with .json)
      const jsonPath = file.path.replace(/\.canvas$/, '.json');

      // Check if file exists
      const existingFile = this.app.vault.getAbstractFileByPath(jsonPath);
      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, serialized);
      } else {
        await this.app.vault.create(jsonPath, serialized);
      }

      new Notice(`Exported to ${jsonPath}`);
    } catch (error) {
      console.error(error);
      new Notice(
        `Export failed${error instanceof Error ? `: ${error.message}` : ''}`
      );
    }
  }

  private async compileFile(file: TFile, showNotice: boolean) {
    if (this.isCompiling) return;
    this.isCompiling = true;

    try {
      const raw = await this.app.vault.read(file);
      const parsed = JSON.parse(raw);
      const output = compileCanvasAll({ input: parsed });
      const serialized = JSON.stringify(output, null, 2) + '\n';

      if (serialized === raw) {
        if (showNotice) {
          new Notice('Canvas already compiled.');
        }
        return;
      }

      await this.app.vault.modify(file, serialized);

      if (showNotice) {
        new Notice('Canvas compiled.');
      }
    } catch (error) {
      console.error(error);
      if (showNotice) {
        new Notice(
          `Canvas compilation failed${error instanceof Error ? `: ${error.message}` : ''}`
        );
      }
    } finally {
      this.isCompiling = false;
    }
  }
}
