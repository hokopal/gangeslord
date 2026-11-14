import { parse, type HTMLElement } from 'node-html-parser';

export type PageMetadata = {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  text: string;
};

const MAX_TEXT = 20_000;
const REMOVE = 'script, noscript, iframe, frame, frameset, object, embed, applet, template, link[rel="preload"], link[rel="modulepreload"], link[rel="prefetch"], link[rel="manifest"], meta[http-equiv], base';
const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'data'];

const clean = (value: string | undefined | null) => (value ?? '').replace(/\s+/g, ' ').trim();

function meta(root: HTMLElement, ...selectors: string[]): string {
  for (const selector of selectors) {
    const value = clean(root.querySelector(selector)?.getAttribute('content'));
    if (value) return value;
  }
  return '';
}

function absolute(value: string, baseUrl: string): string | null {
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Title, description, share image and readable text of an HTML page. */
export function extractMetadata(html: string, baseUrl: string): PageMetadata {
  const root = parse(html);
  const title =
    meta(root, 'meta[property="og:title"]', 'meta[name="twitter:title"]') ||
    clean(root.querySelector('title')?.text) ||
    clean(root.querySelector('h1')?.text) ||
    new URL(baseUrl).hostname;
  const description = meta(
    root,
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
  );
  const image = meta(root, 'meta[property="og:image"]', 'meta[name="twitter:image"]');

  const body = root.querySelector('body') ?? root;
  body.querySelectorAll('script, style, noscript, template, svg, nav, footer, header').forEach((n) => n.remove());
  return {
    title: title.slice(0, 300),
    description: description.slice(0, 1000),
    thumbnailUrl: image ? absolute(image, baseUrl) : null,
    // structuredText keeps a break between block elements, so words do not run together.
    text: clean(body.structuredText).slice(0, MAX_TEXT),
  };
}

/**
 * A static copy of the page: active content removed, inline handlers and script URLs
 * stripped, and a <base> added so relative styles and images load from the source site.
 * This is hygiene only. The route that serves snapshots also sends a CSP that forbids
 * script, and that header is the actual guarantee.
 */
export function buildSnapshot(html: string, baseUrl: string): string {
  const root = parse(html, { comment: false });
  root.querySelectorAll(REMOVE).forEach((node) => node.remove());
  for (const el of root.querySelectorAll('*')) {
    for (const name of Object.keys(el.attributes)) {
      const lower = name.toLowerCase();
      const value = el.getAttribute(name) ?? '';
      if (lower.startsWith('on') || lower === 'srcdoc') {
        el.removeAttribute(name);
      } else if (URL_ATTRS.includes(lower) && /^\s*(javascript|vbscript|data:text\/html)/i.test(value)) {
        el.removeAttribute(name);
      }
    }
    // Links in a snapshot open outside the room frame instead of navigating it.
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }
  const baseTag = `<base href="${baseUrl.replace(/"/g, '&quot;')}">`;
  const head = root.querySelector('head');
  if (head) {
    head.insertAdjacentHTML('afterbegin', `<meta charset="utf-8">${baseTag}`);
    return `<!doctype html>${root.toString().replace(/^\s*<!doctype[^>]*>/i, '')}`;
  }
  return `<!doctype html><html><head><meta charset="utf-8">${baseTag}</head><body>${root.toString()}</body></html>`;
}
