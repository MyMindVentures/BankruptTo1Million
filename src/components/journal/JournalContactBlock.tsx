import { Mail, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { I18nManifest } from '../../lib/i18nManifest';
import { useWebsiteI18n } from '../../lib/websiteI18n';
import './JournalContactBlock.css';

export const JOURNAL_CONTACT_BLOCK_I18N_MANIFEST = {
  componentKey: 'journal.contact.block',
  namespace: 'journal.contact',
  translationKeys: [
    'journal.contact.eyebrow',
    'journal.contact.title',
    'journal.contact.message',
  ] as const,
} as const satisfies I18nManifest;

export function JournalContactBlock() {
  const { t } = useWebsiteI18n();
  const [sharePanel, setSharePanel] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSharePanel(document.querySelector<HTMLElement>('.journal-share .story-panel'));
  }, []);

  if (!sharePanel) return null;

  return createPortal(
    <div className="journal-contact" aria-labelledby="journal-contact-title">
      <div className="journal-contact__intro">
        <p className="eyebrow">{t('journal.contact.eyebrow', 'Continue the conversation')}</p>
        <h2 id="journal-contact-title">{t('journal.contact.title', 'A constructive thought, opportunity or introduction?')}</h2>
        <p>{t('journal.contact.message', 'Reach out when your message is positive, respectful and genuinely helps move this mission forward.')}</p>
      </div>
      <div className="journal-contact__details">
        <strong>Kevin De Vlieger</strong>
        <a href="tel:+34643037346"><Phone size={18} aria-hidden="true" /><span>+34 643 037 346</span></a>
        <a href="mailto:hello@mymindventures.io"><Mail size={18} aria-hidden="true" /><span>hello@mymindventures.io</span></a>
      </div>
    </div>,
    sharePanel,
  );
}
