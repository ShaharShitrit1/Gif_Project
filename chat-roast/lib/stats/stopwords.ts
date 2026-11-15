/**
 * Stop-words for word stats and catchphrases. Words are matched lower-cased and exactly as
 * written (no stemming), so common Hebrew prefixed forms (ו/ש/וש/כש + word) are generated.
 */

const HEBREW_BASE = `
אני אתה את אתם אתן הוא היא הם הן אנחנו אנו אנחנו
זה זאת זו זהו זוהי אלה אלו הזה הזאת הזו האלה האלו
של שלי שלך שלו שלה שלנו שלכם שלכן שלהם שלהן
עם עמי איתי איתך איתו איתה איתנו איתכם איתם
על עליי עלי עליך עליו עליה עלינו עליכם עליהם
אל אליי אליך אליו אליה אלינו אליכם אליהם
את אותי אותך אותו אותה אותנו אתכם אותם אותן
לי לך לו לה לנו לכם לכן להם להן
בי בך בו בה בנו בכם בהם בהן
ממני ממך ממנו ממנה מכם מהם מהן
אצל אצלי אצלך אצלו אצלה אצלנו אצלכם אצלם
לא כן לו אם או כי גם רק אז אבל אך אלא כמו כאילו כדי בשביל בגלל למרות אפילו
מה מי איך למה מתי איפה כמה איזה איזו אילו האם מדוע לאן מאיפה
יש אין היה הייתה היתה היו הייתי היית הייתם היינו יהיה תהיה יהיו להיות נהיה
כל כולם כולן כולנו הכל הכול כלום שום משהו מישהו מישהי אחד אחת אחר אחרת אחרים
כבר עוד עדיין שוב תמיד אף פעם פעם פעמים אולי בטח ממש מאוד מאד די קצת הרבה יותר פחות הכי
פה כאן שם עכשיו אחרי לפני בין תוך דרך בלי עד מאז ליד מול אחר כך כך ככה כזה כזאת כאלה
היום מחר אתמול
טוב אוקיי אוקי אוק אוקיי סבבה בסדר נו אה אהה אממ אמ הממ וואלה יאללה
כן לא יופי נכון בדיוק
אותו עצמי עצמך עצמו עצמה
יודע יודעת יודעים יודעות לדעת רוצה רוצים רוצות לרצות צריך צריכה צריכים צריכות
יכול יכולה יכולים יכולות אפשר חושב חושבת חושבים אומר אומרת אומרים אמר אמרה אמרתי
הולך הולכת הולכים ללכת בא באה באים לבוא עושה עושים לעשות עשה עשיתי עשית
יהיה יש לך תגיד תגידי תגידו
ב ל ה ו ש מ כ
`;

/** Prefixes added to the most frequent function words ("וזה", "שאני", "כשהוא"…). */
const HEBREW_PREFIXABLE = `
אני אתה את אתם הוא היא הם הן אנחנו זה זאת זו
יש אין לא גם רק כל כבר עוד היה היא אם אז מה מי איך למה כמו
`;

const HEBREW_EXTRA = `
שזה וזה שזאת וזאת הזה בזה לזה מזה כזה
שאני ואני כשאני שאתה ואתה שאת ואת שהוא והוא כשהוא שהיא והיא שהם והם
שאנחנו ואנחנו שיש ויש שאין ואין שלא ולא שגם וגם שרק ורק שכל וכל לכל בכל מכל הכל
שכבר וכבר שעוד ועוד שהיה והיה שאם ואם שאז ואז שמה ומה במה למה ממה כמה
שמי ומי שאיך ואיך כמו שכמו וכמו
ולי ולך ולו ולה ולנו ולכם ולהם שלי ושלי ושלך ושלו ושלה
אבל ואבל כי וכי שכי
`;

const ENGLISH = `
a an the and or but if so to of in on at for with from by as into onto about over under
is are was were be been being am isn't aren't wasn't weren't isnt arent wasnt werent
i i'm im i've ive i'll ill i'd id me my mine myself
you you're youre you've youve you'll youll you'd youd your yours yourself u ur ya ye y'all yall
he he's hes him his himself she she's shes her hers herself it it's its itself
we we're were we've weve we'll we'd us our ours ourselves
they they're theyre they've they'll they'd them their theirs themselves
this that these those there there's theres here what what's whats which who who's whom whose
how how's when where where's why
do does did done doing don't dont doesn't doesnt didn't didnt
have has had having haven't havent hasn't hasnt hadn't
will would shall should can could may might must won't wont wouldn't wouldnt can't cant couldn't couldnt shouldn't shouldnt
not no yes yeah yep yup nope ok okay k kk
just like get got gets go goes going gone went come comes came make makes made take took
know knew think thought want wanted need say said says tell told see saw look let let's lets
gonna wanna gotta lemme
all any some every each both few more most other such only own same than too very really
also still even back now then well much many lot lots one two
up down out off again further once
oh ah uh um umm hmm hm eh mm
thing things something anything nothing everything someone anyone everyone
yeah sure right
`;

