<script lang="ts">
  import '../app.css'
  import { auth, clearAuth } from '$lib/stores/auth.js'

  let { children } = $props()

  function logout() {
    clearAuth()
  }

  let navItems = $derived([
    { href: '/', label: 'Home', show: true },
    { href: '/login', label: 'Login', show: !$auth.token },
    { href: '/register', label: 'Register', show: !$auth.token },
    { href: '/dashboard', label: 'Dashboard', show: !!$auth.token },
  ])
</script>

<header>
  <nav>
    <a href="/" class="logo">YoYOapi</a>
    <div class="nav-links">
      {#each navItems as item}
        {#if item.show}
          <a href={item.href} class="nav-link">{item.label}</a>
        {/if}
      {/each}
      {#if $auth.token}
        <button onclick={logout} class="btn-link">Logout</button>
      {/if}
    </div>
  </nav>
</header>

<main>
  {@render children()}
</main>

<style>
  header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0 1.5rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  nav {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
  }
  .logo {
    font-weight: 700;
    font-size: 1.2rem;
    color: var(--primary);
  }
  .nav-links {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .nav-link {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  .nav-link:hover {
    color: var(--text);
  }
  .btn-link {
    background: none;
    border: none;
    color: var(--error);
    cursor: pointer;
    font-size: 0.9rem;
  }
  main {
    max-width: 960px;
    margin: 2rem auto;
    padding: 0 1.5rem;
  }
</style>
