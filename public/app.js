(function () {
  const toastContainer = document.getElementById('toast-container');

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(message, type) {
    type = type || 'info';
    if (!toastContainer) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateY(0.5rem)';
      el.style.transition = 'opacity 0.25s, transform 0.25s';
      setTimeout(function () { el.remove(); }, 250);
    }, 3000);
  }

  window.toast = toast;

  document.querySelectorAll('.nav-link').forEach(function (a) {
    if (a.pathname === window.location.pathname) {
      a.setAttribute('aria-current', 'page');
    }
  });

  function updateCountdowns() {
    document.querySelectorAll('[data-countdown][data-next-scan]').forEach(function (el) {
      const ts = el.dataset.nextScan;
      if (!ts) { el.textContent = '—'; return; }
      const next = new Date(ts).getTime();
      const now = Date.now();
      const diff = next - now;
      if (diff <= 0) { el.textContent = 'soon'; return; }
      const totalSeconds = Math.floor(diff / 1000);
      const s = totalSeconds % 60;
      const m = Math.floor(totalSeconds / 60) % 60;
      const h = Math.floor(totalSeconds / 3600);
      if (h > 0) el.textContent = h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
      else if (m > 0) el.textContent = m + 'm ' + (s < 10 ? '0' : '') + s + 's';
      else el.textContent = s + 's';
    });
  }

  setInterval(updateCountdowns, 1000);
  updateCountdowns();

  function updateMetric(name, delta) {
    const el = document.querySelector('[data-metric="' + name + '"]');
    if (!el) return;
    const current = parseInt(el.textContent, 10) || 0;
    el.textContent = Math.max(0, current + delta);
  }

  const svgs = {
    check: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>',
    undo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a.75.75 0 010 1.5H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clip-rule="evenodd"/></svg>',
    eye: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM15 10a5 5 0 11-10 0 5 5 0 0110 0z" clip-rule="evenodd"/></svg>',
    eyeSlash: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2.695 14.3l1.66-1.66a4.5 4.5 0 010-6.364l-1.66-1.66A6.98 6.98 0 000 10c0 1.953.796 3.72 2.083 4.996L2.695 14.3zm10.6-10.6l1.66 1.66a4.5 4.5 0 010 6.364l1.66 1.66A6.98 6.98 0 0020 10c0-1.953-.796-3.72-2.083-4.996l-1.66 1.66zM10 5a5 5 0 00-5 5 5 5 0 005 5 5 5 0 005-5 5 5 0 00-5-5zm0 8a3 3 0 01-3-3 3 3 0 013-3 3 3 0 013 3 3 3 0 01-3 3z"/><path d="M1.293 1.293a1 1 0 011.414 0l16 16a1 1 0 01-1.414 1.414l-16-16a1 1 0 010-1.414z"/></svg>'
  };

  function badgeHtml(state, needsReply) {
    if (state === 'done') return '<span class="badge done">Done</span>';
    if (state === 'ignored') return '<span class="badge ignored">Ignored</span>';
    if (needsReply) return '<span class="badge needs-reply">Needs reply</span>';
    return '<span class="badge ok">OK</span>';
  }

  function actionForm(id, name, command) {
    const encId = encodeURIComponent(id);
    const safeName = escapeHtml(name);
    const titles = { done: 'Mark done', ignored: 'Ignore', unignore: 'Unignore', undone: 'Undo done' };
    const classes = { done: 'btn btn-icon btn-primary', ignored: 'btn btn-icon btn-ghost', unignore: 'btn btn-icon btn-ghost', undone: 'btn btn-icon btn-ghost' };
    const icons = { done: svgs.check, ignored: svgs.eyeSlash, unignore: svgs.eye, undone: svgs.undo };
    const display = command === 'ignored' ? 'ignore' : command;
    return '<form method="POST" action="/chats/' + encId + '/' + display + '" class="chat-action-form">' +
      '<input type="hidden" name="name" value="' + safeName + '">' +
      '<button type="submit" class="' + classes[command] + '" title="' + titles[command] + '" aria-label="' + titles[command] + '">' + icons[command] + '</button>' +
      '</form>';
  }

  function actionFormsHtml(state, id, name) {
    if (state === 'ignored') {
      return actionForm(id, name, 'unignore') + actionForm(id, name, 'done');
    }
    if (state === 'done') {
      return actionForm(id, name, 'undone') + actionForm(id, name, 'ignored');
    }
    return actionForm(id, name, 'done') + actionForm(id, name, 'ignored');
  }

  function setChatState(card, state) {
    card.dataset.state = state || '';
    const needsReply = card.dataset.needsReply === '1';
    const statusEl = card.querySelector('.chat-status');
    if (statusEl) statusEl.innerHTML = badgeHtml(state, needsReply);
    const actionsEl = card.querySelector('.chat-actions');
    if (actionsEl) {
      actionsEl.dataset.state = state || '';
      actionsEl.innerHTML = actionFormsHtml(state, card.dataset.chatId, card.dataset.chatName || card.dataset.chatId);
      bindChatForms(actionsEl);
    }
    const extras = card.querySelector('.chat-extras');
    if (!extras) return;
    const existing = extras.querySelector('.state-note');
    if (existing) existing.remove();
    if (state === 'done') {
      extras.insertAdjacentHTML('afterbegin', '<div class="state-note">Resets when they reply or after 30 days</div>');
    } else if (state === 'ignored') {
      extras.insertAdjacentHTML('afterbegin', '<div class="state-note">Ignored until you change it</div>');
    }
  }

  function onChatAction(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const card = form.closest('.chat-card');
    if (!card) { form.submit(); return; }
    const match = form.getAttribute('action').match(/\/(done|undone|ignore|unignore)$/);
    if (!match) { form.submit(); return; }
    const command = match[1];
    const nextState = { done: 'done', ignore: 'ignored', undone: null, unignore: null }[command];
    const currentState = card.dataset.state || null;
    const needsReply = card.dataset.needsReply === '1';
    const wasUrgent = needsReply && !currentState;
    const willBeUrgent = needsReply && !nextState;
    if (wasUrgent && !willBeUrgent) updateMetric('urgent', -1);
    if (!wasUrgent && willBeUrgent) updateMetric('urgent', 1);
    if (currentState && !nextState) updateMetric('snoozed', -1);
    if (!currentState && nextState) updateMetric('snoozed', 1);
    card.classList.add('is-updating');
    const body = new URLSearchParams(new FormData(form));
    fetch(form.getAttribute('action'), { method: 'POST', body: body })
      .then(function (res) { if (!res.ok) throw new Error('Request failed'); })
      .then(function () {
        const messages = { done: 'Marked as done', ignore: 'Chat ignored', undone: 'Done state reset', unignore: 'Chat unignored' };
        toast(messages[command], 'success');
        setChatState(card, nextState);
      })
      .catch(function () {
        toast('Action failed. Please try again.', 'error');
      })
      .finally(function () {
        card.classList.remove('is-updating');
      });
  }

  function bindChatForms(root) {
    root.querySelectorAll('.chat-action-form').forEach(function (form) {
      form.addEventListener('submit', onChatAction);
    });
  }

  bindChatForms(document);

  function initThemeToggle() {
    const html = document.documentElement;
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const sun = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    function updateIcon() {
      const isLight = html.getAttribute('data-theme') === 'light';
      if (sun) sun.style.display = isLight ? 'none' : 'block';
      if (moon) moon.style.display = isLight ? 'block' : 'none';
    }
    updateIcon();
    btn.addEventListener('click', function () {
      const isLight = html.getAttribute('data-theme') === 'light';
      const next = isLight ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('respondr-theme', next);
      updateIcon();
    });
  }

  initThemeToggle();

  function initPwa() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js')
        .then(function (registration) {
          initPush(registration);
        })
        .catch(function (err) {
          console.error('Service worker registration failed:', err);
        });
    });
  }

  function initPush(registration) {
    if (!('PushManager' in window)) return;
    const keyMeta = document.querySelector('meta[name="vapid-public-key"]');
    const vapidKey = keyMeta ? keyMeta.content : '';
    if (!vapidKey) return;

    registration.pushManager.getSubscription().then(function (subscription) {
      if (subscription) {
        sendSubscriptionToServer(subscription);
      } else {
        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        }).then(function (sub) {
          sendSubscriptionToServer(sub);
        }).catch(function (err) {
          console.error('Push subscription failed:', err);
        });
      }
    });
  }

  function sendSubscriptionToServer(subscription) {
    fetch('/api/push/subscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    }).then(function (res) {
      if (!res.ok) throw new Error('Subscription save failed');
    }).catch(function (err) {
      console.error('Failed to send push subscription:', err);
    });
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from(raw.split('').map(function (c) { return c.charCodeAt(0); }));
  }

  function initInstallPrompt() {
    const installBtn = document.getElementById('pwa-install');
    if (!installBtn) return;

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.style.display = 'inline-flex';
    });

    installBtn.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        installBtn.style.display = 'none';
        deferredPrompt = null;
      });
    });

    window.addEventListener('appinstalled', function () {
      installBtn.style.display = 'none';
      deferredPrompt = null;
    });
  }

  initPwa();
  initInstallPrompt();
})();
