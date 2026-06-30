<script lang="ts">
  import { auth } from '$lib/stores/auth.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'

  let { children } = $props()

  onMount(() => {
    if (!$auth.token) {
      goto('/login')
    }
  })
</script>

{#if $auth.token}
  <div class="layout">
    <aside class="sidebar">
      <div class="user-info">
        <strong>{$auth.user?.display_name || $auth.user?.email}</strong>
        <span class="role">{$auth.user?.role === 10 ? 'Admin' : 'User'}</span>
      </div>
    </aside>
    <div class="content">
      {@render children()}
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
  .content {
    flex: 1;
    min-width: 0;
  }
</style>
