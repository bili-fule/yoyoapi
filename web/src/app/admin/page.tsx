'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import {
  listUsers,
  updateUser,
  deleteUser,
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getLogs,
  getStats,
} from '@/lib/api'
import styles from './page.module.css'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface User {
  id: number
  email: string
  display_name: string
  role: number
  quota: number
  used_quota: number
  qq_id: string
  created_at: string
}

interface Channel {
  id: number
  name: string
  type: string
  baseUrl: string
  apiKey: string
  models: string[]
  status: number
  priority: number
}

interface LogEntry {
  id: number
  user_id: number
  model: string
  prompt_tokens: number
  completion_tokens: number
  quota_cost: number
  created_at: string
}

interface Stats {
  totalUsers: number
  todayUsage: number
}

type Tab = 'users' | 'channels' | 'logs' | 'stats'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 15

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const { token } = useAuth()
  const { t } = useI18n()

  const TABS: { key: Tab; label: string }[] = [
    { key: 'users', label: t('admin.tab.users') },
    { key: 'channels', label: t('admin.tab.channels') },
    { key: 'logs', label: t('admin.tab.logs') },
    { key: 'stats', label: t('admin.tab.stats') },
  ]

  /* tab state */
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [error, setError] = useState('')

  /* ---- users ---- */
  const [users, setUsers] = useState<User[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersLoading, setUsersLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState({
    displayName: '',
    role: 0,
    quota: 0,
    qqId: '',
  })

  /* ---- channels ---- */
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [channelForm, setChannelForm] = useState({
    name: '',
    type: 'openai',
    baseUrl: '',
    apiKey: '',
    models: '',
    priority: 0,
    status: 1,
  })

  /* ---- logs ---- */
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsFilterInput, setLogsFilterInput] = useState('')
  const [logsActiveFilter, setLogsActiveFilter] = useState('')

  /* ---- stats ---- */
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  /* ------------------------------------------------------------------ */
  /*  Data fetching                                                      */
  /* ------------------------------------------------------------------ */

  /* Users */
  useEffect(() => {
    if (activeTab !== 'users' || !token) return

    setUsersLoading(true)
    setError('')

    listUsers(token, usersPage, PAGE_SIZE)
      .then((data) => {
        setUsers(data.users)
        setUsersTotal(data.total)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setUsersLoading(false))
  }, [activeTab, usersPage, token])

  /* Channels */
  useEffect(() => {
    if (activeTab !== 'channels' || !token) return

    setChannelsLoading(true)
    setError('')

    listChannels(token)
      .then((data) => setChannels(data.channels))
      .catch((err: Error) => setError(err.message))
      .finally(() => setChannelsLoading(false))
  }, [activeTab, token])

  /* Logs */
  useEffect(() => {
    if (activeTab !== 'logs' || !token) return

    setLogsLoading(true)
    setError('')

    const userIdNum = logsActiveFilter
      ? parseInt(logsActiveFilter, 10) || undefined
      : undefined

    getLogs(token, logsPage, userIdNum)
      .then((data) => {
        setLogs(data.logs)
        setLogsTotal(data.total)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLogsLoading(false))
  }, [activeTab, logsPage, logsActiveFilter, token])

  /* Stats */
  useEffect(() => {
    if (activeTab !== 'stats' || !token) return

    setStatsLoading(true)
    setError('')

    getStats(token)
      .then((data) => setStats(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setStatsLoading(false))
  }, [activeTab, token])

  /* ------------------------------------------------------------------ */
  /*  Handlers — Users                                                   */
  /* ------------------------------------------------------------------ */

  function openEditUser(user: User) {
    setEditingUser(user)
    setUserForm({
      displayName: user.display_name,
      role: user.role,
      quota: user.quota,
      qqId: user.qq_id,
    })
    setShowUserModal(true)
  }

  async function handleUserSave(e: FormEvent) {
    e.preventDefault()
    if (!token || !editingUser) return
    setError('')

    try {
      await updateUser(token, editingUser.id, userForm)
      setShowUserModal(false)
      setEditingUser(null)

      const data = await listUsers(token, usersPage, PAGE_SIZE)
      setUsers(data.users)
      setUsersTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  async function handleDeleteUser(id: number) {
    if (!token) return
    if (!window.confirm(t('users.confirmDelete'))) return
    setError('')

    try {
      await deleteUser(token, id)

      const data = await listUsers(token, usersPage, PAGE_SIZE)
      setUsers(data.users)
      setUsersTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Handlers — Channels                                                */
  /* ------------------------------------------------------------------ */

  function openCreateChannel() {
    setEditingChannel(null)
    setChannelForm({
      name: '',
      type: 'openai',
      baseUrl: '',
      apiKey: '',
      models: '',
      priority: 0,
      status: 1,
    })
    setShowChannelModal(true)
  }

  function openEditChannel(channel: Channel) {
    setEditingChannel(channel)
    setChannelForm({
      name: channel.name,
      type: channel.type,
      baseUrl: channel.baseUrl,
      apiKey: channel.apiKey,
      models: channel.models.join(', '),
      priority: channel.priority,
      status: channel.status,
    })
    setShowChannelModal(true)
  }

  async function handleChannelSave(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError('')

    const models = channelForm.models
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const baseData = {
      name: channelForm.name,
      type: channelForm.type,
      baseUrl: channelForm.baseUrl,
      apiKey: channelForm.apiKey,
      models,
      priority: channelForm.priority,
    }

    try {
      if (editingChannel) {
        await updateChannel(token, editingChannel.id, {
          ...baseData,
          status: channelForm.status,
        })
      } else {
        await createChannel(token, baseData)
      }

      setShowChannelModal(false)
      setEditingChannel(null)

      const data = await listChannels(token)
      setChannels(data.channels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save channel')
    }
  }

  async function handleDeleteChannel(id: number) {
    if (!token) return
    if (!window.confirm(t('channels.confirmDelete'))) return
    setError('')

    try {
      await deleteChannel(token, id)

      const data = await listChannels(token)
      setChannels(data.channels)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete channel',
      )
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Handlers — Logs                                                    */
  /* ------------------------------------------------------------------ */

  function applyLogsFilter() {
    setLogsPage(1)
    setLogsActiveFilter(logsFilterInput)
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function renderPagination(
    page: number,
    total: number,
    onPage: (p: number) => void,
    tPrefix: 'users' | 'logs',
  ) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
      <div className={styles.pagination}>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          {t(`${tPrefix}.prev`)}
        </button>
        <span className={styles.pageInfo}>
          {t(`${tPrefix}.page`, { current: page, total: totalPages })}
        </span>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          {t(`${tPrefix}.next`)}
        </button>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('admin.title')}</h1>

      {/* Tabs */}
      <nav className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error && <div className={styles.error}>{error}</div>}

      {/* ---------- Users ---------- */}
      {activeTab === 'users' && (
        <div className={styles.section}>
          {usersLoading ? (
            <div className={styles.loading}>{t('loading')}</div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('users.id')}</th>
                      <th>{t('users.email')}</th>
                      <th>{t('users.displayName')}</th>
                      <th>{t('users.role')}</th>
                      <th>{t('users.quota')}</th>
                      <th>{t('users.qqId')}</th>
                      <th>{t('users.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td className={styles.cellEmail}>{u.email}</td>
                        <td>{u.display_name || t('users.dash')}</td>
                        <td>{u.role}</td>
                        <td>
                          {u.used_quota}/{u.quota}
                        </td>
                        <td>{u.qq_id || t('users.dash')}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.editBtn}
                              onClick={() => openEditUser(u)}
                            >
                              {t('users.edit')}
                            </button>
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              {t('users.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <div className={styles.emptyMsg}>{t('users.noUsers')}</div>
              )}
              {renderPagination(usersPage, usersTotal, setUsersPage, 'users')}
            </>
          )}
        </div>
      )}

      {/* ---------- Channels ---------- */}
      {activeTab === 'channels' && (
        <div className={styles.section}>
          <button
            type="button"
            className={styles.createBtn}
            onClick={openCreateChannel}
          >
            {t('channels.create')}
          </button>

          {channelsLoading ? (
            <div className={styles.loading}>{t('loading')}</div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('channels.name')}</th>
                      <th>{t('channels.type')}</th>
                      <th>{t('channels.baseUrl')}</th>
                      <th>{t('channels.models')}</th>
                      <th>{t('channels.status')}</th>
                      <th>{t('channels.priority')}</th>
                      <th>{t('channels.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.type}</td>
                        <td className={styles.cellUrl}>{c.baseUrl}</td>
                        <td>{c.models.join(', ') || t('users.dash')}</td>
                        <td>
                          <span
                            className={
                              c.status === 1
                                ? styles.statusActive
                                : styles.statusDisabled
                            }
                          >
                            {c.status === 1 ? t('channels.active') : t('channels.disabled')}
                          </span>
                        </td>
                        <td>{c.priority}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.editBtn}
                              onClick={() => openEditChannel(c)}
                            >
                              {t('channels.edit')}
                            </button>
                            <button
                              type="button"
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteChannel(c.id)}
                            >
                              {t('channels.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {channels.length === 0 && (
                <div className={styles.emptyMsg}>{t('channels.noChannels')}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------- Logs ---------- */}
      {activeTab === 'logs' && (
        <div className={styles.section}>
          <div className={styles.filterRow}>
            <input
              className={styles.filterInput}
              type="text"
              placeholder={t('logs.filterPlaceholder')}
              value={logsFilterInput}
              onChange={(e) => setLogsFilterInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyLogsFilter()
              }}
            />
            <button
              type="button"
              className={styles.filterBtn}
              onClick={applyLogsFilter}
            >
              {t('logs.filter')}
            </button>
            {logsActiveFilter && (
              <button
                type="button"
                className={styles.filterClearBtn}
                onClick={() => {
                  setLogsFilterInput('')
                  setLogsActiveFilter('')
                  setLogsPage(1)
                }}
              >
                Clear
              </button>
            )}
          </div>

          {logsLoading ? (
            <div className={styles.loading}>{t('loading')}</div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('logs.id')}</th>
                      <th>{t('logs.userId')}</th>
                      <th>{t('logs.model')}</th>
                      <th>{t('logs.promptTokens')}</th>
                      <th>{t('logs.completionTokens')}</th>
                      <th>{t('logs.cost')}</th>
                      <th>{t('logs.timestamp')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td>{l.id}</td>
                        <td>{l.user_id}</td>
                        <td>{l.model}</td>
                        <td>{l.prompt_tokens}</td>
                        <td>{l.completion_tokens}</td>
                        <td>{l.quota_cost}</td>
                        <td className={styles.cellDate}>{l.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logs.length === 0 && (
                <div className={styles.emptyMsg}>{t('logs.noLogs')}</div>
              )}
              {renderPagination(logsPage, logsTotal, setLogsPage, 'logs')}
            </>
          )}
        </div>
      )}

      {/* ---------- Stats ---------- */}
      {activeTab === 'stats' && (
        <div className={styles.section}>
          {statsLoading ? (
            <div className={styles.loading}>{t('loading')}</div>
          ) : stats ? (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{stats.totalUsers}</div>
                <div className={styles.statLabel}>{t('stats.totalUsers')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{stats.todayUsage}</div>
                <div className={styles.statLabel}>{t('stats.todayUsage')}</div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyMsg}>No stats available.</div>
          )}
        </div>
      )}

      {/* ---------- User Edit Modal ---------- */}
      {showUserModal && editingUser && (
        <div
          className={styles.overlay}
          onClick={() => setShowUserModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>
              {t('users.editTitle', { id: editingUser.id })}
            </h3>
            <form onSubmit={handleUserSave}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="user-displayName">
                  {t('users.displayName')}
                </label>
                <input
                  id="user-displayName"
                  className={styles.input}
                  type="text"
                  value={userForm.displayName}
                  onChange={(e) =>
                    setUserForm((f) => ({
                      ...f,
                      displayName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="user-role">
                  {t('users.role')}
                </label>
                <input
                  id="user-role"
                  className={styles.input}
                  type="number"
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm((f) => ({
                      ...f,
                      role: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="user-quota">
                  {t('users.quota')}
                </label>
                <input
                  id="user-quota"
                  className={styles.input}
                  type="number"
                  value={userForm.quota}
                  onChange={(e) =>
                    setUserForm((f) => ({
                      ...f,
                      quota: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="user-qqId">
                  {t('users.qqId')}
                </label>
                <input
                  id="user-qqId"
                  className={styles.input}
                  type="text"
                  value={userForm.qqId}
                  onChange={(e) =>
                    setUserForm((f) => ({ ...f, qqId: e.target.value }))
                  }
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowUserModal(false)}
                >
                  {t('channels.cancel')}
                </button>
                <button type="submit" className={styles.saveBtn}>
                  {t('channels.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Channel Create/Edit Modal ---------- */}
      {showChannelModal && (
        <div
          className={styles.overlay}
          onClick={() => setShowChannelModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>
              {editingChannel
                ? t('channels.editTitle', { id: editingChannel.id })
                : t('channels.createTitle')}
            </h3>
            <form onSubmit={handleChannelSave}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ch-name">
                  {t('channels.name')}
                </label>
                <input
                  id="ch-name"
                  className={styles.input}
                  type="text"
                  required
                  value={channelForm.name}
                  onChange={(e) =>
                    setChannelForm((f) => ({
                      ...f,
                      name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ch-type">
                  {t('channels.type')}
                </label>
                <input
                  id="ch-type"
                  className={styles.input}
                  type="text"
                  value={channelForm.type}
                  onChange={(e) =>
                    setChannelForm((f) => ({
                      ...f,
                      type: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ch-baseUrl">
                  {t('channels.baseUrl')}
                </label>
                <input
                  id="ch-baseUrl"
                  className={styles.input}
                  type="text"
                  required
                  value={channelForm.baseUrl}
                  onChange={(e) =>
                    setChannelForm((f) => ({
                      ...f,
                      baseUrl: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ch-apiKey">
                  {t('channels.apiKey')}
                </label>
                <input
                  id="ch-apiKey"
                  className={styles.input}
                  type="text"
                  required
                  value={channelForm.apiKey}
                  onChange={(e) =>
                    setChannelForm((f) => ({
                      ...f,
                      apiKey: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ch-models">
                  {t('channels.models')}
                </label>
                <input
                  id="ch-models"
                  className={styles.input}
                  type="text"
                  placeholder={t('channels.modelsPlaceholder')}
                  value={channelForm.models}
                  onChange={(e) =>
                    setChannelForm((f) => ({
                      ...f,
                      models: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ch-priority">
                  {t('channels.priority')}
                </label>
                <input
                  id="ch-priority"
                  className={styles.input}
                  type="number"
                  value={channelForm.priority}
                  onChange={(e) =>
                    setChannelForm((f) => ({
                      ...f,
                      priority: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
              {editingChannel && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="ch-status">
                    {t('channels.status')}
                  </label>
                  <select
                    id="ch-status"
                    className={styles.select}
                    value={channelForm.status}
                    onChange={(e) =>
                      setChannelForm((f) => ({
                        ...f,
                        status: parseInt(e.target.value, 10) as 0 | 1,
                      }))
                    }
                  >
                    <option value={1}>{t('channels.active')}</option>
                    <option value={0}>{t('channels.disabled')}</option>
                  </select>
                </div>
              )}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowChannelModal(false)}
                >
                  {t('channels.cancel')}
                </button>
                <button type="submit" className={styles.saveBtn}>
                  {t('channels.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
