/** The installed theme owns presentation; the platform owns appointment behavior. */
const protectedMarkup = /<!--[\s\S]*?-->|<(script|style|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const attributes = /([^\s=<>"'`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function mapMarkup(html: string, transform: (markup: string) => string): string {
  let offset = 0;
  let result = "";
  for (const match of html.matchAll(protectedMarkup)) {
    result += transform(html.slice(offset, match.index)) + match[0];
    offset = match.index! + match[0].length;
  }
  return result + transform(html.slice(offset));
}

function attributeValue(source: string, name: string): string | undefined {
  for (const match of source.matchAll(attributes)) {
    if (match[1].toLowerCase() === name.toLowerCase()) return match[2] ?? match[3] ?? match[4] ?? "";
  }
}

function setAttributes(source: string, values: Record<string, string | null>): string {
  let output = source;
  // Match complete attributes, so a data-href or a quoted value containing href is preserved.
  for (const match of [...source.matchAll(attributes)].reverse()) {
    if (Object.hasOwn(values, match[1].toLowerCase())) {
      output = output.slice(0, match.index) + output.slice(match.index! + match[0].length);
    }
  }
  return output.trimEnd() + Object.entries(values)
    .filter(([, value]) => value !== null)
    .map(([name, value]) => ` ${name}="${escapeHtml(value!)}"`).join("");
}

/** Also upgrades legacy nested CTAs; existing installations need no new upload. */
export function normalizeAppointmentCtas(html: string, slug?: string): string {
  const href = slug ? `/${encodeURIComponent(slug)}#agendamento` : "#agendamento";
  return mapMarkup(html, (markup) => markup
    .replace(/<(a|button)\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/\1\s*>/gi,
      (element, tag: string, source: string, content: string) => {
        const text = content.replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|#160|#x0*a0);/gi, " ");
        const module = attributeValue(source, "data-module");
        if (module?.toLowerCase() !== "appointment" && !/agendar\s+agora/i.test(text)) return element;
        const normalized = setAttributes(source, {
          "data-module": "appointment", onclick: null, target: null,
          ...(tag.toLowerCase() === "a" ? { href } : { type: "button", formaction: null }),
        });
        return `<${tag}${normalized}>${content}</${tag}>`;
      })
    .replace(/<(div|section)\b((?:[^>"']|"[^"]*"|'[^']*')*)>\s*<\/\1\s*>/gi,
      (element, tag: string, source: string) => {
        if (attributeValue(source, "data-module")?.toLowerCase() !== "appointment") return element;
        return `<${tag}${source}><button type="button" data-module="appointment">Agendar agora</button></${tag}>`;
      }));
}

export function isValidTemplateId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]+$/.test(value);
}

/** Serve the selected uploaded theme with shared booking assets, never inline JS. */
export function renderBookingTemplate(html: string, options: { slug: string; templateId: string; studioName: string }): string {
  if (!isValidTemplateId(options.templateId)) throw new Error("Invalid template id");
  const base = `/templates/uploaded/${options.templateId}/`;
  let result = normalizeAppointmentCtas(html.replaceAll("{{studioName}}", escapeHtml(options.studioName)), options.slug);
  // The first base element must precede relative styles/images, including those in the head.
  result = mapMarkup(result, (markup) => markup.replace(/<base\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, ""));
  let hasStylesheet = false;
  let hasViewport = false;
  mapMarkup(result, (markup) => {
    for (const match of markup.matchAll(/<(link|meta)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
      const source = match[2];
      if (match[1].toLowerCase() === "meta" && attributeValue(source, "name")?.toLowerCase() === "viewport") hasViewport = true;
      if (match[1].toLowerCase() === "link" && attributeValue(source, "rel")?.toLowerCase() === "stylesheet") {
        const href = attributeValue(source, "href")?.split(/[?#]/)[0];
        if (href === "preview.css" || href === "./preview.css" || href === base + "preview.css") hasStylesheet = true;
      }
    }
    return markup;
  });
  const headStart = `<base href="${base}">${hasViewport ? "" : '<meta name="viewport" content="width=device-width, initial-scale=1">'}${hasStylesheet ? "" : '<link rel="stylesheet" href="preview.css">'}`;
  if (/<head\b[^>]*>/i.test(result)) {
    result = result.replace(/<head\b[^>]*>/i, (head) => head + headStart);
  } else if (/<html\b[^>]*>/i.test(result)) {
    result = result.replace(/<html\b[^>]*>/i, (root) => root + `<head>${headStart}</head>`);
  } else {
    result = `<head>${headStart}</head>` + result;
  }
  const assets = `<style>[data-slot="services"] .services,[data-slot="gallery"],[data-slot="testimonials"]{opacity:0}</style><link rel="stylesheet" href="/booking.css?v=3"><script defer src="/booking.js?v=3" data-booking-slug="${escapeHtml(options.slug)}"></script><script defer src="/public-services.js?v=1" data-studio-slug="${escapeHtml(options.slug)}"></script><script defer src="/public-gallery.js?v=1" data-studio-slug="${escapeHtml(options.slug)}"></script><script defer src="/public-testimonials.js?v=1" data-studio-slug="${escapeHtml(options.slug)}"></script>`;
  if (/<\/head\s*>/i.test(result)) return result.replace(/<\/head\s*>/i, assets + "</head>");
  // Tolerate incomplete uploaded documents without depending on a closing body tag.
  if (/<body\b/i.test(result)) return result.replace(/<body\b/i, assets + "</head><body");
  return result + assets;
}
