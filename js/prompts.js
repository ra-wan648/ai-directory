/* Prompts page */

const COMPAT_TOOL_LINKS = {
  'midjourney': 'midjourney',
  'dalle': 'chatgpt',
  'dall-e': 'chatgpt',
  'stable-diffusion': 'stability-ai',
  'sd': 'stability-ai',
  'chatgpt': 'chatgpt',
  'claude': 'claude-ai',
  'gemini': 'gemini',
  'gpt': 'chatgpt',
  'copilot': 'github-copilot'
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let allPrompts = [];
let activeCategory = '';
let searchQuery = '';

function promptCard(p) {
  const tools = String(p.compatible_tools || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  const badges = tools.map(t => {
    const label = t.toUpperCase().replace(/[-_]/g, ' ');
    return `<span class="compat-badge">${escapeHtml(label)}</span>`;
  }).join('');

  const firstTool = tools.find(t => COMPAT_TOOL_LINKS[t]);
  const tryHref = firstTool ? `tool.html?slug=${encodeURIComponent(COMPAT_TOOL_LINKS[firstTool])}` : '#';

  return `
    <div class="prompt-card">
      <div class="prompt-eyebrow">${escapeHtml(p.category || 'prompt')}</div>
      <div class="prompt-title">${escapeHtml(p.title)}</div>
      <div class="prompt-desc">${escapeHtml(p.description || '')}</div>
      <div class="compat-badges">${badges}</div>
      <div class="prompt-actions">
        <button class="btn btn-accent btn-sm" data-copy="${p.id}" data-text="${escapeHtml(p.prompt_text || '')}">📋 COPY</button>
        ${firstTool ? `<a class="btn btn-ghost btn-sm" href="${tryHref}">TRY IT →</a>` : ''}
      </div>
    </div>`;
}

function renderPrompts() {
  const grid = document.getElementById('promptGrid');
  const empty = document.getElementById('promptEmpty');

  let filtered = allPrompts;
  if (activeCategory) {
    filtered = filtered.filter(p => (p.category || '').toLowerCase() === activeCategory.toLowerCase());
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => {
      return (p.title || '').toLowerCase().includes(q) ||
             (p.description || '').toLowerCase().includes(q) ||
             (p.prompt_text || '').toLowerCase().includes(q);
    });
  }

  grid.innerHTML = filtered.map(promptCard).join('');
  empty.style.display = filtered.length === 0 ? 'block' : 'none';

  grid.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.copy;
      const text = btn.dataset.text;
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      fetch(`/api/prompts/copy/${id}`, { method: 'POST' }).catch(() => {});
      btn.classList.add('btn-copied');
      btn.textContent = '✅ Copied!';
      setTimeout(() => {
        btn.classList.remove('btn-copied');
        btn.textContent = '📋 COPY';
      }, 2000);
    });
  });
}

async function loadPrompts() {
  const grid = document.getElementById('promptGrid');
  try {
    const data = await (await fetch('/api/prompts?limit=100')).json();
    allPrompts = data.prompts || [];
    renderPrompts();
  } catch (e) {
    grid.innerHTML = '<div class="empty-state" style="padding:30px;">Failed to load prompts.</div>';
  }
}

function setup() {
  document.getElementById('promptSearch').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderPrompts();
  });

  document.querySelectorAll('[data-pcat]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-pcat]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.pcat;
      renderPrompts();
    });
  });
}

setup();
loadPrompts();
