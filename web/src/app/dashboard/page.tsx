'use client'

import { useState, useEffect } from 'react'
import { useAuth, type User } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import {
  getProfile,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  getQqBindCode,
  confirmQqBind,
  unbindQq,
} from '@/lib/api'
import styles from './page.module.css'

type Tab = 'profile' | 'api-keys' | 'settings'

interface ApiKeyItem {
  id: number
  keyPrefix: string
  name: string
  status: number
  lastUsedAt: string | null
  fullKey?: string
}

export default function DashboardPage() {
  const { token, user, setUser } = useAuth()

  if (!token || !user) return null

  return <DashboardInner token={token} user={user} setUser={setUser} />
}

function DashboardInner({
  token,
  user,
  setUser,
}: {
  token: string
  user: User
  setUser: (u: User) => void
}) {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const { t } = useI18n()

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('dashboard.title')}</h1>

      <nav className={styles.tabs}>
        {(['profile', 'api-keys', 'settings'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'profile' ? t('dashboard.tab.profile') : tab === 'api-keys' ? t('dashboard.tab.apiKeys') : t('dashboard.tab.settings')}
          </button>
        ))}
      </nav>

      {activeTab === 'profile' && <ProfileTab token={token} />}
      {activeTab === 'api-keys' && <ApiKeysTab token={token} />}
      {activeTab === 'settings' && (
        <SettingsTab token={token} user={user} setUser={setUser} />
      )}
    </div>
  )
}

/* ─── Profile Tab ─────────────────────────────────────── */

function ProfileTab({ token }: { token: string }) {
  const { t } = useI18n()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile !== null) return
    setLoading(true)
    setError('')
    getProfile(token)
      .then((r) => setProfile(r.user))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load profile'))
      .finally(() => setLoading(false))
  }, [token, profile])

  if (loading) return <div className={styles.loading}>{t('loading')}</div>
  if (error) return <div className={styles.error}>{error}</div>
  if (!profile) return null

  return (
    <div className={styles.card}>
      <div className={styles.fields}>
        <Field label={t('profile.email')} value={profile.email} />
        <Field label={t('profile.displayName')} value={profile.display_name || profile.email} />
        <Field
          label={t('profile.role')}
          value={
            <span
              className={`${styles.badge} ${profile.role === 10 ? styles.badgePrimary : styles.badgeMuted}`}
            >
              {profile.role === 10 ? t('profile.admin') : t('profile.user')}
            </span>
          }
        />
        <Field
          label={t('profile.quota')}
          value={t('profile.quotaValue', { used: profile.used_quota, total: profile.quota })}
        />
        <Field
          label={t('profile.qqBind')}
          value={
            profile.qq_id ? (
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                {t('profile.qqBound', { id: profile.qq_id })}
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeDanger}`}>
                {t('profile.qqNotBound')}
              </span>
            )
          }
        />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  )
}

/* ─── API Keys Tab ────────────────────────────────────── */

function ApiKeysTab({ token }: { token: string }) {
  const { t } = useI18n()
  const [keys, setKeys] = useState<ApiKeyItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (keys !== null) return
    setLoading(true)
    setError('')
    listApiKeys(token)
      .then((r) => setKeys(r.apiKeys as ApiKeyItem[]))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load API keys'))
      .finally(() => setLoading(false))
  }, [token, keys])

  async function handleCreate() {
    if (creating) return
    setCreating(true)
    setError('')
    try {
      const result = await createApiKey(token, newKeyName || undefined)
      const item: ApiKeyItem = result.apiKey
      setKeys((prev) => (prev ? [item, ...prev] : [item]))
      setCreatedKey(item.fullKey ?? null)
      setNewKeyName('')
      setCopied(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleCopyKey() {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
    } catch {
      // Fallback: select and execCommand
      const ta = document.createElement('textarea')
      ta.value = createdKey
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
    }
  }

  async function handleDelete(id: number) {
    setError('')
    try {
      await deleteApiKey(token, id)
      setKeys((prev) => (prev ? prev.filter((k) => k.id !== id) : null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete key')
    }
  }

  return (
    <><div className={styles.card}>
      <div className={styles.createSection}>
        <input
          className={styles.input}
          placeholder={t('apikeys.namePlaceholder')}
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate()
          }}
        />
        <button
          type="button"
          className={styles.button}
          disabled={creating}
          onClick={handleCreate}
        >
          {creating ? 'Creating...' : t('apikeys.create')}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>{t('loading')}</div>
      ) : !keys || keys.length === 0 ? (
        <div className={styles.empty}>{t('apikeys.noKeys')}</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('apikeys.name')}</th>
              <th>{t('apikeys.key')}</th>
              <th>{t('apikeys.status')}</th>
              <th>{t('apikeys.lastUsed')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id}>
                <td>{key.name || <em style={{ color: 'var(--text-secondary)' }}>{t('apikeys.dash')}</em>}</td>
                <td>
                  <span className={styles.keyDisplay}>{key.keyPrefix}...</span>
                </td>
                <td>
                  <span
                    className={`${styles.badge} ${key.status === 1 ? styles.badgeSuccess : styles.badgeDanger}`}
                  >
                    {key.status === 1 ? t('apikeys.active') : t('apikeys.disabled')}
                  </span>
                </td>
                <td>
                  {key.lastUsedAt
                    ? new Date(key.lastUsedAt).toLocaleDateString()
                    : t('apikeys.never')}
                </td>
                <td>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonDanger} ${styles.buttonSmall}`}
                    onClick={() => handleDelete(key.id)}
                  >
                    {t('apikeys.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>

    {createdKey && (
      <div className={styles.overlay} onClick={() => setCreatedKey(null)}>
        <div className={styles.createdKeyModal} onClick={(e) => e.stopPropagation()}>
          <h3 className={styles.createdKeyTitle}>{t('apikeys.created')}</h3>
          <p className={styles.createdKeyHint}>{t('apikeys.createdHint')}</p>
          <div className={styles.createdKeyBox}>
            <code className={styles.createdKeyValue}>{createdKey}</code>
            <button
              type="button"
              className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}
              onClick={handleCopyKey}
            >
              {copied ? t('apikeys.copied') : t('apikeys.copy')}
            </button>
          </div>
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={() => setCreatedKey(null)}
          >
            {t('apikeys.dismiss')}
          </button>
        </div>
      </div>
    )}
  </>
  )
}

