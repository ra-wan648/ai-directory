/* Blog and post pages */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function readTime(content) {
  const words = String(content || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function categoryClass(cat) {
  return ['review', 'tutorial', 'news'].includes(cat) ? cat : 'review';
}

/* ─────────── BLOG LISTING (blog.html) ─────────── */
(function initBlogPage() {
  if (!document.getElementById('blogGrid')) return;

  const grid = document.getElementById('blogGrid');
  const pagination = document.getElementById('pagination');
  let activeTab = 'all';
  let currentPage = 1;

  function renderBlogCard(b) {
    return `
      <div class="blog-card" data-slug="${escapeHtml(b.slug)}">
        <div class="blog-eyebrow ${categoryClass(b.category)}">${escapeHtml(b.category)}</div>
        <div class="blog-title">${escapeHtml(b.title)}</div>
        <div class="blog-meta">${formatDate(b.published_at)} · ${readTime(b.content)} min read</div>
      </div>`;
  }

  async function fetchBlogs(page = 1) {
    currentPage = page;
    grid.innerHTML = '<div class="skeleton" style="height:140px;"></div>'.repeat(3);
    try {
      const url = `/api/blogs?category=${encodeURIComponent(activeTab)}&page=${page}&limit=12`;
      const data = await (await fetch(url)).json();
      const blogs = data.blogs || [];
      grid.innerHTML = '';
      if (blogs.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="padding:30px;">No posts yet</div>';
        pagination.innerHTML = '';
        return;
      }
      blogs.forEach(b => grid.insertAdjacentHTML('beforeend', renderBlogCard(b)));

      grid.querySelectorAll('.blog-card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `post.html?slug=${encodeURIComponent(card.dataset.slug)}`;
        });
      });

      renderPagination(data.total || 0, page);
    } catch (e) {
      grid.innerHTML = '<div class="empty-state">Failed to load posts.</div>';
      pagination.innerHTML = '';
    }
  }

  function renderPagination(total, page) {
    const totalPages = Math.max(1, Math.ceil(total / 12));
    pagination.innerHTML = `
      <button class="btn" id="prevBtn" ${page <= 1 ? 'disabled' : ''}>← Prev</button>
      <span>Page ${page} of ${totalPages}</span>
      <button class="btn" id="nextBtn" ${page >= totalPages ? 'disabled' : ''}>Next →</button>`;

    document.getElementById('prevBtn').addEventListener('click', () => {
      if (currentPage > 1) {
        fetchBlogs(currentPage - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    document.getElementById('nextBtn').addEventListener('click', () => {
      if (currentPage < totalPages) {
        fetchBlogs(currentPage + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  function setupTabs() {
    document.querySelectorAll('[data-blog-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-blog-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.blogTab;
        fetchBlogs(1);
      });
    });
  }

  setupTabs();
  fetchBlogs(1);
})();

/* ─────────── POST PAGE (post.html) ─────────── */
(function initPostPage() {
  if (!document.getElementById('postArticle')) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) {
    document.getElementById('postArticle').innerHTML = '<div class="empty-state">No post specified.</div>';
    return;
  }

  const breadcrumb = document.getElementById('breadcrumb');
  const article = document.getElementById('postArticle');

  function injectJSONLD(blog) {
    let schema = null;
    try {
      schema = blog.faq_schema ? JSON.parse(blog.faq_schema) : null;
    } catch (e) {
      schema = null;
    }
    if (schema && Array.isArray(schema) && schema.length) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: schema.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a }
        }))
      });
      document.head.appendChild(script);
    }
  }

  function renderFAQ(items) {
    if (!items || !items.length) return '';
    const faqItems = items.map((item, i) => `
      <div class="faq-item" data-faq>
        <button class="faq-q">
          <span class="faq-icon">▶</span>
          <span>${escapeHtml(item.q)}</span>
        </button>
        <div class="faq-a">
          <div class="faq-a-inner">${escapeHtml(item.a)}</div>
        </div>
      </div>`).join('');

    return `
      <div class="faq-section">
        <h2>Frequently Asked Questions</h2>
        ${faqItems}
      </div>`;
  }

  function setupAccordion() {
    document.querySelectorAll('[data-faq]').forEach(item => {
      const q = item.querySelector('.faq-q');
      const a = item.querySelector('.faq-a');
      q.addEventListener('click', () => {
        const open = item.classList.toggle('open');
        a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
      });
    });
  }

  async function fetchRelatedTool(toolSlug) {
    const box = document.getElementById('relatedToolBox');
    if (!box || !toolSlug) return;
    try {
      const data = await (await fetch(`/api/tools/${encodeURIComponent(toolSlug)}`)).json();
      const tool = data.tool;
      if (!tool) { box.innerHTML = ''; return; }
      const domain = (() => { try { return new URL(tool.url).hostname; } catch (e) { return ''; } })();
      const logo = domain
        ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64" alt="" style="width:18px;height:18px;border-radius:3px;">`
        : '<span>🤖</span>';
      box.innerHTML = `
        <div class="tool-card" style="height:auto;min-height:110px;" onclick="location.href='tool.html?slug=${encodeURIComponent(tool.slug)}'">
          <div class="tool-card-top">
            ${logo}
            <span class="tool-card-name">${escapeHtml(tool.name)}</span>
            <span class="badge badge-${escapeHtml(tool.pricing)}">${escapeHtml(tool.pricing)}</span>
          </div>
          <div class="tool-card-desc" style="line-clamp:2;">${escapeHtml(tool.short_desc || tool.description || '')}</div>
          <div class="tool-card-visit">Visit ↗</div>
        </div>`;
    } catch (e) {
      box.innerHTML = '';
    }
  }

  async function fetchPost(slug) {
    article.innerHTML = '<div class="empty-state" style="padding:40px;"><span class="loader-spinner"></span> Loading...</div>';
    try {
      const data = await (await fetch(`/api/blogs/${encodeURIComponent(slug)}`)).json();
      const blog = data.blog;
      if (!blog) {
        article.innerHTML = '<div class="empty-state">Post not found.</div>';
        return;
      }
      renderPost(blog);
    } catch (e) {
      article.innerHTML = '<div class="empty-state">Failed to load post.</div>';
    }
  }

  function renderPost(blog) {
    document.title = blog.title || document.title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && blog.meta_description) metaDesc.setAttribute('content', blog.meta_description);

    injectJSONLD(blog);

    if (breadcrumb) {
      breadcrumb.innerHTML = `<a href="index.html">Home</a><span class="sep">›</span><a href="blog.html">Blog</a><span class="sep">›</span><span>${escapeHtml(blog.title)}</span>`;
    }

    let faqHtml = '';
    let faqItems = [];
    try {
      faqItems = blog.faq_schema ? JSON.parse(blog.faq_schema) : [];
    } catch (e) {
      faqItems = [];
    }
    faqHtml = renderFAQ(faqItems);

    article.innerHTML = `
      <div class="post-header">
        <span class="blog-eyebrow ${categoryClass(blog.category)}">${escapeHtml(blog.category)}</span>
        <h1 class="post-title">${escapeHtml(blog.title)}</h1>
        <div class="post-meta">
          <span>${formatDate(blog.published_at)}</span>
          <span>·</span>
          <span>${readTime(blog.content)} min read</span>
          ${blog.focus_keyword ? `<span class="keyword-tag">${escapeHtml(blog.focus_keyword)}</span>` : ''}
        </div>
      </div>
      <article class="prose">${blog.content || ''}</article>
      ${faqHtml}`;

    setupAccordion();
    fetchRelatedTool(blog.tool_slug);
  }

  fetchPost(slug);
})();
