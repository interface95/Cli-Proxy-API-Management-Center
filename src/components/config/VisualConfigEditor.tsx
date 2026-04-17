import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ConfigSection } from '@/components/config/ConfigSection';
import { cacheBoostApi, type CacheBoostStats } from '@/services/api/cacheBoost';
import type {
  PayloadFilterRule,
  PayloadParamValidationErrorCode,
  PayloadRule,
  VisualConfigValidationErrorCode,
  VisualConfigValidationErrors,
  VisualConfigValues,
} from '@/types/visualConfig';
import {
  ApiKeysCardEditor,
  PayloadFilterRulesEditor,
  PayloadRulesEditor,
} from './VisualConfigEditorBlocks';

interface VisualConfigEditorProps {
  values: VisualConfigValues;
  validationErrors?: VisualConfigValidationErrors;
  disabled?: boolean;
  onChange: (values: Partial<VisualConfigValues>) => void;
}

function getValidationMessage(
  t: ReturnType<typeof useTranslation>['t'],
  errorCode?: VisualConfigValidationErrorCode | PayloadParamValidationErrorCode
) {
  if (!errorCode) return undefined;
  return t(`config_management.visual.validation.${errorCode}`);
}

type ToggleRowProps = {
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ title, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 220 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
        {description && (
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
            {description}
          </div>
        )}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} ariaLabel={title} />
    </div>
  );
}

function SectionGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border-color)', margin: '16px 0' }} />;
}

interface CacheBoostSectionProps {
  values: VisualConfigValues;
  disabled: boolean;
  onChange: (values: Partial<VisualConfigValues>) => void;
}

function CacheBoostSection({ values, disabled, onChange }: CacheBoostSectionProps) {
  const { t } = useTranslation();
  const sliderId = useId();
  const exemptKeysId = useId();
  const exemptModelsId = useId();
  const [stats, setStats] = useState<CacheBoostStats | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!values.cacheBoostEnabled) {
      setStats(null);
      return;
    }
    let cancelled = false;
    const load = () => {
      cacheBoostApi
        .get()
        .then((r) => {
          if (!cancelled) setStats(r.stats);
        })
        .catch(() => {
          /* silently ignore — backend may be offline */
        });
    };
    load();
    const id = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [values.cacheBoostEnabled]);

  const handleResetStats = useCallback(async () => {
    setResetting(true);
    try {
      await cacheBoostApi.resetStats();
      setStats({ processed: 0, boosted: 0, suppressed: 0, passthrough: 0 });
    } catch {
      /* ignore */
    } finally {
      setResetting(false);
    }
  }, []);

  const ratioPercent = Math.round(values.cacheBoostTargetRatio * 100);
  const controlsDisabled = disabled || !values.cacheBoostEnabled;

  return (
    <ConfigSection
      title={t('config_management.visual.sections.cache_boost.title')}
      description={t('config_management.visual.sections.cache_boost.description')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ToggleRow
          title={t('config_management.visual.sections.cache_boost.enabled')}
          checked={values.cacheBoostEnabled}
          disabled={disabled}
          onChange={(cacheBoostEnabled) => onChange({ cacheBoostEnabled })}
        />

        <div className="form-group">
          <label htmlFor={sliderId}>
            {t('config_management.visual.sections.cache_boost.target_ratio')}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={0.95}
              step={0.05}
              value={values.cacheBoostTargetRatio}
              disabled={controlsDisabled}
              onChange={(e) =>
                onChange({ cacheBoostTargetRatio: Number(e.target.value) })
              }
              style={{ flex: 1 }}
            />
            <span
              style={{
                minWidth: 52,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)',
                fontWeight: 600,
              }}
            >
              {ratioPercent}%
            </span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor={exemptKeysId}>
            {t('config_management.visual.sections.cache_boost.exempt_api_keys')}
          </label>
          <textarea
            id={exemptKeysId}
            className="input"
            rows={3}
            placeholder="sk-admin-*"
            value={values.cacheBoostExemptAPIKeys}
            disabled={controlsDisabled}
            onChange={(e) => onChange({ cacheBoostExemptAPIKeys: e.target.value })}
            style={{ fontFamily: 'var(--font-mono, monospace)', resize: 'vertical' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor={exemptModelsId}>
            {t('config_management.visual.sections.cache_boost.exempt_models')}
          </label>
          <textarea
            id={exemptModelsId}
            className="input"
            rows={3}
            placeholder="gpt-oss-*"
            value={values.cacheBoostExemptModels}
            disabled={controlsDisabled}
            onChange={(e) => onChange({ cacheBoostExemptModels: e.target.value })}
            style={{ fontFamily: 'var(--font-mono, monospace)', resize: 'vertical' }}
          />
        </div>

        {stats && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              paddingTop: 12,
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {t('config_management.visual.sections.cache_boost.stats_processed')}:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{stats.processed}</strong>
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {t('config_management.visual.sections.cache_boost.stats_boosted')}:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{stats.boosted}</strong>
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {t('config_management.visual.sections.cache_boost.stats_suppressed')}:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{stats.suppressed}</strong>
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {t('config_management.visual.sections.cache_boost.stats_passthrough')}:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{stats.passthrough}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={resetting}
              loading={resetting}
              onClick={handleResetStats}
            >
              {t('config_management.visual.sections.cache_boost.reset_stats')}
            </Button>
          </div>
        )}
      </div>
    </ConfigSection>
  );
}

