"use client";

import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { IconArrowBack, IconChevronForward, IconDots, IconFile, IconLock, IconMail, IconUpload } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";
import { wizardDict } from "@/lib/i18n/dict/wizard";
import "@/components/ui/motion.css";

export type GuidePlatform = "ios" | "android";
export type GuideKind = "group" | "direct";

export type ScreenId =
  | "list"
  | "chat"
  | "info-scroll"
  | "info-bottom"
  | "ios-media"
  | "ios-share"
  | "and-menu"
  | "and-more"
  | "and-media"
  | "and-share"
  | "pick";

/** Ember outline + pulsing "tap" dot around the element the user should press. */
function Hi({ on, children, className = "", dot = "end" }: { on: boolean; children: ReactNode; className?: string; dot?: "end" | "center" | "none" }) {
  return (
    <div className={`relative ${on ? "z-10 rounded-lg outline outline-[2.5px] outline-offset-2 outline-ember" : ""} ${className}`}>
      {children}
      {on && dot !== "none" && (
        <span
          aria-hidden
          className={`cr-tap pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-white bg-ember/80 shadow ${dot === "center" ? "start-1/2 -ms-2.5" : "end-3"}`}
        />
      )}
    </div>
  );
}

function StatusBar({ platform }: { platform: GuidePlatform }) {
  return (
    <div className="relative flex h-6 shrink-0 items-center justify-between px-4 text-[0.55rem] font-bold text-ink" dir="ltr">
      <span>9:41</span>
      {platform === "ios" ? (
        <span className="absolute start-1/2 top-1 h-4 w-14 -translate-x-1/2 rounded-full bg-[#17120e]" />
      ) : (
        <span className="absolute start-1/2 top-1.5 size-2.5 -translate-x-1/2 rounded-full bg-[#17120e]" />
      )}
      <span className="flex items-center gap-1">
        <span className="flex items-end gap-[1.5px]">
          {[3, 5, 7, 9].map((h) => (
            <span key={h} className="w-[2px] rounded-sm bg-ink" style={{ height: h }} />
          ))}
        </span>
        <span className="h-2 w-4 rounded-[2px] border border-ink p-[1px]">
          <span className="block h-full w-3/4 rounded-[1px] bg-ink" />
        </span>
      </span>
    </div>
  );
}

