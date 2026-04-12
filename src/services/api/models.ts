/**
 * 可用模型获取
 */

import axios from 'axios';
import { normalizeModelList } from '@/utils/models';
import { normalizeApiBase } from '@/utils/connection';
import { apiCallApi, getApiCallErrorMessage } from './apiCall';

const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
const GEMINI_MODELS_IN_FLIGHT = new Map<string, Promise<ReturnType<typeof normalizeModelList>>>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const buildRequestSignature = (url: string, headers: Record<string, string>) => {
  const headerSignature = Object.entries(headers)
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  return `${url}||${headerSignature}`;
};

const buildModelsEndpoint = (baseUrl: string): string => {
  const normalized = normalizeApiBase(baseUrl);
  if (!normalized) return '';
  const trimmed = normalized.replace(/\/+$/g, '');
  if (/\/models$/i.test(trimmed)) return trimmed;
  return `${trimmed}/models`;
};

const buildV1ModelsEndpoint = (baseUrl: string): string => {
  const normalized = normalizeApiBase(baseUrl);
  if (!normalized) return '';
  const trimmed = normalized.replace(/\/+$/g, '');
  if (/\/v1\/models$/i.test(trimmed)) return trimmed;
  if (/\/v1$/i.test(trimmed)) return `${trimmed}/models`;
  return `${trimmed}/v1/models`;
};

const buildGeminiModelsEndpoint = (baseUrl: string): string => {
  const normalized = normalizeApiBase(baseUrl);
  const fallback = normalized || DEFAULT_GEMINI_BASE_URL;
  let trimmed = fallback.replace(/\/+$/g, '');
  trimmed = trimmed.replace(/\/v1beta\/models$/i, '');
  trimmed = trimmed.replace(/\/v1beta(?:\/.*)?$/i, '');
  return `${trimmed}/v1beta/models`;
};

const stripGeminiModelResourceName = (value: string): string => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/^\/?models\//i, '');
};

const hasHeader = (headers: Record<string, string>, name: string) => {
  const target = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
};

export const modelsApi = {
  /**
   * Fetch available models from /v1/models endpoint (for system info page)
   */
  async fetchModels(baseUrl: string, apiKey?: string, headers: Record<string, string> = {}) {
    const endpoint = buildV1ModelsEndpoint(baseUrl);
    if (!endpoint) {
      throw new Error('Invalid base url');
    }

    const resolvedHeaders = { ...headers };
    if (apiKey) {
      resolvedHeaders.Authorization = `Bearer ${apiKey}`;
    }

    const response = await axios.get(endpoint, {
      headers: Object.keys(resolvedHeaders).length ? resolvedHeaders : undefined
    });
    const payload = response.data?.data ?? response.data?.models ?? response.data;
    return normalizeModelList(payload, { dedupe: true });
  },

  /**
   * Fetch models from /v1/models endpoint via api-call.
   * Useful when the configured baseUrl is the upstream host root (e.g. https://api.example.com).
   */
  async fetchV1ModelsViaApiCall(
    baseUrl: string,
    apiKey?: string,
    headers: Record<string, string> = {}
  ) {
    const endpoint = buildV1ModelsEndpoint(baseUrl);
    if (!endpoint) {
      throw new Error('Invalid base url');
    }

    const resolvedHeaders = { ...headers };
    const hasAuthHeader = Boolean(resolvedHeaders.Authorization || resolvedHeaders.authorization);
    if (apiKey && !hasAuthHeader) {
      resolvedHeaders.Authorization = `Bearer ${apiKey}`;
    }

    const result = await apiCallApi.request({
      method: 'GET',
      url: endpoint,
      header: Object.keys(resolvedHeaders).length ? resolvedHeaders : undefined
    });

    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(getApiCallErrorMessage(result));
    }

    const payload = result.body ?? result.bodyText;
    return normalizeModelList(payload, { dedupe: true });
  },

  /**
   * Fetch models from /models endpoint via api-call (for OpenAI provider discovery)
   */
  async fetchModelsViaApiCall(
    baseUrl: string,
    apiKey?: string,
    headers: Record<string, string> = {}
  ) {
    const endpoint = buildModelsEndpoint(baseUrl);
    if (!endpoint) {
      throw new Error('Invalid base url');
    }

    const resolvedHeaders = { ...headers };
    const hasAuthHeader = Boolean(resolvedHeaders.Authorization || resolvedHeaders.authorization);
    if (apiKey && !hasAuthHeader) {
      resolvedHeaders.Authorization = `Bearer ${apiKey}`;
    }

    const result = await apiCallApi.request({
      method: 'GET',
      url: endpoint,
      header: Object.keys(resolvedHeaders).length ? resolvedHeaders : undefined
    });

    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(getApiCallErrorMessage(result));
    }

    const payload = result.body ?? result.bodyText;
    return normalizeModelList(payload, { dedupe: true });
  },

  buildV1ModelsEndpoint(baseUrl: string) {
    return buildV1ModelsEndpoint(baseUrl);
  },

  buildGeminiModelsEndpoint(baseUrl: string) {
    return buildGeminiModelsEndpoint(baseUrl);
  },

  /**
   * Fetch Gemini models from /v1beta/models via api-call.
   * Gemini API accepts API key via query param or `x-goog-api-key` header.
   */
  async fetchGeminiModelsViaApiCall(
    baseUrl: string,
    apiKey?: string,
    headers: Record<string, string> = {}
  ) {
    const endpoint = buildGeminiModelsEndpoint(baseUrl);
    if (!endpoint) {
      throw new Error('Invalid base url');
    }

    const resolvedHeaders = { ...headers };
    const resolvedApiKey = String(apiKey ?? '').trim();
    if (resolvedApiKey && !hasHeader(resolvedHeaders, 'x-goog-api-key')) {
      resolvedHeaders['x-goog-api-key'] = resolvedApiKey;
    }

    const signature = buildRequestSignature(endpoint, resolvedHeaders);
    const existing = GEMINI_MODELS_IN_FLIGHT.get(signature);
    if (existing) return existing;

    const request = (async () => {
      const seen = new Set<string>();
      const collected: ReturnType<typeof normalizeModelList> = [];
      let pageToken = '';

      for (let page = 0; page < 20; page += 1) {
        const url = new URL(endpoint);
        if (pageToken) {
          url.searchParams.set('pageToken', pageToken);
        }

        const result = await apiCallApi.request({
          method: 'GET',
          url: url.toString(),
          header: Object.keys(resolvedHeaders).length ? resolvedHeaders : undefined
        });

        if (result.statusCode < 200 || result.statusCode >= 300) {
          throw new Error(getApiCallErrorMessage(result));
        }

        const payload = result.body ?? result.bodyText;
        const normalized = normalizeModelList(payload, { dedupe: false });
        normalized.forEach((model) => {
          const name = stripGeminiModelResourceName(model.name);
          const key = (name || '').toLowerCase();
          if (!key || seen.has(key)) return;
          seen.add(key);
          const resolved = { ...model, name };
          if (resolved.alias && resolved.alias.trim() === name) {
            resolved.alias = undefined;
          }
          collected.push(resolved);
        });

        const nextToken =
          isRecord(payload) && typeof payload.nextPageToken === 'string' ? payload.nextPageToken : '';
        if (!nextToken) {
          break;
        }
        pageToken = nextToken;
      }

      return collected;
    })();

    GEMINI_MODELS_IN_FLIGHT.set(signature, request);
    try {
      return await request;
    } finally {
      GEMINI_MODELS_IN_FLIGHT.delete(signature);
    }
  },
};
