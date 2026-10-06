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
  if (!url) return url;

  const patterns = [/\/file\/d\/([^/]+)/, /[?&]id=([^&]+)/];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const fileId = match[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return url;
}
