/**
 * Мини-санитайзер для HTML из данных (объяснения уроков/вопросов). Разрешены только безопасные теги БЕЗ атрибутов,
 * поэтому даже подменённый файл импорта не сможет выполнить скрипт или подгрузить ресурс.
 */
const ALLOWED = new Set(['B', 'I', 'EM', 'STRONG', 'U', 'BR', 'CODE', 'MARK', 'SUB', 'SUP', 'UL', 'OL', 'LI', 'P', 'SPAN', 'SMALL']);
const cache = new Map<string, string>();

function clean(node: Node, out: Node, doc: Document) {
  node.childNodes.forEach((c) => {
    if (c.nodeType === 3) {
      out.appendChild(doc.createTextNode(c.nodeValue || ''));
    } else if (c.nodeType === 1) {
      const el = c as Element;
      if (ALLOWED.has(el.tagName)) {
        const n = doc.createElement(el.tagName.toLowerCase());
        clean(el, n, doc);
        out.appendChild(n);
      } else if (!['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT'].includes(el.tagName)) {
        clean(el, out, doc); // неизвестный тег: оставляем только содержимое
      }
    }
  });
}

export function sanitize(html: string): string {
  if (!html) return '';
  const hit = cache.get(html);
  if (hit !== undefined) return hit;
  const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
  const box = doc.createElement('div');
  clean(doc.body, box, doc);
  const res = box.innerHTML;
  if (cache.size > 2000) cache.clear();
  cache.set(html, res);
  return res;
}

/** Убирает все теги — для упрощённых пояснений и подписей. */
export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}
