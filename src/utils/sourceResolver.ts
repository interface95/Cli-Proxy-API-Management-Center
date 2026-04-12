import type { GeminiKeyConfig, ProviderKeyConfig } from '@/types';
import type { CredentialInfo, SourceInfo } from '@/types/sourceInfo';
import { buildCandidateUsageSourceIds, normalizeAuthIndex } from '@/utils/usage';

export interface SourceInfoMapInput {
  geminiApiKeys?: GeminiKeyConfig[];
  vertexApiKeys?: ProviderKeyConfig[];
}

export function buildSourceInfoMap(input: SourceInfoMapInput): Map<string, SourceInfo> {
  const map = new Map<string, SourceInfo>();

  const registerSource = (sourceId: string, displayName: string, type: string) => {
    if (!sourceId || !displayName || map.has(sourceId)) return;
    map.set(sourceId, { displayName, type });
  };

  const registerCandidates = (displayName: string, type: string, candidates: string[]) => {
    candidates.forEach((sourceId) => registerSource(sourceId, displayName, type));
  };

  const providers: Array<{
    items: Array<{ apiKey?: string; prefix?: string }>;
    type: string;
    label: string;
  }> = [
    { items: input.geminiApiKeys || [], type: 'gemini', label: 'Gemini' },
    { items: input.vertexApiKeys || [], type: 'vertex', label: 'Vertex' },
  ];

  providers.forEach(({ items, type, label }) => {
    items.forEach((item, index) => {
      const displayName = item.prefix?.trim() || `${label} #${index + 1}`;
      registerCandidates(
        displayName,
        type,
        buildCandidateUsageSourceIds({ apiKey: item.apiKey, prefix: item.prefix })
      );
    });
  });

  return map;
}

export function resolveSourceDisplay(
  sourceRaw: string,
  authIndex: unknown,
  sourceInfoMap: Map<string, SourceInfo>,
  authFileMap: Map<string, CredentialInfo>
): SourceInfo {
  const source = sourceRaw.trim();
  const matched = sourceInfoMap.get(source);
  if (matched) return matched;

  const authIndexKey = normalizeAuthIndex(authIndex);
  if (authIndexKey) {
    const authInfo = authFileMap.get(authIndexKey);
    if (authInfo) {
      return { displayName: authInfo.name || authIndexKey, type: authInfo.type };
    }
  }

  return {
    displayName: source.startsWith('t:') ? source.slice(2) : source || '-',
    type: '',
  };
}
