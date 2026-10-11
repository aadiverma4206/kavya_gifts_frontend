// Converts a Google Drive "share" link into a direct image URL that <img>
// can actually load. A normal Drive share link (e.g.
// "https://drive.google.com/file/d/FILE_ID/view?usp=sharing") points to a
// viewer page, not the raw image file, so it won't render in <img src="...">
// as-is — this pulls out the file ID and rewrites it to a format that will.
//
// Supported input formats:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?id=FILE_ID&export=view
// Anything else (a normal image URL, an empty string, etc.) is returned
// unchanged.
export function toDirectImageUrl(url) {
  if (!url) return "";

  // If passed an array of images (e.g., product.images), extract the first valid non-empty entry
  if (Array.isArray(url)) {
    const firstValid = url.find((u) => typeof u === "string" && u.trim().length > 0);
    return firstValid ? toDirectImageUrl(firstValid) : "";
  }

  if (typeof url !== "string") return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const fileId = match[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return trimmed;
}
