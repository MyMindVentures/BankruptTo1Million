import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const U = Deno.env.get("SUPABASE_URL")!;
const S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const A = Deno.env.get("SUPABASE_ANON_KEY")!;
const K = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
const FAL_KEY = Deno.env.get("FAL_KEY") ?? Deno.env.get("FAL_API_KEY");
const SLUG = "generate-journal-social-creative";
const IMAGE_MODEL = "fal-ai/flux-pro/kontext";
const PUBLIC_SITE = "https://www.bankruptto1million.com";
const BRAND_LINE = "Bankrupt to 1 Million";

const db = createClient(U, S, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

type FormatKey = "ig_feed" | "ig_story" | "x";

const FORMATS: Array<{
  key: FormatKey;
  aspectRatio: "1:1" | "9:16" | "16:9";
  width: number;
  height: number;
  label: string;
}> = [
  { key: "ig_feed", aspectRatio: "1:1", width: 1080, height: 1080, label: "Instagram feed" },
  { key: "ig_story", aspectRatio: "9:16", width: 1080, height: 1920, label: "Instagram story" },
  { key: "x", aspectRatio: "16:9", width: 1600, height: 900, label: "X post" },
];

type SocialCopy = {
  hook: string;
  caption_instagram_feed: string;
  caption_instagram_story: string;
  caption_x: string;
};

type StartPayload = {
  creative_id: string;
  journal_post_id: string;
  slug: string | null;
  title: string | null;
  subtitle: string | null;
  excerpt: string | null;
  body: string | null;
  source_media_asset_id: string;
  source_storage_bucket: string;
  source_storage_path: string;
  source_public_path: string;
  source_mime_type: string | null;
};

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const parseJson = (text: string) => {
  const t = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("Invalid AI JSON");
  return JSON.parse(t.slice(a, b + 1));
};

function absolutePublicUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${U.replace(/\/$/, "")}${path}`;
}

function journalPublicUrl(slug: string | null | undefined) {
  const clean = String(slug || "").trim();
  if (!clean) return "";
  return `${PUBLIC_SITE}/journal/${clean}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapHookLines(hook: string, maxChars: number) {
  const words = hook.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [BRAND_LINE];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

async function authenticate(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new Error("Unauthorized");

  const user = createClient(U, A, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const access = await user.rpc("get_my_admin_access");
  if (access.error) throw new Error(`Admin verification failed: ${access.error.message}`);
  if (!access.data?.[0]?.is_active) throw new Error("Admin access required");
  return { user };
}

async function markFailed(user: SupabaseClient, creativeId: string | null, message: string) {
  if (!creativeId) return;
  await user.rpc("admin_finalize_journal_social_creative", {
    p_creative_id: creativeId,
    p_status: "failed",
    p_error_message: message.slice(0, 2000),
  });
}

async function loadCaptionConfig() {
  const cfgResult = await db.rpc("get_ai_edge_function_runtime_config", {
    p_edge_function_slug: SLUG,
  });
  if (cfgResult.error || !cfgResult.data) {
    throw new Error(cfgResult.error?.message || "Social creative AI config unavailable");
  }
  return cfgResult.data as Record<string, unknown>;
}

async function generateCopy(
  start: StartPayload,
  cfg: Record<string, unknown>,
): Promise<{ copy: SocialCopy; model: string }> {
  if (!K) throw new Error("Missing OPENROUTER_API_KEY");

  const journalUrl = journalPublicUrl(start.slug);
  const prompt = `${String(cfg.user_prompt_template ?? "")}

Journal context:
${JSON.stringify({
    title: start.title,
    subtitle: start.subtitle,
    excerpt: start.excerpt,
    body: start.body,
    journal_url: journalUrl || null,
  })}`;

  const ai = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${K}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://bankruptto1million.com",
      "X-Title": "Bankrupt to 1 Million Journal Social",
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: Number(cfg.temperature ?? 0.6),
      top_p: cfg.top_p == null ? undefined : Number(cfg.top_p),
      max_tokens: Number(cfg.max_output_tokens ?? 2048),
      response_format: cfg.response_format,
      messages: [
        { role: "system", content: String(cfg.system_prompt ?? "") },
        { role: "user", content: prompt },
      ],
    }),
  });

  const payload = await ai.json().catch(() => null) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  } | null;

  if (!ai.ok) {
    throw new Error(payload?.error?.message || `OpenRouter caption request failed (${ai.status})`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned empty caption content");

  const parsed = parseJson(content) as Partial<SocialCopy>;
  const copy: SocialCopy = {
    hook: String(parsed.hook || "").trim(),
    caption_instagram_feed: String(parsed.caption_instagram_feed || "").trim(),
    caption_instagram_story: String(parsed.caption_instagram_story || "").trim(),
    caption_x: String(parsed.caption_x || "").trim(),
  };

  if (!copy.hook || !copy.caption_instagram_feed || !copy.caption_instagram_story || !copy.caption_x) {
    throw new Error("Caption model returned incomplete social copy");
  }

  if (journalUrl) {
    for (const key of ["caption_instagram_feed", "caption_instagram_story", "caption_x"] as const) {
      if (!copy[key].includes(journalUrl)) {
        copy[key] = `${copy[key].trim()}\n\n${journalUrl}`.trim();
      }
    }
  }

  return { copy, model: String(cfg.model || "unknown") };
}

async function falReframe(imageUrl: string, aspectRatio: string, label: string) {
  if (!FAL_KEY) throw new Error("Missing FAL_KEY for Flux Kontext Pro");

  const prompt =
    `Reframe and lightly enhance this real photograph for a ${label} social post. `
    + `Compose naturally to ${aspectRatio} aspect ratio. Preserve the real people, place, and documentary look. `
    + `Do not add any text, letters, logos, watermarks, stickers, borders, or UI chrome. Photorealistic only.`;

  const response = await fetch(`https://fal.run/${IMAGE_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_url: imageUrl,
      aspect_ratio: aspectRatio,
      num_images: 1,
      output_format: "png",
      sync_mode: true,
      safety_tolerance: "2",
    }),
  });

  const payload = await response.json().catch(() => null) as {
    images?: Array<{ url?: string }>;
    image?: { url?: string };
    detail?: string;
    error?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      payload?.detail || payload?.error || payload?.message || `Flux Kontext request failed (${response.status})`,
    );
  }

  const url = payload?.images?.[0]?.url || payload?.image?.url;
  if (!url) throw new Error(`Flux Kontext returned no image for ${label}`);
  return url as string;
}

let resvgReady: Promise<typeof import("npm:@resvg/resvg-wasm@2.6.2")> | null = null;

async function getResvg() {
  if (!resvgReady) {
    resvgReady = (async () => {
      const mod = await import("npm:@resvg/resvg-wasm@2.6.2");
      const wasmResponse = await fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm");
      if (!wasmResponse.ok) throw new Error("Failed to load resvg wasm for text overlay.");
      await mod.initWasm(await wasmResponse.arrayBuffer());
      return mod;
    })();
  }
  return resvgReady;
}

async function burnHookOverlay(
  sourceBytes: Uint8Array,
  width: number,
  height: number,
  hook: string,
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const image = await Image.decode(sourceBytes);
  image.resize(width, height);

  const lines = wrapHookLines(hook, width >= 1400 ? 42 : 28);
  const fontSize = Math.round(width * (height > width ? 0.045 : 0.048));
  const brandSize = Math.round(fontSize * 0.45);
  const padX = Math.round(width * 0.06);
  const barHeight = Math.round(height * (height > width ? 0.22 : 0.28));
  const lineHeight = Math.round(fontSize * 1.15);
  const textStartY = Math.round(barHeight * 0.34);

  const textNodes = lines.map((line, index) => {
    const y = textStartY + index * lineHeight;
    return `<text x="${padX}" y="${y}" fill="#ffffff" font-size="${fontSize}" font-family="Georgia, 'Times New Roman', serif" font-weight="700">${escapeXml(line)}</text>`;
  }).join("");

  const brandY = Math.min(barHeight - Math.round(barHeight * 0.18), textStartY + lines.length * lineHeight + Math.round(fontSize * 0.55));

  const overlaySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${barHeight}" viewBox="0 0 ${width} ${barHeight}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="40%" stop-color="#000000" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${barHeight}" fill="url(#g)"/>
  ${textNodes}
  <text x="${padX}" y="${brandY}" fill="#f3efe6" fill-opacity="0.9" font-size="${brandSize}" font-family="Arial, Helvetica, sans-serif" letter-spacing="1.5">${escapeXml(BRAND_LINE)}</text>
</svg>`;

  const { Resvg } = await getResvg();
  const overlayPng = new Resvg(overlaySvg, {
    fitTo: { mode: "width", value: width },
  }).render().asPng();
  const overlay = await Image.decode(overlayPng);
  image.composite(overlay, 0, height - barHeight);

  return { bytes: await image.encode(), width, height };
}

async function storeFormat(
  user: SupabaseClient,
  creativeId: string,
  postId: string,
  format: (typeof FORMATS)[number],
  png: { bytes: Uint8Array; width: number; height: number },
) {
  const fileName = `${format.key}.png`;
  const objectPath = `journal/${postId}/social/${creativeId}/${fileName}`;
  const bucket = "media-images";
  const storage = createClient(U, S, { auth: { persistSession: false } }).storage;

  const upload = await storage.from(bucket).upload(objectPath, png.bytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (upload.error) throw new Error(upload.error.message);

  const register = await user.rpc("admin_register_journal_social_image", {
    p_creative_id: creativeId,
    p_format: format.key,
    p_bucket_name: bucket,
    p_object_path: objectPath,
    p_file_name: fileName,
    p_mime_type: "image/png",
    p_file_size: png.bytes.byteLength,
    p_width: png.width,
    p_height: png.height,
  });

  if (register.error) {
    await storage.from(bucket).remove([objectPath]);
    throw new Error(register.error.message);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return out({ ok: false, error: "Method not allowed." }, 405);

  let creativeId: string | null = null;
  let userClient: SupabaseClient | null = null;

  try {
    const { user } = await authenticate(request);
    userClient = user;

    const body = await request.json().catch(() => null) as {
      post_id?: unknown;
      source_media_asset_id?: unknown;
    } | null;

    if (!isUuid(body?.post_id) || !isUuid(body?.source_media_asset_id)) {
      return out({ ok: false, error: "post_id and source_media_asset_id are required." }, 400);
    }

    const started = await user.rpc("admin_start_journal_social_creative", {
      p_post_id: body.post_id,
      p_source_media_asset_id: body.source_media_asset_id,
    });
    if (started.error) throw new Error(started.error.message);

    const start = started.data as StartPayload;
    creativeId = start.creative_id;
    if (!creativeId) throw new Error("Creative start did not return an id.");

    const cfg = await loadCaptionConfig();
    const { copy, model: captionModel } = await generateCopy(start, cfg);

    const sourceUrl = absolutePublicUrl(start.source_public_path);
    for (const format of FORMATS) {
      const falUrl = await falReframe(sourceUrl, format.aspectRatio, format.label);
      const falImage = await fetch(falUrl);
      if (!falImage.ok) throw new Error(`Failed to download Flux result for ${format.label}`);
      const falBytes = new Uint8Array(await falImage.arrayBuffer());
      const composed = await burnHookOverlay(falBytes, format.width, format.height, copy.hook);
      await storeFormat(user, creativeId, start.journal_post_id, format, composed);
    }

    const finalized = await user.rpc("admin_finalize_journal_social_creative", {
      p_creative_id: creativeId,
      p_status: "ready",
      p_hook_text: copy.hook,
      p_caption_instagram_feed: copy.caption_instagram_feed,
      p_caption_instagram_story: copy.caption_instagram_story,
      p_caption_x: copy.caption_x,
      p_model_image: IMAGE_MODEL,
      p_model_caption: captionModel,
    });
    if (finalized.error) throw new Error(finalized.error.message);

    return out({
      ok: true,
      creative_id: creativeId,
      status: "ready",
      hook_text: copy.hook,
      captions: {
        instagram_feed: copy.caption_instagram_feed,
        instagram_story: copy.caption_instagram_story,
        x: copy.caption_x,
      },
      model_image: IMAGE_MODEL,
      model_caption: captionModel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Social creative generation failed.";
    if (userClient) await markFailed(userClient, creativeId, message);
    const status = message === "Unauthorized" || message === "Admin access required" ? 401 : 400;
    return out({ ok: false, error: message, creative_id: creativeId }, status);
  }
});
