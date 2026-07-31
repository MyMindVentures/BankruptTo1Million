import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, ImageIcon, LoaderCircle, Sparkles, TextQuote } from 'lucide-react';
import { resolvePublicMediaUrl } from '../lib/journalFootage';
import {
  getJournalSocialCreatives,
  type AdminJournalFootageItem,
  type JournalSocialCreative,
} from '../lib/journalAdminApi';
import {
  generateJournalInstagramCaption,
  generateJournalInstagramImage,
} from '../lib/journalInstagramCreativeApi';
import type { I18nManifest } from '../lib/i18nManifest';
import { useWebsiteI18n } from '../lib/websiteI18n';

export const JOURNAL_SOCIAL_CREATIVES_PANEL_I18N_MANIFEST = {
  componentKey: 'journal.social_creatives.panel',
  namespace: 'journal.social_creatives',
  translationKeys: [
    'journal.social_creatives.title',
    'journal.social_creatives.description',
    'journal.social_creatives.save_first',
    'journal.social_creatives.empty_photos',
    'journal.social_creatives.generating_image',
    'journal.social_creatives.generate_image',
    'journal.social_creatives.regenerate_image',
    'journal.social_creatives.writing_caption',
    'journal.social_creatives.rewrite_caption',
    'journal.social_creatives.generate_caption',
    'journal.social_creatives.loading',
    'journal.social_creatives.format_label',
    'journal.social_creatives.image_missing',
    'journal.social_creatives.no_preview',
    'journal.social_creatives.caption_placeholder',
    'journal.social_creatives.copied',
    'journal.social_creatives.copy_caption',
    'journal.social_creatives.download_image',
    'journal.social_creatives.error.select_photo',
    'journal.social_creatives.error.generate_image_first',
    'journal.social_creatives.error.load_failed',
    'journal.social_creatives.error.image_failed',
    'journal.social_creatives.error.caption_failed',
    'journal.social_creatives.error.download_failed',
  ] as const,
} as const satisfies I18nManifest;

type Props = {
  postId: string | null;
  footage: AdminJournalFootageItem[];
};

function mediaUrl(path: string | null | undefined) {
  return resolvePublicMediaUrl(path);
}

