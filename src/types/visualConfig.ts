export type PayloadParamValueType = 'string' | 'number' | 'boolean' | 'json';
export type PayloadParamValidationErrorCode =
  | 'payload_invalid_number'
  | 'payload_invalid_boolean'
  | 'payload_invalid_json';

export type VisualConfigFieldPath =
  | 'port'
  | 'logsMaxTotalSizeMb'
  | 'requestRetry'
  | 'maxRetryInterval'
  | 'streaming.keepaliveSeconds'
  | 'streaming.bootstrapRetries'
  | 'streaming.nonstreamKeepaliveInterval';

export type VisualConfigValidationErrorCode = 'port_range' | 'non_negative_integer';

export type VisualConfigValidationErrors = Partial<
  Record<VisualConfigFieldPath, VisualConfigValidationErrorCode>
>;

export type PayloadParamEntry = {
  id: string;
  path: string;
  valueType: PayloadParamValueType;
  value: string;
};

export type PayloadModelEntry = {
  id: string;
  name: string;
  protocol?: 'openai' | 'openai-response' | 'gemini' | 'claude' | 'antigravity';
};

export type PayloadRule = {
  id: string;
  models: PayloadModelEntry[];
  params: PayloadParamEntry[];
};

export type PayloadFilterRule = {
  id: string;
  models: PayloadModelEntry[];
  params: string[];
};

export interface StreamingConfig {
  keepaliveSeconds: string;
  bootstrapRetries: string;
  nonstreamKeepaliveInterval: string;
}

export type AntigravityCreditsMode = 'off' | 'fallback' | 'always';
export type AntigravityBaseURLMode =
  | 'auto'
  | 'prod-only'
  | 'daily-only'
  | 'sandbox-only'
  | 'custom';

export type VisualConfigValues = {
  host: string;
  port: string;
  tlsEnable: boolean;
  tlsCert: string;
  tlsKey: string;
  rmAllowRemote: boolean;
  rmSecretKey: string;
  rmDisableControlPanel: boolean;
  rmPanelRepo: string;
  authDir: string;
  apiKeysText: string;
  debug: boolean;
  commercialMode: boolean;
  loggingToFile: boolean;
  logsMaxTotalSizeMb: string;
  usageStatisticsEnabled: boolean;
  proxyUrl: string;
  forceModelPrefix: boolean;
  requestRetry: string;
  maxRetryInterval: string;
  quotaSwitchProject: boolean;
  quotaSwitchPreviewModel: boolean;
  routingStrategy: 'round-robin' | 'fill-first';
  stickySessionId: boolean;
  stickyTtlSeconds: string;
  antigravityCreditsMode: AntigravityCreditsMode;
  antigravityBaseURLMode: AntigravityBaseURLMode;
  antigravityCustomBaseURLs: string[];
  cacheBoostEnabled: boolean;
  cacheBoostTargetRatio: number;
  cacheBoostCreationRatio: number;
  cacheBoostJitterRead: number;
  cacheBoostJitterCreation: number;
  cacheBoostExemptAPIKeys: string;
  cacheBoostExemptModels: string;
  wsAuth: boolean;
  payloadDefaultRules: PayloadRule[];
  payloadOverrideRules: PayloadRule[];
  payloadFilterRules: PayloadFilterRule[];
  streaming: StreamingConfig;
};

export const makeClientId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const DEFAULT_VISUAL_VALUES: VisualConfigValues = {
  host: '',
  port: '',
  tlsEnable: false,
  tlsCert: '',
  tlsKey: '',
  rmAllowRemote: false,
  rmSecretKey: '',
  rmDisableControlPanel: false,
  rmPanelRepo: '',
  authDir: '',
  apiKeysText: '',
  debug: false,
  commercialMode: false,
  loggingToFile: false,
  logsMaxTotalSizeMb: '',
  usageStatisticsEnabled: false,
  proxyUrl: '',
  forceModelPrefix: false,
  requestRetry: '',
  maxRetryInterval: '',
  quotaSwitchProject: true,
  quotaSwitchPreviewModel: true,
  routingStrategy: 'round-robin',
  stickySessionId: true,
  stickyTtlSeconds: '',
  antigravityCreditsMode: 'off',
  antigravityBaseURLMode: 'auto',
  antigravityCustomBaseURLs: [],
  cacheBoostEnabled: false,
  cacheBoostTargetRatio: 0.8,
  cacheBoostCreationRatio: 0,
  cacheBoostJitterRead: 0.15,
  cacheBoostJitterCreation: 0.35,
  cacheBoostExemptAPIKeys: '',
  cacheBoostExemptModels: '',
  wsAuth: false,
  payloadDefaultRules: [],
  payloadOverrideRules: [],
  payloadFilterRules: [],
  streaming: {
    keepaliveSeconds: '',
    bootstrapRetries: '',
    nonstreamKeepaliveInterval: '',
  },
};