export function VisualConfigEditor({ values, validationErrors, disabled = false, onChange }: VisualConfigEditorProps) {
  const { t } = useTranslation();
  const routingStrategyLabelId = useId();
  const routingStrategyHintId = `${routingStrategyLabelId}-hint`;
  const antigravityCreditsModeId = useId();
  const antigravityCreditsModeHintId = `${antigravityCreditsModeId}-hint`;
  const antigravityBaseURLModeId = useId();
  const antigravityBaseURLModeHintId = `${antigravityBaseURLModeId}-hint`;
  const keepaliveInputId = useId();
  const keepaliveHintId = `${keepaliveInputId}-hint`;
  const keepaliveErrorId = `${keepaliveInputId}-error`;
  const nonstreamKeepaliveInputId = useId();
  const nonstreamKeepaliveHintId = `${nonstreamKeepaliveInputId}-hint`;
  const nonstreamKeepaliveErrorId = `${nonstreamKeepaliveInputId}-error`;
  const isKeepaliveDisabled = values.streaming.keepaliveSeconds === '' || values.streaming.keepaliveSeconds === '0';
  const isNonstreamKeepaliveDisabled =
    values.streaming.nonstreamKeepaliveInterval === '' || values.streaming.nonstreamKeepaliveInterval === '0';
  const portError = getValidationMessage(t, validationErrors?.port);
  const logsMaxSizeError = getValidationMessage(t, validationErrors?.logsMaxTotalSizeMb);
  const requestRetryError = getValidationMessage(t, validationErrors?.requestRetry);
  const maxRetryIntervalError = getValidationMessage(t, validationErrors?.maxRetryInterval);
  const keepaliveError = getValidationMessage(t, validationErrors?.['streaming.keepaliveSeconds']);
  const bootstrapRetriesError = getValidationMessage(t, validationErrors?.['streaming.bootstrapRetries']);
  const nonstreamKeepaliveError = getValidationMessage(
    t,
    validationErrors?.['streaming.nonstreamKeepaliveInterval']
  );

  const handleApiKeysTextChange = useCallback((apiKeysText: string) => onChange({ apiKeysText }), [onChange]);
  const handlePayloadDefaultRulesChange = useCallback(
    (payloadDefaultRules: PayloadRule[]) => onChange({ payloadDefaultRules }),
    [onChange]
  );
  const handlePayloadOverrideRulesChange = useCallback(
    (payloadOverrideRules: PayloadRule[]) => onChange({ payloadOverrideRules }),
    [onChange]
  );
  const handlePayloadFilterRulesChange = useCallback(
    (payloadFilterRules: PayloadFilterRule[]) => onChange({ payloadFilterRules }),
    [onChange]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ConfigSection title={t('config_management.visual.sections.server.title')} description={t('config_management.visual.sections.server.description')}>
        <SectionGrid>
          <Input
            label={t('config_management.visual.sections.server.host')}
            placeholder="0.0.0.0"
            value={values.host}
            onChange={(e) => onChange({ host: e.target.value })}
            disabled={disabled}
          />
          <Input
            label={t('config_management.visual.sections.server.port')}
            type="number"
            placeholder="8317"
            value={values.port}
            onChange={(e) => onChange({ port: e.target.value })}
            disabled={disabled}
            error={portError}
          />
        </SectionGrid>
      </ConfigSection>

      <ConfigSection title={t('config_management.visual.sections.tls.title')} description={t('config_management.visual.sections.tls.description')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title={t('config_management.visual.sections.tls.enable')}
            description={t('config_management.visual.sections.tls.enable_desc')}
            checked={values.tlsEnable}
            disabled={disabled}
            onChange={(tlsEnable) => onChange({ tlsEnable })}
          />
          {values.tlsEnable && (
            <>
              <Divider />
              <SectionGrid>
                <Input
                  label={t('config_management.visual.sections.tls.cert')}
                  placeholder="/path/to/cert.pem"
                  value={values.tlsCert}
                  onChange={(e) => onChange({ tlsCert: e.target.value })}
                  disabled={disabled}
                />
                <Input
                  label={t('config_management.visual.sections.tls.key')}
                  placeholder="/path/to/key.pem"
                  value={values.tlsKey}
                  onChange={(e) => onChange({ tlsKey: e.target.value })}
                  disabled={disabled}
                />
              </SectionGrid>
            </>
          )}
        </div>
      </ConfigSection>

      <ConfigSection title={t('config_management.visual.sections.remote.title')} description={t('config_management.visual.sections.remote.description')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title={t('config_management.visual.sections.remote.allow_remote')}
            description={t('config_management.visual.sections.remote.allow_remote_desc')}
            checked={values.rmAllowRemote}
            disabled={disabled}
            onChange={(rmAllowRemote) => onChange({ rmAllowRemote })}
          />
          <ToggleRow
            title={t('config_management.visual.sections.remote.disable_panel')}
            description={t('config_management.visual.sections.remote.disable_panel_desc')}
            checked={values.rmDisableControlPanel}
            disabled={disabled}
            onChange={(rmDisableControlPanel) => onChange({ rmDisableControlPanel })}
          />
          <SectionGrid>
            <Input
              label={t('config_management.visual.sections.remote.secret_key')}
              type="password"
              placeholder={t('config_management.visual.sections.remote.secret_key_placeholder')}
              value={values.rmSecretKey}
              onChange={(e) => onChange({ rmSecretKey: e.target.value })}
              disabled={disabled}
            />
            <Input
              label={t('config_management.visual.sections.remote.panel_repo')}
              placeholder="https://github.com/router-for-me/Cli-Proxy-API-Management-Center"
              value={values.rmPanelRepo}
              onChange={(e) => onChange({ rmPanelRepo: e.target.value })}
              disabled={disabled}
            />
          </SectionGrid>
        </div>
      </ConfigSection>

      <ConfigSection title={t('config_management.visual.sections.auth.title')} description={t('config_management.visual.sections.auth.description')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label={t('config_management.visual.sections.auth.auth_dir')}
            placeholder="~/.cli-proxy-api"
            value={values.authDir}
            onChange={(e) => onChange({ authDir: e.target.value })}
            disabled={disabled}
            hint={t('config_management.visual.sections.auth.auth_dir_hint')}
          />
          <ApiKeysCardEditor
            value={values.apiKeysText}
            disabled={disabled}
            onChange={handleApiKeysTextChange}
          />
        </div>
      </ConfigSection>

      <ConfigSection title={t('config_management.visual.sections.system.title')} description={t('config_management.visual.sections.system.description')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionGrid>
            <ToggleRow
              title={t('config_management.visual.sections.system.debug')}
              description={t('config_management.visual.sections.system.debug_desc')}
              checked={values.debug}
              disabled={disabled}
              onChange={(debug) => onChange({ debug })}
            />
            <ToggleRow
              title={t('config_management.visual.sections.system.commercial_mode')}
              description={t('config_management.visual.sections.system.commercial_mode_desc')}
              checked={values.commercialMode}
              disabled={disabled}
              onChange={(commercialMode) => onChange({ commercialMode })}
            />
            <ToggleRow
              title={t('config_management.visual.sections.system.logging_to_file')}
              description={t('config_management.visual.sections.system.logging_to_file_desc')}
              checked={values.loggingToFile}
              disabled={disabled}
              onChange={(loggingToFile) => onChange({ loggingToFile })}
            />
            <ToggleRow
              title={t('config_management.visual.sections.system.usage_statistics')}
              description={t('config_management.visual.sections.system.usage_statistics_desc')}
              checked={values.usageStatisticsEnabled}
              disabled={disabled}
              onChange={(usageStatisticsEnabled) => onChange({ usageStatisticsEnabled })}
            />
          </SectionGrid>

          <SectionGrid>
            <Input
              label={t('config_management.visual.sections.system.logs_max_size')}
              type="number"
              placeholder="0"
              value={values.logsMaxTotalSizeMb}
              onChange={(e) => onChange({ logsMaxTotalSizeMb: e.target.value })}
              disabled={disabled}
              error={logsMaxSizeError}
            />
          </SectionGrid>
        </div>
      </ConfigSection>

      <ConfigSection title={t('config_management.visual.sections.network.title')} description={t('config_management.visual.sections.network.description')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionGrid>
            <Input
              label={t('config_management.visual.sections.network.proxy_url')}
              placeholder="socks5://user:pass@127.0.0.1:1080/"
              value={values.proxyUrl}
              onChange={(e) => onChange({ proxyUrl: e.target.value })}
              disabled={disabled}
            />
            <Input
              label={t('config_management.visual.sections.network.request_retry')}
              type="number"
              placeholder="3"
              value={values.requestRetry}
              onChange={(e) => onChange({ requestRetry: e.target.value })}
              disabled={disabled}
              error={requestRetryError}
            />
            <Input
              label={t('config_management.visual.sections.network.max_retry_interval')}
              type="number"
              placeholder="30"
              value={values.maxRetryInterval}
              onChange={(e) => onChange({ maxRetryInterval: e.target.value })}
              disabled={disabled}
              error={maxRetryIntervalError}
            />
            <div className="form-group">
              <label id={routingStrategyLabelId} htmlFor={`${routingStrategyLabelId}-select`}>{t('config_management.visual.sections.network.routing_strategy')}</label>
              <Select
                value={values.routingStrategy}
                options={[
                  { value: 'round-robin', label: t('config_management.visual.sections.network.strategy_round_robin') },
                  { value: 'fill-first', label: t('config_management.visual.sections.network.strategy_fill_first') },
                ]}
                id={`${routingStrategyLabelId}-select`}
                disabled={disabled}
                ariaLabelledBy={routingStrategyLabelId}
                ariaDescribedBy={routingStrategyHintId}
                onChange={(nextValue) =>
                  onChange({ routingStrategy: nextValue as VisualConfigValues['routingStrategy'] })
                }
              />
              <div id={routingStrategyHintId} className="hint">{t('config_management.visual.sections.network.routing_strategy_hint')}</div>
            </div>
          </SectionGrid>

          <ToggleRow
            title={t('config_management.visual.sections.network.force_model_prefix')}
            description={t('config_management.visual.sections.network.force_model_prefix_desc')}
            checked={values.forceModelPrefix}
            disabled={disabled}
            onChange={(forceModelPrefix) => onChange({ forceModelPrefix })}
          />
          <ToggleRow
            title={t('config_management.visual.sections.network.ws_auth')}
            description={t('config_management.visual.sections.network.ws_auth_desc')}
            checked={values.wsAuth}
            disabled={disabled}
            onChange={(wsAuth) => onChange({ wsAuth })}
          />
          <ToggleRow
            title={t('config_management.visual.sections.network.sticky_session_id')}
            description={t('config_management.visual.sections.network.sticky_session_id_desc')}
            checked={values.stickySessionId}
            disabled={disabled}
            onChange={(stickySessionId) => onChange({ stickySessionId })}
          />
          <Input
            label={t('config_management.visual.sections.network.sticky_ttl_seconds')}
            type="number"
            placeholder="1800"
            value={values.stickyTtlSeconds}
            onChange={(e) => onChange({ stickyTtlSeconds: e.target.value })}
            disabled={disabled}
            hint={t('config_management.visual.sections.network.sticky_ttl_seconds_hint')}
          />
        </div>
      </ConfigSection>

      <ConfigSection title={t('config_management.visual.sections.quota.title')} description={t('config_management.visual.sections.quota.description')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ToggleRow
            title={t('config_management.visual.sections.quota.switch_project')}
            description={t('config_management.visual.sections.quota.switch_project_desc')}
            checked={values.quotaSwitchProject}
            disabled={disabled}
            onChange={(quotaSwitchProject) => onChange({ quotaSwitchProject })}
          />
          <ToggleRow
            title={t('config_management.visual.sections.quota.switch_preview_model')}
            description={t('config_management.visual.sections.quota.switch_preview_model_desc')}
            checked={values.quotaSwitchPreviewModel}
            disabled={disabled}
            onChange={(quotaSwitchPreviewModel) => onChange({ quotaSwitchPreviewModel })}
          />
        </div>
      </ConfigSection>

      <ConfigSection title={t('config_management.visual.sections.antigravity.title')} description={t('config_management.visual.sections.antigravity.description')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label id={antigravityCreditsModeId} htmlFor={`${antigravityCreditsModeId}-select`}>
              {t('config_management.visual.sections.antigravity.credits_mode')}
            </label>
            <Select
              value={values.antigravityCreditsMode}
              options={[
                {
                  value: 'off',
                  label: t('config_management.visual.sections.antigravity.credits_mode_off'),
                },
                {
                  value: 'fallback',
                  label: t('config_management.visual.sections.antigravity.credits_mode_fallback'),
                },
                {
                  value: 'always',
                  label: t('config_management.visual.sections.antigravity.credits_mode_always'),
                },
              ]}
              id={`${antigravityCreditsModeId}-select`}
              disabled={disabled}
              ariaLabelledBy={antigravityCreditsModeId}
              ariaDescribedBy={antigravityCreditsModeHintId}
              onChange={(nextValue) =>
                onChange({
                  antigravityCreditsMode: nextValue as VisualConfigValues['antigravityCreditsMode'],
                })
              }
            />
            <div id={antigravityCreditsModeHintId} className="hint">
              {t('config_management.visual.sections.antigravity.credits_mode_hint')}
            </div>
          </div>

          <div className="form-group">
            <label id={antigravityBaseURLModeId} htmlFor={`${antigravityBaseURLModeId}-select`}>
              {t('config_management.visual.sections.antigravity.base_url_mode')}
            </label>
            <Select
              value={values.antigravityBaseURLMode}
              options={[
                {
                  value: 'auto',
                  label: t('config_management.visual.sections.antigravity.base_url_mode_auto'),
                },
                {
                  value: 'prod-only',
                  label: t('config_management.visual.sections.antigravity.base_url_mode_prod'),
                },
                {
                  value: 'daily-only',
                  label: t('config_management.visual.sections.antigravity.base_url_mode_daily'),
                },
                {
                  value: 'sandbox-only',
                  label: t('config_management.visual.sections.antigravity.base_url_mode_sandbox'),
                },
                {
                  value: 'custom',
                  label: t('config_management.visual.sections.antigravity.base_url_mode_custom'),
                },
              ]}
              id={`${antigravityBaseURLModeId}-select`}
              disabled={disabled}
              ariaLabelledBy={antigravityBaseURLModeId}
              ariaDescribedBy={antigravityBaseURLModeHintId}
              onChange={(nextValue) =>
                onChange({
                  antigravityBaseURLMode:
                    nextValue as VisualConfigValues['antigravityBaseURLMode'],
                })
              }
            />
            <div id={antigravityBaseURLModeHintId} className="hint">
              {t('config_management.visual.sections.antigravity.base_url_mode_hint')}
            </div>
          </div>

          {values.antigravityBaseURLMode === 'custom' && (
            <div className="form-group">
              <label>
                {t('config_management.visual.sections.antigravity.custom_base_urls')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {values.antigravityCustomBaseURLs.map((url, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      style={{ flex: 1 }}
                      type="text"
                      value={url}
                      placeholder="https://cloudcode-pa.googleapis.com"
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...values.antigravityCustomBaseURLs];
                        next[idx] = e.target.value;
                        onChange({ antigravityCustomBaseURLs: next });
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={disabled}
                      onClick={() => {
                        const next = values.antigravityCustomBaseURLs.filter(
                          (_, i) => i !== idx
                        );
                        onChange({ antigravityCustomBaseURLs: next });
                      }}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      antigravityCustomBaseURLs: [
                        ...values.antigravityCustomBaseURLs,
                        '',
                      ],
                    })
                  }
                >
                  {t('config_management.visual.sections.antigravity.add_custom_base_url')}
                </button>
              </div>
              <div className="hint">
                {t('config_management.visual.sections.antigravity.custom_base_urls_hint')}
              </div>
            </div>
          )}
        </div>
      </ConfigSection>

      <CacheBoostSection values={values} disabled={disabled} onChange={onChange} />

      <ConfigSection title={t('config_management.visual.sections.streaming.title')} description={t('config_management.visual.sections.streaming.description')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionGrid>
            <div className="form-group">
              <label htmlFor={keepaliveInputId}>{t('config_management.visual.sections.streaming.keepalive_seconds')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  id={keepaliveInputId}
                  className="input"
                  type="number"
                  placeholder="0"
                  value={values.streaming.keepaliveSeconds}
                  onChange={(e) =>
                    onChange({ streaming: { ...values.streaming, keepaliveSeconds: e.target.value } })
                  }
                  disabled={disabled}
                />
                {isKeepaliveDisabled && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {t('config_management.visual.sections.streaming.disabled')}
                  </span>
                )}
              </div>
              {keepaliveError && <div id={keepaliveErrorId} className="error-box">{keepaliveError}</div>}
              <div id={keepaliveHintId} className="hint">{t('config_management.visual.sections.streaming.keepalive_hint')}</div>
            </div>
            <Input
              label={t('config_management.visual.sections.streaming.bootstrap_retries')}
              type="number"
              placeholder="1"
              value={values.streaming.bootstrapRetries}
              onChange={(e) => onChange({ streaming: { ...values.streaming, bootstrapRetries: e.target.value } })}
              disabled={disabled}
              hint={t('config_management.visual.sections.streaming.bootstrap_hint')}
              error={bootstrapRetriesError}
            />
          </SectionGrid>

          <SectionGrid>
            <div className="form-group">
              <label htmlFor={nonstreamKeepaliveInputId}>{t('config_management.visual.sections.streaming.nonstream_keepalive')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="number"
                  placeholder="0"
                  value={values.streaming.nonstreamKeepaliveInterval}
                  onChange={(e) =>
                    onChange({
                      streaming: { ...values.streaming, nonstreamKeepaliveInterval: e.target.value },
                    })
                  }
                  disabled={disabled}
                />
                {isNonstreamKeepaliveDisabled && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      padding: '2px 8px',
                      borderRadius: 999,
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {t('config_management.visual.sections.streaming.disabled')}
                  </span>
                )}
              </div>
              {nonstreamKeepaliveError && <div id={nonstreamKeepaliveErrorId} className="error-box">{nonstreamKeepaliveError}</div>}
              <div id={nonstreamKeepaliveHintId} className="hint">
                {t('config_management.visual.sections.streaming.nonstream_keepalive_hint')}
              </div>
            </div>
          </SectionGrid>
        </div>
      </ConfigSection>

      <ConfigSection title={t('config_management.visual.sections.payload.title')} description={t('config_management.visual.sections.payload.description')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('config_management.visual.sections.payload.default_rules')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {t('config_management.visual.sections.payload.default_rules_desc')}
            </div>
            <PayloadRulesEditor
              value={values.payloadDefaultRules}
              disabled={disabled}
              onChange={handlePayloadDefaultRulesChange}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('config_management.visual.sections.payload.override_rules')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {t('config_management.visual.sections.payload.override_rules_desc')}
            </div>
            <PayloadRulesEditor
              value={values.payloadOverrideRules}
              disabled={disabled}
              protocolFirst
              onChange={handlePayloadOverrideRulesChange}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('config_management.visual.sections.payload.filter_rules')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {t('config_management.visual.sections.payload.filter_rules_desc')}
            </div>
            <PayloadFilterRulesEditor
              value={values.payloadFilterRules}
              disabled={disabled}
              onChange={handlePayloadFilterRulesChange}
            />
          </div>
        </div>
      </ConfigSection>
    </div>
  );
}
