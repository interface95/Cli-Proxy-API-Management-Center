import type { AuthFileItem } from '@/types';
import { authFilesApi } from '@/services/api';
import { apiClient } from '@/services/api/client';
import { normalizeAuthIndex } from '@/utils/usage';

const DEFAULT_TIMEOUT_MS = 45_000;

export type AntigravityMessageTestStatus = 'success' | 'error';

export type AntigravityMessageTestResult = {
  fileName: string;
  authIndex: string | null;
  model: string;
  status: AntigravityMessageTestStatus;
  statusCode?: number;
  durationMs: number;
  summary: string;
  bodyText: string;
  requestUrl?: string;
  validationUrl?: string;
};

export type AntigravityMessageTestConfig = {
  model: string;
  timeoutMs?: number;
};

export const isAntigravityAuthFile = (file: AuthFileItem): boolean => {
  const rawType = typeof file.type === 'string' ? file.type : typeof file.provider === 'string' ? file.provider : '';
  return rawType.trim().toLowerCase() === 'antigravity';
};

const buildErrorResult = (
  file: AuthFileItem,
  authIndex: string | null,
  model: string,
  durationMs: number,
  summary: string,
  bodyText = '',
  statusCode?: number,
  requestUrl?: string,
  validationUrl?: string
): AntigravityMessageTestResult => ({
  fileName: file.name,
  authIndex,
  model,
  status: 'error',
  statusCode,
  durationMs,
  validationUrl,
  summary,
  bodyText,
  requestUrl,
});

export const loadAntigravityModels = async (files: AuthFileItem[]): Promise<string[]> => {
  const targetFiles = files.filter(isAntigravityAuthFile);
  const modelsByFile = await Promise.all(
    targetFiles.map(async (file) => {
      try {
        const models = await authFilesApi.getModelsForAuthFile(file.name);
        return models.map((model) => model.id).filter(Boolean);
      } catch {
        return [] as string[];
      }
    })
  );

  const seen = new Set<string>();
  const merged: string[] = [];
  modelsByFile.flat().forEach((modelId) => {
    const trimmed = modelId.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    merged.push(trimmed);
  });

  return merged;
};

interface TestCredentialResponse {
  success: boolean;
  model?: string;
  text?: string;
  latency_ms?: number;
  error?: string;
  validation_url?: string;
}

export const runAntigravityMessageTest = async (
  file: AuthFileItem,
  config: AntigravityMessageTestConfig
): Promise<AntigravityMessageTestResult> => {
  const authIndex = normalizeAuthIndex(file['auth_index'] ?? file.authIndex);
  const model = config.model.trim();
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();

  if (!authIndex) {
    return buildErrorResult(file, null, model, Date.now() - startedAt, 'Missing auth_index');
  }

  if (!model) {
    return buildErrorResult(file, authIndex, '', Date.now() - startedAt, 'Missing model');
  }

  try {
    const result = await apiClient.post<TestCredentialResponse>(
      '/test-credential',
      { auth_index: authIndex, model },
      { timeout: timeoutMs }
    );

    const durationMs = result.latency_ms ?? (Date.now() - startedAt);

    if (result.success) {
      return {
        fileName: file.name,
        authIndex,
        model: result.model ?? model,
        status: 'success',
        statusCode: 200,
        durationMs,
        summary: result.text?.slice(0, 400) || 'OK',
        bodyText: result.text ?? '',
      };
    }

    return buildErrorResult(
      file, authIndex, model, durationMs,
      result.error ?? 'Test failed',
      '', undefined, undefined,
      result.validation_url,
    );
  } catch (err: unknown) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : 'Request failed';
    return buildErrorResult(file, authIndex, model, durationMs, message);
  }
};
