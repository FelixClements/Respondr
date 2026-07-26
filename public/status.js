(function () {
  if (['/login', '/setup'].includes(window.location.pathname)) {
    return;
  }

  function renderIcon(container, name, health) {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    let existing = container.querySelector(`[data-service="${name}"]`);
    if (!existing) {
      existing = document.createElement('span');
      existing.className = 'status-icon';
      existing.dataset.service = name;
      container.appendChild(existing);
    }
    existing.className = `status-icon ${health.ok ? 'ok' : 'error'}`;
    existing.textContent = `${label}: ${health.ok ? 'OK' : 'DOWN'}`;
    existing.title = `${label}: ${health.detail}`;
  }

  async function fetchWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  async function updateStatus() {
    const indicator = document.getElementById('status-indicator');
    const iconContainer = document.getElementById('status-icons');

    if (indicator) indicator.textContent = 'Loading...';

    try {
      const res = await fetchWithTimeout('/api/status');
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();

      if (indicator) {
        indicator.textContent = `WhatsApp: ${data.status} (ready: ${data.isReady})`;
      }

      if (iconContainer && data.health) {
        renderIcon(iconContainer, 'whatsapp', data.health.whatsapp);
        renderIcon(iconContainer, 'chrome', data.health.chrome);
        renderIcon(iconContainer, 'puppeteer', data.health.puppeteer);
      }
    } catch (e) {
      if (indicator) indicator.textContent = 'Status unavailable';
      if (iconContainer) {
        iconContainer.innerHTML = '<span class="status-icon error">offline</span>';
      }
    }
  }

  updateStatus();
  setInterval(updateStatus, 5000);
})();
