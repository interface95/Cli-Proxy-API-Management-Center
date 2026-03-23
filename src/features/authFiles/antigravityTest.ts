import type { AuthFileItem } from '@/types';
import { apiCallApi, authFilesApi, getApiCallErrorMessage } from '@/services/api';
import { ANTIGRAVITY_REQUEST_HEADERS } from '@/utils/quota';
import { normalizeAuthIndex } from '@/utils/usage';

const DEFAULT_ANTIGRAVITY_PROJECT_ID = 'bamboo-precept-lgxtn';
const DEFAULT_TEST_PROMPT = 'Please reply with OK only.';
const DEFAULT_TIMEOUT_MS = 45_000;

export const ANTIGRAVITY_MESSAGE_TEST_URLS = [
  'https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent',
  'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:generateContent',
  'https://cloudcode-pa.googleapis.com/v1internal:generateContent',
];

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
};

export type AntigravityMessageTestConfig = {
  model: string;
  prompt?: string;
  timeoutMs?: number;
};

export const isAntigravityAuthFile = (file: AuthFileItem): boolean => {
  const rawType = typeof file.type === 'string' ? file.type : typeof file.provider === 'string' ? file.provider : '';
  return rawType.trim().toLowerCase() === 'antigravity';
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const resolveAntigravityProjectId = async (file: AuthFileItem): Promise<string> => {
  try {
    const text = await authFilesApi.downloadText(file.name);
    const trimmed = text.trim();
    if (!trimmed) return DEFAULT_ANTIGRAVITY_PROJECT_ID;

    const parsed = JSON.parse(trimmed) as unknown;
    const topLevel = toRecord(parsed);
    const topLevelProjectId = normalizeString(topLevel?.project_id ?? topLevel?.projectId);
    if (topLevelProjectId) return topLevelProjectId;

    const installed = toRecord(topLevel?.installed);
    const installedProjectId = normalizeString(installed?.project_id ?? installed?.projectId);
    if (installedProjectId) return installedProjectId;

    const web = toRecord(topLevel?.web);
    const webProjectId = normalizeString(web?.project_id ?? web?.projectId);
    if (webProjectId) return webProjectId;
  } catch {
    return DEFAULT_ANTIGRAVITY_PROJECT_ID;
  }

  return DEFAULT_ANTIGRAVITY_PROJECT_ID;
};

const buildRequestBody = (projectId: string, model: string, prompt: string) =>
  JSON.stringify({
    project: projectId,
    model,
    request: {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 64,
      },
    },
  });

const extractTextParts = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = toRecord(item);
      return normalizeString(record?.text) ?? '';
    })
    .filter(Boolean);
};

const summarizeResponse = (body: unknown, bodyText: string): string => {
  const bodyRecord = toRecord(body);
  const response = toRecord(bodyRecord?.response ?? bodyRecord);
  const firstCandidate = Array.isArray(response?.candidates)
    ? toRecord(response?.candidates[0])
    : null;
  const content = toRecord(firstCandidate?.content);
  const textParts = extractTextParts(content?.parts);

  if (textParts.length > 0) {
    return textParts.join('\n').trim().slice(0, 400);
  }

  const errorRecord = toRecord(bodyRecord?.error);
  const errorMessage = normalizeString(errorRecord?.message) ?? normalizeString(bodyRecord?.message);
  if (errorMessage) {
    return errorMessage.slice(0, 400);
  }

  const trimmed = bodyText.trim();
  return trimmed ? trimmed.slice(0, 400) : 'No response body';
};

const buildErrorResult = (
  file: AuthFileItem,
  authIndex: string | null,
  model: string,
  durationMs: number,
  summary: string,
  bodyText = '',
  statusCode?: number,
  requestUrl?: string
): AntigravityMessageTestResult => ({
  fileName: file.name,
  authIndex,
  model,
  status: 'error',
  statusCode,
  durationMs,
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

export const runAntigravityMessageTest = async (
  file: AuthFileItem,
  config: AntigravityMessageTestConfig
): Promise<AntigravityMessageTestResult> => {
  const authIndex = normalizeAuthIndex(file['auth_index'] ?? file.authIndex);
  const model = config.model.trim();
  const prompt = config.prompt?.trim() || DEFAULT_TEST_PROMPT;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();

  if (!authIndex) {
    return buildErrorResult(file, null, model, Date.now() - startedAt, 'Missing auth_index');
  }

  if (!model) {
    return buildErrorResult(file, authIndex, '', Date.now() - startedAt, 'Missing model');
  }

  const projectId = await resolveAntigravityProjectId(file);
  const requestBody = buildRequestBody(projectId, model, prompt);

  let lastError = 'Request failed';
  let lastStatusCode: number | undefined;
  let lastBodyText = '';
  let lastUrl = '';

  for (const url of ANTIGRAVITY_MESSAGE_TEST_URLS) {
    lastUrl = url;
    try {
      const result = await apiCallApi.request(
        {
          authIndex,
          method: 'POST',
          url,
          header: { ...ANTIGRAVITY_REQUEST_HEADERS },
          data: requestBody,
        },
        { timeout: timeoutMs }
      );

      const durationMs = Date.now() - startedAt;

      if (result.statusCode >= 200 && result.statusCode < 300) {
        return {
          fileName: file.name,
          authIndex,
          model,
          status: 'success',
          statusCode: result.statusCode,
          durationMs,
          summary: summarizeResponse(result.body, result.bodyText),
          bodyText: result.bodyText,
          requestUrl: url,
        };
      }

      lastStatusCode = result.statusCode;
      lastBodyText = result.bodyText;
      lastError = getApiCallErrorMessage(result);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Request failed';
    }
  }

  return buildErrorResult(
    file,
    authIndex,
    model,
    Date.now() - startedAt,
    lastError,
    lastBodyText,
    lastStatusCode,
    lastUrl
  );
};
