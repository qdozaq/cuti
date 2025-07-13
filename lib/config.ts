import { join } from 'path';
import { homedir } from 'os';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import type { JiraConfig } from './jira-config';

export interface Config {
  version: string;
  branchPrefix?: string;
  jira?: JiraConfig;
  [key: string]: any;
}

export class ConfigManager {
  private static readonly DEFAULT_CONFIG: Config = {
    version: '1.0.0',
  };

  private readonly globalConfigDir: string;
  private readonly globalConfigPath: string;
  private readonly localConfigDir: string;
  private readonly localConfigPath: string;

  private globalConfig: Config = { ...ConfigManager.DEFAULT_CONFIG };
  private localConfig: Partial<Config> = {};
  private mergedConfig: Config = { ...ConfigManager.DEFAULT_CONFIG };

  constructor(globalDir?: string, localDir?: string) {
    // Allow custom directories for testing
    this.globalConfigDir = globalDir || join(homedir(), '.cuti');
    this.globalConfigPath = join(this.globalConfigDir, 'config.json');
    this.localConfigDir = localDir || join(process.cwd(), '.cuti');
    this.localConfigPath = join(this.localConfigDir, 'config.json');

    // Load configs synchronously in constructor
    this.loadConfigsSync();
  }

  /**
   * Load both global and local configs and merge them synchronously
   */
  private loadConfigsSync(): void {
    this.globalConfig = this.loadGlobalConfigSync();
    this.localConfig = this.loadLocalConfigSync();
    this.mergedConfig = this.mergeConfigs();
  }

