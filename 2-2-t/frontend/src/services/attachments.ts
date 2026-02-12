export function getAttachmentDownloadUrl(apiBaseUrl: string, attachmentId: string) {
  const base = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  return `${base}/attachments/${encodeURIComponent(attachmentId)}/download`;
}
