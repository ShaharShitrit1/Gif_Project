# -*- coding: utf-8 -*-
"""Report section: 'many small losses, a few huge winners' (trend / breakout trading with stops)."""
import os
import json
from common import OUT
from report_helpers import pct, bars_div, table, align

TREND_LIT = ""  # filled from the literature research group (see notes/trend_literature.md)


def N(v, d=1, sign=True):
    return f'<span class="num">{pct(v, d, sign)}</span>'


def lit_block(T):
    ts, P, X = T["trade_stats"], T["portfolios"], T.get("extra_portfolios", {})
    a = ts.get("ath|atr10")
    pa = P.get("all-time high | 10xATR trail | 20 slots")
    best = X.get("all-time high + quality | wide % stops | 10 slots")
    if not (a and pa and best):
        return ""
    return f"""
  <div class="grid2">
    <div class="fig"><h3>מה הספרות אומרת</h3>
      <ul class="plain">
        <li><b>הגרסה שעובדת:</b> Wilcox &amp; Crittenden (2005) ו-Zarattini, Pagani &amp; Wilcox (2025) נכנסים בשיא כל הזמנים, עם סטופ נגרר <b>רחב מאוד</b> (פי 10 מהתנודה היומית) והחזקה של כ-10 חודשים, על מניות נזילות בבורסה, כולל מניות שמתו. 44%–49% מהעסקאות מרוויחות, רווח ממוצע של 51%+ מול הפסד ממוצע של 20%-, ופחות מ-7% מהעסקאות מייצרות את כל הרווח. כ-15% בשנה ברוטו (1991–2024).</li>
        <li><b>סטופים צמודים:</b> מפסידים לקנה-והחזק בגלל עלויות, ומוסיפים ערך רק כשיש מומנטום אמיתי (Lo &amp; Remorov 2017; Kaminski &amp; Lo 2014).</li>
        <li><b>עלויות:</b> רווחי מומנטום הם "אשליה" במניות שעולה ביוקר לסחור בהן. הם נעלמים כבר בעלות של כ-1.5% לסבב (Lesmond, Schill &amp; Zhou 2004). ב-OTC הסבב עולה בערך פי 3.</li>
        <li><b>הצד של הלוטו:</b> מניות עם הקפיצה היומית הגדולה ביותר מפסידות למניות השקטות ביותר ביותר מ-1% בחודש (Bali, Cakici &amp; Whitelaw 2011).</li>
        <li><b>סוחרים פרטיים:</b> פחות מ-1% מהסוחרים היומיים בטייוואן מרוויחים באופן עקבי (Barber et al. 2014). בברזיל, 97% מאלה שהתמידו מעל 300 ימים הפסידו (Chague et al.).</li>
      </ul></div>
    <div class="fig"><h3>ניסינו גם את גרסת הספרות על OTC</h3>
      <ul class="plain">
        <li>שיא כל הזמנים עם סטופ נגרר 10×ATR, בדיוק כמו במחקר: עסקה ממוצעת של {N(a['gross_mean'])} לפני עלויות ו-{N(a['mean'])} אחריהן, לעומת 15%+ במניות נזילות. ב-OTC המגמה פשוט לא נמשכת.</li>
        <li>כתיק: {N(pa['CAGR'])} בשנה, וגם בלי עלויות בכלל {N(pa['CAGR_no_costs'])}. נפילה מקסימלית של {N(pa['maxDD'], 0)}.</li>
        <li>הגרסה הטובה ביותר מתוך 52 שבדקתי (שיא כל הזמנים בחברה איכותית, סטופים רחבים): {N(best['CAGR'])} בשנה, נפילה מקסימלית של {N(best['maxDD'], 0)}, והעסקה הממוצעת לא שונה מאפס (p={best['p']:.2f}). אחרי 52 ניסיונות זו התוצאה שמצפים לקבל במקרה.</li>
      </ul></div>
  </div>"""


