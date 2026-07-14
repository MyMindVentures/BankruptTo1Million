const QR_BUTTON_ATTRIBUTE = 'data-journal-post-qr-button';
const QR_MODAL_ID = 'journal-post-qr-modal';

function currentPostUrl(): string {
  return window.location.href;
}

function createQrImageUrl(url: string): string {
  const params = new URLSearchParams({
    size: '420x420',
    data: url,
    format: 'svg',
    margin: '16',
  });

  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

function closeQrModal(): void {
  document.getElementById(QR_MODAL_ID)?.remove();
  document.body.classList.remove('journal-qr-modal-open');
}

function openQrModal(): void {
  closeQrModal();

  const url = currentPostUrl();
  const articleTitle = document.querySelector<HTMLElement>('.journal-article h1')?.textContent?.trim()
    || document.title.replace(/\s*\|.*$/, '')
    || 'Journal post';

  const overlay = document.createElement('div');
  overlay.id = QR_MODAL_ID;
  overlay.className = 'journal-qr-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'journal-qr-modal-title');

  const panel = document.createElement('div');
  panel.className = 'journal-qr-modal__panel';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'journal-qr-modal__close';
  closeButton.setAttribute('aria-label', 'Close QR code');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', closeQrModal);

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Share in person';

  const title = document.createElement('h2');
  title.id = 'journal-qr-modal-title';
  title.textContent = 'Show Post QR Code';

  const postTitle = document.createElement('p');
  postTitle.className = 'journal-qr-modal__post-title';
  postTitle.textContent = articleTitle;

  const image = document.createElement('img');
  image.className = 'journal-qr-modal__image';
  image.src = createQrImageUrl(url);
  image.alt = `QR code that opens ${articleTitle}`;
  image.width = 420;
  image.height = 420;

  const instruction = document.createElement('p');
  instruction.className = 'journal-qr-modal__instruction';
  instruction.textContent = 'Scan this QR code to open this journal post.';

  panel.append(closeButton, eyebrow, title, postTitle, image, instruction);
  overlay.append(panel);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeQrModal();
  });

  document.addEventListener('keydown', function onEscape(event) {
    if (event.key !== 'Escape') return;
    closeQrModal();
    document.removeEventListener('keydown', onEscape);
  });

  document.body.append(overlay);
  document.body.classList.add('journal-qr-modal-open');
  closeButton.focus();
}

function addQrButton(): void {
  const shareActions = document.querySelector<HTMLElement>('.journal-share .share-actions');
  if (!shareActions || shareActions.querySelector(`[${QR_BUTTON_ATTRIBUTE}]`)) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button--ghost journal-post-qr-button';
  button.setAttribute(QR_BUTTON_ATTRIBUTE, 'true');
  button.setAttribute('aria-haspopup', 'dialog');
  button.innerHTML = '<span aria-hidden="true" class="journal-post-qr-button__icon">▦</span><span>Show Post QR Code</span>';
  button.addEventListener('click', openQrModal);

  const copyButton = Array.from(shareActions.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.toLowerCase().includes('copy'),
  );

  if (copyButton?.nextSibling) {
    shareActions.insertBefore(button, copyButton.nextSibling);
  } else if (copyButton) {
    shareActions.append(button);
  } else {
    shareActions.prepend(button);
  }
}

export function initializeJournalPostQrUi(): void {
  const run = () => addQrButton();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
