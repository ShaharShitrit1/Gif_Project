/**
 * zod schemas for the API request bodies (server-side validation).
 */

import { z } from "zod";
import type { AskRequest, ReportRequest } from "../types";
import { AIReportSchema } from "./schema";

const id = z.string().trim().min(1).max(24);
const participants = z
  .array(z.object({ id, name: z.string().max(200), messages: z.number().int().nonnegative() }))
  .min(1)
  .max(2000);
const transcript = z.string().min(1).max(2_900_000);
const statsDigest = z.string().max(60_000);

const TranscriptMetaSchema = z.object({
  totalMessages: z.number().int().nonnegative(),
  includedMessages: z.number().int().nonnegative(),
  fromTs: z.number(),
  toTs: z.number(),
  truncated: z.boolean(),
  approxTokens: z.number().nonnegative(),
});

const common = {
  language: z.string().trim().min(2).max(40),
  personaId: z.enum(["max", "savta", "doc"]),
  intensity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
};

export const ReportRequestSchema = z
  .object({
    chatType: z.enum(["friends", "couple", "friend", "family", "work", "other"]),
    ...common,
    groupName: z.string().max(200).optional(),
    selfId: id.optional().nullable(),
    extraContext: z.string().max(2000).optional(),
    participants,
    transcript,
    transcriptMeta: TranscriptMetaSchema,
    statsDigest,
  })
  .refine((r) => !r.selfId || r.participants.some((p) => p.id === r.selfId), { message: "selfId must be a participant id", path: ["selfId"] });

export const AskRequestSchema = z
  .object({
    ...common,
    report: AIReportSchema,
    participants,
    transcript,
    statsDigest,
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20_000) }))
      .max(60),
    question: z.string().trim().min(1).max(2000),
    focusParticipantId: id.optional().nullable(),
  })
  .refine((r) => !r.focusParticipantId || r.participants.some((p) => p.id === r.focusParticipantId), {
    message: "focusParticipantId must be a participant id",
    path: ["focusParticipantId"],
  });

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

function describe(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
    .join("; ");
}

export function parseReportRequest(json: unknown): ParseResult<ReportRequest> {
  const r = ReportRequestSchema.safeParse(json);
  if (!r.success) return { ok: false, message: describe(r.error) };
  const v = r.data;
  return {
    ok: true,
    value: {
      ...v,
      selfId: v.selfId ?? undefined,
    },
  };
}

export function parseAskRequest(json: unknown): ParseResult<AskRequest> {
  const r = AskRequestSchema.safeParse(json);
  if (!r.success) return { ok: false, message: describe(r.error) };
  const v = r.data;
  return { ok: true, value: { ...v, focusParticipantId: v.focusParticipantId ?? undefined } };
}
