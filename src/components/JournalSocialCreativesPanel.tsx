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

type Props = {
  postId: string | null;
  footage: AdminJournalFootageItem[];
};

function mediaUrl(path: string | null | undefined) {
  return resolvePublicMediaUrl(path);
}

export function JournalSocialCreativesPanel({ postId, footage }: Props) {
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
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Failed to load Instagram creative.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function refresh() {
    if (!postId) return null;
    const rows = await getJournalSocialCreatives(postId);
    setCreatives(rows);
    return rows[0] ?? null;
  }

  async function onGenerateImage() {
    if (!postId || !selectedAssetId) {
      setError('Select a journal photo first.');
      return;
    }
    setGeneratingImage(true);
    setError(null);
    try {
      const result = await generateJournalInstagramImage(postId, selectedAssetId);
      await refresh();
      return result.creative_id;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Instagram image generation failed.');
      await refresh().catch(() => null);
      return null;
    } finally {
      setGeneratingImage(false);
    }
  }

  async function onGenerateCaption() {
    const creativeId = latest?.id;
    if (!creativeId || !latest.image_ig_feed_url) {
      setError('Generate the Instagram image first.');
      return;
    }
    setGeneratingCaption(true);
    setError(null);
    try {
      await generateJournalInstagramCaption(creativeId);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Instagram caption generation failed.');
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
            <h3>Instagram creative</h3>
            <p>Save the journal event first, then generate the image and caption separately.</p>
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
          <h3>Instagram creative</h3>
          <p>Generate the square post image first, then create the caption in a separate faster step.</p>
        </div>
        <Sparkles size={20} />
      </div>

      {imageFootage.length === 0 ? (
        <div className="journal-social-empty">Add at least one journal photo first.</div>
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
                  {url ? <img src={url} alt={item.alt_text || item.original_filename || 'Journal photo'} /> : <span>No preview</span>}
                </button>
              );
            })}
          </div>

          <div className="journal-social-actions">
            <button type="button" className="primary" disabled={generatingImage || !selectedAssetId} onClick={() => void onGenerateImage()}>
              {generatingImage ? <LoaderCircle className="spin" size={16} /> : <ImageIcon size={16} />}
              {generatingImage ? 'Generating Instagram image…' : image ? 'Regenerate Instagram image' : 'Generate Instagram image'}
            </button>
            <button type="button" disabled={generatingCaption || !image} onClick={() => void onGenerateCaption()}>
              {generatingCaption ? <LoaderCircle className="spin" size={16} /> : <TextQuote size={16} />}
              {generatingCaption ? 'Writing caption…' : latest?.caption_instagram_feed ? 'Rewrite caption' : 'Generate caption'}
            </button>
          </div>
        </>
      )}

      {loading && <div className="journal-social-status">Loading saved Instagram creative…</div>}
      {error && <div className="admin-error">{error}</div>}

      {(image || latest?.caption_instagram_feed) && (
        <div className="journal-social-results">
          <article className="journal-social-card format-instagram_feed">
            <p>Instagram feed (1:1)</p>
            {image ? <img src={image} alt="Instagram feed creative" /> : <div className="journal-social-missing">Image missing</div>}
            <textarea readOnly rows={8} value={latest?.caption_instagram_feed || ''} placeholder="Generate the caption after the image is ready." />
            <div className="journal-social-card-actions">
              <button type="button" disabled={!latest?.caption_instagram_feed} onClick={() => void copyCaption()}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy caption'}
              </button>
              <button
                type="button"
                disabled={!image}
                onClick={() => {
                  if (!image) return;
                  void downloadImage(image).catch((reason) => setError(reason instanceof Error ? reason.message : 'Download failed.'));
                }}
              >
                <Download size={14} />
                Download image
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
