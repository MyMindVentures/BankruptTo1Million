import { useWebsiteI18n } from '../lib/websiteI18n';

export function LegalPage() {
  const { t } = useWebsiteI18n();

  return (
    <main className="legal-page" id="top">
      <section className="section legal-hero">
        <div className="section-heading">
          <p className="eyebrow">{t('legal.eyebrow', 'Legal & transparency')}</p>
          <h1>{t('legal.title', 'Clear principles for a public rebuild')}</h1>
          <p>{t('legal.intro', 'This page explains ownership, acceptable use, privacy and the public mission behind Bankrupt to 1 Million.')}</p>
        </div>
      </section>

      <section className="section legal-content" aria-label={t('legal.sections_aria', 'Legal information')}>
        <article id="ownership">
          <h2>{t('legal.ownership.title', 'Ownership & intellectual property')}</h2>
          <p>{t('legal.ownership.body', 'Original concepts, written content, branding, software and media remain protected by their respective owners unless an explicit licence states otherwise. Public visibility does not transfer ownership.')}</p>
        </article>

        <article id="terms">
          <h2>{t('legal.terms.title', 'Terms of use')}</h2>
          <p>{t('legal.terms.body', 'Use the website lawfully and respectfully. Do not misuse private links, interfere with the service, impersonate contributors or republish protected material as your own.')}</p>
        </article>

        <article id="privacy">
          <h2>{t('legal.privacy.title', 'Privacy')}</h2>
          <p>{t('legal.privacy.body', 'Only information needed to operate the website, respond to submissions and protect the platform should be processed. Private outreach links and submitted personal information must not be shared without permission.')}</p>
        </article>

        <article id="mission">
          <h2>{t('legal.mission.title', 'Public mission statement')}</h2>
          <p>{t('legal.mission.body', 'Bankrupt to 1 Million documents how Kevin and Micha rebuild from rock bottom through honest progress, useful work, community, partnerships and transparent storytelling. The mission is about creating momentum together, not presenting fake success.')}</p>
        </article>
      </section>
    </main>
  );
}
