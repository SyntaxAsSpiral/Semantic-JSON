import { App, PluginSettingTab, Setting } from 'obsidian';
import SemanticJsonPlugin from './main';

export interface SemanticJsonSettings {
  autoCompile: boolean;
  colorSortNodes: boolean;
  colorSortEdges: boolean;
  flowSortNodes: boolean;
  stripEdgesWhenFlowSorted: boolean;
}

export const DEFAULT_SETTINGS: SemanticJsonSettings = {
  autoCompile: true,
  colorSortNodes: true,
  colorSortEdges: true,
  flowSortNodes: false,
  stripEdgesWhenFlowSorted: true,
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

    new Setting(containerEl)
      .setName('Compilation')
      .setHeading();

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

    new Setting(containerEl)
      .setName('Sorting')
      .setHeading();

    new Setting(containerEl)
      .setName('Color sort nodes')
      .setDesc('Group nodes by color within the same spatial position. Preserves visual taxonomy (e.g., red = urgent, blue = reference).')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.colorSortNodes)
          .onChange(async (value) => {
            this.plugin.settings.colorSortNodes = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Color sort edges')
      .setDesc('Group edges by color within the same topology. Preserves visual flow semantics.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.colorSortEdges)
          .onChange(async (value) => {
            this.plugin.settings.colorSortEdges = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Flow sort nodes')
      .setDesc('Sort nodes by directional flow order. Nodes connected by arrows form conceptual groups that sort by flow topology rather than strict spatial position.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.flowSortNodes)
          .onChange(async (value) => {
            this.plugin.settings.flowSortNodes = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Export')
      .setHeading();

    new Setting(containerEl)
      .setName('Strip edges from pure JSON when flow-sorted')
      .setDesc('Flow topology is compiled into node sequence order. Edges become redundant and can be safely removed from pure JSON exports.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.stripEdgesWhenFlowSorted)
          .onChange(async (value) => {
            this.plugin.settings.stripEdgesWhenFlowSorted = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
