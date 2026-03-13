/**
 * Hydrate missing titles for `status='new'` jobs (best effort).
 *
 * Run:
 *   zsh -lc 'set -a; source .env.local; set +a; node scripts/hydrate-new-job-titles.js'
 */

const CONN = process.env.POSTGRES_URL_NON_POOLING;
if (!CONN) {
  console.error("Missing POSTGRES_URL_NON_POOLING");
  process.exit(2);
}

function extract(html, pattern) {
  const m = html.match(pattern);
  return m?.[1]?.trim() ?? "";
}

function stripHtmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanJobTitle(raw) {
  return String(raw)
    .replace(/\s*[\|–—]\s*.+$/, "")
    .replace(/\s+at\s+[A-Z].+$/, "")
    .replace(/\s+-\s+[A-Z].+$/, "")
    .trim();
}

function isRecord(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function findLdJobPostingTitle(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => (m[1] ?? "").trim())
    .filter(Boolean);

  function pick(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj.flatMap(pick);
    if (!isRecord(obj)) return [];
    const graph = obj["@graph"];
    if (Array.isArray(graph)) return graph.flatMap(pick);
    return [obj];
  }

  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw);
      const nodes = pick(parsed);
      const jp = nodes.find((n) => {
        if (!isRecord(n)) return false;
        const t = n["@type"];
        return t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"));
      });
      if (jp && isRecord(jp) && typeof jp.title === "string") return jp.title.trim();
    } catch {
      // ignore
    }
  }

  return "";
}

async function scrapeTitle(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JobTracker/1.0)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const html = await res.text();

  const ldTitle = findLdJobPostingTitle(html);
  const ogTitle =
    extract(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    extract(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  const pageTitle = extract(html, /<title[^>]*>([^<]+)<\/title>/i);
  const h1 = extract(html, /<h1[^>]*>([^<]+)<\/h1>/i);

  const raw = ldTitle || h1 || ogTitle || pageTitle;
  const cleaned = cleanJobTitle(stripHtmlToText(raw));
  return cleaned;
}

function looksBad(title) {
  if (!title) return true;
  const t = title.toLowerCase();
  if (t.length < 4) return true;
  if (t === "jobs") return true;
  if (
    t.includes("careers") &&
    !t.includes("engineer") &&
    !t.includes("developer") &&
    !t.includes("designer")
  )
    return true;
  return false;
}

async function main() {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: CONN });
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, url FROM jobs WHERE status = $1 AND (title IS NULL OR title = '') AND url IS NOT NULL AND url <> '' ORDER BY created_at DESC`,
    ["new"],
  );

  let updated = 0;
  let attempted = 0;
  const failures = [];

  for (const r of rows) {
    attempted++;
    try {
      const title = await scrapeTitle(r.url);
      if (looksBad(title)) continue;
      await client.query(
        `UPDATE jobs SET title = $2, updated_at = NOW() WHERE id = $1 AND (title IS NULL OR title = '')`,
        [r.id, title],
      );
      updated++;
    } catch (e) {
      failures.push({
        id: r.id,
        error: String(e && e.message ? e.message : e),
      });
    }
  }

  await client.end();
  console.log(
    JSON.stringify(
      { attempted, updated, failureCount: failures.length, failures: failures.slice(0, 8) },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error("Error:", e?.message || e);
  process.exit(1);
});
