import { Notice, Plugin, TFile } from 'obsidian';
import { compileCanvasAll, stripCanvasMetadata, importJsonToCanvas } from './compile';
import {
  DEFAULT_SETTINGS,
  SemanticJsonModernSettingTab,
  SemanticJsonModernSettings,
} from './settings';

export default class SemanticJsonModernPlugin extends Plugin {
  settings: SemanticJsonModernSettings = { ...DEFAULT_SETTINGS };
  private isCompiling = false;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SemanticJsonModernSettingTab(this.app, this));

    this.addCommand({
      id: 'compile-active-canvas',
      name: 'Compile active canvas',
      callback: () => void this.compileActive(),
    });

    this.addCommand({
      id: 'export-as-pure-json',
      name: 'Export as pure JSON',
      callback: () => void this.exportAsPureJson(),
    });

    this.addCommand({
      id: 'import-json-to-canvas',
      name: 'Import JSON to canvas',
      callback: () => void this.importJsonToCanvas(),
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

  async exportAsPureJson() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'canvas') {
      new Notice('No active canvas file');
      return;
    }

    try {
      const raw = await this.app.vault.read(file);
      const parsed = JSON.parse(raw);

      // Compile first to get semantic ordering
      const compiled = compileCanvasAll({
        input: parsed,
        settings: {
          colorSortNodes: this.settings.colorSortNodes,
          colorSortEdges: this.settings.colorSortEdges,
          flowSortNodes: this.settings.flowSortNodes,
          semanticSortOrphans: this.settings.semanticSortOrphans,
        },
      });

      // Strip Canvas metadata
      const stripped = stripCanvasMetadata(compiled, {
        flowSortNodes: this.settings.flowSortNodes,
        stripEdgesWhenFlowSorted: this.settings.stripEdgesWhenFlowSorted,
      });
      const serialized = JSON.stringify(stripped, null, 2) + '\n';

      // Create .pure.json filename
      const jsonPath = file.path.replace(/\.canvas$/, '.pure.json');

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

  async importJsonToCanvas() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'json') {
      new Notice('No active JSON file');
      return;
    }

    try {
      const raw = await this.app.vault.read(file);
      const parsed = JSON.parse(raw);

      // Import JSON to Canvas structure
      const canvas = importJsonToCanvas(parsed);
      const serialized = JSON.stringify(canvas, null, 2) + '\n';

      // Create .canvas filename
      const canvasPath = file.path.replace(/\.json$/, '.canvas');

      // Check if file exists
      const existingFile = this.app.vault.getAbstractFileByPath(canvasPath);
      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, serialized);
      } else {
        await this.app.vault.create(canvasPath, serialized);
      }

      new Notice(`Imported to ${canvasPath}`);
    } catch (error) {
      console.error(error);
      new Notice(
        `Import failed${error instanceof Error ? `: ${error.message}` : ''}`
      );
    }
  }

  private async compileFile(file: TFile, showNotice: boolean) {
    if (this.isCompiling) return;
    this.isCompiling = true;

    try {
      const raw = await this.app.vault.read(file);
      const parsed = JSON.parse(raw);
      const output = compileCanvasAll({
        input: parsed,
        settings: {
          colorSortNodes: this.settings.colorSortNodes,
          colorSortEdges: this.settings.colorSortEdges,
          flowSortNodes: this.settings.flowSortNodes,
          semanticSortOrphans: this.settings.semanticSortOrphans,
        },
      });
      const serialized = JSON.stringify(output, null, 2) + '\n';

      if (serialized === raw) {
        if (showNotice) {
          new Notice('Canvas already compiled');
        }
        return;
      }

      await this.app.vault.modify(file, serialized);

      if (showNotice) {
        new Notice('Canvas compiled');
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
