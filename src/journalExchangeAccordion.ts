import './journalExchangeAccordion.css';

const ENHANCED = 'data-exchange-accordion-ready';

function makeToggle(target: HTMLElement, label: string, count: number, level: 'parent' | 'group' | 'item') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `journey-exchange-accordion__toggle journey-exchange-accordion__toggle--${level}`;
  button.setAttribute('aria-expanded', 'false');

  const labelNode = document.createElement('span');
  labelNode.className = 'journey-exchange-accordion__label';
  labelNode.textContent = label;

  const countNode = document.createElement('span');
  countNode.className = 'journey-exchange-accordion__count';
  countNode.textContent = String(count);

  const chevron = document.createElement('span');
  chevron.className = 'journey-exchange-accordion__chevron';
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
  const heading = section.querySelector<HTMLElement>(':scope > .journey-subheading');
  const grid = section.querySelector<HTMLElement>(':scope > .journey-exchange-grid');
  if (!heading || !grid) return;

  section.setAttribute(ENHANCED, 'true');
  section.classList.add('journey-exchange-accordion');

  const parentLabel = heading.querySelector('h3')?.textContent?.trim() || 'What we need. What we offer.';
  const columns = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .journey-exchange-column'));
  const totalItems = grid.querySelectorAll(':scope > .journey-exchange-column > article').length;
  section.insertBefore(makeToggle(grid, parentLabel, totalItems, 'parent'), grid);
  grid.classList.add('journey-exchange-accordion__content');

  columns.forEach((column) => {
    const title = column.querySelector<HTMLElement>(':scope > .journey-exchange-title');
    const articles = Array.from(column.querySelectorAll<HTMLElement>(':scope > article'));
    const label = title?.querySelector('h4')?.textContent?.trim() || 'Details';
    if (title) title.hidden = true;
    column.insertBefore(makeToggle(column, label, articles.length, 'group'), column.firstChild);
    column.classList.add('journey-exchange-accordion__group');

    articles.forEach((article) => {
      const titleText = article.querySelector('strong')?.textContent?.trim() || 'View details';
      const details = article.querySelector<HTMLElement>('div');
      if (!details) return;
      article.insertBefore(makeToggle(article, titleText, 0, 'item'), article.firstChild);
      article.classList.add('journey-exchange-accordion__item');
      details.classList.add('journey-exchange-accordion__item-content');
    });
  });
}

function enhanceAll() {
  document.querySelectorAll<HTMLElement>('.journey-exchange').forEach(enhanceExchangeSection);
}

const observer = new MutationObserver(enhanceAll);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('load', enhanceAll, { once: true });
enhanceAll();
