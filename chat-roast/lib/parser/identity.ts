/**
 * Review-step identity edits: merge duplicate senders, rename, mark "this is me".
 * Pure: always derive from the ORIGINAL parse, never mutates its input.
 */
import type { Message, ParsedChat, Participant } from "../types";
import { sortParticipants } from "./text";

export interface Identity {
  /** sourceId -> targetId (source's messages become target's; source disappears). */
  merges: Record<string, string>;
  /** participantId -> new displayName (blank values are ignored). */
  names: Record<string, string>;
  /** Participant the uploader marked as themselves (resolved through merges). */
  selfId?: string | null;
}

const idNum = (id: string) => Number(id.replace(/^\D+/, "")) || 0;

/**
 * Follow merge chains (a→b→c ⇒ c). Unknown targets stop the walk; a cycle (a→b→a) collapses
 * onto its lowest id, so every member of the cycle resolves to the same survivor.
 */
function resolver(merges: Record<string, string>, known: Set<string>): (id: string) => string {
  const cache = new Map<string, string>();
  const has = (k: string) => Object.prototype.hasOwnProperty.call(merges, k);
  return (id: string) => {
    const hit = cache.get(id);
    if (hit !== undefined) return hit;
    const path = [id];
    let curr = id;
    let result: string | null = null;
    for (;;) {
      const next = has(curr) ? merges[curr] : undefined;
      if (!next || next === curr || !known.has(next)) break;
      const at = path.indexOf(next);
      if (at !== -1) {
        result = path.slice(at).reduce((a, b) => (idNum(b) < idNum(a) ? b : a));
        break;
      }
      path.push(next);
      curr = next;
    }
    const out = result ?? curr;
    cache.set(id, out);
    return out;
  };
}

export function applyIdentity(original: ParsedChat, identity: Identity): ParsedChat {
  const known = new Set(original.participants.map((p) => p.id));
  const resolve = resolver(identity?.merges ?? {}, known);
  const names = identity?.names ?? {};
  const selfId = identity?.selfId ? resolve(identity.selfId) : null;

  const messages: Message[] = original.messages.map((m) => {
    const author = resolve(m.author);
    return author === m.author ? { ...m } : { ...m, author };
  });

  // Aggregate counts / first / last per surviving id.
  const agg = new Map<string, { count: number; first: number; last: number }>();
  for (const m of messages) {
    const a = agg.get(m.author);
    if (a) {
      a.count++;
      if (m.ts < a.first) a.first = m.ts;
      if (m.ts > a.last) a.last = m.ts;
    } else {
      agg.set(m.author, { count: 1, first: m.ts, last: m.ts });
    }
  }

  // Original names: the survivor's own first, then each merged source's (in id order).
  const mergedIn = new Map<string, string[]>();
  for (const p of [...original.participants].sort((x, y) => idNum(x.id) - idNum(y.id))) {
    const target = resolve(p.id);
    if (target === p.id) continue;
    const list = mergedIn.get(target) ?? [];
    list.push(...p.originalNames);
    mergedIn.set(target, list);
  }

  const participants: Participant[] = [];
  for (const p of original.participants) {
    if (resolve(p.id) !== p.id) continue; // merged away
    const a = agg.get(p.id);
    const rename = typeof names[p.id] === "string" ? names[p.id].replace(/\s+/g, " ").trim() : "";
    const next: Participant = {
      id: p.id,
      originalNames: unique([...p.originalNames, ...(mergedIn.get(p.id) ?? [])]),
      displayName: rename || p.displayName,
      messageCount: a?.count ?? 0,
      firstTs: a?.first ?? p.firstTs,
      lastTs: a?.last ?? p.lastTs,
    };
    if (selfId === p.id) next.isSelf = true;
    participants.push(next);
  }
  sortParticipants(participants);

  return {
    ...original,
    messages,
    systemEvents: original.systemEvents.map((e) => ({ ...e })),
    participants,
    warnings: [...original.warnings],
  };
}

function unique(list: string[]): string[] {
  return [...new Set(list)];
}
