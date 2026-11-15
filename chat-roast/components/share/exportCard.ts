"use client";

import { CARD_H, CARD_W } from "./ShareCards";

const FONT_PROBES = ['400 40px "Rubik Variable"', '700 40px "Rubik Variable"', '900 40px "Rubik Variable"'];
const SAMPLE = "אבגדהוזחטיכלמנסעפצקרשת ABCabc 0123";

/** Make sure every Rubik subset the card uses (Hebrew + Latin) is loaded before we snapshot. */
async function fontsReady() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all(FONT_PROBES.map((f) => document.fonts.load(f, SAMPLE)));
    await document.fonts.ready;
  } catch {}
}

/** Waits until images inside the node (if any) are decoded. */
async function imagesReady(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => {}))));
}

/**
 * Renders a 1080×1350 share card node to a PNG blob with modern-screenshot.
 * Rubik's @font-face rules (from the page's stylesheets) are inlined as data URLs so the
 * Hebrew glyphs render inside the SVG foreignObject exactly like on the page.
 */
/** Hides optional blocks (in DOM order) until the card's content column stops overflowing. */
function fitCard(node: HTMLElement) {
  const col = node.querySelector<HTMLElement>("[data-card-col]");
  if (!col) return;
  for (const opt of Array.from(col.querySelectorAll<HTMLElement>("[data-optional]"))) {
    if (col.scrollHeight <= col.clientHeight + 1) break;
    opt.style.display = "none";
  }
}

export async function renderCardPng(node: HTMLElement): Promise<Blob> {
  await fontsReady();
  await imagesReady(node);
  fitCard(node);
  const { domToBlob } = await import("modern-screenshot");
  const blob = await domToBlob(node, {
    width: CARD_W,
    height: CARD_H,
    scale: 1,
    type: "image/png",
    backgroundColor: "#fff8f0",
    // No preferredFormat: fontsource declares format('woff2-variations'), which a "woff2" filter would drop.
    timeout: 20000,
  });
  if (!blob) throw new Error("render_failed");
  return blob;
}

export function cardFileName(base: string): string {
  const slug = base
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `chatroast-${slug || "card"}.png`;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function canShareFiles(file: File): boolean {
  try {
    return typeof navigator !== "undefined" && typeof navigator.share === "function" && !!navigator.canShare?.({ files: [file] });
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
