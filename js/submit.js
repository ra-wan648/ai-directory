/* Submit tool page */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const wrap = document.getElementById('submitWrap');
const nameInput = document.getElementById('toolName');
const urlInput = document.getElementById('toolUrl');
const catSelect = document.getElementById('toolCategory');
const descInput = document.getElementById('toolDesc');
const emailInput = document.getElementById('toolEmail');
const submitBtn = document.getElementById('submitBtn');

let selectedPricing = '';

function setError(id, msg) {
  document.getElementById(id).textContent = msg;
}

function clearErrors() {
  ['errName', 'errUrl', 'errCategory', 'errDesc', 'errEmail', 'formError'].forEach(id => {
    setError(id, '');
  });
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
  if (emailInput.value.trim()) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(emailInput.value.trim())) {
      setError('errEmail', 'Enter a valid email address.');
      valid = false;
    }
  }
  return valid;
}

/* Pricing pill toggles */
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
    const res = await fetch('/api/submit-tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('bad status');
    wrap.innerHTML = `
      <div class="form-success">
        <div style="font-size:48px;">✅</div>
        <h2>Tool Submitted!</h2>
        <p>We'll review it within 24 hours.</p>
        <a class="btn btn-accent" href="index.html">← Back to Directory</a>
      </div>`;
  } catch (e) {
    setError('formError', '❌ Failed. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Tool';
  }
});
