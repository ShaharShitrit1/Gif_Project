/**
 * Pattern tables for WhatsApp exports (iOS + Android, English + Hebrew first,
 * plus the most common other export languages).
 *
 * Note: tsconfig targets ES2017, so no named capture groups and no `s` flag.
 */
import type { MessageKind, SystemEventType } from "../types";

/** Bidi / invisible marks WhatsApp sprinkles around names, placeholders and lines. */
export const MARKS = "\\u200B\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069\\u061C\\uFEFF";
export const LEADING_MARKS_RE = new RegExp(`^[${MARKS}]+`);
export const ALL_MARKS_RE = new RegExp(`[${MARKS}]`, "g");
const EDGE_MARKS_WS_RE = new RegExp(`^[\\s${MARKS}]+|[\\s${MARKS}]+$`, "g");

export function stripEdgeMarks(s: string): string {
  return s.replace(EDGE_MARKS_WS_RE, "");
}

/** Bidi embeddings/isolates (LRE…PDF, LRI…PDI) wrap phone numbers; once edges are trimmed they'd be unbalanced. */
const EMBEDDING_RE = /[\u202A-\u202E\u2066-\u2069]/g;

/** Clean user/system text: drop embeddings everywhere, trim marks + whitespace at the edges. */
export function cleanText(s: string): string {
  return stripEdgeMarks(s.indexOf("\u202A") === -1 && s.indexOf("\u2066") === -1 && s.indexOf("\u202B") === -1 && s.indexOf("\u2068") === -1 ? s : s.replace(EMBEDDING_RE, ""));
}

export function startsWithMark(s: string): boolean {
  return LEADING_MARKS_RE.test(s);
}

/* ------------------------------------------------------------------ */
/* Line header                                                         */
/* ------------------------------------------------------------------ */

const SP = "[\\s\\u202F\\u00A0]";
const AMPM =
  `(?:[AaPp]\\.?${SP}?[Mm]\\.?|לפנה["״'׳]צ|אחה["״'׳]צ|לפני${SP}הצהריים|אחרי${SP}הצהריים|אחר${SP}הצהריים|בבוקר|בערב|בלילה)`;

/**
 * Groups: 1 "[" · 2 a · 3 date sep · 4 b · 5 c · 6 hour · 7 min · 8 sec · 9 am/pm · 10 "]" · 11 dash · 12 colon
 *   iOS      [14/11/2026, 14:06:12] Name: msg
 *   Android  14/11/2026, 14:06 - Name: msg      11/14/26, 2:06 PM - Name: msg
 *   old iOS  14/11/2026, 14:06:12: Name: msg
 */
export const HEADER_RE = new RegExp(
  "^(\\[)?" +
    "(\\d{1,4})([./-])(\\d{1,2})\\3(\\d{1,4})\\.?" +
    `,?${SP}*(?:at${SP}+|ב-?)?` +
    "(\\d{1,2})[:.](\\d{2})(?:[:.](\\d{2}))?" +
    `(?:${SP}*(${AMPM}))?` +
    `(?:${SP}*(\\])${SP}*|${SP}*([-–—])${SP}+|${SP}*([-–—])$|(:)${SP}+)`,
);

export const AMPM_PM_RE = /^(?:[Pp]|אחה|אחר|בערב|בלילה)/;
export const AMPM_HEBREW_RE = /[֐-׿]/;

/* ------------------------------------------------------------------ */
/* Message placeholders                                                */
/* ------------------------------------------------------------------ */

const EDITED_ALTS = [
  "This message was edited",
  "ההודעה נערכה",
  "הודעה זו נערכה",
  "Se editó este mensaje\\.?",
  "Mensaje editado",
  "Mensagem editada",
  "Esta mensagem foi editada",
  "Ce message a été modifié",
  "Message modifié",
  "Diese Nachricht wurde bearbeitet",
  "Nachricht bearbeitet",
  "Сообщение изменено",
  "Questo messaggio è stato modificato",
  "Messaggio modificato",
  "Dit bericht is bewerkt",
  "Bu mesaj düzenlendi",
  "تم تعديل هذه الرسالة",
].join("|");

export const EDITED_RE = new RegExp(`[\\s${MARKS}]*<(?:${EDITED_ALTS})>[\\s${MARKS}]*$`, "i");

