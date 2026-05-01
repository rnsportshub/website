// ============================================
// RN SPORTS HUB — Cloudinary Uploader
// ============================================
// ⚠️ REPLACE THESE VALUES after creating your Cloudinary account.
// How to get them:
//   1. Go to https://cloudinary.com → Sign Up (free)
//   2. Dashboard → copy your "Cloud Name"
//   3. Settings → Upload → Add upload preset → choose "Unsigned" → name it "rn_sports_unsigned"
//   4. Replace the values below

const CLOUDINARY_CLOUD_NAME   = "dycb5zzhi";    
const CLOUDINARY_UPLOAD_PRESET = "rn_sports_unsigned";   

export async function uploadToCloudinary(file, folder = "rn_products") {
  if (!file) throw new Error("No file provided");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.secure_url;
}

export async function uploadMultipleToCloudinary(files, folder = "rn_products", onProgress) {
  const arr = Array.from(files);
  const urls = [];
  for (let i = 0; i < arr.length; i++) {
    urls.push(await uploadToCloudinary(arr[i], folder));
    if (onProgress) onProgress(i + 1, arr.length);
  }
  return urls;
}

export async function uploadScreenshot(file) {
  return uploadToCloudinary(file, "rn_screenshots");
}
