<script lang="ts">
  import { login } from '$lib/api/index.js'
  import { setAuth } from '$lib/stores/auth.js'
  import { goto } from '$app/navigation'

  let email = $state('')
  let password = $state('')
  let error = $state('')
  let loading = $state(false)

  async function handleLogin(e: Event) {
    e.preventDefault()
    error = ''
    loading = true
    try {
      const result = await login(email, password)
      setAuth(result.apiKey, result.user as any)
      goto('/dashboard')
    } catch (err) {
      error = err instanceof Error ? err.message : 'Login failed'
    } finally {
      loading = false
    }
  }
</script>

<svelte:head>
  <title>Login - YoYOapi</title>
</svelte:head>

<div class="form-page">
  <h2>Sign In</h2>
  <form onsubmit={handleLogin}>
    {#if error}
      <div class="error">{error}</div>
    {/if}
    <label>
      Email
      <input type="email" bind:value={email} required placeholder="you@example.com" />
    </label>
    <label>
      Password
      <input type="password" bind:value={password} required placeholder="••••••••" />
    </label>
    <button type="submit" disabled={loading}>
      {loading ? 'Signing in...' : 'Sign In'}
    </button>
    <p class="hint">
      <a href="/reset-password">Forgot password?</a>
    </p>
    <p class="hint">
      Don't have an account? <a href="/register">Register</a>
    </p>
  </form>
</div>

<style>
  .form-page {
    max-width: 400px;
    margin: 2rem auto;
  }
  h2 {
    margin-bottom: 1.5rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  input {
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  button {
    padding: 0.7rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
  }
  .error {
    background: #fef2f2;
    color: var(--error);
    padding: 0.7rem;
    border-radius: var(--radius);
    font-size: 0.9rem;
  }
  .hint {
    text-align: center;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
</style>