export const MEDIA_OMITTED_RE = new RegExp(
  "^<(?:" +
    [
      "Media omitted",
      "המדיה לא נכללה",
      "מדיה הושמטה",
      "המדיה הושמטה",
      "Multimedia omitido",
      "Archivo omitido",
      "Mídia oculta",
      "Arquivo de mídia oculto",
      "Médias omis",
      "Fichier omis",
      "Medien ausgeschlossen",
      "Medien weggelassen",
      "Без медиафайлов",
      "Медиафайл пропущен",
      "Media omessi",
      "Media weggelaten",
      "Medya dahil edilmedi",
      "Media tidak disertakan",
      "Media dihilangkan",
      "تم استبعاد الوسائط",
      "الوسائط محذوفة",
    ].join("|") +
    ")>$",
  "i",
);

/** A lone localized placeholder in angle brackets we don't know ("<Медиа отсутствует>"). */
export const GENERIC_PLACEHOLDER_RE = /^<[^<>\d]{3,40}>$/;

/** iOS "image omitted"-style lines, per language. */
export const OMITTED_TABLE: [RegExp, MessageKind][] = [
  [/(?:^|\s)image omitted$/i, "image"],
  [/(?:^|\s)video omitted$/i, "video"],
  [/(?:^|\s)audio omitted$/i, "audio"],
  [/(?:^|\s)sticker omitted$/i, "sticker"],
  [/(?:^|\s)GIF omitted$/i, "gif"],
  [/(?:^|\s)document omitted$/i, "document"],
  [/(?:^|\s)(?:contact card|vcard|contact) omitted$/i, "contact"],
  [/(?:^|\s)view once (?:photo|image|video|voice message|audio|message) omitted$/i, "viewonce"],
  // Hebrew
  [/(?:^|\s)תמונה הושמטה$/, "image"],
  [/(?:^|\s)(?:סרטון|וידאו|סרט) הושמט$/, "video"],
  [/(?:^|\s)(?:שמע|קובץ שמע|אודיו|הקלטה|הקלטת שמע|הודעה קולית) הושמט(?:ה)?$/, "audio"],
  [/(?:^|\s)(?:מדבקה|סטיקר) הושמט(?:ה)?$/, "sticker"],
  [/(?:^|\s)(?:GIF|קובץ GIF) הושמט$/i, "gif"],
  [/(?:^|\s)(?:מסמך|קובץ) הושמט$/, "document"],
  [/(?:^|\s)כרטיס (?:איש|אנשי) קשר הושמט$/, "contact"],
  // Spanish / Portuguese / French / German / Italian
  [/(?:^|\s)(?:imagen omitida|imagem ocultada|imagem omitida|image absente|bild weggelassen|immagine omessa)$/i, "image"],
  [/(?:^|\s)(?:video omitido|vídeo omitido|vídeo ocultado|vidéo absente|video weggelassen|video omesso)$/i, "video"],
  [/(?:^|\s)(?:audio omitido|áudio ocultado|áudio omitido|audio omis|audio weggelassen|audio omesso)$/i, "audio"],
  [/(?:^|\s)(?:sticker omitido|figurinha omitida|autocollant omis|sticker weggelassen|sticker omesso)$/i, "sticker"],
  [/(?:^|\s)(?:GIF omitido|GIF retiré|GIF weggelassen|GIF omessa|GIF omesso)$/i, "gif"],
  [/(?:^|\s)(?:documento omitido|document omis|dokument weggelassen|documento omesso)$/i, "document"],
  [/(?:^|\s)(?:tarjeta de contacto omitida|cartão de contato omitido|kontaktkarte weggelassen)$/i, "contact"],
];

/** "<attached: 00000012-PHOTO-2026-06-01-10-00-00.jpg>" (iOS zip exports). */
export const IOS_ATTACHED_RE =
  /^<(?:attached|מצורף|קובץ מצורף|adjunto|anexado|anexo|pièce jointe|Anhang|allegato|bijlage|прикреплено|ekli)\s*:\s*([^<>]+?)\s*>\s*(.*)$/i;

/** "IMG-20260601-WA0001.jpg (file attached)" (Android zip exports). */
export const ANDROID_ATTACHED_RE =
  /^(.+?\.[A-Za-z0-9]{1,6})\s+\((?:file attached|הקובץ מצורף|קובץ מצורף|מצורף קובץ|archivo adjunto|arquivo anexado|fichier joint|Datei angehängt|файл прикреплен|file allegato|bestand bijgevoegd|dosya ekli|ملف مرفق)\)\s*(.*)$/i;

