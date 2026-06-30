<script lang="ts">
  import { register, sendCode } from '$lib/api/index.js'
  import { setAuth } from '$lib/stores/auth.js'
  import { goto } from '$app/navigation'

  let step = $state<'code' | 'register'>('code')
  let email = $state('')
  let code = $state('')
  let password = $state('')
  let error = $state('')
  let loading = $state(false)
  let codeSent = $state(false)
  let countdown = $state(0)
  let timer: ReturnType<typeof setInterval> | null = null

  async function handleSendCode(e: Event) {
    e.preventDefault()
    error = ''
    loading = true
    try {
      await sendCode(email, 'register')
      codeSent = true
      step = 'register'
      countdown = 60
      timer = setInterval(() => {
        countdown--
        if (countdown <= 0 && timer) clearInterval(timer)
      }, 1000)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to send code'
    } finally {
      loading = false
    }
  }

  async function handleRegister(e: Event) {
    e.preventDefault()
    error = ''
    loading = true
    try {
      const result = await register(email, password, code)
      setAuth(result.apiKey, result.user as any)
      goto('/dashboard')
    } catch (err) {
      error = err instanceof Error ? err.message : 'Registration failed'
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Register - YoYOapi</title>
</svelte:head>

<div class="form-page">
  <h2>Create Account</h2>

  {#if step === 'code'}
    <form onsubmit={handleSendCode}>
      {#if error}
        <div class="error">{error}</div>
      {/if}
      <label>
        Email
        <input type="email" bind:value={email} required placeholder="you@example.com" />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Verification Code'}
      </button>
    </form>
  {:else}
    <form onsubmit={handleRegister}>
      {#if error}
        <div class="error">{error}</div>
      {/if}
      <p class="info">Verification code sent to {email}</p>
      <label>
        Verification Code
        <input type="text" bind:value={code} required maxlength={6} placeholder="123456" />
      </label>
      <label>
        Password
        <input type="password" bind:value={password} required minlength={6} placeholder="At least 6 characters" />
      </label>
      <button type="submit" disabled={loading || password.length < 6}>
        {loading ? 'Creating...' : 'Create Account'}
      </button>
      {#if countdown > 0}
        <p class="hint">Resend code in {countdown}s</p>
      {:else}
        <button type="button" class="link-btn" onclick={() => { step = 'code'; codeSent = false }}>
          Resend code
        </button>
      {/if}
    </form>
  {/if}

  <p class="hint">
    Already have an account? <a href="/login">Sign In</a>
  </p>
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
  .link-btn {
    background: none;
    color: var(--primary);
    padding: 0;
    font-weight: normal;
    font-size: 0.85rem;
  }
  .error {
    background: #fef2f2;
    color: var(--error);
    padding: 0.7rem;
    border-radius: var(--radius);
    font-size: 0.9rem;
  }
  .info {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  .hint {
    text-align: center;
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 0.5rem;
  }
</style>
