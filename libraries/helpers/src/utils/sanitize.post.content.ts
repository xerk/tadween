import DOMPurify from 'isomorphic-dompurify';
import { parseFragment, serialize } from 'parse5';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'u',
  'a',
  'ul',
  'li',
  'h1',
  'h2',
  'h3',
  'span',
  'img',
];

const ALLOWED_ATTR = [
  'dir',
  'href',
  'target',
  'rel',
  'class',
  'data-mention-id',
  'data-mention-label',
  'src',
  'alt',
];

// <img> keeps data: URIs whatever ALLOWED_URI_REGEXP says, so a picture
// that doesn't point to a real file is dropped
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (
    data.tagName === 'img' &&
    !/^https?:\/\//i.test((node as Element).getAttribute('src') || '')
  ) {
    node.parentNode?.removeChild(node);
  }
});

export const sanitizePostContent = (value: unknown): string => {
  if (typeof value !== 'string' || !value) {
    return '';
  }

  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/|#)/i,
  });
};

// The plain text a reviewer sees for a post item: the text nodes of the
// sanitised HTML, in order, entities decoded. This is what anchor offsets
// index into on both the frontend (element.textContent) and the backend.
export const postContentPlainText = (value: unknown): string => {
  const walk = (nodes: any[]): string =>
    nodes
      .map((node) =>
        node.nodeName === '#text' ? node.value : walk(node.childNodes || [])
      )
      .join('');

  return walk(parseFragment(sanitizePostContent(value)).childNodes as any[]);
};

// Bare URLs (up to trailing punctuation) and #hashtags in any script.
const decoratedText = () =>
  /(https?:\/\/[^\s<>"]+)|((?<![\p{L}\p{N}_])#[\p{L}\p{N}_]+)/gu;

// For display only: links bare URLs in the text and marks #hashtags, so a
// post reads the way it will on the network. It only wraps text that is
// already there in <a>/<span> and never adds or removes characters, so
// postContentPlainText (and every comment anchor offset into it) is unchanged.
// Returns sanitised HTML.
export const decoratePostContent = (value: unknown): string => {
  const fragment = parseFragment(sanitizePostContent(value)) as any;
  const textNode = (text: string, parentNode: any) => ({
    nodeName: '#text',
    value: text,
    parentNode,
  });
  const element = (
    tagName: string,
    attrs: Record<string, string>,
    text: string,
    parentNode: any
  ) => {
    const node: any = {
      nodeName: tagName,
      tagName,
      attrs: Object.entries(attrs).map(([name, attr]) => ({
        name,
        value: attr,
      })),
      namespaceURI: 'http://www.w3.org/1999/xhtml',
      childNodes: [],
      parentNode,
    };
    node.childNodes.push(textNode(text, node));
    return node;
  };

  const walk = (node: any) => {
    // Text that is already a link, or a mention, stays as it is.
    if (
      node.nodeName === 'a' ||
      node.attrs?.some((a: any) => a.name === 'data-mention-id')
    ) {
      return;
    }
    node.childNodes = (node.childNodes || []).flatMap((child: any) => {
      if (child.nodeName !== '#text') {
        walk(child);
        return [child];
      }
      const pieces: any[] = [];
      let last = 0;
      for (const match of child.value.matchAll(decoratedText())) {
        const text = match[1]
          ? match[0].replace(/[.,;:!?)\]}'"]+$/u, '')
          : match[0];
        if (!text) {
          continue;
        }
        if (match.index > last) {
          pieces.push(textNode(child.value.slice(last, match.index), node));
        }
        pieces.push(
          match[1]
            ? element(
                'a',
                {
                  href: text,
                  target: '_blank',
                  rel: 'noopener noreferrer nofollow',
                  class: 'tdw-pp-link',
                },
                text,
                node
              )
            : element('span', { class: 'tdw-pp-hashtag' }, text, node)
        );
        last = match.index + text.length;
      }
      if (!pieces.length) {
        return [child];
      }
      if (last < child.value.length) {
        pieces.push(textNode(child.value.slice(last), node));
      }
      return pieces;
    });
  };

  walk(fragment);
  return sanitizePostContent(serialize(fragment));
};