export const DELETED_RE = new RegExp(
  "^(?:" +
    [
      "This message was deleted(?: by .+)?",
      "You deleted this message",
      "This message was deleted by admin.*",
      "ההודעה (?:הזו |הזאת )?נמחקה.*",
      "הודעה זו נמחקה.*",
      "מחקת (?:את )?(?:ההודעה הזו|ההודעה הזאת|הודעה זו|ההודעה)",
      "Se eliminó este mensaje",
      "Este mensaje fue eliminado",
      "Eliminaste este mensaje",
      "Mensagem apagada",
      "(?:Essa|Esta) mensagem foi apagada",
      "Você apagou esta mensagem",
      "Ce message a été supprimé",
      "Vous avez supprimé ce message",
      "Diese Nachricht wurde gelöscht",
      "Du hast diese Nachricht gelöscht",
      "(?:Это )?(?:с|С)ообщение удалено",
      "Вы удалили это сообщение",
      "Questo messaggio è stato eliminato",
      "Hai eliminato questo messaggio",
      "Dit bericht is verwijderd",
      "Je hebt dit bericht verwijderd",
      "Bu mesaj silindi",
      "Bu mesajı sildiniz",
      "تم حذف هذه الرسالة",
      "لقد حذفت هذه الرسالة",
    ].join("|") +
    ")\\.?$",
  "i",
);

/** Undecryptable placeholders — real messages whose content never reached the exporting phone. */
export const WAITING_RE =
  /^(?:Waiting for this message.*|ממתין להודעה (?:הזו|זו).*|Esperando (?:el|este) mensaje.*|Aguardando (?:a|esta) mensagem.*|En attente de ce message.*|Warten auf diese Nachricht.*)$/i;

export const CALL_RE =
  /^(?:Missed (?:group )?(?:voice|video) call|(?:Group )?(?:voice|video) call|Silenced (?:voice|video) call|Incoming (?:voice|video) call|Outgoing (?:voice|video) call|שיחה קולית(?: שלא נענתה| קבוצתית| שהוחמצה)?|שיחת וידאו(?: שלא נענתה| קבוצתית| שהוחמצה)?|שיחה (?:קבוצתית|שלא נענתה)|Llamada (?:de voz |de video )?perdida|Videollamada perdida|Llamada de (?:voz|video)|Chamada de (?:voz|vídeo) perdida|Chamada de (?:voz|vídeo)|Appel (?:vocal|vidéo) manqué|Appel (?:vocal|vidéo)|Verpasster (?:Sprach|Video)anruf|(?:Sprach|Video)anruf)(?:\s*[,•·]\s*.*)?$/i;

export const VIEW_ONCE_RE =
  /^(?:null|view once (?:photo|image|video|voice message|audio|message)|.*לצפייה חד[ -]?פעמית.*|.*צפייה חד[ -]?פעמית.*|(?:foto|vídeo|video|mensaje de voz|mensagem de voz) (?:de|para) (?:una sola|uma única) (?:vez|visualización|visualização))$/i;

export const LOCATION_RE =
  /^(?:location|live location|מיקום|ubicación|localização|localisation|position|standort|местоположение|posizione|locatie|konum|الموقع)\s*:\s*\S*/i;
export const LIVE_LOCATION_RE =
  /^(?:live location shared|live location|מיקום (?:בזמן אמת|חי)(?: משותף| שותף)?|שיתוף מיקום (?:בזמן אמת|חי)|ubicación en tiempo real(?: compartida)?|localização em tempo real(?: compartilhada)?|position en direct(?: partagée)?|live-standort(?: geteilt)?)$/i;

export const POLL_HEAD_RE =
  /^(?:POLL|סקר|ENCUESTA|ENQUETE|SONDAGE|UMFRAGE|ОПРОС|SONDAGGIO|PEILING|ANKET|استطلاع)\s*:\s*(.*)$/i;
export const POLL_OPTION_RE =
  /^(?:OPTION|אפשרות|OPCIÓN|OPÇÃO|ANTWORT|ВАРИАНТ|OPZIONE|OPTIE|SEÇENEK|خيار)\s*:\s*(.*?)(?:\s*\([^()]*\d[^()]*\))?\s*$/i;

/* ------------------------------------------------------------------ */
/* System events                                                       */
/* ------------------------------------------------------------------ */

export const ENCRYPTION_RE =
  /end-to-end encrypt|secured with end-to-end|מוצפנות מקצה לקצה|מוצפנות מקצה-לקצה|הצפנה מקצה לקצה|הצפנה מקצה-לקצה|cifrad[oa]s? de extremo a extremo|criptografia de ponta a ponta|protegidas com a criptografia|chiffrés de bout en bout|chiffrement de bout en bout|Ende-zu-Ende-verschlüsselt|Ende-zu-Ende-Verschlüsselung|сквозным шифрованием|crittografia end-to-end|end-to-end versleuteld|uçtan uca şifrelidir|مشفرة تمامًا|التشفير التام/i;

