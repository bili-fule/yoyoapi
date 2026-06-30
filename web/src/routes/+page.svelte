<svelte:head>
  <title>YoYOapi - AI API Relay</title>
</svelte:head>

<div class="hero">
  <h1>YoYOapi</h1>
  <p class="subtitle">OpenAI / Anthropic / Gemini — 统一 API 中转</p>
  <div class="actions">
    <a href="/register" class="btn btn-primary">Get Started</a>
    <a href="/login" class="btn btn-secondary">Sign In</a>
  </div>
</div>

<div class="features">
  <div class="card">
    <h3>多格式支持</h3>
    <p>OpenAI → Anthropic / Gemini 格式自动转换，一份代码调用所有模型</p>
  </div>
  <div class="card">
    <h3>邮箱登录</h3>
    <p>简单安全的邮箱验证码登录，无需手机号</p>
  </div>
  <div class="card">
    <h3>QQ 绑定</h3>
    <p>绑定 QQ 号，安全风控，防止滥用</p>
  </div>
</div>

<style>
  .hero {
    text-align: center;
    padding: 4rem 0 3rem;
  }
  h1 {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
  }
  .subtitle {
    color: var(--text-secondary);
    font-size: 1.2rem;
    margin-bottom: 2rem;
  }
  .actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  .btn {
    padding: 0.75rem 2rem;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
  }
  .btn-primary {
    background: var(--primary);
    color: white;
  }
  .btn-secondary {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
  }
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    padding: 2rem 0;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
  }
  .card h3 {
    margin-bottom: 0.5rem;
  }
  .card p {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
</style>
