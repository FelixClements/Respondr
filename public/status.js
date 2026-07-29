(function () {
  const publicPages = ['/login', '/setup'];
  if (publicPages.indexOf(window.location.pathname) !== -1) {
    return;
  }

  const labels = {
    ready: 'Connected',
    awaiting_qr: 'Waiting for QR',
    authenticated: 'Authenticating',
    initializing: 'Initializing',
    disconnected: 'Disconnected',
    puppeteer_error: 'Puppeteer error',
    auth_failure: 'Auth failure'
  };

  const badgeClass = {
    ready: 'connected',
    awaiting_qr: 'waiting',
    authenticated: 'waiting',
    initializing: 'initializing',
    disconnected: 'disconnected',
    puppeteer_error: 'disconnected',
    auth_failure: 'disconnected'
  };

  function renderIcon(container, name, health) {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    let existing = container.querySelector('[data-service="' + name + '"]');
    if (!existing) {
      existing = document.createElement('span');
      existing.className = 'status-icon';
      existing.dataset.service = name;
      container.appendChild(existing);
    }
    existing.className = 'status-icon ' + (health.ok ? 'ok' : 'error');
    existing.textContent = label + ': ' + (health.ok ? 'OK' : 'DOWN');
    existing.title = label + ': ' + health.detail;
  }

  function fetchWithTimeout(url, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    return new Promise(function (resolve, reject) {
      const controller = new AbortController();
      const id = setTimeout(function () { controller.abort(); }, timeoutMs);
      fetch(url, { signal: controller.signal })
        .then(function (res) { clearTimeout(id); resolve(res); })
        .catch(function (err) { clearTimeout(id); reject(err); });
    });
  }

  async function updateStatus() {
    const badge = document.getElementById('connection-badge');
    const iconContainer = document.getElementById('status-icons');

    try {
      const res = await fetchWithTimeout('/api/status');
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      const statusKey = data.status || 'disconnected';

      if (badge) {
        badge.textContent = labels[statusKey] || statusKey;
        badge.className = 'status-badge ' + (badgeClass[statusKey] || 'disconnected');
      }

      if (iconContainer && data.health) {
        renderIcon(iconContainer, 'whatsapp', data.health.whatsapp);
        renderIcon(iconContainer, 'chrome', data.health.chrome);
        renderIcon(iconContainer, 'puppeteer', data.health.puppeteer);
      }

      document.querySelectorAll('[data-next-scan]').forEach(function (el) {
        el.dataset.nextScan = data.nextScan ? new Date(data.nextScan).toISOString() : '';
      });
    } catch (e) {
      if (badge) {
        badge.textContent = 'Status unavailable';
        badge.className = 'status-badge disconnected';
      }
      if (iconContainer) {
        iconContainer.innerHTML = '<span class="status-icon error">offline</span>';
      }
    }
  }

  updateStatus();
  setInterval(updateStatus, 5000);
})();