/* ─── Settings Tab (QQ Bind) ──────────────────────────── */

function SettingsTab({
  token,
  user,
  setUser,
}: {
  token: string
  user: User
  setUser: (u: User) => void
}) {
  const { t } = useI18n()
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleBind() {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const result = await getQqBindCode(token)
      setCode(result.code)
      setShowCode(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get bind code')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const result = await confirmQqBind(token)
      setUser({ ...user, qq_id: result.qq_id })
      setShowCode(false)
      setCode('')
      setSuccess(t('qq.boundSuccess'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to confirm bind')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnbind() {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await unbindQq(token)
      setUser({ ...user, qq_id: '' })
      setSuccess(t('qq.unboundSuccess'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unbind QQ')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    setShowCode(false)
    setCode('')
    setError('')
    setSuccess('')
  }

  return (
    <div className={styles.card}>
      <div className={styles.fields}>
        <Field
          label={t('profile.qqBind')}
          value={
            user.qq_id ? (
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                {t('profile.qqBound', { id: user.qq_id })}
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeDanger}`}>
                {t('profile.qqNotBound')}
              </span>
            )
          }
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {user.qq_id ? (
        <button
          type="button"
          className={`${styles.button} ${styles.buttonDanger}`}
          disabled={loading}
          onClick={handleUnbind}
        >
          {loading ? t('qq.unbinding') : t('qq.unbind')}
        </button>
      ) : showCode ? (
        <>
          <div className={styles.qqCodeBox}>
            <div className={styles.qqCode}>{code}</div>
            <p className={styles.qqCodeHint}>
              {t('qq.sendCode')}
            </p>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              disabled={loading}
              onClick={handleConfirm}
            >
              {loading ? t('qq.confirming') : t('qq.confirm')}
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={loading}
              onClick={handleBack}
            >
              Back
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className={styles.button}
          disabled={loading}
          onClick={handleBind}
        >
          {loading ? t('qq.loading') : t('qq.bind')}
        </button>
      )}
    </div>
  )
}
