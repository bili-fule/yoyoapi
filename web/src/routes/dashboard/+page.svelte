<script lang="ts">
  import { auth } from '$lib/stores/auth.js'
  import { onMount } from 'svelte'
  import {
    getProfile,
    listApiKeys,
    createApiKey,
    deleteApiKey,
    getQqBindCode,
    confirmQqBind,
    unbindQq,
  } from '$lib/api/index.js'

  const tabs = ['Profile', 'API Keys', 'Settings'] as const
  let activeTab = $state<(typeof tabs)[number]>('Profile')

  let profile = $state<{
    id: number
    email: string
    display_name: string
    role: number
    quota: number
    used_quota: number
    qq_id: string
  } | null>(null)
  let apiKeys = $state<{ id: number; keyPrefix: string; name: string; status: number; lastUsedAt: string | null }[]>([])
  let loading = $state(true)
  let newKeyName = $state('')
  let qqLoading = $state(false)
  let qqError = $state('')
  let qqSuccess = $state('')
  let qqCode = $state('')
  let qqExpire = $state(0)
  let showQqCode = $state(false)

  onMount(async () => {
    if (!$auth.token) return
    try {
      const [profileRes, keysRes] = await Promise.all([
        getProfile($auth.token),
        listApiKeys($auth.token),
      ])
      profile = profileRes.user
      apiKeys = keysRes.apiKeys as typeof apiKeys
    } catch (err) {
      console.error(err)
    } finally {
      loading = false
    }
  })

  async function handleCreateKey() {
    if (!$auth.token) return
    try {
      const res = await createApiKey($auth.token, newKeyName || undefined) as { apiKey: { id: number; keyPrefix: string; name: string; status: number; lastUsedAt: string | null } }
      apiKeys = [res.apiKey, ...apiKeys]
      newKeyName = ''
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDeleteKey(id: number) {
    if (!$auth.token) return
    try {
      await deleteApiKey($auth.token, id)
      apiKeys = apiKeys.filter(k => k.id !== id)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleGetQqCode() {
    if (!$auth.token) return
    qqError = ''
    qqSuccess = ''
    qqLoading = true
    try {
      const res = await getQqBindCode($auth.token)
      qqCode = res.code
      qqExpire = res.expire_seconds
      showQqCode = true
    } catch (err) {
      qqError = err instanceof Error ? err.message : 'Failed to get bind code'
    } finally {
      qqLoading = false
    }
  }

  async function handleConfirmQqBind() {
    if (!$auth.token) return
    qqError = ''
    qqSuccess = ''
    qqLoading = true
    try {
      const res = await confirmQqBind($auth.token)
      if (profile) profile.qq_id = res.qq_id
      qqSuccess = res.message
      showQqCode = false
      qqCode = ''
    } catch (err) {
      qqError = err instanceof Error ? err.message : 'Failed to confirm bind'
    } finally {
      qqLoading = false
    }
  }

  async function handleUnbindQq() {
    if (!$auth.token) return
    qqError = ''
    qqSuccess = ''
    qqLoading = true
    try {
      const res = await unbindQq($auth.token)
      if (profile) profile.qq_id = ''
      qqSuccess = res.message
    } catch (err) {
      qqError = err instanceof Error ? err.message : 'Failed to unbind QQ'
    } finally {
      qqLoading = false
    }
  }
</script>

{#if loading}
  <p>Loading...</p>
{:else}
  <nav class="tabs">
    {#each tabs as tab}
      <button
        class="tab-link"
        class:active={activeTab === tab}
        onclick={() => activeTab = tab}
      >
        {tab}
      </button>
    {/each}
  </nav>

  {#if activeTab === 'Profile' && profile}
    <div class="card">
      <h3>Profile</h3>
      <div class="field"><span class="label">Email</span><span>{profile.email}</span></div>
      <div class="field"><span class="label">Display Name</span><span>{profile.display_name}</span></div>
      <div class="field"><span class="label">Role</span><span>{profile.role === 10 ? 'Admin' : 'User'}</span></div>
      <div class="field"><span class="label">Quota Used</span><span>{profile.used_quota} / {profile.quota}</span></div>
      <div class="field"><span class="label">QQ Bind</span><span>{profile.qq_id ? `Bound (${profile.qq_id})` : 'Not bound'}</span></div>
    </div>
  {/if}

  {#if activeTab === 'API Keys'}
    <div class="card">
      <h3>API Keys</h3>
      <div class="create-key">
        <input type="text" bind:value={newKeyName} placeholder="Key name (optional)" />
        <button onclick={handleCreateKey}>Create</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Status</th>
            <th>Last Used</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each apiKeys as key}
            <tr>
              <td>{key.name || '-'}</td>
              <td><code>{key.keyPrefix}</code></td>
              <td>{key.status === 1 ? 'Active' : 'Disabled'}</td>
              <td>{key.lastUsedAt || 'Never'}</td>
              <td><button class="danger" onclick={() => handleDeleteKey(key.id)}>Delete</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if activeTab === 'Settings'}
    <div class="card">
      <h3>Settings</h3>
      <div class="qq-section">
        <h4>QQ Bind</h4>
        {#if qqError}
          <div class="error">{qqError}</div>
        {/if}
        {#if qqSuccess}
          <div class="success">{qqSuccess}</div>
        {/if}
        {#if profile?.qq_id}
          <div class="field">
            <span class="label">QQ Bound</span>
            <span>{profile.qq_id}</span>
          </div>
          <button onclick={handleUnbindQq} disabled={qqLoading} class="danger">
            {qqLoading ? 'Unbinding...' : 'Unbind'}
          </button>
        {:else if showQqCode}
          <div class="code-box">
            <span class="code">{qqCode}</span>
            <p class="hint">Send this code to the QQ bot</p>
            <p class="hint">Expires in {qqExpire} seconds</p>
          </div>
          <button onclick={handleConfirmQqBind} disabled={qqLoading}>
            {qqLoading ? 'Confirming...' : 'Confirm Bind'}
          </button>
        {:else}
          <p class="hint">Bind your QQ account for additional security.</p>
          <button onclick={handleGetQqCode} disabled={qqLoading}>
            {qqLoading ? 'Loading...' : 'Bind QQ'}
          </button>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .tab-link {
    padding: 0.6rem 1rem;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  .tab-link.active {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  h3 {
    margin-bottom: 1rem;
  }
  .field {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f0f0f0;
  }
  .label {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  .create-key {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .create-key input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .create-key button {
    padding: 0.5rem 1rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid #f0f0f0;
    font-size: 0.9rem;
  }
  th {
    color: var(--text-secondary);
    font-weight: 500;
  }
  code {
    background: #f5f5f5;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }
  .danger {
    background: var(--error);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .hint {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  .qq-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .qq-section h4 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  .qq-section button:not(.danger) {
    padding: 0.6rem 1rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    font-weight: 600;
    align-self: flex-start;
  }
  .qq-section button:disabled {
    opacity: 0.6;
  }
  .code-box {
    background: #f5f5f5;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    padding: 1rem;
    text-align: center;
  }
  .code {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.15rem;
    margin-bottom: 0.5rem;
    color: var(--primary);
  }
  .error {
    background: #fef2f2;
    color: var(--error);
    padding: 0.7rem;
    border-radius: var(--radius);
    font-size: 0.9rem;
  }
  .success {
    background: #f0fdf4;
    color: var(--success);
    padding: 0.7rem;
    border-radius: var(--radius);
    font-size: 0.9rem;
  }
</style>
