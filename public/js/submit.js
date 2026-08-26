/* ═══════════════════════════════════════════════════
   submit.js — tool submission form.
   Posts to /api/submit-tool. Depends on utils.js.
   ═══════════════════════════════════════════════════ */

(function initSubmit() {
  const wrap = document.getElementById('submitWrap');
  if (!wrap) return;

  const nameInput = document.getElementById('toolName');
  const urlInput = document.getElementById('toolUrl');
  const catSelect = document.getElementById('toolCategory');
  const descInput = document.getElementById('toolDesc');
  const emailInput = document.getElementById('toolEmail');
  const submitBtn = document.getElementById('submitBtn');

  let selectedPricing = 'free';

  function setError(id, msg) {
    document.getElementById(id).textContent = msg;
  }

  function clearErrors() {
    ['errName', 'errUrl', 'errCategory', 'errDesc', 'errEmail', 'formError'].forEach(id => setError(id, ''));
  }

  function validate() {
    let valid = true;
    clearErrors();

    if (!nameInput.value.trim()) {
      setError('errName', 'Tool name is required.');
      valid = false;
    }
    const urlVal = urlInput.value.trim();
    if (!urlVal) {
      setError('errUrl', 'Website URL is required.');
      valid = false;
    } else {
      try {
        const u = new URL(urlVal);
        if (!/^https?:$/.test(u.protocol)) throw new Error();
      } catch (e) {
        setError('errUrl', 'Enter a valid URL like https://example.com');
        valid = false;
      }
    }
    if (!catSelect.value) {
      setError('errCategory', 'Please select a category.');
      valid = false;
    }
    if (!descInput.value.trim()) {
      setError('errDesc', 'Short description is required.');
      valid = false;
    }
    if (emailInput.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
      setError('errEmail', 'Enter a valid email address.');
      valid = false;
    }
    return valid;
  }

  /* Pricing pills */
  document.querySelectorAll('.pricing-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.pricing-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const radio = opt.querySelector('input');
      radio.checked = true;
      selectedPricing = radio.value;
    });
  });

  /* Char counter */
  descInput.addEventListener('input', () => {
    document.getElementById('charCount').textContent = descInput.value.length;
  });

  submitBtn.addEventListener('click', async () => {
    if (!validate()) return;

    const payload = {
      name: nameInput.value.trim(),
      url: urlInput.value.trim(),
      category: catSelect.value,
      short_desc: descInput.value.trim(),
      pricing: selectedPricing,
      email: emailInput.value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader-spinner" style="width:16px;height:16px;"></span> Submitting...';

    try {
      const res = await fetch(`${API}/api/submit-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('bad status');
      wrap.innerHTML = `
        <div class="form-success">
          <div class="success-icon">&#9989;</div>
          <h2>Tool Submitted!</h2>
          <p>We&rsquo;ll review it within 24 hours.</p>
          <a class="btn btn-accent" href="/">&larr; Back to Directory</a>
        </div>`;
    } catch (e) {
      setError('formError', '&#10060; Failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Tool';
    }
  });

  setupNewsletter();
})();
