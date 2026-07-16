/*
  Auth Script (auth.js) with Firebase Backend Integration
*/

// ── FIREBASE CONFIGURATION ──────────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {

  // ── Tab switching ─────────────────────────────────────────
  const tabBtns   = document.querySelectorAll('.auth-tabs__btn');
  const panels    = document.querySelectorAll('.auth-panel');
  const heading   = document.getElementById('auth-heading');
  const subheading = document.getElementById('auth-subheading');

  const mobileBrand = document.getElementById('mobile-brand');
  if (window.innerWidth <= 768 && mobileBrand) {
    mobileBrand.style.display = 'flex';
  }

  const headings = {
    signin:   { h: 'Welcome back',      s: 'Sign in to access your campus dashboard.' },
    register: { h: 'Create your account', s: 'Join Campus Connect — it only takes a minute.' },
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => {
        b.classList.remove('auth-tabs__btn--active');
        b.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => {
        p.classList.remove('auth-panel--active');
        p.hidden = true;
      });

      btn.classList.add('auth-tabs__btn--active');
      btn.setAttribute('aria-selected', 'true');

      const target = document.getElementById(`panel-${tab}`);
      if (target) { target.classList.add('auth-panel--active'); target.hidden = false; }

      if (heading)    heading.textContent    = headings[tab]?.h || '';
      if (subheading) subheading.textContent = headings[tab]?.s || '';
    });
  });

  // ── Password toggle ───────────────────────────────────────
  document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  });

  // ── Password strength meter ───────────────────────────────
  const pwdInput    = document.getElementById('reg-password');
  const strengthBar = document.getElementById('strength-bar');
  const strengthLbl = document.getElementById('strength-label');

  if (pwdInput && strengthBar) {
    pwdInput.addEventListener('input', () => {
      const v = pwdInput.value;
      let score = 0;
      if (v.length >= 8)           score++;
      if (/[A-Z]/.test(v))         score++;
      if (/[0-9]/.test(v))         score++;
      if (/[^A-Za-z0-9]/.test(v))  score++;

      const levels = [
        { w: '0%',   bg: 'transparent',           label: '' },
        { w: '33%',  bg: 'var(--danger)',           label: 'Weak' },
        { w: '66%',  bg: 'var(--warning)',          label: 'Fair' },
        { w: '100%', bg: 'var(--success)',          label: 'Strong' },
      ];
      const lvl = score === 0 ? 0 : score <= 2 ? 1 : score === 3 ? 2 : 3;
      strengthBar.style.width      = levels[lvl].w;
      strengthBar.style.background = levels[lvl].bg;
      if (strengthLbl) strengthLbl.textContent = levels[lvl].label ? `Strength: ${levels[lvl].label}` : '';
    });
  }

  // ── Form validation helper ────────────────────────────────
  function validate(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    let ok = true;
    form.querySelectorAll('[required]').forEach(el => {
      const invalid = el.type === 'checkbox' ? !el.checked : !el.value.trim();
      el.style.borderColor = invalid ? 'var(--danger)' : '';
      if (invalid) ok = false;
    });
    return ok;
  }

  // ── Sign in (Firebase Integration) ────────────────────────
  const signinForm = document.getElementById('signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate('signin-form')) { showToast('Fill in all required fields.', 'error'); return; }

      const email = document.getElementById('signin-email').value; // पक्का करें कि HTML में यह ID हो
      const password = document.getElementById('signin-password').value; // पक्का करें कि HTML में यह ID हो
      const role = document.getElementById('signin-role').value;

      showToast(`Attempting sign in as ${role}…`);

      // FIREBASE AUTH SIGN IN
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          showToast('Login Successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = role === 'admin' ? 'admin.html' : 'student.html';
          }, 1000);
        })
        .catch((error) => {
          showToast(error.message, 'error');
        });
    });
  }

  // ── Register (Firebase Integration) ───────────────────────
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate('register-form')) { showToast('Fill in all required fields.', 'error'); return; }

      const email = document.getElementById('reg-email').value; // पक्का करें कि HTML में यह ID हो
      const pwd     = document.getElementById('reg-password').value;
      const confirm = document.getElementById('reg-confirm').value;
      const first = document.getElementById('reg-firstname').value;

      if (pwd !== confirm) {
        document.getElementById('reg-confirm').style.borderColor = 'var(--danger)';
        showToast('Passwords do not match.', 'error');
        return;
      }

      showToast('Creating account...');

      // FIREBASE AUTH CREATE USER
      auth.createUserWithEmailAndPassword(email, pwd)
        .then((userCredential) => {
          showToast(`Account created! Welcome, ${first} 🎉`, 'success');
          setTimeout(() => {
            registerForm.reset();
            document.querySelector('[data-tab="signin"]')?.click();
          }, 1800);
        })
        .catch((error) => {
          showToast(error.message, 'error');
        });
    });
  }

  // ── Toast utility ─────────────────────────────────────────
  function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className   = `toast toast--show toast--${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3000);
  }

  window.showToast = showToast;
});