import './journalExchangeAccordion.css';

const ENHANCED = 'data-exchange-accordion-ready';

function makeToggle(target: HTMLElement, label: string, count: number, level: 'parent' | 'group') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `journal-exchange-accordion__toggle journal-exchange-accordion__toggle--${level}`;
  button.setAttribute('aria-expanded', 'false');

  const labelNode = document.createElement('span');
  labelNode.className = 'journal-exchange-accordion__label';
  labelNode.textContent = label;

  const countNode = document.createElement('span');
  countNode.className = 'journal-exchange-accordion__count';
  countNode.textContent = String(count);

  const chevron = document.createElement('span');
  chevron.className = 'journal-exchange-accordion__chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '⌄';

  button.append(labelNode, countNode, chevron);
  button.addEventListener('click', () => {
    const open = target.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(open));
  });

  return button;
}

function enhanceExchangeSection(section: HTMLElement) {
  if (section.hasAttribute(ENHANCED)) return;

  const heading = section.querySelector<HTMLElement>(':scope > .journal-exchange__heading');
  const columns = section.querySelector<HTMLElement>(':scope > .journal-exchange__columns');
  if (!heading || !columns) return;

  section.setAttribute(ENHANCED, 'true');
  section.classList.add('journal-exchange-accordion');

  const panels = Array.from(columns.querySelectorAll<HTMLElement>(':scope > .journal-exchange__panel'));
  const totalItems = columns.querySelectorAll('.journal-exchange__item').length;
  const parentLabel = heading.querySelector('h2')?.textContent?.trim() || 'What we need — and what we give back.';

  section.insertBefore(makeToggle(columns, parentLabel, totalItems, 'parent'), columns);
  columns.classList.add('journal-exchange-accordion__content');

  panels.forEach((panel) => {
    const panelHeading = panel.querySelector<HTMLElement>(':scope > .journal-exchange__panel-heading');
    const itemContainer = panel.querySelector<HTMLElement>(':scope > .journal-exchange__items');
    if (!panelHeading || !itemContainer) return;

    const itemCount = itemContainer.querySelectorAll(':scope > .journal-exchange__item').length;
    const label = panelHeading.querySelector('h3')?.textContent?.trim()
      || panelHeading.querySelector('.eyebrow')?.textContent?.trim()
      || 'Details';

    panelHeading.hidden = true;
    panel.insertBefore(makeToggle(panel, label, itemCount, 'group'), panel.firstChild);
    panel.classList.add('journal-exchange-accordion__group');
    itemContainer.classList.add('journal-exchange-accordion__group-content');

    const allOffersLink = panel.querySelector<HTMLElement>(':scope > .journal-exchange__all');
    allOffersLink?.classList.add('journal-exchange-accordion__group-extra');
  });
}

function enhanceAll() {
  document.querySelectorAll<HTMLElement>('.journal-exchange').forEach(enhanceExchangeSection);
}

const observer = new MutationObserver(enhanceAll);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('load', enhanceAll, { once: true });
enhanceAll();
