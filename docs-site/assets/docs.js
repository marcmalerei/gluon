const menuButton = document.querySelector('[data-menu-button]');
const sidebar = document.querySelector('[data-sidebar]');
const searchOpenButtons = [...document.querySelectorAll('[data-search-open]')];
const searchPanel = document.querySelector('[data-search-panel]');
const searchDialog = searchPanel?.querySelector('.search-dialog');
const searchInput = searchPanel?.querySelector('[data-search-input]');
const searchStatus = searchPanel?.querySelector('[data-search-status]');
const searchResults = searchPanel?.querySelector('[data-search-results]');
const searchClose = searchPanel?.querySelector('[data-search-close]');
const packageSearch = document.querySelector('[data-package-search]');
const packageCards = [...document.querySelectorAll('[data-package-card]')];
const packageSearchStatus = document.querySelector('[data-package-search-status]');

let searchEntries = [];
let activeResultIndex = -1;
let searchReady = false;
let searchReturnFocus = null;

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
  if (sidebar instanceof HTMLElement) sidebar.inert = !open && window.matchMedia('(max-width: 800px)').matches;
});

sidebar?.addEventListener('click', (event) => {
  if (!(event.target instanceof HTMLAnchorElement)) return;
  document.body.classList.remove('menu-open');
  menuButton?.setAttribute('aria-expanded', 'false');
});

document.querySelector('[data-version-select]')?.addEventListener('change', (event) => {
  const select = event.currentTarget;
  if (!(select instanceof HTMLSelectElement)) return;
  window.location.href = `/gluon/${encodeURIComponent(select.value)}/`;
});

for (const button of document.querySelectorAll('[data-copy-code]')) {
  button.addEventListener('click', async () => {
    const code = button.closest('.code-frame')?.querySelector('code')?.textContent ?? '';
    let copied = false;
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
    } catch {
      const field = document.createElement('textarea');
      field.value = code;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      copied = document.execCommand('copy');
      field.remove();
    }
    button.textContent = copied ? 'Copied' : 'Copy failed';
    button.dataset.copyState = copied ? 'copied' : 'failed';
    window.setTimeout(() => {
      button.textContent = 'Copy';
      delete button.dataset.copyState;
    }, 2000);
  });
}

const mobile = window.matchMedia('(max-width: 800px)');
const syncSidebar = () => {
  if (!(sidebar instanceof HTMLElement)) return;
  sidebar.inert = mobile.matches && !document.body.classList.contains('menu-open');
};
mobile.addEventListener('change', syncSidebar);
syncSidebar();

packageSearch?.addEventListener('input', () => {
  if (!(packageSearch instanceof HTMLInputElement)) return;
  const query = packageSearch.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const card of packageCards) {
    const match = !query || (card.getAttribute('data-package-search-text') ?? '').toLocaleLowerCase().includes(query);
    card.hidden = !match;
    if (match) visible += 1;
  }
  if (packageSearchStatus) packageSearchStatus.textContent = `${visible} package${visible === 1 ? '' : 's'}`;
});

searchOpenButtons.forEach((button) => button.addEventListener('click', () => {
  void openSearch(button);
}));

searchClose?.addEventListener('click', () => closeSearch());
searchPanel?.addEventListener('click', (event) => {
  if (event.target === searchPanel) closeSearch();
});
searchInput?.addEventListener('input', () => renderSearchResults());
searchInput?.addEventListener('keydown', (event) => {
  if (!searchEntries.length) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveResult(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveResult(-1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    activateResult(activeResultIndex >= 0 ? activeResultIndex : 0);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeSearch();
  }
});
searchResults?.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveResult(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveResult(-1);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeSearch();
  }
});
searchDialog?.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const focusable = focusableSearchElements();
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && searchPanel && !searchPanel.hidden) closeSearch();
});