  /**
   * Load global config from ~/.cuti/config.json synchronously
   */
  private loadGlobalConfigSync(): Config {
    try {
      if (!existsSync(this.globalConfigPath)) {
        return { ...ConfigManager.DEFAULT_CONFIG };
      }
      const content = readFileSync(this.globalConfigPath, 'utf8');
      if (!content || content.trim() === '') {
        return { ...ConfigManager.DEFAULT_CONFIG };
      }
      return { ...ConfigManager.DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch (error) {
      // File doesn't exist or is invalid, return default config
      return { ...ConfigManager.DEFAULT_CONFIG };
    }
  }

  /**
   * Load local config from .cuti/config.json synchronously
   */
  private loadLocalConfigSync(): Partial<Config> {
    try {
      if (!existsSync(this.localConfigPath)) {
        return {};
      }
      const content = readFileSync(this.localConfigPath, 'utf8');
      if (!content || content.trim() === '') {
        return {};
      }
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, return empty config
      return {};
    }
  }

  /**
   * Reload configs synchronously
   */
  public reloadConfigs(): void {
    this.loadConfigsSync();
  }

  /**
   * Load global config from ~/.cuti/config.json asynchronously
   */
  private async loadGlobalConfig(): Promise<Config> {
    try {
      const file = Bun.file(this.globalConfigPath);
      if (file.size === 0) {
        return { ...ConfigManager.DEFAULT_CONFIG };
      }
      const content = await file.text();
      return { ...ConfigManager.DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch (error) {
      // File doesn't exist or is invalid, return default config
      return { ...ConfigManager.DEFAULT_CONFIG };
    }
  }

  /**
   * Load local config from .cuti/config.json asynchronously
   */
  private async loadLocalConfig(): Promise<Partial<Config>> {
    try {
      const file = Bun.file(this.localConfigPath);
      if (file.size === 0) {
        return {};
      }
      const content = await file.text();
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, return empty config
      return {};
    }
  }

  /**
   * Merge global and local configs with local taking precedence
   */
  private mergeConfigs(): Config {
    return { ...this.globalConfig, ...this.localConfig };
  }

  /**
   * Get the merged configuration
   */
  public getConfig(): Config {
    return { ...this.mergedConfig };
  }

  /**
   * Get a specific config value (supports nested keys with dot notation)
   */
  public get<T = any>(key: string): T | undefined {
    const keys = key.split('.');
    let value: any = this.mergedConfig;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value as T;
  }

  /**
   * Set a config value (saves to local by default, supports nested keys with dot notation)
   */
  public async set(
    key: string,
    value: any,
    global: boolean = false
  ): Promise<void> {
    const keys = key.split('.');
    const targetConfig = global ? this.globalConfig : this.localConfig;

    // Handle nested keys
    let current: any = targetConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]!;
      if (
        !(k in current) ||
        typeof current[k] !== 'object' ||
        current[k] === null
      ) {
        current[k] = {};
      }
      current = current[k];
    }

    // Set the final value
    const lastKey = keys[keys.length - 1]!;
    current[lastKey] = value;

    // Save the config
    if (global) {
      await this.saveGlobalConfig();
    } else {
      await this.saveLocalConfig();
    }
    this.mergedConfig = this.mergeConfigs();
  }

  /**
   * Save multiple config values at once
   */
  public async setMultiple(
    values: Partial<Config>,
    global: boolean = false
  ): Promise<void> {
    if (global) {
      this.globalConfig = { ...this.globalConfig, ...values };
      await this.saveGlobalConfig();
    } else {
      this.localConfig = { ...this.localConfig, ...values };
      await this.saveLocalConfig();
    }
    this.mergedConfig = this.mergeConfigs();
  }

  /**
   * Save global config to ~/.cuti/config.json
   */
  private async saveGlobalConfig(): Promise<void> {
    try {
      // Ensure directory exists
      await this.ensureDirectory(this.globalConfigDir);

      // Write config file
      await Bun.write(
        this.globalConfigPath,
        JSON.stringify(this.globalConfig, null, 2)
      );
    } catch (error) {
      throw new Error(
        `Failed to save global config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Save local config to .cuti/config.json
   */
  private async saveLocalConfig(): Promise<void> {
    try {
      // Ensure directory exists
      await this.ensureDirectory(this.localConfigDir);

      // Write config file
      await Bun.write(
        this.localConfigPath,
        JSON.stringify(this.localConfig, null, 2)
      );
    } catch (error) {
      throw new Error(
        `Failed to save local config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ensure a directory exists, create it if it doesn't
   */
  private async ensureDirectory(dir: string): Promise<void> {
    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      // If mkdirSync fails, try with Bun's shell
      await Bun.$`mkdir -p ${dir}`.quiet();
    }
  }

  /**
   * Delete a config key (supports nested keys with dot notation)
   */
  public async delete(key: string, global: boolean = false): Promise<void> {
    const keys = key.split('.');
    const targetConfig = global ? this.globalConfig : this.localConfig;

    if (keys.length === 1) {
      // Simple key deletion
      delete targetConfig[key];
    } else {
      // Nested key deletion
      let current: any = targetConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]!;
        if (!current[k] || typeof current[k] !== 'object') {
          return; // Nothing to delete
        }
        current = current[k];
      }
      const lastKey = keys[keys.length - 1]!;
      delete current[lastKey];
    }

    if (global) {
      await this.saveGlobalConfig();
    } else {
      await this.saveLocalConfig();
    }
    this.mergedConfig = this.mergeConfigs();
  }

  /**
   * Clear all local config
   */
  public async clearLocal(): Promise<void> {
    this.localConfig = {};
    await this.saveLocalConfig();
    this.mergedConfig = this.mergeConfigs();
  }

  /**
   * Clear all global config (except version)
   */
  public async clearGlobal(): Promise<void> {
    this.globalConfig = { ...ConfigManager.DEFAULT_CONFIG };
    await this.saveGlobalConfig();
    this.mergedConfig = this.mergeConfigs();
  }

  /**
   * Get the path to the global config file
   */
  public getGlobalConfigPath(): string {
    return this.globalConfigPath;
  }

  /**
   * Get the path to the local config file
   */
  public getLocalConfigPath(): string {
    return this.localConfigPath;
  }

  /**
   * Check if a local config exists
   */
  public hasLocalConfig(): boolean {
    return Object.keys(this.localConfig).length > 0;
  }

  /**
   * Check if a global config exists
   */
  public hasGlobalConfig(): boolean {
    return (
      Object.keys(this.globalConfig).length >
      Object.keys(ConfigManager.DEFAULT_CONFIG).length
    );
  }

  /**
   * Check if a local config file exists on disk
   */
  public localConfigExists(): boolean {
    return existsSync(this.localConfigPath);
  }

  /**
   * Check if a global config file exists on disk
   */
  public globalConfigExists(): boolean {
    return existsSync(this.globalConfigPath);
  }

  /**
   * List configurations (global, local, or merged)
   */
  public listConfigs(scope?: 'global' | 'local'): {
    global?: Config;
    local?: Partial<Config>;
    merged?: Config;
  } {
    const result: {
      global?: Config;
      local?: Partial<Config>;
      merged?: Config;
    } = {};

    if (!scope || scope === 'global') {
      result.global = { ...this.globalConfig };
    }

    if (!scope || scope === 'local') {
      result.local =
        Object.keys(this.localConfig).length > 0
          ? { ...this.localConfig }
          : undefined;
    }

    if (!scope) {
      result.merged = { ...this.mergedConfig };
    }

    return result;
  }

  /**
   * Reset configuration to defaults
   */
  public async reset(scope: 'global' | 'local' | 'all' = 'all'): Promise<void> {
    if (scope === 'global' || scope === 'all') {
      this.globalConfig = { ...ConfigManager.DEFAULT_CONFIG };
      await this.saveGlobalConfig();
    }
    if (scope === 'local' || scope === 'all') {
      this.localConfig = {};
      await this.saveLocalConfig();
    }
    this.mergedConfig = this.mergeConfigs();
  }

  /**
   * Initialize local config file
   */
  public async initLocalConfig(): Promise<boolean> {
    try {
      if (existsSync(this.localConfigPath)) {
        return false; // Already exists
      }

      // Create an empty local config with just the version
      this.localConfig = { version: ConfigManager.DEFAULT_CONFIG.version };
      await this.saveLocalConfig();
      this.mergedConfig = this.mergeConfigs();
      return true;
    } catch (error) {
      throw new Error(
        `Failed to initialize local config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export a singleton instance
export const configManager = new ConfigManager();
