export interface Config {
  version: string;
  [key: string]: any;
}

export type ConfigScope = 'local' | 'global' | 'all';

export interface ConfigListResult {
  global: Config;
  local: Config;
  merged: Config;
}
