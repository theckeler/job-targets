import { NextResponse } from "next/server";

function firstUrlFromText(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// PWA `share_target` handler. Must not conflict with a `page.tsx` route.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const title = String(form.get("title") ?? "").trim();
    const text = String(form.get("text") ?? "").trim();
    const urlRaw = String(form.get("url") ?? "").trim();

    const url = urlRaw || firstUrlFromText(text) || "";

    const qs = new URLSearchParams();
    if (url) qs.set("url", url);
    if (title) qs.set("title", title);
    if (text && !urlRaw) qs.set("text", text);

    return NextResponse.redirect(new URL(`/share?${qs.toString()}`, req.url), {
      status: 303,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL("/share", req.url), { status: 303 });
  }
}

