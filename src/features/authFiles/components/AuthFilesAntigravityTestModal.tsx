import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { AuthFileItem } from '@/types';
import type { AntigravityMessageTestResult } from '@/features/authFiles/antigravityTest';
import styles from '@/pages/AuthFilesPage.module.scss';

type AuthFilesAntigravityTestModalProps = {
  open: boolean;
  mode: 'single' | 'batch';
  targets: AuthFileItem[];
  availableModels: string[];
  loadingModels: boolean;
  selectedModel: string;
  running: boolean;
  summaryMessage: string;
  results: AntigravityMessageTestResult[];
  onClose: () => void;
  onModelChange: (value: string) => void;
  onRun: () => void;
};

const formatDuration = (value: number) => `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}s`;

export function AuthFilesAntigravityTestModal({
  open,
  mode,
  targets,
  availableModels,
  loadingModels,
  selectedModel,
  running,
  summaryMessage,
  results,
  onClose,
  onModelChange,
  onRun,
}: AuthFilesAntigravityTestModalProps) {
  const { t } = useTranslation();

  const title =
    mode === 'single'
      ? t('auth_files.antigravity_test_single_title')
      : t('auth_files.antigravity_test_batch_title');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={880}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={running}>
            {t('common.close')}
          </Button>
          <Button onClick={onRun} loading={running} disabled={loadingModels || !selectedModel.trim()}>
            {mode === 'single'
              ? t('auth_files.antigravity_test_run_single')
              : t('auth_files.antigravity_test_run_batch')}
          </Button>
        </>
      }
    >
      <div className={styles.antigravityTestModalBody}>
        <div className={styles.antigravityTestHeader}>
          <div>
            <div className={styles.antigravityTestTargetTitle}>{t('auth_files.antigravity_test_targets')}</div>
            <div className={styles.antigravityTestTargetHint}>
              {mode === 'single'
                ? targets[0]?.name ?? '-'
                : t('auth_files.antigravity_test_batch_count', { count: targets.length })}
            </div>
            {mode === 'batch' && (
              <div className={styles.antigravityTestTargetNote}>
                {t('auth_files.antigravity_test_batch_note')}
              </div>
            )}
          </div>
          {summaryMessage && <div className={styles.antigravityTestSummary}>{summaryMessage}</div>}
        </div>

        <div className={styles.antigravityTestFormGrid}>
          <Input
            label={t('auth_files.antigravity_test_model_label')}
            value={selectedModel}
            onChange={(event) => onModelChange(event.target.value)}
            placeholder={t('auth_files.antigravity_test_model_placeholder')}
            hint={
              loadingModels
                ? t('auth_files.antigravity_test_models_loading')
                : availableModels.length > 0
                  ? t('auth_files.antigravity_test_model_hint', { count: availableModels.length })
                  : t('auth_files.antigravity_test_model_hint_empty')
            }
            list="antigravity-test-models"
            disabled={running}
          />
          <datalist id="antigravity-test-models">
            {availableModels.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
        </div>

        {results.length > 0 && (
          <div className={styles.antigravityTestResultsSection}>
            <div className={styles.antigravityTestResultsTitle}>{t('auth_files.antigravity_test_results')}</div>
            <div className={styles.antigravityTestResultsList}>
              {results.map((result) => (
                <div key={`${result.fileName}-${result.requestUrl ?? 'none'}`} className={styles.antigravityTestResultCard}>
                  <div className={styles.antigravityTestResultHeader}>
                    <div>
                      <div className={styles.antigravityTestResultName}>{result.fileName}</div>
                      <div className={styles.antigravityTestResultMeta}>
                        <span>{result.model}</span>
                        {result.requestUrl && <span>{result.requestUrl}</span>}
                      </div>
                    </div>
                    <div className={styles.antigravityTestResultBadges}>
                      <span
                        className={`${styles.antigravityTestStatusBadge} ${
                          result.status === 'success'
                            ? styles.antigravityTestStatusSuccess
                            : styles.antigravityTestStatusError
                        }`}
                      >
                        {result.status === 'success' ? t('common.success') : t('common.error')}
                      </span>
                      {typeof result.statusCode === 'number' && (
                        <span className={styles.antigravityTestMetaBadge}>HTTP {result.statusCode}</span>
                      )}
                      <span className={styles.antigravityTestMetaBadge}>{formatDuration(result.durationMs)}</span>
                    </div>
                  </div>
                  <div className={styles.antigravityTestResultSummary}>{result.summary}</div>
                  {result.validationUrl && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a
                        href={result.validationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'underline' }}
                      >
                        {t('auth_files.antigravity_test_verify_account')}
                      </a>
                    </div>
                  )}
                  {result.bodyText && (
                    <details className={styles.antigravityTestDetails}>
                      <summary>{t('auth_files.antigravity_test_raw_response')}</summary>
                      <pre className={styles.antigravityTestRawResponse}>{result.bodyText}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
