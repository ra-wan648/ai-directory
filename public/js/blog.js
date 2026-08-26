/* ═══════════════════════════════════════════════════
   blog.js — blog listing (/blog) + post page (/post/:slug).
   Depends on utils.js.
   ═══════════════════════════════════════════════════ */

/* ─────────── BLOG LISTING ─────────── */
(function initBlogPage() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  const pagination = document.getElementById('pagination');
  let activeTab = 'all';
  let currentPage = 1;

  function renderBlogCard(b) {
    const catClass = ['review', 'tutorial', 'news'].includes(b.category) ? b.category : 'review';
    return `
      <div class="blog-card" data-slug="${escapeHtml(b.slug)}">
        <div class="blog-eyebrow ${catClass}">${escapeHtml(b.category || 'post')}</div>
        <div class="blog-title">${escapeHtml(b.title)}</div>
        <div class="blog-meta">${formatDate(b.published_at)} · ${readTime(b.content)} min read</div>
      </div>`;
  }

  async function fetchBlogs(page = 1) {
    currentPage = page;
    grid.innerHTML = '<div class="skeleton" style="height:140px;"></div>'.repeat(3);
    try {
      const data = await fetchJSON(`${API}/api/blogs?category=${encodeURIComponent(activeTab)}&page=${page}&limit=12`);
      const blogs = data.blogs || [];
      grid.innerHTML = '';
      if (!blogs.length) {
        grid.innerHTML = '<div class="empty-state" style="padding:30px;">No posts yet</div>';
        pagination.innerHTML = '';
        return;
      }
      blogs.forEach(b => grid.insertAdjacentHTML('beforeend', renderBlogCard(b)));
      grid.querySelectorAll('.blog-card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `/post/${encodeURIComponent(card.dataset.slug)}`;
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
      <button class="btn btn-ghost" id="prevBtn" ${page <= 1 ? 'disabled' : ''}>&larr; Prev</button>
      <span>Page ${page} of ${totalPages}</span>
      <button class="btn btn-ghost" id="nextBtn" ${page >= totalPages ? 'disabled' : ''}>Next &rarr;</button>`;

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

  document.querySelectorAll('[data-blog-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-blog-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.blogTab;
      fetchBlogs(1);
    });
  });

  fetchBlogs(1);
  setupNewsletter();
})();

/* ─────────── POST PAGE ─────────── */
(function initPostPage() {
  const article = document.getElementById('postArticle');
  if (!article) return;

  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug) {
    article.innerHTML = '<div class="empty-state">No post specified.</div>';
    return;
  }

  const breadcrumb = document.getElementById('breadcrumb');

  function injectJSONLD(faqSchema) {
    let schema = null;
    try { schema = faqSchema ? JSON.parse(faqSchema) : null; } catch (e) { schema = null; }
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
    return `
      <div class="faq-section">
        <h2>Frequently Asked Questions</h2>
        ${items.map((item, i) => `
          <div class="faq-item" data-faq>
            <button class="faq-q">
              <span class="faq-icon">&#9654;</span>
              <span>${escapeHtml(item.q)}</span>
            </button>
            <div class="faq-a">
              <div class="faq-a-inner">${escapeHtml(item.a)}</div>
            </div>
          </div>`).join('')}
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
      const data = await fetchJSON(`${API}/api/tools/${encodeURIComponent(toolSlug)}`);
      const tool = data.tool;
      if (!tool) { box.innerHTML = ''; return; }
      const domain = getDomain(tool.url);
      const logo = domain
        ? `<img src="${faviconFor(tool.url, 64)}" alt="" style="width:26px;height:26px;border-radius:6px;">`
        : `<span style="font-size:20px">${categoryEmoji(tool.category)}</span>`;
      box.innerHTML = `
        <div class="tool-card" style="cursor:pointer;height:auto;min-height:120px;" data-slug="${escapeHtml(tool.slug)}">
          <div class="tool-card-top">
            ${logo}
            <span class="tool-card-name">${escapeHtml(tool.name)}</span>
            ${pricingBadge(tool.pricing)}
          </div>
          <div class="tool-card-desc">${escapeHtml(tool.short_desc || tool.description || '')}</div>
          <div class="tool-card-bottom">
            <span class="tool-card-visit">View Tool &nearr;</span>
          </div>
        </div>`;
      bindCardClicks(box);
    } catch (e) {
      box.innerHTML = '';
    }
  }

  async function fetchPost(slug) {
    article.innerHTML = '<div class="empty-state" style="padding:40px;"><span class="loader-spinner"></span> Loading...</div>';
    try {
      const data = await fetchJSON(`${API}/api/blogs/${encodeURIComponent(slug)}`);
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

    injectJSONLD(blog.faq_schema);

    if (breadcrumb) {
      breadcrumb.innerHTML = `<a href="/">Home</a><span class="sep">&rsaquo;</span><a href="/blog">Blog</a><span class="sep">&rsaquo;</span><span>${escapeHtml(blog.title)}</span>`;
    }

    let faqItems = [];
    try { faqItems = blog.faq_schema ? JSON.parse(blog.faq_schema) : []; } catch (e) { faqItems = []; }

    const catClass = ['review', 'tutorial', 'news'].includes(blog.category) ? blog.category : 'review';
    article.innerHTML = `
      <div class="post-header">
        <span class="blog-eyebrow ${catClass}">${escapeHtml(blog.category || 'post')}</span>
        <h1 class="post-title">${escapeHtml(blog.title)}</h1>
        <div class="post-meta">
          <span>${formatDate(blog.published_at)}</span>
          <span>·</span>
          <span>${readTime(blog.content)} min read</span>
          ${blog.focus_keyword ? `<span class="keyword-tag">${escapeHtml(blog.focus_keyword)}</span>` : ''}
        </div>
      </div>
      <article class="prose">${blog.content || ''}</article>
      ${renderFAQ(faqItems)}`;

    setupAccordion();
    fetchRelatedTool(blog.tool_slug);
  }

  fetchPost(slug);
})();