/** Ordered: the first matching type wins. */
const SYSTEM_TABLE: [SystemEventType, RegExp][] = [
  ["encryption", ENCRYPTION_RE],
  ["security_code", /security code|קוד האבטחה|código de seguridad|código de segurança|code de sécurité|Sicherheitsnummer|код безопасности/i],
  [
    "disappearing",
    /disappearing messages|messages will disappear|default timer for disappearing|הודעות זמניות|ההודעות הזמניות|הודעות נעלמות|ההודעות ייעלמו|mensajes temporales|mensagens temporárias|messages éphémères|selbstlöschende Nachrichten|исчезающие сообщения/i,
  ],
  [
    "subject",
    /changed the (?:group )?subject|changed the group name|changed this group's name|changed the name of this group|(?:שינה|שינתה|שינית|שינו)(?:\/תה|\/ה)?\s+את\s+(?:נושא|שם)\s+הקבוצה|cambió el (?:asunto|nombre del grupo)|mudou o (?:assunto|nome do grupo)|a modifié le (?:sujet|nom du groupe)|hat den Betreff|hat den Gruppennamen|изменил(?:а)? тему|изменил(?:а)? название группы/i,
  ],
  [
    "icon",
    /changed (?:this|the) group(?:'s)? (?:icon|photo|picture)|deleted this group's (?:icon|photo)|removed this group's (?:icon|photo)|changed the group icon|(?:שינה|שינתה|שינית|מחק|מחקה|מחקת|הסיר|הסירה)(?:\/תה|\/ה)?\s+את\s+(?:סמל|תמונת|תמונה של|הסמל של|התמונה של)\s*(?:ה)?קבוצה|cambió el ícono del grupo|cambió la imagen del grupo|mudou a imagem do grupo|a changé l'icône du groupe|hat das Gruppenbild/i,
  ],
  [
    "description",
    /(?:changed|deleted|removed) the group description|(?:שינה|שינתה|שינית|מחק|מחקה|מחקת)(?:\/תה|\/ה)?\s+את\s+תיאור\s+הקבוצה|cambió la descripción del grupo|mudou a descrição do grupo|a modifié la description du groupe|hat die Gruppenbeschreibung/i,
  ],
  [
    "number_changed",
    /changed their phone number|changed (?:their|his|her) number|changed to \+?\d|changed from \+?\d|(?:שינה|שינתה|החליף|החליפה)(?:\/תה|\/ה)?\s+(?:את\s+)?(?:מספר הטלפון|המספר|למספר)|עבר(?:\/ה)?\s+למספר|cambió su número|mudou seu número|a changé de numéro|hat (?:seine|ihre) Telefonnummer/i,
  ],
  [
    "created",
    /\bcreated (?:the )?group|\bcreated this group|\bcreated a group|(?:יצר|יצרה|יצרת|יצרו)(?:\/ה)?\s+(?:את\s+)?(?:ה)?קבוצה|creó el grupo|criou o grupo|a créé le groupe|hat die Gruppe .{0,60}erstellt|создал(?:а)? группу/i,
  ],
  [
    "joined",
    /\bjoined using (?:this group's|an?|the) (?:invite )?link|\bjoined via (?:an )?invite link|\bjoined from the community|\bjoined the group|(?:הצטרף|הצטרפה|הצטרפת|הצטרפו)(?:\/ה)?(?:\s|$)|se unió (?:usando|mediante)|entrou usando|a rejoint|ist .{0,40}beigetreten|присоединил(?:ся|ась)/i,
  ],
  [
    "added",
    /\badded\s+\S|^\S.{0,80}?\bwas added\b|(?:^|\s)(?:הוסיף|הוסיפה|הוספת|הוסיפו|הוספתם)(?:\/ה)?\s+\S|\bañadió\s|\badicionou\s|\ba ajouté\s|\bhat .{0,60}hinzugefügt|добавил(?:а)?\s/i,
  ],
  [
    "removed",
    /\bremoved\s+\S|(?:^|\s)(?:הסיר|הסירה|הסרת|הסירו|הוציא|הוציאה|הוצאת)(?:\/ה)?\s+\S|\beliminó a\s|\bremoveu\s|\ba retiré\s|\bhat .{0,60}entfernt|удалил(?:а)?\s/i,
  ],
  [
    "left",
    /^\S.{0,80}?\s+left(?: the group)?$|^You left$|(?:^|\s)(?:יצא|יצאה|יצאת|יצאו|עזב|עזבה|עזבת|עזבו)(?:\/ה)?(?:\s+(?:מה)?קבוצה)?$|\bsalió del grupo|\bsaiu$|\ba quitté le groupe|\bhat die Gruppe verlassen|покинул(?:а)? группу/i,
  ],
  [
    "other",
    /\bis now an admin|\byou're now an admin|\bno longer an admin|\bpinned a message|\bunpinned a message|changed this group's settings|changed the settings|\bchanged the group settings|\bturned (?:on|off) admin approval|\bblocked this contact|\bunblocked this contact|\bnow a community|\badded this group to the community|\bstarted a call|\bstarted a video call|\breset this group's invite link|\bis a contact\b|this business|\bwelcome to the group|(?:עכשיו\s+)?(?:את\/ה|אתה|את)\s+מנהל(?:\/ת|ת)?|הוא\/היא עכשיו מנהל|מנהל(?:\/ת)? הקבוצה|הצמיד(?:\/ה)? הודעה|הצמידה הודעה|שינה(?:\/תה)? את הגדרות הקבוצה|שינה(?:\/תה)? את ההגדרות|חסמת את איש הקשר|ביטלת את החסימה|איש הקשר הזה|קישור ההזמנה|(?:עכשיו\s+)?מנהל\/ת/i,
  ],
];

/** Classify a system-looking text. Returns null when no system pattern matches. */
export function systemTypeOf(text: string): SystemEventType | null {
  const t = text.replace(ALL_MARKS_RE, "");
  for (const [type, re] of SYSTEM_TABLE) if (re.test(t)) return type;
  return null;
}

/* ------------------------------------------------------------------ */
/* Titles                                                              */
/* ------------------------------------------------------------------ */

const QUOTED_RE = /["“”„«»״]([^"“”„«»״]+)["“”„«»״]\s*\.?$/;

/** New group name from a subject / created event ("…to "X"", "…ל"X"", "created group "X""). */
export function quotedNameAtEnd(text: string): string | null {
  const t = text.replace(ALL_MARKS_RE, "").trim();
  const m = QUOTED_RE.exec(t);
  if (!m) return null;
  const name = m[1].trim();
  return name || null;
}

const FILENAME_TITLE_RES: RegExp[] = [
  /^WhatsApp Chat\s*(?:with|-|–|—)\s*(.+)$/i,
  /^צ['׳]?אט (?:ב-?)?WhatsApp (?:עם|-)\s*(.+)$/i,
  /^שיחת WhatsApp עם\s*(.+)$/i,
  /^WhatsApp Chat mit\s+(.+)$/i,
  /^Chat de WhatsApp con\s+(.+)$/i,
  /^Conversa do WhatsApp com\s+(.+)$/i,
  /^Discussion WhatsApp avec\s+(.+)$/i,
  /^Chat WhatsApp con\s+(.+)$/i,
  /^WhatsApp-chat met\s+(.+)$/i,
  /^Чат WhatsApp с\s+(.+)$/i,
  /^محادثة واتساب مع\s+(.+)$/i,
];

export function titleFromFilename(filename: string | undefined): string | null {
  if (!filename) return null;
  let base = filename.replace(/^.*[\\/]/, "").replace(ALL_MARKS_RE, "");
  base = base.replace(/\.(?:zip|txt)$/i, "").replace(/\s*\(\d+\)$/, "").replace(/\.(?:zip|txt)$/i, "");
  base = base.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  for (const re of FILENAME_TITLE_RES) {
    const m = re.exec(base);
    if (m) {
      const t = m[1].trim();
      if (t) return t;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Attachments                                                         */
/* ------------------------------------------------------------------ */

export function kindFromFilename(name: string): MessageKind {
  const n = name.toUpperCase();
  if (/(?:^|[-_ ])(?:PTT|AUDIO|AUD)[-_]/.test(n)) return "audio";
  if (/(?:^|[-_ ])(?:STK|STICKER)[-_]/.test(n)) return "sticker";
  if (/(?:^|[-_ ])GIF[-_]/.test(n)) return "gif";
  if (/(?:^|[-_ ])(?:VID|VIDEO)[-_]/.test(n)) return "video";
  if (/(?:^|[-_ ])(?:IMG|PHOTO|IMAGE)[-_]/.test(n)) return "image";
  if (/\.(?:OPUS|M4A|MP3|AAC|OGG|OGA|WAV|AMR)$/.test(n)) return "audio";
  if (/\.WEBP$/.test(n)) return "sticker";
  if (/\.GIF$/.test(n)) return "gif";
  if (/\.(?:MP4|MOV|3GP|MKV|AVI|WEBM|M4V)$/.test(n)) return "video";
  if (/\.(?:JPE?G|PNG|HEIC|HEIF|BMP|TIFF?)$/.test(n)) return "image";
  if (/\.VCF$/.test(n)) return "contact";
  return "document";
}
