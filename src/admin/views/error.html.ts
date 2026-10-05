import { ADMIN_STYLES } from './admin.styles';

export function renderErrorPage(nonce: string, title: string, lines: string[]): string {
  const items = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shield Admin</title><style nonce="${nonce}">${ADMIN_STYLES}</style></head>
<body><div class="center"><div class="card box" role="alert"><h1>${escapeHtml(title)}</h1>${items}</div></div></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
