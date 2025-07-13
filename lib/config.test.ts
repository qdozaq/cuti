import { test, expect, beforeEach } from 'bun:test';
import { ConfigManager } from './config';
import { rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const testGlobalDir = join(homedir(), '.cuti-test');
const testLocalDir = join(process.cwd(), '.cuti-test');

beforeEach(() => {
  try {
    rmSync(testGlobalDir, { recursive: true, force: true });
    rmSync(testLocalDir, { recursive: true, force: true });
  } catch {}
});

test('ConfigManager should create instance', () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  expect(config).toBeDefined();
});

test('should get default values', () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  expect(config.get<string>('version')).toBe('1.0.0');
});

test('should set and get local config values', async () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  await config.set('editor', 'vscode');
  expect(config.get<string>('editor')).toBe('vscode');
});

test('should set and get global config values', async () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  await config.set('theme', 'dark', true);
  expect(config.get<string>('theme')).toBe('dark');
});

test('local config should override global config', async () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  await config.set('editor', 'vim', true); // global
  await config.set('editor', 'vscode'); // local
  expect(config.get<string>('editor')).toBe('vscode');
});

test('should handle nested keys', async () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  await config.set('theme.colors.primary', '#000000');
  expect(config.get<string>('theme.colors.primary')).toBe('#000000');
});

test('should list configs correctly', async () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  await config.set('globalItem', 'value1', true);
  await config.set('localItem', 'value2');

  const allConfigs = config.listConfigs();
  expect(allConfigs.global).toHaveProperty('globalItem', 'value1');
  expect(allConfigs.local).toHaveProperty('localItem', 'value2');
});

test('should reset configs', async () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  await config.set('testKey', 'testValue');
  await config.reset('local');
  expect(config.get<string>('testKey')).toBeUndefined();
});

test('should initialize local config', async () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  const result = await config.initLocalConfig();
  expect(result).toBe(true);
  expect(config.localConfigExists()).toBe(true);
});

test('should delete config keys', async () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  await config.set('temp', 'value');
  expect(config.get<string>('temp')).toBe('value');
  await config.delete('temp');
  expect(config.get<string>('temp')).toBeUndefined();
});

test('should reload configs from disk', async () => {
  const config = new ConfigManager(testGlobalDir, testLocalDir);
  await config.set('editor', 'vim');

  // Simulate external change
  const newConfig = new ConfigManager(testGlobalDir, testLocalDir);
  await newConfig.set('editor', 'emacs');

  config.reloadConfigs();
  expect(config.get<string>('editor')).toBe('emacs');
});