def build():
    path = os.path.join(OUT, "trend_results.json")
    if not os.path.exists(path):
        return "", {}
    T = json.load(open(path))
    ts, P, tests, halt = T["trade_stats"], T["portfolios"], T["tests"], T["halt_stress"]
    b = ts["breakout52|base"]
    q = ts["breakout52+quality|base"]
    sp = ts["spike|base"]
    rnd = ts["random|base"]
    pb = P["breakout52 | base stops | 20 slots"]
    pw = P["breakout52 | wide stops | 20 slots"]
    pq = P["breakout52 + quality | base | 10 slots"]
    iwm = P["IWM (Russell 2000)"]
    n_trades = sum(v["n"] for k, v in ts.items() if "+quality" not in k)

    lab = {"breakout52 | base stops | 20 slots": "פריצה לשיא שנתי, סטופ 15% ונגרר 25%",
           "breakout52 | wide stops | 20 slots": "פריצה לשיא שנתי, סטופים רחבים (25% / 35%)",
           "breakout52 | no stop, 60d | 20 slots": "פריצה לשיא שנתי, בלי סטופ, יציאה אחרי 60 יום",
           "breakout52 + quality | base | 10 slots": "פריצה + סינון איכות ודגלים (10 פוזיציות)",
           "donchian50 | base | 20 slots": "פריצה לשיא של 50 יום",
           "spike (rocket) | base | 20 slots": "קניית \"רקטה\": +30% ביום על נפח פי 5",
           "random entries | base | 20 slots": "ביקורת: כניסות אקראיות, אותם סטופים",
           "all-time high | 10xATR trail | 20 slots": "גרסת הספרות: שיא כל הזמנים, סטופ נגרר 10×ATR",
           "all-time high + quality | 5xATR | 10 slots": "שיא כל הזמנים + איכות, סטופ 5×ATR"}
    prow = [[l, pct(P[k]["CAGR"], 1), pct(P[k]["CAGR_no_costs"], 1), pct(P[k]["maxDD"], 0),
             pct(P[k]["worst_year"], 0), f"{P[k]['trades_per_year']:.0f}"] for k, l in lab.items()]
    X = T.get("extra_portfolios", {})
    xk = "all-time high + quality | wide % stops | 10 slots"
    if xk in X:
        prow.append(["הטובה מתוך 52 גרסאות: שיא כל הזמנים + איכות, סטופים רחבים", pct(X[xk]["CAGR"], 1), pct(X[xk]["CAGR_no_costs"], 1),
                     pct(X[xk]["maxDD"], 0), "–", f"{X[xk]['trades_per_year']:.0f}"])
    prow.append(["Russell 2000 (IWM), קנה והחזק", pct(iwm["CAGR"], 1), pct(iwm["CAGR"], 1), pct(iwm["maxDD"], 0), "–", "–"])

    slab = {"breakout52|base": "פריצה לשיא שנתי על נפח פי 3", "donchian50|base": "פריצה לשיא של 50 יום",
            "spike|base": "\"רקטה\": +30% ביום", "random|base": "כניסה אקראית (ביקורת)",
            "breakout52+quality|base": "פריצה בחברה איכותית עם 0–2 דגלים"}
    srow = [[l, f"{ts[k]['n']:,}", pct(ts[k]['win'], 0, False), pct(ts[k]['avg_win'], 0), pct(ts[k]['avg_loss'], 0),
             f"{ts[k]['payoff']:.1f}", pct(ts[k]['gross_mean'], 1), pct(ts[k]['mean'], 1), pct(ts[k]['median'], 0),
             pct(ts[k]['p_double'], 1, False), pct(ts[k]['gap_exits'], 0, False), f"{ts[k]['median_days']:.0f}"] for k, l in slab.items()]

    ser = align([
        dict(name="פריצה, סטופ רגיל (נטו)", short="פריצה", c="--s1", pts=list(T["curves"]["breakout52 | base stops | 20 slots"].items())),
        dict(name="פריצה + איכות (נטו)", short="פריצה+איכות", c="--s2", pts=list(T["curves"]["breakout52 + quality | base | 10 slots"].items())),
        dict(name="פריצה, סטופים רחבים (נטו)", short="רחב", c="--s3", pts=list(T["curves"]["breakout52 | wide stops | 20 slots"].items())),
        dict(name="Russell 2000 (IWM)", short="IWM", c="--s4", pts=list(T["curves"]["IWM (Russell 2000)"].items())),
    ], start="2009-12")
    chart = {"trend": dict(aria="צמיחת 1 דולר: מסחר פריצות עם סטופים מול IWM", series=ser)}
    t = tests["base"]

    html = f"""
<section id="asym">
  <div class="eyebrow">Small losses, big winners</div>
  <h2>ומה עם הגישה ההפוכה: הרבה הפסדים קטנים ומעט מנצחות ענקיות?</h2>
  <p class="prose">בדקתי את זה ישירות: 4 אותות כניסה, 4 כללי יציאה ו-{n_trades:,} עסקאות מדומות על מניות ה-OTC בשנים 2010–2026. כל עסקה נכנסת בפתיחה של היום שאחרי האות. הסטופ נבדק מול השפל היומי, ואם המניה פותחת מתחת לסטופ, היציאה היא במחיר הפתיחה. בכל צד משלמים חצי מהמרווח המוערך של המניה ועוד 0.5%, וביציאה בסטופ עוד 1%. קבוצת ביקורת של כניסות אקראיות, עם אותם כללי יציאה בדיוק, בודקת אם יש ערך באות עצמו או רק במנגנון הסטופ.</p>
  <div class="kpis">
    <div class="kpi"><div class="v">{pct(b['win'], 0, False)}</div><div class="l">מהעסקאות מרוויחות (פריצה לשיא שנתי). הפרופיל שתיארת אמיתי: רוב העסקאות מפסידות.</div></div>
    <div class="kpi"><div class="v sm">{pct(b['avg_win'], 0)} / {pct(b['avg_loss'], 0)}</div><div class="l">רווח ממוצע מול הפסד ממוצע. יחס של {b['payoff']:.1f}, כמו שהגישה מבטיחה.</div></div>
    <div class="kpi neg"><div class="v sm">{pct(b['gross_mean'], 1)} → {pct(b['mean'], 1)}</div><div class="l">עסקה ממוצעת לפני עלויות ואחריהן. העלויות מוחקות את כל היתרון.</div></div>
    <div class="kpi neg"><div class="v">{pct(pb['CAGR'], 1)}</div><div class="l">תשואה שנתית של תיק שעובד כך (20 פוזיציות). Russell 2000 באותה תקופה: {pct(iwm['CAGR'], 1)}.</div></div>
  </div>
  {table(["אסטרטגיה", "שנתי נטו", "שנתי בלי עלויות", "נפילה מקס׳", "שנה גרועה", "עסקאות בשנה"], prow, hl=[len(prow) - 1], num_cols=[1, 2, 3, 4, 5])}
  <div class="fig">
    <h3>צמיחת 1 דולר, 2010–2026, אחרי עלויות</h3>
    <div class="legend">{''.join(f'<span><i style="background:var({s["c"]})"></i>{s["name"]}</span>' for s in ser)}</div>
    <div class="chart" data-chart="trend"></div>
    <p class="cap">סקאלה לוגריתמית, שווי יומי לפי מחירי סגירה. "רקטות" וכניסות אקראיות לא מוצגות בגרף כי הן מתקרבות לאפס; הן מופיעות בטבלה.</p>
  </div>
  <h3>העסקאות עצמן</h3>
  {table(["אות כניסה", "עסקאות", "מרוויחות", "רווח ממוצע", "הפסד ממוצע", "יחס", "ממוצע ברוטו", "ממוצע נטו", "חציון", "הוכפלו", "יציאה בפער", "ימים"], srow, hl=[4], num_cols=list(range(1, 12)))}
  <h3>למה זה נכשל דווקא ב-OTC</h3>
  <ol class="rules">
    <li><b>העלויות אוכלות את היתרון.</b> לפני עלויות העסקה הממוצעת מרוויחה {N(b['gross_mean'])}, אחריהן {N(b['mean'])}. החזקה חציונית של {b['median_days']:.0f} ימים אומרת שמשלמים את המרווח (כ-{pct(b['cost_side'], 1, False)} לכל צד) עשרות פעמים בשנה.</li>
    <li><b>ההפסדים לא באמת קטנים.</b> ב-{pct(b['gap_exits'], 0, False)} מהיציאות המניה פתחה מתחת לסטופ, ולכן ההפסד הממוצע הוא {N(b['avg_loss'], 0)} ולא 15%-. ב-OTC אין מי שיקנה ממך בדיוק במחיר הסטופ.</li>
    <li><b>המנצחות הענקיות נדירות.</b> רק {pct(b['p_double'], 1, False)} מהעסקאות הכפילו את עצמן, ו-{pct(b['p_5x'], 1, False)} עלו פי 5. 5% מהעסקאות הטובות מייצרות {pct(b['top5_share'], 0, False)} מכל הרווחים, כך שמספיק לפספס כמה מהן כדי לסיים בהפסד.</li>
    <li><b>יש אות, אבל הוא חלש.</b> פריצה לשיא שנתי עדיפה בבירור על כניסה אקראית: בממוצע ב-{N(t['diff'])} לעסקה (t={t['welch_t']:.1f}), וב-{t['years_breakout_beats_random']} מהשנים. אבל העסקה הממוצעת נטו לא שונה מאפס (p={t['breakout_vs_zero_p']:.2f}), וגם בלי עלויות בכלל הגרסה הטובה ביותר הניבה {N(pw['CAGR_no_costs'])} בשנה, פחות מ-IWM.</li>
    <li><b>סטופים לא עוזרים כאן.</b> אותן פריצות בלי סטופ, עם יציאה אחרי 60 יום, יצאו טובות מעט יותר בממוצע לעסקה. מניות OTC רועשות מכדי שסטופ צמוד יעבוד: הוא מוציא אותך לפני התנועה.</li>
    <li><b>"רקטות" הן הגרועות מכולן.</b> קנייה אחרי יום של +30% על נפח חריג: {N(sp['mean'])} לעסקה, רק {pct(sp['win'], 0, False)} מרוויחות, ותיק שעובד כך כמעט נמחק ({N(P['spike (rocket) | base | 20 slots']['CAGR'], 0)} בשנה).</li>
    <li><b>וזה עדיין אופטימי.</b> מניות שהושעו או בוטלו חסרות בנתונים, ובהשעיה אי אפשר לצאת בכלל. אם רק 1%–2% מהעסקאות נתקעות בהשעיה (90%-), העסקה הממוצעת יורדת ל-{N(halt['1%_of_trades_halted'])} עד {N(halt['2%_of_trades_halted'])}.</li>
  </ol>
  <p class="callout prose"><b>מה כן אפשר לקחת מזה:</b> הסינון שוב עושה את רוב העבודה. פריצה בחברה רווחית ונקייה ניצחה ב-{pct(q['win'], 0, False)} מהמקרים, עם חציון של {N(q['median'], 0)}, לעומת {N(ts['breakout52|base']['median'], 0)} בכל הפריצות. תיק כזה הפסיד רק {N(pq['CAGR'])} בשנה ובנפילה מקסימלית של {N(pq['maxDD'], 0)}. אבל זה עדיין רחוק מקרן מדד. הגישה של "הפסדים קטנים, מנצחות גדולות" מתאימה לשווקים עם עלויות נמוכות ומגמות אמיתיות, ו-OTC הוא כמעט ההפך: מרווחים רחבים, פערי פתיחה, השעיות ומומנטום חלש.</p>
  {lit_block(T)}
</section>
"""
    return html, chart
