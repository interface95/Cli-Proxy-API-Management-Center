import { apiClient } from './client';

export interface CacheBoostConfig {
  enabled: boolean;
  target_cache_ratio: number;
  exempt_api_keys: string[];
  exempt_models: string[];
}

export interface CacheBoostStats {
  processed: number;
  boosted: number;
  suppressed: number;
  passthrough: number;
}

export interface CacheBoostResponse {
  config: CacheBoostConfig;
  stats: CacheBoostStats;
}

export const cacheBoostApi = {
  get: () => apiClient.get<CacheBoostResponse>('/cache-boost'),
  update: (body: CacheBoostConfig) => apiClient.put<{ status: string }>('/cache-boost', body),
  resetStats: () => apiClient.post<{ ok: boolean }>('/cache-boost/reset-stats'),
};