const SPANISH = `
de la que el en y a los se del las un por con no una su para es al lo como más pero sus le ya o este sí porque esta entre cuando muy sin sobre también me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mí antes algunos qué unos yo otro otras otra él tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mi mis tú te ti tu tus ellas nosotras vosotros os mío mía tuyo tuya suyo suya nuestro nuestra vuestro vuestra esos esas estoy estás está estamos están ser soy eres somos son fue era tengo tiene tienes bueno vale pues
`;

const PORTUGUESE = `
de a o que e do da em um para é com não uma os no se na por mais as dos como mas foi ao ele das tem à seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você tinha foram essa num nem suas meu às minha têm numa pelos elas havia seja qual será nós tenho lhe deles essas esses pelas este fosse dele tu te vocês vos lhes meus minhas teu tua teus tuas nosso nossa nossos nossas dela delas esta estes estas aquele aquela aquilo isto tá né pra pro
`;

const FRENCH = `
au aux avec ce ces dans de des du elle en et eux il ils je la le les leur lui ma mais me même mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l à m n s t y été être avoir ai as avons avez ont est sont était ça cette cet tout tous très bien oui non alors donc
`;

const GERMAN = `
aber alle allem allen aller als also am an ander andere auch auf aus bei bin bis bist da damit dann das dass dein deine dem den der des dich die dir doch dort du durch ein eine einem einen einer es etwas für gegen hab habe haben hat hatte hier hin hinter ich ihm ihn ihr ihre im in ist ja jede jetzt kann kein keine man mein meine mich mir mit muss nach nicht nichts noch nun nur ob oder ohne schon sehr sein seine sich sie sind so über um und uns unser unter vom von vor war waren was weil wenn wer wie wieder wir wird zu zum zur okay
`;

const RUSSIAN = `
и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между это
`;

const ARABIC = `
في من على إلى عن مع هذا هذه ذلك تلك هو هي هم أنا أنت نحن انت انا ما لا لم لن قد كان كانت يكون إن أن او أو ثم كل بعض غير بين عند حتى إذا اذا لكن يا و ف ب ل
`;

function words(block: string): string[] {
  return block.split(/\s+/).filter(Boolean);
}

function build(): Set<string> {
  const set = new Set<string>();
  for (const block of [HEBREW_BASE, HEBREW_EXTRA, ENGLISH, SPANISH, PORTUGUESE, FRENCH, GERMAN, RUSSIAN, ARABIC]) {
    for (const w of words(block)) set.add(w.toLowerCase());
  }
  for (const w of words(HEBREW_PREFIXABLE)) {
    for (const p of ["ו", "ש", "וש", "כש", "וכש"]) set.add(p + w);
  }
  return set;
}

export const STOP_WORDS: ReadonlySet<string> = build();

/** Placeholder / export noise that must never surface as a "top word". */
export const NOISE_WORDS: ReadonlySet<string> = new Set([
  "omitted", "attached", "media", "image", "sticker", "gif", "jpg", "jpeg", "png", "webp", "opus", "mp4", "pdf", "vcf",
  "edited", "null", "http", "https", "www", "com",
  "הושמטה", "הושמט", "המדיה", "נכללה", "נערכה", "מצורף",
]);

/**
 * Greetings / congratulations: common to every chat, never an "inside joke".
 * A catchphrase containing one of these bigrams is dropped.
 */
export const GENERIC_PHRASES: readonly string[] = [
  "בוקר טוב", "בוקר אור", "לילה טוב", "ערב טוב", "צהריים טובים", "שבת שלום", "שבוע טוב", "חודש טוב",
  "מזל טוב", "חג שמח", "שנה טובה", "יום הולדת", "הולדת שמח", "תודה רבה", "גמר חתימה", "חתימה טובה",
  "סוף שבוע", "ליל מנוחה", "בתאבון", "רפואה שלמה", "החלמה מהירה", "בשעה טובה",
  "good morning", "good night", "happy birthday", "thank you", "thanks a lot", "happy new", "new year",
  "merry christmas", "good luck", "see you", "buenos días", "buenas noches", "bom dia", "boa noite",
];

/** Pure interjections trimmed from the edges of a catchphrase ("טוב יאללה תביאו…" → "יאללה תביאו…"). */
export const EDGE_FILLERS: ReadonlySet<string> = new Set([
  "טוב", "אוקיי", "אוקי", "אוק", "נו", "וואלה", "סבבה", "אז", "אה", "אהה", "אממ", "אמ", "הממ", "כאילו", "בקיצור",
  "ok", "okay", "so", "well", "oh", "ah", "um", "umm", "hmm", "like", "and", "but", "anyway",
]);