function Avatar({ label, tone = "bg-sun", size = "size-7" }: { label: string; tone?: string; size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full border-[1.5px] border-line text-[0.6rem] font-black text-[#17120e] ${tone}`}>
      {label}
    </span>
  );
}

/** Rows used by the info pages (iOS). */
function InfoRow({ label, tone = "text-ink", on = false }: { label: string; tone?: string; on?: boolean }) {
  return (
    <Hi on={on}>
      <div className={`flex items-center justify-between border-b border-line-soft bg-surface px-3 py-2 text-[0.62rem] font-semibold ${tone}`}>
        <span>{label}</span>
        {tone === "text-ink" && <IconChevronForward size={10} className="text-ink-3" />}
      </div>
    </Hi>
  );
}

export function PhoneMock({ platform, kind, screen }: { platform: GuidePlatform; kind: GuideKind; screen: ScreenId }) {
  const t = useT(wizardDict);
  const group = kind === "group";
  const name = group ? t("m_group_name") : t("m_contact_name");
  const sub = group ? t("m_members") : t("m_online");
  const initial = group ? "🍕" : t("m_contact_name").slice(0, 1);

  const chatHeader = (hiName: boolean, hiDots: boolean) => (
    <div className="flex shrink-0 items-center gap-2 border-b border-line-soft bg-surface px-2.5 py-2">
      <IconArrowBack size={12} className="text-sea" />
      <Hi on={hiName} className="min-w-0 flex-1" dot="center">
        <div className="flex min-w-0 items-center gap-1.5 px-0.5">
          <Avatar label={initial} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[0.65rem] font-bold">{name}</p>
            <p className="truncate text-[0.5rem] text-ink-3">{platform === "ios" ? t("m_tap_info") : sub}</p>
          </div>
        </div>
      </Hi>
      {platform === "android" && (
        <Hi on={hiDots} dot="center">
          <span className="grid size-6 place-items-center">
            <IconDots size={14} />
          </span>
        </Hi>
      )}
    </div>
  );

  const chatBody = (
    <div className="flex flex-1 flex-col justify-end gap-1.5 bg-chat-bg p-2.5">
      <span className="max-w-[78%] self-start rounded-xl rounded-ss-sm border border-line-soft bg-bubble-in px-2 py-1 text-[0.6rem]">{t("m_msg_1")}</span>
      <span className="max-w-[78%] self-end rounded-xl rounded-se-sm bg-bubble-out px-2 py-1 text-[0.6rem]">{t("m_msg_2")}</span>
      <span className="max-w-[78%] self-start rounded-xl rounded-ss-sm border border-line-soft bg-bubble-in px-2 py-1 text-[0.6rem]">{t("m_msg_3")}</span>
      <div className="mt-1 h-6 rounded-full border border-line-soft bg-surface" />
    </div>
  );

  const infoHeader = (
    <div className="flex shrink-0 flex-col items-center gap-1 bg-surface-2 px-3 pb-3 pt-2">
      <Avatar label={initial} size="size-12" tone="bg-sun text-base" />
      <p className="text-[0.7rem] font-black">{name}</p>
      <p className="text-[0.5rem] text-ink-3">{group ? t("m_members") : "+972 50-000-0000"}</p>
    </div>
  );

  const infoRowsTop = (
    <>
      <InfoRow label={t("m_media")} />
      <InfoRow label={t("m_starred")} />
      <InfoRow label={t("m_mute")} />
    </>
  );

  const infoRowsBottom = (hiExport: boolean) => (
    <div className="mt-2">
      <InfoRow label={t("m_export")} tone="text-sea" on={hiExport} />
      <InfoRow label={t("m_clear")} tone="text-ember" />
      <InfoRow label={group ? t("m_exit") : t("m_block")} tone="text-ember" />
      <InfoRow label={t("m_report")} tone="text-ember" />
    </div>
  );

  let body: ReactNode;
  switch (screen) {
    case "list":
      body = (
        <div className="flex flex-1 flex-col bg-surface">
          <div className="px-3 pb-1 pt-1">
            <p className="text-base font-black">{t("m_chats")}</p>
            <div className="mt-1 h-5 rounded-lg bg-surface-2 px-2 text-[0.55rem] leading-5 text-ink-3">{t("m_search")}</div>
          </div>
          {[
            { label: "👨‍👩‍👧", n: t("m_list_family"), tone: "bg-mint" },
            { label: initial, n: name, tone: "bg-sun", target: true },
            { label: "💼", n: group ? t("m_list_work") : t("m_group_name"), tone: "bg-sky" },
            { label: "🏐", n: t("m_list_volley"), tone: "bg-bubblegum" },
          ].map((row, i) => (
            <Hi key={i} on={Boolean(row.target)}>
              <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
                <Avatar label={row.label} tone={row.tone} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.62rem] font-bold">{row.n}</p>
                  <span className="mt-1 block h-1.5 w-3/4 rounded bg-line-soft" />
                </div>
              </div>
            </Hi>
          ))}
        </div>
      );
      break;
    case "chat":
      body = (
        <>
          {chatHeader(platform === "ios", platform === "android")}
          {chatBody}
        </>
      );
      break;
    case "info-scroll":
      body = (
        <div className="relative flex-1 overflow-hidden bg-surface-2">
          <div className="cr-scroll-anim">
            {infoHeader}
            {infoRowsTop}
            <div className="mt-2">
              <InfoRow label={group ? `${t("m_members")}` : t("m_contact_info")} />
              <InfoRow label="…" />
              <InfoRow label="…" />
            </div>
            {infoRowsBottom(false)}
          </div>
          <span className="absolute bottom-3 start-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full border-2 border-white bg-ember text-white shadow rtl:translate-x-1/2">
            <IconUpload size={14} className="rotate-180" />
          </span>
        </div>
      );
      break;
    case "info-bottom":
      body = (
        <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden bg-surface-2 pb-6">
          {infoHeader}
          {infoRowsTop}
          <div className="mt-2">
            <InfoRow label={group ? t("m_members") : t("m_contact_info")} />
          </div>
          {infoRowsBottom(true)}
        </div>
      );
      break;
    case "ios-media":
      body = (
        <div className="relative flex flex-1 flex-col">
          <div className="pointer-events-none flex flex-1 flex-col opacity-40">
            {infoRowsTop}
            {infoRowsBottom(false)}
          </div>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-x-2 bottom-2 space-y-1.5">
            <div className="overflow-hidden rounded-xl bg-surface text-center text-[0.65rem] font-semibold text-sea">
              <div className="border-b border-line-soft px-2 py-2">{t("m_attach")}</div>
              <Hi on>
                <div className="px-2 py-2">{t("m_without")}</div>
              </Hi>
            </div>
            <div className="rounded-xl bg-surface py-2 text-center text-[0.65rem] font-bold text-sea">{t("m_cancel")}</div>
          </div>
        </div>
      );
      break;
    case "ios-share":
      body = (
        <div className="relative flex flex-1 flex-col bg-black/30">
          <div className="mt-auto rounded-t-2xl bg-surface-2 p-2.5 pb-4">
            <div className="flex items-center gap-2 rounded-xl bg-surface p-2">
              <span className="grid size-7 place-items-center rounded-md border border-line-soft bg-surface-2">
                <IconFile size={14} />
              </span>
              <p className="truncate text-[0.55rem] font-bold" dir="ltr">
                {t("m_file_name")}
              </p>
            </div>
            <div className="mt-2.5 flex justify-between px-1">
              {["bg-sky", "bg-mint", "bg-sun", "bg-bubblegum"].map((c, i) => (
                <span key={i} className={`size-8 rounded-xl border border-line-soft ${c}`} />
              ))}
            </div>
            <div className="mt-2.5 overflow-hidden rounded-xl bg-surface text-[0.62rem] font-semibold">
              <div className="flex items-center justify-between border-b border-line-soft px-2.5 py-2">
                <span>{t("m_copy")}</span>
                <span className="size-3 rounded-sm border border-ink-3" />
              </div>
              <Hi on>
                <div className="flex items-center justify-between px-2.5 py-2">
                  <span>{t("m_save_files")}</span>
                  <span className="h-2.5 w-3.5 rounded-[3px] bg-sky" />
                </div>
              </Hi>
              <div className="flex items-center justify-between border-t border-line-soft px-2.5 py-2">
                <span>{t("m_mail")}</span>
                <IconMail size={12} />
              </div>
            </div>
          </div>
        </div>
      );
      break;
    case "and-menu":
    case "and-more":
      body = (
        <div className="relative flex flex-1 flex-col">
          {chatHeader(false, false)}
          {chatBody}
          <div className="absolute end-1.5 top-1.5 w-[64%] overflow-hidden rounded-lg border border-line-soft bg-surface py-1 text-[0.6rem] shadow-lg">
            {screen === "and-menu" ? (
              <>
                {[group ? t("m_a_info_g") : t("m_a_info_d"), t("m_a_media"), t("m_a_search"), t("m_a_mute"), t("m_a_wallpaper")].map((l) => (
                  <div key={l} className="px-3 py-1.5">
                    {l}
                  </div>
                ))}
                <Hi on>
                  <div className="flex items-center justify-between px-3 py-1.5 font-bold">
                    {t("m_a_more")}
                    <IconChevronForward size={10} />
                  </div>
                </Hi>
              </>
            ) : (
              <>
                {[t("m_a_report"), t("m_a_block"), t("m_a_clear")].map((l) => (
                  <div key={l} className="px-3 py-1.5">
                    {l}
                  </div>
                ))}
                <Hi on>
                  <div className="px-3 py-1.5 font-bold">{t("m_a_export")}</div>
                </Hi>
                <div className="px-3 py-1.5">{t("m_a_shortcut")}</div>
              </>
            )}
          </div>
        </div>
      );
      break;
    case "and-media":
      body = (
        <div className="relative flex flex-1 flex-col">
          {chatHeader(false, false)}
          {chatBody}
          <div className="absolute inset-0 grid place-items-center bg-black/35 p-4">
            <div className="w-full rounded-2xl bg-surface p-3 text-[0.6rem] shadow-lg">
              <p className="text-[0.7rem] font-bold">{t("m_a_export")}?</p>
              <span className="mt-1.5 block h-1.5 w-full rounded bg-line-soft" />
              <span className="mt-1 block h-1.5 w-2/3 rounded bg-line-soft" />
              <div className="mt-3 flex justify-end gap-1.5 font-bold text-sea">
                <span className="px-1.5 py-1">{t("m_attach")}</span>
                <Hi on dot="none">
                  <span className="block px-1.5 py-1">{t("m_without")}</span>
                </Hi>
              </div>
            </div>
          </div>
        </div>
      );
      break;
    case "and-share":
      body = (
        <div className="relative flex flex-1 flex-col bg-black/30">
          <div className="mt-auto rounded-t-2xl bg-surface p-3 pb-5">
            <span className="mx-auto mb-2 block h-1 w-8 rounded-full bg-line-soft" />
            <p className="text-[0.62rem] font-bold">{t("m_a_share_title")}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.52rem] font-semibold">
              <Hi on dot="none">
                <div className="flex flex-col items-center gap-1 p-1">
                  <span className="size-8 rounded-xl border border-line-soft bg-sun" />
                  {t("m_a_drive")}
                </div>
              </Hi>
              <div className="flex flex-col items-center gap-1 p-1">
                <span className="grid size-8 place-items-center rounded-xl border border-line-soft bg-surface-2">
                  <IconMail size={14} className="text-ember" />
                </span>
                {t("m_a_gmail")}
              </div>
              <Hi on dot="none">
                <div className="flex flex-col items-center gap-1 p-1">
                  <span className="size-8 rounded-xl border border-line-soft bg-sky" />
                  {t("m_a_files")}
                </div>
              </Hi>
            </div>
          </div>
        </div>
      );
      break;
    case "pick":
      body = (
        <div className="flex flex-1 flex-col items-center bg-paper px-3 pt-3">
          <Logo size={20} />
          <div className="mt-4 flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-line/60 bg-surface px-2 py-4">
            <span className="grid size-9 place-items-center rounded-xl border-[1.5px] border-line bg-sun text-[#17120e]">
              <IconUpload size={16} />
            </span>
            <span className="text-[0.6rem] font-black">{t("m_pick_title")}</span>
          </div>
          <Hi on className="mt-3 w-full">
            <div className="flex items-center gap-1.5 rounded-lg border border-line-soft bg-surface px-2 py-1.5">
              <IconFile size={12} />
              <span className="truncate text-[0.52rem] font-bold" dir="ltr">
                {t("m_file_name")}
              </span>
            </div>
          </Hi>
          <span className="mt-auto mb-4 flex items-center gap-1 text-[0.5rem] font-semibold text-ink-3">
            <IconLock size={9} />
            ChatRoast
          </span>
        </div>
      );
      break;
  }

  return (
    <div
      role="img"
      aria-label={t("eg_phone_aria")}
      className="relative h-[27rem] w-[13.25rem] shrink-0 rounded-[2.4rem] border-[3px] border-line bg-[#17120e] p-[7px] shadow-pop-lg rtl:shadow-[-6px_6px_0_0_var(--shadow)] sm:h-[28rem] sm:w-[13.75rem]"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[1.95rem] bg-surface">
        <StatusBar platform={platform} />
        <div key={`${platform}-${kind}-${screen}`} className="cr-fade-in flex min-h-0 flex-1 flex-col">
          {body}
        </div>
        {platform === "ios" && <span className="mx-auto mb-1.5 mt-1 block h-1 w-16 shrink-0 rounded-full bg-ink/70" />}
      </div>
    </div>
  );
}
