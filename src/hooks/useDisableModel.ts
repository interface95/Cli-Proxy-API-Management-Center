/**
 * 禁用模型 Hook
 *
 * In the google-only build the "disable model" feature is effectively a
 * UI-only marker: we only track the disable in the local store and never
 * hit the backend, because the feature was originally backed by the
 * openai-compatibility provider CRUD which no longer exists.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDisabledModelsStore } from '@/stores';
import {
  resolveProvider,
  createDisableState,
  type DisableState,
} from '@/utils/monitor';
import type { SourceInfo } from '@/types/sourceInfo';

export interface UseDisableModelOptions {
  providerMap: Record<string, string>;
  sourceInfoMap?: Map<string, SourceInfo>;
  providerModels?: Record<string, Set<string>>;
}

export interface UseDisableModelReturn {
  disableState: DisableState | null;
  disabling: boolean;
  handleDisableClick: (source: string, model: string) => void;
  handleConfirmDisable: () => Promise<void>;
  handleCancelDisable: () => void;
  isModelDisabled: (source: string, model: string) => boolean;
}

export function useDisableModel(options: UseDisableModelOptions): UseDisableModelReturn {
  const { providerMap, providerModels } = options;
  const { t } = useTranslation();

  const { addDisabledModel, isDisabled } = useDisabledModelsStore();

  const [disableState, setDisableState] = useState<DisableState | null>(null);
  const [disabling, setDisabling] = useState(false);

  const handleDisableClick = useCallback((source: string, model: string) => {
    setDisableState(createDisableState(source, model, providerMap));
  }, [providerMap]);

  const handleConfirmDisable = useCallback(async () => {
    if (!disableState) return;

    if (disableState.step < 3) {
      setDisableState({
        ...disableState,
        step: disableState.step + 1,
      });
      return;
    }

    setDisabling(true);
    try {
      const { source, model } = disableState;

      const providerName = resolveProvider(source, providerMap);
      if (!providerName) {
        throw new Error(t('monitor.logs.disable_error_no_provider'));
      }

      // Google-only build: no server-side provider CRUD, just record the
      // disable locally so the monitor page hides the model on refresh.
      addDisabledModel(source, model);
      setDisableState(null);
    } catch (err) {
      console.error('禁用模型失败：', err);
      alert(err instanceof Error ? err.message : t('monitor.logs.disable_error'));
    } finally {
      setDisabling(false);
    }
  }, [disableState, providerMap, t, addDisabledModel]);

  const handleCancelDisable = useCallback(() => {
    setDisableState(null);
  }, []);

  const isModelDisabled = useCallback((source: string, model: string): boolean => {
    if (isDisabled(source, model)) {
      return true;
    }

    if (providerModels) {
      if (!source || !model) return false;

      if (providerModels[source]) {
        return !providerModels[source].has(model);
      }

      const entries = Object.entries(providerModels);
      for (const [key, modelSet] of entries) {
        if (source.startsWith(key) || key.startsWith(source)) {
          return !modelSet.has(model);
        }
      }
    }

    return false;
  }, [isDisabled, providerModels]);

  return {
    disableState,
    disabling,
    handleDisableClick,
    handleConfirmDisable,
    handleCancelDisable,
    isModelDisabled,
  };
}
