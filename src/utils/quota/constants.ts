/**
 * Quota constants for API URLs, headers, and theme colors.
 */

import type {
  AntigravityQuotaGroupDefinition,
  GeminiCliQuotaGroupDefinition,
  TypeColorSet,
} from '@/types';

// Theme colors for type badges
export const TYPE_COLORS: Record<string, TypeColorSet> = {
  gemini: {
    light: { bg: '#e3f2fd', text: '#1565c0' },
    dark: { bg: '#0d47a1', text: '#64b5f6' },
  },
  'gemini-cli': {
    light: { bg: '#e7efff', text: '#1e4fa3' },
    dark: { bg: '#1c3f73', text: '#a8c7ff' },
  },
  aistudio: {
    light: { bg: '#f0f2f5', text: '#2f343c' },
    dark: { bg: '#373c42', text: '#cfd3db' },
  },
  antigravity: {
    light: { bg: '#e0f7fa', text: '#006064' },
    dark: { bg: '#004d40', text: '#80deea' },
  },
  empty: {
    light: { bg: '#f5f5f5', text: '#616161' },
    dark: { bg: '#424242', text: '#bdbdbd' },
  },
  unknown: {
    light: { bg: '#f0f0f0', text: '#666666', border: '1px dashed #999999' },
    dark: { bg: '#3a3a3a', text: '#aaaaaa', border: '1px dashed #666666' },
  },
};

// Antigravity API configuration
export const ANTIGRAVITY_QUOTA_URLS = [
  'https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels',
  'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels',
  'https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels',
];

export const ANTIGRAVITY_REQUEST_HEADERS = {
  Authorization: 'Bearer $TOKEN$',
  'Content-Type': 'application/json',
  'User-Agent': 'antigravity/1.20.5 windows/amd64',
};

export const ANTIGRAVITY_QUOTA_GROUPS: AntigravityQuotaGroupDefinition[] = [
  {
    // Claude + GPT share a billing bucket upstream.
    id: 'claude',
    label: 'Claude',
    identifiers: [
      'claude-sonnet-4-6',
      'claude-opus-4-6-thinking',
      'claude-opus-4-7-thinking',
      'gpt-oss-120b-medium',
    ],
  },
  {
    // All Pro variants (3-pro + 3.1-pro, high/low) share one pool.
    id: 'gemini-pro',
    label: 'Gemini Pro',
    identifiers: [
      'gemini-3-pro-high',
      'gemini-3-pro-low',
      'gemini-3.1-pro-high',
      'gemini-3.1-pro-low',
    ],
  },
  {
    // All non-image Flash variants share one pool (2.5 flash family + 3-flash).
    id: 'gemini-flash',
    label: 'Gemini Flash',
    identifiers: [
      'gemini-2.5-flash',
      'gemini-2.5-flash-thinking',
      'gemini-2.5-flash-lite',
      'gemini-3-flash',
    ],
  },
  {
    // Image generation is a separate quota and bills differently.
    id: 'gemini-3-1-flash-image',
    label: 'gemini-3.1-flash-image',
    identifiers: ['gemini-3.1-flash-image'],
    labelFromModel: true,
  },
];

// Gemini CLI API configuration
export const GEMINI_CLI_QUOTA_URL =
  'https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota';

export const GEMINI_CLI_CODE_ASSIST_URL =
  'https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist';

export const GEMINI_CLI_REQUEST_HEADERS = {
  Authorization: 'Bearer $TOKEN$',
  'Content-Type': 'application/json',
};

export const GEMINI_CLI_QUOTA_GROUPS: GeminiCliQuotaGroupDefinition[] = [
  {
    id: 'gemini-flash-lite-series',
    label: 'Gemini Flash Lite Series',
    preferredModelId: 'gemini-2.5-flash-lite',
    modelIds: ['gemini-2.5-flash-lite'],
  },
  {
    id: 'gemini-flash-series',
    label: 'Gemini Flash Series',
    preferredModelId: 'gemini-3-flash-preview',
    modelIds: ['gemini-3-flash-preview', 'gemini-2.5-flash'],
  },
  {
    id: 'gemini-pro-series',
    label: 'Gemini Pro Series',
    preferredModelId: 'gemini-3.1-pro-preview',
    modelIds: ['gemini-3.1-pro-preview', 'gemini-3-pro-preview', 'gemini-2.5-pro'],
  },
];

export const GEMINI_CLI_GROUP_ORDER = new Map(
  GEMINI_CLI_QUOTA_GROUPS.map((group, index) => [group.id, index] as const)
);

export const GEMINI_CLI_GROUP_LOOKUP = new Map(
  GEMINI_CLI_QUOTA_GROUPS.flatMap((group) =>
    group.modelIds.map((modelId) => [modelId, group] as const)
  )
);

export const GEMINI_CLI_IGNORED_MODEL_PREFIXES = ['gemini-2.0-flash'];
