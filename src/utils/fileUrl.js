import config from "@/config";

/**
 * Resolves a stored upload reference to a browser-loadable URL.
 *
 * The server chooses its storage backend at runtime, so two shapes reach the
 * admin panel:
 *   - relative path  "uploads/members/uuid.webp"  (disk / PM2 deployment)
 *   - absolute URL   "https://….public.blob…"     (Vercel Blob deployment)
 *
 * Absolute values are already loadable and must pass through untouched;
 * prefixing them yields "/https://…" and a broken image. Relative values are
 * joined to the API origin, which is "" on the shared-domain deployment and
 * therefore resolves same-origin.
 *
 * Windows-style separators appear in older rows because path.join produced them
 * on the Windows dev box before they were normalised server-side.
 *
 * @param {string} [stored]
 * @returns {string}
 */
export const fileUrl = (stored) => {
  if (!stored) return "";
  const value = String(stored);
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  const normalised = value.split("\\").join("/").replace(/^\/+/, "");
  const base = config.api.API_URL || "";
  return base ? `${base}/${normalised}` : `/${normalised}`;
};

export default fileUrl;
