<script lang="ts">
  import { auth } from '$lib/stores/auth.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'

  onMount(() => {
    if (!$auth.token) {
      goto('/login')
    }
  })

  let tabs = ['Profile', 'API Keys', 'Settings']
  let activeTab = $state('Profile')
</script>

{#if $auth.token}
  <div class="layout">
    <aside class="sidebar">
      <div class="user-info">
        <strong>{$auth.user?.display_name || $auth.user?.email}</strong>
        <span class="role">{$auth.user?.role === 10 ? 'Admin' : 'User'}</span>
      </div>
      <nav>
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
    </aside>
    <div class="content">
      {@render children({ activeTab })}
    </div>
  </div>
{/if}

<style>
  .layout {
    display: flex;
    gap: 2rem;
  }
  .sidebar {
    width: 200px;
    flex-shrink: 0;
  }
  .user-info {
    padding: 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 1rem;
  }
  .user-info strong {
    display: block;
    font-size: 0.95rem;
  }
  .role {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
  .tab-link {
    display: block;
    width: 100%;
    padding: 0.6rem 1rem;
    text-align: left;
    background: none;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  .tab-link.active {
    background: var(--primary);
    color: white;
  }
  .tab-link:hover:not(.active) {
    background: #f0f0f0;
  }
  .content {
    flex: 1;
    min-width: 0;
  }
</style>
