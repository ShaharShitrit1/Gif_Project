import { Fragment, type ReactNode } from "react";

/**
 * Tiny, safe markdown for model answers: paragraphs, "-"/"*"/"•"/"1." lists, **bold**, *italic*.
 * Builds React elements from text only — never injects HTML.
 */
export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={blocks.length}>
          {para.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {inline(l)}
            </Fragment>
          ))}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>);
      blocks.push(
        list.ordered ? (
          <ol key={blocks.length} className="list-decimal space-y-1 ps-5">
            {items}
          </ol>
        ) : (
          <ul key={blocks.length} className="list-disc space-y-1 ps-5 marker:text-ink-3">
            {items}
          </ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•])\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (bullet || ordered) {
      flushPara();
      const isOrdered = !bullet;
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push((bullet ?? ordered)![1]);
    } else if (heading) {
      flushPara();
      flushList();
      blocks.push(
        <p key={blocks.length} className="font-black">
          {inline(heading[1])}
        </p>,
      );
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return <div className={`space-y-2.5 ${className}`}>{blocks}</div>;
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|__([^_]+)__|(?<![\w*])\*([^*\n]+)\*(?!\w)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1] ?? m[2]) out.push(<strong key={out.length} className="font-black">{m[1] ?? m[2]}</strong>);
    else out.push(<em key={out.length}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
