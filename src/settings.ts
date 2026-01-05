import { App, PluginSettingTab, Setting } from 'obsidian';
import SemanticJsonPlugin from './main';

export interface SemanticJsonSettings {
  autoCompile: boolean;
}

export const DEFAULT_SETTINGS: SemanticJsonSettings = {
  autoCompile: true,
};

export class SemanticJsonSettingTab extends PluginSettingTab {
  plugin: SemanticJsonPlugin;

  constructor(app: App, plugin: SemanticJsonPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Semantic JSON Settings' });

    new Setting(containerEl)
      .setName('Auto-compile on save')
      .setDesc('Automatically compile canvas to semantic JSON when saving .canvas files.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoCompile)
          .onChange(async (value) => {
            this.plugin.settings.autoCompile = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
