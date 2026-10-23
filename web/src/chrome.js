// Shared by every page: nav counts, copy buttons and code tabs.

// GitHub's unauthenticated API allows 60 requests an hour per IP, so counts
// are cached for the session and the badges stay hidden if a request fails.
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
async function showCount(id, url, read) {
  const badge = document.getElementById(id);
  if (!badge) return;
  const key = `count:${url}`;
  try {
    let value = sessionStorage.getItem(key);
    if (value === null) {
      const response = await fetch(url);
      if (!response.ok) return;
      value = String(read(await response.json()));
      sessionStorage.setItem(key, value);
    }
    if (!Number.isFinite(Number(value))) return;
    badge.lastElementChild.textContent = compact.format(Number(value));
    badge.hidden = false;
  } catch {}
}
showCount('github-stars', 'https://api.github.com/repos/skyaara/holey-shapes', (data) => data.stargazers_count);
showCount('npm-downloads', 'https://api.npmjs.org/downloads/point/last-month/holey-shapes', (data) => data.downloads);

document.querySelectorAll('[data-copy]').forEach((button) => {
  const state = button.querySelector('.copy-state');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      state.textContent = 'copied';
    } catch {
      state.textContent = 'press ⌘C';
    }
    setTimeout(() => { state.textContent = 'copy'; }, 1400);
  });
});

document.querySelectorAll('[role="tablist"]').forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    for (const other of tabs) {
      const active = other === tab;
      other.setAttribute('aria-selected', String(active));
      other.tabIndex = active ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !active;
    }
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = tabs[(index + step + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
});
