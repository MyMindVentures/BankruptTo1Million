import { Mail, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWebsiteI18n } from '../../lib/websiteI18n';

export function JournalContactBlock() {
  const { t } = useWebsiteI18n();
  const [sharePanel, setSharePanel] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSharePanel(document.querySelector<HTMLElement>('.journal-share .story-panel'));
  }, []);

  if (!sharePanel) return null;

  return createPortal(
    <div className="journal-contact" aria-labelledby="journal-contact-title">
      <p className="eyebrow">{t('journal.contact.eyebrow', 'Contact')}</p>
      <h2 id="journal-contact-title">{t('journal.contact.title', 'Get in touch with Kevin.')}</h2>
      <p>{t('journal.contact.message', 'Only positive, constructive responses are welcome.')}</p>
      <div className="journal-contact__details">
        <strong>Kevin De Vlieger</strong>
        <a href="tel:+34643037346"><Phone size={17} /> +34 643 037 346</a>
        <a href="mailto:hello@mymindventures"><Mail size={17} /> hello@mymindventures</a>
      </div>
    </div>,
    sharePanel,
  );
}
