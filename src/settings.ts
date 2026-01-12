import { App, PluginSettingTab, Setting } from 'obsidian';
import SemanticJsonModernPlugin from './main';

export interface LLMSettings {
  provider: 'lmstudio' | 'ollama' | 'openrouter' | 'openai' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface SemanticJsonModernSettings {
  autoCompile: boolean;
  colorSortNodes: boolean;
  colorSortEdges: boolean;
  flowSortNodes: boolean;
  semanticSortOrphans: boolean;
  stripEdgesWhenFlowSorted: boolean;
  llm: LLMSettings;
}

const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: 'lmstudio',
  baseUrl: 'http://localhost:1234',
  apiKey: '',
  model: 'microsoft/Phi-3.5-mini-instruct',
  enabled: false,
};

export const DEFAULT_SETTINGS: SemanticJsonModernSettings = {
  autoCompile: true,
  colorSortNodes: true,
  colorSortEdges: true,
  flowSortNodes: false,
  semanticSortOrphans: false,
  stripEdgesWhenFlowSorted: true,
  llm: { ...DEFAULT_LLM_SETTINGS },
};

export class SemanticJsonModernSettingTab extends PluginSettingTab {
  plugin: SemanticJsonModernPlugin;

  constructor(app: App, plugin: SemanticJsonModernPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private getProviderDefaults(provider: string): { baseUrl: string; model: string } {
    switch (provider) {
      case 'lmstudio':
        return {
          baseUrl: 'http://localhost:1234',
          model: 'microsoft/Phi-3.5-mini-instruct'
        };
      case 'ollama':
        return {
          baseUrl: 'http://localhost:11434',
          model: 'llama3.3'
        };
      case 'openrouter':
        return {
          baseUrl: 'https://openrouter.ai/api/v1',
          model: 'meta-llama/llama-3.3-70b-instruct'
        };
      case 'openai':
        return {
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o'
        };
      case 'anthropic':
        return {
          baseUrl: 'https://api.anthropic.com',
          model: 'claude-3-5-sonnet-20241022'
        };
      default:
        return {
          baseUrl: 'http://localhost:1234',
          model: 'microsoft/Phi-3.5-mini-instruct'
        };
    }
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
      .setDesc('Group nodes by directional flow order. Nodes connected by arrows form conceptual groups that sort by flow topology rather than strict spatial position.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.flowSortNodes)
          .onChange(async (value) => {
            this.plugin.settings.flowSortNodes = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Group orphan nodes')
      .setDesc('Group orphan nodes first before sorting spatially. Orphan nodes are nodes that are not connected to any other nodes by groups or edges, and will be sorted to the top as a single group.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.semanticSortOrphans)
          .onChange(async (value) => {
            this.plugin.settings.semanticSortOrphans = value;
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

    new Setting(containerEl)
      .setName('LLM Integration')
      .setHeading();

    new Setting(containerEl)
      .setName('Enable LLM features')
      .setDesc('Enable LLM-based semantic ID assignment and content analysis.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.llm.enabled)
          .onChange(async (value) => {
            this.plugin.settings.llm.enabled = value;
            await this.plugin.saveSettings();
            this.display(); // Refresh to show/hide LLM settings
          })
      );

    if (this.plugin.settings.llm.enabled) {
      new Setting(containerEl)
        .setName('LLM Provider')
        .setDesc('Choose your LLM provider. Local providers (LMStudio, Ollama) don\'t require API keys.')
        .addDropdown((dropdown) =>
          dropdown
            .addOption('lmstudio', 'LMStudio (Local)')
            .addOption('ollama', 'Ollama (Local)')
            .addOption('openrouter', 'OpenRouter (Cloud)')
            .addOption('openai', 'OpenAI (Cloud)')
            .addOption('anthropic', 'Anthropic (Cloud)')
            .setValue(this.plugin.settings.llm.provider)
            .onChange(async (value) => {
              const provider = value as 'lmstudio' | 'ollama' | 'openrouter' | 'openai' | 'anthropic';
              this.plugin.settings.llm.provider = provider;
              
              // Set provider-specific defaults
              const providerDefaults = this.getProviderDefaults(provider);
              this.plugin.settings.llm.baseUrl = providerDefaults.baseUrl;
              this.plugin.settings.llm.model = providerDefaults.model;
              
              await this.plugin.saveSettings();
              this.display(); // Refresh to update other fields
            })
        );

      new Setting(containerEl)
        .setName('Base URL')
        .setDesc('API endpoint URL for your LLM provider.')
        .addText((text) =>
          text
            .setPlaceholder('http://localhost:1234')
            .setValue(this.plugin.settings.llm.baseUrl)
            .onChange(async (value) => {
              this.plugin.settings.llm.baseUrl = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName('Model')
        .setDesc('Specific model name to use for analysis.')
        .addText((text) =>
          text
            .setPlaceholder('microsoft/Phi-3.5-mini-instruct')
            .setValue(this.plugin.settings.llm.model)
            .onChange(async (value) => {
              this.plugin.settings.llm.model = value;
              await this.plugin.saveSettings();
            })
        );

      const needsApiKey = ['openrouter', 'openai', 'anthropic'].includes(this.plugin.settings.llm.provider);
      if (needsApiKey) {
        new Setting(containerEl)
          .setName('API Key')
          .setDesc('API key for cloud provider authentication.')
          .addText((text) => {
            text
              .setPlaceholder('Enter your API key...')
              .setValue(this.plugin.settings.llm.apiKey)
              .onChange(async (value) => {
                this.plugin.settings.llm.apiKey = value;
                await this.plugin.saveSettings();
              });
            text.inputEl.type = 'password';
            return text;
          });
      }
    }
  }
}
