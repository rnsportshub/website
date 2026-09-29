// ============================================
// RN SPORTS HUB — Media Uploader (Supabase Storage)
// ============================================
// Drop-in replacement for the old Cloudinary uploader.
// File name and exported function names are unchanged, so admin.js and
// checkout.js keep working without touching their import lines.
//
// SETUP: paste your two values below (Supabase → Project Settings → API).
// The anon key is designed to be public; access is limited by the storage
// policies in supabase/setup.sql.

const SUPABASE_URL      = "https://wmnwfifbiuvtyeliumng.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbndmaWZiaXV2dHllbGl1bW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDMyNzAsImV4cCI6MjEwNjI3OTI3MH0.XJh-vATUEV_wdw_LadHVEriC0DOLWDuKlydTzS-UEbE";
const SUPABASE_BUCKET   = "media";

const SUPABASE_SDK_URL  = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// Compression profiles
const PRODUCT_PROFILE = { maxWidth: 1600, quality: 0.85, type: "image/webp" };
const RECEIPT_PROFILE = { maxWidth: 1200, quality: 0.75, type: "image/jpeg" };

// Old Cloudinary folder names → new Supabase folders.
// Only "products" and "receipts" are allowed by the storage policy.
const FOLDER_MAP = {
  rn_products:     "products",
  rn_bulk_upload:  "products/bulk",
  rn_screenshots:  "receipts",
};

// ── Lazy Supabase client ────────────────────────────────────────────────────
let _clientPromise = null;
function getClient() {
  if (!_clientPromise) {
    _clientPromise = import(SUPABASE_SDK_URL).then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    ).catch(err => { _clientPromise = null; throw err; });
  }
  return _clientPromise;
}

// ── Image loading (respects EXIF rotation so phone photos aren't sideways) ──
async function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (_) { /* fall through to <img> decoding */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This image format isn't supported by your browser. Please use JPG, PNG or WebP.")); };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image compression failed")), type, quality);
  });
}

// ── Compression engine ──────────────────────────────────────────────────────
// Resizes down to maxWidth (never upscales) and re-encodes.
// Returns { blob, ext, type }.
export async function compressImage(file, { maxWidth = 1600, quality = 0.85, type = "image/webp" } = {}) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  const bitmap = await loadBitmap(file);
  const srcW = bitmap.width, srcH = bitmap.height;
  const scale = Math.min(1, maxWidth / srcW);
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (type === "image/jpeg") {            // JPEG has no alpha → white background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (bitmap.close) bitmap.close();

  let blob = await canvasToBlob(canvas, type, quality);
  // Older Safari silently returns PNG when WebP is unsupported → retry as JPEG
  if (blob.type !== type) {
    if (type === "image/webp") {
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      type = "image/jpeg";
      blob = await canvasToBlob(canvas, type, quality);
    } else {
      throw new Error("Image compression failed");
    }
  }

  // Already-small source that got bigger? Keep the original.
  if (scale === 1 && blob.size >= file.size && /^image\/(jpeg|png|webp)$/.test(file.type)) {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    return { blob: file, ext, type: file.type };
  }

  return { blob, ext: type === "image/webp" ? "webp" : "jpg", type };
}

// ── Internals ───────────────────────────────────────────────────────────────
function normaliseFolder(folder, fallback) {
  let f = FOLDER_MAP[folder] || folder || fallback;
  f = String(f).replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  return f || fallback;
}

function uniqueName(ext) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${rand}.${ext}`;
}

async function uploadCompressed(file, folder, profile, defaultFolder) {
  if (!file) throw new Error("No file provided");
  const { blob, ext, type } = await compressImage(file, profile);
  const path = `${normaliseFolder(folder, defaultFolder)}/${uniqueName(ext)}`;
  const supabase = await getClient();

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, blob, {
      contentType: type,
      cacheControl: "31536000",   // unique filenames → safe to cache for a year
      upsert: false,
    });
    if (!error) {
      const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }
    lastErr = error;
    const msg = String(error.message || "");
    // Don't retry policy / size / type errors — only transient network ones
    if (/policy|not allowed|too large|exceeded|mime|unauthorized|forbidden/i.test(msg)) break;
    await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
  }
  throw new Error(lastErr?.message || "Upload failed");
}

// ── Public API (same signatures as before) ──────────────────────────────────

// Product image → 1600px WebP @ 0.85 → products/ → public URL
export async function uploadToCloudinary(file, folder = "products") {
  return uploadCompressed(file, folder, PRODUCT_PROFILE, "products");
}

// Batch product upload with progress callback (done, total) → array of URLs
export async function uploadMultipleToCloudinary(files, folder = "products", onProgress) {
  const arr = Array.from(files);
  const urls = [];
  for (let i = 0; i < arr.length; i++) {
    urls.push(await uploadToCloudinary(arr[i], folder));
    if (onProgress) onProgress(i + 1, arr.length);
  }
  return urls;
}

// Payment receipt → 1200px JPEG @ 0.75 → receipts/ → public URL
export async function uploadScreenshot(file) {
  return uploadCompressed(file, "receipts", RECEIPT_PROFILE, "receipts");
}

// Friendlier aliases for new code
export const uploadProductImage  = uploadToCloudinary;
export const uploadProductImages = uploadMultipleToCloudinary;
export const uploadReceipt       = uploadScreenshot;
