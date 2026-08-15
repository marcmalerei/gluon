const menuButton = document.querySelector('[data-menu-button]');
const sidebar = document.querySelector('[data-sidebar]');

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

const packageSearch = document.querySelector('[data-package-search]');
const packageCards = [...document.querySelectorAll('[data-package-card]')];
const packageSearchStatus = document.querySelector('[data-package-search-status]');
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
