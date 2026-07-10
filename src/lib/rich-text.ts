const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BR",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "U",
  "UL",
]);

function sanitizeHref(href: string) {
  const trimmed = href.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed, "https://example.com");
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return trimmed;
    }
  } catch {}

  return "";
}

export function sanitizeRichTextHtml(html: string) {
  if (typeof window === "undefined") {
    return html.trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName;

    if (!ALLOWED_TAGS.has(tagName)) {
      const parent = element.parentNode;
      if (!parent) {
        return;
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      return;
    }

    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (tagName === "A" && name === "href") {
        const safeHref = sanitizeHref(attribute.value);
        if (safeHref) {
          element.setAttribute("href", safeHref);
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        } else {
          element.removeAttribute(attribute.name);
        }
        continue;
      }

      element.removeAttribute(attribute.name);
    }

    for (const child of [...element.childNodes]) {
      sanitizeNode(child);
    }
  };

  for (const child of [...doc.body.childNodes]) {
    sanitizeNode(child);
  }

  return doc.body.innerHTML.trim();
}

export function getPlainTextFromRichText(html: string) {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}
