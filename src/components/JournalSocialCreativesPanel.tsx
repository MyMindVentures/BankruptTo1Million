import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, ImageIcon, LoaderCircle, Sparkles } from 'lucide-react';
import { resolvePublicMediaUrl } from '../lib/journalFootage';
import {
  generateJournalSocialCreative,
  getJournalSocialCreatives,
  type AdminJournalFootageItem,
  type JournalSocialCreative,
} from '../lib/journalAdminApi';

type Props = {
  postId: string | null;
  footage: AdminJournalFootageItem[];
};

type PlatformCard = {
  key: 'instagram_feed' | 'instagram_story' | 'x';
  label: string;
  caption: string | null;
  imagePath: string | null;
  fileName: string;
};

function mediaUrl(path: string | null | undefined) {
  return resolvePublicMediaUrl(path);
}

export function JournalSocialCreativesPanel({ postId, footage }: Props) {
  const imageFootage = useMemo(
    () => footage.filter((item) => item.asset_type === 'image'),
    [footage],
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [creatives, setCreatives] = useState<JournalSocialCreative[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const latest = creatives?.[0] ?? null;

  useEffect(() => {
    if (!selectedAssetId && imageFootage[0]?.asset_id) {
      setSelectedAssetId(imageFootage[0].asset_id);
    }
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
        if (!cancelled) {
          setCreatives(null);
          setError(reason instanceof Error ? reason.message : 'Failed to load social creatives.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function refresh() {
    if (!postId) return;
    const rows = await getJournalSocialCreatives(postId);
    setCreatives(rows);
  }

  async function onGenerate() {
    if (!postId || !selectedAssetId) {
      setError('Select a journal photo before generating social creatives.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      await generateJournalSocialCreative(postId, selectedAssetId);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Social creative generation failed.');
      try {
        await refresh();
      } catch {
        // Keep the generation error as primary.
      }
    } finally {
      setGenerating(false);
    }
  }

  async function copyCaption(key: string, value: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1600);
  }

  async function downloadImage(url: string, fileName: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status}).`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  if (!postId) {
    return (
      <section className="event-panel journal-social-creatives-panel">
        <div className="event-panel-heading">
          <span>07</span>
          <div>
            <h3>Social creatives</h3>
            <p>Save the journal event first, then generate Instagram and X creatives from a photo.</p>
          </div>
          <ImageIcon size={20} />
        </div>
      </section>
    );
  }

  const cards: PlatformCard[] = latest && latest.status === 'ready'
    ? [
        {
          key: 'instagram_feed',
          label: 'Instagram feed (1:1)',
          caption: latest.caption_instagram_feed,
          imagePath: latest.image_ig_feed_url,
          fileName: `${latest.id}-ig-feed.png`,
        },
        {
          key: 'instagram_story',
          label: 'Instagram story (9:16)',
          caption: latest.caption_instagram_story,
          imagePath: latest.image_ig_story_url,
          fileName: `${latest.id}-ig-story.png`,
        },
        {
          key: 'x',
          label: 'X post (16:9)',
          caption: latest.caption_x,
          imagePath: latest.image_x_url,
          fileName: `${latest.id}-x.png`,
        },
      ]
    : [];

  return (
    <section className="event-panel journal-social-creatives-panel">
      <div className="event-panel-heading">
        <span>07</span>
        <div>
          <h3>Social creatives</h3>
          <p>One click builds IG feed, IG story, and X images with captions you can copy and download.</p>
        </div>
        <Sparkles size={20} />
      </div>

      {imageFootage.length === 0 ? (
        <div className="journal-social-empty">Add at least one journal photo to generate social creatives.</div>
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
            <button type="button" className="primary" disabled={generating || !selectedAssetId} onClick={() => void onGenerate()}>
              {generating ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
              {generating ? 'Generating social creatives…' : latest ? 'Regenerate social creatives' : 'Generate social creatives'}
            </button>
          </div>
        </>
      )}

      {loading && <div className="journal-social-status">Loading saved social creatives…</div>}
      {error && <div className="admin-error">{error}</div>}
      {!loading && latest?.status === 'generating' && (
        <div className="journal-social-status">Generation is still marked in progress. Try regenerate if this stays stuck.</div>
      )}
      {!loading && latest?.status === 'failed' && (
        <div className="admin-error">{latest.error_message || 'The latest social creative run failed.'}</div>
      )}

      {cards.length > 0 && (
        <div className="journal-social-results">
          {latest?.hook_text && <p className="journal-social-hook">On-image hook: <strong>{latest.hook_text}</strong></p>}
          <div className="journal-social-cards">
            {cards.map((card) => {
              const imageUrl = mediaUrl(card.imagePath);
              return (
                <article key={card.key} className={`journal-social-card format-${card.key}`}>
                  <p>{card.label}</p>
                  {imageUrl ? <img src={imageUrl} alt={card.label} /> : <div className="journal-social-missing">Image missing</div>}
                  <textarea readOnly rows={6} value={card.caption || ''} />
                  <div className="journal-social-card-actions">
                    <button type="button" disabled={!card.caption} onClick={() => void copyCaption(card.key, card.caption)}>
                      {copiedKey === card.key ? <Check size={14} /> : <Copy size={14} />}
                      {copiedKey === card.key ? 'Copied' : 'Copy caption'}
                    </button>
                    <button
                      type="button"
                      disabled={!imageUrl}
                      onClick={() => {
                        if (!imageUrl) return;
                        void downloadImage(imageUrl, card.fileName).catch((reason) => {
                          setError(reason instanceof Error ? reason.message : 'Download failed.');
                        });
                      }}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function publicStorageThumb(item: AdminJournalFootageItem) {
  return resolvePublicMediaUrl(null, item.storage_bucket, item.storage_path) || item.thumbnail_url || '';
}
