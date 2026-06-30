<svelte:head>
  <title>Page Not Found - YoYOapi</title>
</svelte:head>

<div class="error-page">
  <div class="card">
    <h1>Page Not Found</h1>
    <p class="status">404</p>
    <p class="message">The page you're looking for doesn't exist.</p>
    <a href="/" class="btn">Go Home</a>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2rem;
    text-align: center;
    max-width: 400px;
    width: 100%;
  }
  h1 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  .status {
    font-size: 3rem;
    font-weight: 800;
    color: var(--primary);
    margin-bottom: 0.5rem;
  }
  .message {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }
  .btn {
    display: inline-block;
    padding: 0.7rem 1.5rem;
    background: var(--primary);
    color: white;
    border-radius: var(--radius);
    font-weight: 600;
  }
</style>