export function JournalSocialCreativesPanel({ postId, footage }: Props) {
  const { t } = useWebsiteI18n();
  const imageFootage = useMemo(() => footage.filter((item) => item.asset_type === 'image'), [footage]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [creatives, setCreatives] = useState<JournalSocialCreative[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const latest = creatives?.[0] ?? null;

  useEffect(() => {
    if (!selectedAssetId && imageFootage[0]?.asset_id) setSelectedAssetId(imageFootage[0].asset_id);
  }, [imageFootage, selectedAssetId]);

  useEffect(() => {
    if (!postId) {
      setCreatives(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getJournalSocialCreatives(postId)
      .then((rows) => {
        if (!cancelled) setCreatives(rows);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : t('journal.social_creatives.error.load_failed', 'Failed to load Instagram creative.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, t]);

  async function refresh() {
    if (!postId) return null;
    const rows = await getJournalSocialCreatives(postId);
    setCreatives(rows);
    return rows[0] ?? null;
  }

  async function onGenerateImage() {
    if (!postId || !selectedAssetId) {
      setError(t('journal.social_creatives.error.select_photo', 'Select a journal photo first.'));
      return;
    }
    setGeneratingImage(true);
    setError(null);
    try {
      const result = await generateJournalInstagramImage(postId, selectedAssetId);
      await refresh();
      return result.creative_id;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('journal.social_creatives.error.image_failed', 'Instagram image generation failed.'));
      await refresh().catch(() => null);
      return null;
    } finally {
      setGeneratingImage(false);
    }
  }

  async function onGenerateCaption() {
    const creativeId = latest?.id;
    if (!creativeId || !latest.image_ig_feed_url) {
      setError(t('journal.social_creatives.error.generate_image_first', 'Generate the Instagram image first.'));
      return;
    }
    setGeneratingCaption(true);
    setError(null);
    try {
      await generateJournalInstagramCaption(creativeId);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('journal.social_creatives.error.caption_failed', 'Instagram caption generation failed.'));
      await refresh().catch(() => null);
    } finally {
      setGeneratingCaption(false);
    }
  }

  async function copyCaption() {
    if (!latest?.caption_instagram_feed) return;
    await navigator.clipboard.writeText(latest.caption_instagram_feed);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function downloadImage(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status}).`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `${latest?.id || 'journal'}-instagram.png`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  if (!postId) {
    return (
      <section className="event-panel journal-social-creatives-panel">
        <div className="event-panel-heading">
          <span>07</span>
          <div>
            <h3>{t('journal.social_creatives.title', 'Instagram creative')}</h3>
            <p>{t('journal.social_creatives.save_first', 'Save the journal event first, then generate the image and caption separately.')}</p>
          </div>
          <ImageIcon size={20} />
        </div>
      </section>
    );
  }

  const image = mediaUrl(latest?.image_ig_feed_url);

  return (
    <section className="event-panel journal-social-creatives-panel">
      <div className="event-panel-heading">
        <span>07</span>
        <div>
          <h3>{t('journal.social_creatives.title', 'Instagram creative')}</h3>
          <p>{t('journal.social_creatives.description', 'Generate the square post image first, then create the caption in a separate faster step.')}</p>
        </div>
        <Sparkles size={20} />
      </div>

      {imageFootage.length === 0 ? (
        <div className="journal-social-empty">{t('journal.social_creatives.empty_photos', 'Add at least one journal photo first.')}</div>
      ) : (
        <>
          <div className="journal-social-picker">
            {imageFootage.map((item) => {
              const url = publicStorageThumb(item);
              const selected = selectedAssetId === item.asset_id;
              return (
                <button
                  key={item.asset_id}
                  type="button"
                  className={selected ? 'is-selected' : undefined}
                  onClick={() => setSelectedAssetId(item.asset_id)}
                >
                  {url ? <img src={url} alt={item.alt_text || item.original_filename || 'Journal photo'} /> : <span>{t('journal.social_creatives.no_preview', 'No preview')}</span>}
                </button>
              );
            })}
          </div>

          <div className="journal-social-actions">
            <button type="button" className="primary" disabled={generatingImage || !selectedAssetId} onClick={() => void onGenerateImage()}>
              {generatingImage ? <LoaderCircle className="spin" size={16} /> : <ImageIcon size={16} />}
              {generatingImage ? t('journal.social_creatives.generating_image', 'Generating Instagram image…') : image ? t('journal.social_creatives.regenerate_image', 'Regenerate Instagram image') : t('journal.social_creatives.generate_image', 'Generate Instagram image')}
            </button>
            <button type="button" disabled={generatingCaption || !image} onClick={() => void onGenerateCaption()}>
              {generatingCaption ? <LoaderCircle className="spin" size={16} /> : <TextQuote size={16} />}
              {generatingCaption ? t('journal.social_creatives.writing_caption', 'Writing caption…') : latest?.caption_instagram_feed ? t('journal.social_creatives.rewrite_caption', 'Rewrite caption') : t('journal.social_creatives.generate_caption', 'Generate caption')}
            </button>
          </div>
        </>
      )}

      {loading && <div className="journal-social-status">{t('journal.social_creatives.loading', 'Loading saved Instagram creative…')}</div>}
      {error && <div className="admin-error">{error}</div>}

      {(image || latest?.caption_instagram_feed) && (
        <div className="journal-social-results">
          <article className="journal-social-card format-instagram_feed">
            <p>{t('journal.social_creatives.format_label', 'Instagram feed (1:1)')}</p>
            {image ? <img src={image} alt="Instagram feed creative" /> : <div className="journal-social-missing">{t('journal.social_creatives.image_missing', 'Image missing')}</div>}
            <textarea readOnly rows={8} value={latest?.caption_instagram_feed || ''} placeholder={t('journal.social_creatives.caption_placeholder', 'Generate the caption after the image is ready.')} />
            <div className="journal-social-card-actions">
              <button type="button" disabled={!latest?.caption_instagram_feed} onClick={() => void copyCaption()}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t('journal.social_creatives.copied', 'Copied') : t('journal.social_creatives.copy_caption', 'Copy caption')}
              </button>
              <button
                type="button"
                disabled={!image}
                onClick={() => {
                  if (!image) return;
                  void downloadImage(image).catch((reason) => setError(reason instanceof Error ? reason.message : t('journal.social_creatives.error.download_failed', 'Download failed.')));
                }}
              >
                <Download size={14} />
                {t('journal.social_creatives.download_image', 'Download image')}
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

function publicStorageThumb(item: AdminJournalFootageItem) {
  return resolvePublicMediaUrl(null, item.storage_bucket, item.storage_path) || item.thumbnail_url || '';
}