async function openSearch(opener) {
  searchReturnFocus = opener instanceof HTMLElement ? opener : document.activeElement;
  if (searchPanel instanceof HTMLElement) searchPanel.hidden = false;
  document.body.classList.add('search-open');
  if (searchInput instanceof HTMLInputElement) {
    searchInput.focus();
    searchInput.select();
  }
  try {
    await loadSearchIndex();
    renderSearchResults();
  } catch {
    searchEntries = [];
    if (searchResults instanceof HTMLElement) searchResults.replaceChildren();
    if (searchStatus instanceof HTMLElement) searchStatus.textContent = 'Search is temporarily unavailable. Use the versioned navigation links instead.';
  }
}

function closeSearch() {
  if (!(searchPanel instanceof HTMLElement) || searchPanel.hidden) return;
  if (searchPanel instanceof HTMLElement) searchPanel.hidden = true;
  document.body.classList.remove('search-open');
  activeResultIndex = -1;
  const returnTarget = searchReturnFocus;
  searchReturnFocus = null;
  if (returnTarget instanceof HTMLElement && returnTarget.isConnected) returnTarget.focus();
}

async function loadSearchIndex() {
  if (searchReady) return;
  const script = [...document.querySelectorAll('script[type="module"]')].find((node) => node.src.endsWith('/assets/docs.js'));
  const indexUrl = script ? script.src.replace(/assets\/docs\.js$/, 'assets/search-index.json') : '/gluon/assets/search-index.json';
  const response = await fetch(indexUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`failed to load search index: ${response.status}`);
  searchEntries = await response.json();
  searchReady = true;
}

function renderSearchResults() {
  if (!(searchInput instanceof HTMLInputElement) || !(searchResults instanceof HTMLElement) || !(searchStatus instanceof HTMLElement)) return;
  const query = normalizeSearchText(searchInput.value);
  const queryTerms = query.split(' ').filter(Boolean);
  const matches = !query
    ? searchEntries.slice(0, 8)
    : searchEntries.filter((entry) => queryTerms.every((term) => entry.terms.includes(term))).slice(0, 8);
  activeResultIndex = -1;
  searchResults.innerHTML = '';
  if (matches.length === 0) {
    searchStatus.textContent = query ? `No results for "${searchInput.value.trim()}".` : 'Type to filter the maintained docs index.';
    const empty = document.createElement('p');
    empty.className = 'search-empty';
    empty.textContent = 'No matching pages. Try a package name, guide topic, or API symbol.';
    searchResults.append(empty);
    return;
  }
  searchStatus.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'} shown from the maintained docs index.`;
  matches.forEach((entry, index) => {
    const link = document.createElement('a');
    link.className = 'search-result';
    link.href = entry.url;
    link.dataset.searchResult = String(index);
    link.toggleAttribute('data-active', index === activeResultIndex);
    link.innerHTML = `<small>${escapeHtml(entry.contentType)} · ${escapeHtml(entry.context)} · ${escapeHtml(entry.version)}</small><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.description)}</p>`;
    link.addEventListener('mouseenter', () => setActiveResult(index));
    link.addEventListener('focus', () => setActiveResult(index));
    searchResults.append(link);
  });
}

function moveResult(delta) {
  const links = [...searchResults?.querySelectorAll('[data-search-result]') ?? []];
  if (links.length === 0) return;
  activeResultIndex = (activeResultIndex + delta + links.length) % links.length;
  setActiveResult(activeResultIndex);
  const active = links[activeResultIndex];
  if (active instanceof HTMLElement) active.focus();
}

function setActiveResult(index) {
  activeResultIndex = index;
  const links = [...searchResults?.querySelectorAll('[data-search-result]') ?? []];
  links.forEach((link, current) => link.toggleAttribute('data-active', current === index));
}

function activateResult(index) {
  const links = [...searchResults?.querySelectorAll('[data-search-result]') ?? []];
  const link = links[index];
  if (link instanceof HTMLAnchorElement) window.location.href = link.href;
}

function normalizeSearchText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function focusableSearchElements() {
  if (!(searchDialog instanceof HTMLElement)) return [];
  return [...searchDialog.querySelectorAll('input, button, a[href]')]
    .filter((element) => element instanceof HTMLElement && !element.hidden && element.tabIndex >= 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
