<script lang="ts">
  import { auth } from '$lib/stores/auth.js'
  import { onMount } from 'svelte'
  import { getProfile, listApiKeys, createApiKey, deleteApiKey } from '$lib/api/index.js'

  let { data, activeTab: tab } = $props()

  let profile = $state<{
    id: number; email: string; display_name: string; role: number
    quota: number; used_quota: number; qq_id: string
  } | null>(null)
  let apiKeys = $state<{ id: number; keyPrefix: string; name: string; status: number; lastUsedAt: string | null }[]>([])
  let loading = $state(true)
  let newKeyName = $state('')

  onMount(async () => {
    if (!$auth.token) return
    try {
      const [profileRes, keysRes] = await Promise.all([
        getProfile($auth.token),
        listApiKeys($auth.token),
      ])
      profile = profileRes.user
      apiKeys = keysRes.apiKeys as any
    } catch (err) {
      console.error(err)
    } finally {
      loading = false
    }
  })

  async function handleCreateKey() {
    if (!$auth.token) return
    try {
      const res = await createApiKey($auth.token, newKeyName || undefined) as any
      apiKeys = [...apiKeys, res.apiKey]
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


</script>

{#if loading}
  <p>Loading...</p>
{:else}
  {#if tab === 'Profile' && profile}
    <div class="card">
      <h3>Profile</h3>
      <div class="field"><span class="label">Email</span><span>{profile.email}</span></div>
      <div class="field"><span class="label">Display Name</span><span>{profile.display_name}</span></div>
      <div class="field"><span class="label">Role</span><span>{profile.role === 10 ? 'Admin' : 'User'}</span></div>
      <div class="field"><span class="label">Quota Used</span><span>{profile.used_quota} / {profile.quota}</span></div>
      <div class="field"><span class="label">QQ Bind</span><span>{profile.qq_id ? `Bound (${profile.qq_id})` : 'Not bound'}</span></div>
    </div>
  {/if}

  {#if tab === 'API Keys'}
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
              <td>{key.name || '—'}</td>
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

  {#if tab === 'Settings'}
    <div class="card">
      <h3>Settings</h3>
      <p class="hint">More settings coming soon.</p>
    </div>
  {/if}
{/if}

<style>
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
</style>
