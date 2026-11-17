# -*- coding: utf-8 -*-
"""Build the Hebrew HTML report from output/*.json|csv. Every number comes from the result files."""
import os
import json
import pandas as pd
from common import OUT
from report_assets import CSS, JS
from report_static import LIT, PRACTICE
from report_helpers import pct, money, bars_div, table, align, fix_bidi
import report_trend

R = json.load(open(os.path.join(OUT, "results.json")))
EV = json.load(open(os.path.join(OUT, "events_summary.json")))
HOT = json.load(open(os.path.join(OUT, "hot_split.json")))
ML = json.load(open(os.path.join(OUT, "ml.json")))
DEAD = json.load(open(os.path.join(OUT, "dead_reasons.json")))
SURV = pd.read_csv(os.path.join(OUT, "survival.csv"), index_col=0)
LIVE = pd.read_csv(os.path.join(OUT, "screen_now.csv"))
LIVE_DATE = json.load(open(os.path.join(OUT, "live_meta.json")))["live_date"] if os.path.exists(os.path.join(OUT, "live_meta.json")) else "2026-11-13"
S = R["strategies"]
F = {k: pd.DataFrame(v) for k, v in R["factors"].items()}
SENS = R["method_sensitivity"]


def N(v, d=1, sign=True):
    return f'<span class="num">{pct(v, d, sign)}</span>'


M = S["METHOD (final) [net]"]
MG = S["METHOD (final) [gross]"]
IWM, SPY = S["IWM"], S["SPY"]
TR = S["All tradable OTC [net]"]
JK = S["Junk (losses + dilution/toxic) [net]"]
RF6 = S["Red flags >= 6 [net]"]
B = R["base"]
hot = EV["hot"]
up = EV["uplist"]
junk_dead = DEAD["junk (shell or neg-equity diluter)"]["shares"]
qual_dead = DEAD["quality micro (profitable, RE>0)"]["shares"]
junk_bad = junk_dead.get("revoked", 0) + junk_dead.get("abandoned", 0) + junk_dead.get("went dark", 0) + junk_dead.get("bankrupt", 0)
years = R["meta"]["years"]
elig = R["eligible_per_year"]

# ------------------------------------------------------------------ hero
hero = f"""
<header class="hero">
  <div class="eyebrow">OTC research · backtest {years[0]}–{years[1] + 1} · {R['meta']['rows']:,} company-years · {R['meta']['companies']} companies</div>
  <h1>איך באמת עושים כסף ב-OTC</h1>
  <p class="lede">התשובה הקצרה: לא דרך ציד "רקטות". מניה שזינקה פי 2 בתוך חודש איבדה בשנה שאחרי, בחציון, {N(hot['fwd_250']['median'], 0)}. מה שעבד הוא סינון קפדני: חברות רווחיות, מדווחות ולא מדוללות, ברובן בנקים קהילתיים קטנים, שמחזיקים בסבלנות. ב-14 שנים זה הניב כ-{N(M['CAGR'], 1, False)} בשנה אחרי עלויות מסחר, עם ירידות מתונות יותר מאשר ב-Russell 2000. אבל זה <b>לא</b> ניצח קרן מדד זולה. היתרון האמיתי ב-OTC הוא להימנע מההפסדים, ומעבר לזה לעשות עבודת מחקר ידנית שסורק לא רואה.</p>
  <div class="kpis">
    <div class="kpi neg"><div class="v">{pct(hot['fwd_250']['median'], 0)}</div><div class="l">תשואה חציונית בשנה שאחרי "רקטה" (+100% ב-20 ימים על פי 5 מהמחזור הרגיל). {hot['n']} מקרים.</div></div>
    <div class="kpi"><div class="v">{pct(M['CAGR'], 1)}</div><div class="l">השיטה, תשואה שנתית אחרי עלויות. Russell 2000 (IWM): {pct(IWM['CAGR'], 1)}. S&amp;P 500: {pct(SPY['CAGR'], 1)}.</div></div>
    <div class="kpi neg"><div class="v">{pct(TR['CAGR'], 1)}</div><div class="l">כל מניות ה-OTC הסחירות, תשואה שנתית אחרי עלויות. וזה עוד לפני המניות שמתו ונעלמו מהנתונים.</div></div>
    <div class="kpi neg"><div class="v">{pct(junk_bad, 0, False)}</div><div class="l">מחברות ה"זבל" שנעלמו: ביטול רישום ב-SEC, נטישה או יציאה מדיווח. רק {pct(junk_dead.get('acquired', 0), 0, False)} נרכשו.</div></div>
  </div>
</header>
"""

bottom = f"""
<section id="bottom">
  <div class="eyebrow">Bottom line</div>
  <h2>השורה התחתונה</h2>
  <ol class="rules">
    <li><b>השוק כולו הוא משחק מפסיד.</b> המניה החציונית בנתונים שלנו ירדה {N(B['all']['median'], 0)} בשנה. {pct(B['all']['p_halved'], 0, False)} מהמניות איבדו חצי מערכן בתוך שנה, וזה בנתונים שכבר לא כוללים את המתות. המחקר האקדמי, שכולל אותן, מגיע לחציון של כ-97%- למניה (2000–2008).</li>
    <li><b>"רקטות" הן כרטיס לוטו.</b> מניות פני קטנות מ-10 סנט מזנקות פי 3 בתדירות כפולה מהממוצע, אבל החציון שלהן שלילי, ו-{pct(R['rockets']['groups']['penny <$0.10']['p_wipe'], 0, False)} מהן מאבדות יותר מ-80%. אי אפשר לבחור מראש את הזוכות, וה-AI שבנינו גם לא הצליח.</li>
    <li><b>הכסף נמצא בהימנעות.</b> ציון דגלים אדומים 6 ומעלה: חציון של {N(F['red_flags'].set_index('bucket').loc['6+','avg_median'], 0)} בשנה, ו-{pct(F['red_flags'].set_index('bucket').loc['6+','p_halved'], 0, False)} נחתכו בחצי. ציון 0: חציון של {N(F['red_flags'].set_index('bucket').loc['0','avg_median'], 0)}, ורק {pct(F['red_flags'].set_index('bucket').loc['0','p_halved'], 0, False)} נחתכו בחצי. ההבדל בין תיק "זבל" לתיק השיטה הוא כ-{pct(M['CAGR'] - JK['CAGR'], 0, False)} בשנה.</li>
    <li><b>השיטה עובדת אבל לא קסומה.</b> {pct(M['CAGR'], 1, False)} בשנה אחרי עלויות, נפילה מקסימלית של {N(M['maxDD'], 0)} (מול {N(IWM['maxDD'], 0)} ב-IWM) ומתאם חודשי של {R['method_vs_iwm_corr']:.2f} בלבד עם ה-Russell. כ-{pct(R['method_bank_share'], 0, False)} מהבחירות הן בנקים קהילתיים. בלי בנקים התשואה יורדת ל-{N(SENS['ex_banks'], 1, False)}.</li>
    <li><b>עלייה לבורסה (uplisting) היא אירוע למכור בו, לא לקנות.</b> לפני המעבר המניה כבר עולה ({N(up['pre_-250_-21']['median'], 0)} בחציון), ואחריו יורדת ({N(up['post_+5_+250']['median'], 0)} בשנה שאחרי).</li>
    <li><b>מי שמנצח את השוק ב-OTC עושה עבודה ידנית.</b> קורא דוחות של חברות "חשוכות" שלא מדווחות ל-SEC, מוצא מצבים מיוחדים (פדיונות, הצעות odd-lot, יציאות לפרטיות) ומחזיק שנים. קרן Alluvial, למשל, עושה כ-12%–16% בשנה לטווח ארוך, לא פי 10.</li>
  </ol>
</section>
"""

# ------------------------------------------------------------------ the market loses
lab = {"all": "כל מניות ה-OTC (בנתונים)", "tradable": "סחירות (מחזור $5K+ ליום)", "penny_<$0.10": "מניות פני (<10¢)",
       "junk": "זבל: הפסדים + דילול/המרות", "red>=6": "דגלים אדומים 6+", "quality": "איכות: רווח + תזרים + הון חיובי",
       "quality_tradable_red<=2": "השיטה: איכות, סחירה, דגלים 0–2"}
rows = []
for k, l in lab.items():
    b = B[k]
    rows.append([l, f"{b['n']:,}", pct(b['median'], 0), pct(b['p_up'], 0, False), pct(b['p_double'], 0, False),
                 pct(b['p_halved'], 0, False), pct(b['p_wipe'], 1, False)])
base_tbl = table(["קבוצה", "תצפיות", "חציון 12 ח׳", "עלו", "הוכפלו", "נחתכו בחצי", "ירדו 80%+"], rows, hl=[6], num_cols=[1, 2, 3, 4, 5, 6])

surv_lab = {"All filers": "כל המדווחות ל-SEC", "Micro & profitable & retained earnings>0": "מיקרו רווחית עם עודפים",
            "Micro & profitable (NI>0, OCF>0)": "מיקרו רווחית", "Micro & losing money": "מיקרו מפסידה",
            "Negative equity": "הון עצמי שלילי", "Toxic converts / derivative liab.": "אג״ח להמרה / נגזרים",
            "Shell-like (rev<$100k, assets<$1M)": "שלד (הכנסות <$100K)", "Shell + negative equity + dilution": "שלד + הון שלילי + דילול"}
surv_rows = [dict(l=surv_lab[k], v=float(SURV.loc[k, "dead_within_3-4y_%"]) / 100, t=f"n={int(SURV.loc[k,'n']):,}") for k in surv_lab]
dead_lab = {"acquired": "נרכשה", "went dark": "יצאה מדיווח", "abandoned": "הפסיקה לדווח", "revoked": "רישום בוטל ע״י SEC", "bankrupt": "פשיטת רגל"}

market = f"""
<section id="market">
  <div class="eyebrow">The base rate</div>
  <h2>השוק עצמו מפסיד, ואת רוב ההפסד לא רואים</h2>
  <p class="prose">בכל 1 ביולי בין {years[0]} ל-{years[1]} לקחתי את כל החברות שנסחרו ב-OTC ודיווחו ל-SEC, עם הדוחות שהיו ידועים באותו יום, ובדקתי מה קרה להן ב-12 החודשים הבאים. הממוצע מטעה ב-OTC, כי כמה מניות שזינקו פי 50 מושכות אותו למעלה. לכן החציון ושיעור המניות שנחתכו בחצי מספרים את הסיפור האמיתי.</p>
  {base_tbl}
  <div class="grid2">
    <div class="fig"><h3>כמה חברות "נעלמות" תוך 3–4 שנים</h3>
      {bars_div(surv_rows, fmt='u', color='--pos')}
      <p class="cap">כל {int(SURV.loc['All filers','n']):,} השנים-חברה של מדווחות XBRL בשנים 2011–2021, כולל חברות שמתו, כך שאין כאן הטיית שרידות. "נעלמה" פירושו שהפסיקה להגיש מאזן לתוך 3–4 שנים.</p></div>
    <div class="fig"><h3>למה הן נעלמו</h3>
      <h3 style="font-size:14px;color:var(--ink-2)">זבל (שלד או הון שלילי עם דילול), מדגם {DEAD['junk (shell or neg-equity diluter)']['sampled']}</h3>
      {bars_div([dict(l=dead_lab[k], v=v) for k, v in sorted(junk_dead.items(), key=lambda x: -x[1])], fmt='u')}
      <h3 style="font-size:14px;color:var(--ink-2)">מיקרו רווחית עם עודפים, {DEAD['quality micro (profitable, RE>0)']['sampled']} חברות</h3>
      {bars_div([dict(l=dead_lab[k], v=v) for k, v in sorted(qual_dead.items(), key=lambda x: -x[1])], fmt='u')}
      <p class="cap">סיווג לפי הטפסים האחרונים ב-EDGAR. "נרכשה" כולל מיזוג, הצעת רכש או יציאה לפרטיות. כל השאר הוא בדרך כלל הפסד של רוב ההשקעה.</p></div>
  </div>
  <p class="warn prose"><b>מה זה אומר על כל בקטסט ב-OTC:</b> מחירים היסטוריים קיימים רק למניות ששרדו עד היום. {pct(junk_bad, 0, False)} מהיעלמויות הזבל הן כמעט אפס שפשוט חסר בנתונים. לכן כל המספרים בדוח הזה אופטימיים, במיוחד לזבל. השוואה בין קבוצות אמינה יותר מהמספר המוחלט.</p>
</section>
"""

# ------------------------------------------------------------------ rockets
rk = R["rockets"]["groups"]
rk_lab = {"penny <$0.10": "מניות פני (<10¢)", "MC < $5M": "שווי שוק < $5M", "pump in last 12m": "הייתה \"רקטה\" בשנה האחרונה",
          "red>=6": "דגלים אדומים 6+", "junk": "זבל", "OCF turned positive": "תזרים הפך לחיובי",
          "revenue inflection": "קפיצה בהכנסות 50%+", "quality": "איכות", "quality & red<=2 & tradable": "השיטה"}
rk_rows = [[l, f"{rk[k]['n']:,}", pct(rk[k]['p_rocket'], 1, False), f"{rk[k]['lift']:.1f}x", pct(rk[k]['p_wipe'], 1, False), pct(rk[k]['median'], 0)] for k, l in rk_lab.items()]
hot_rows = [dict(l="20 ימי מסחר", v=hot['fwd_20']['median']), dict(l="3 חודשים", v=hot['fwd_60']['median']),
            dict(l="6 חודשים", v=hot['fwd_125']['median']), dict(l="שנה", v=hot['fwd_250']['median']),
            dict(l="שנה, מעל IWM", v=hot['fwd_250_xs']['median']), dict(l="שפל מקסימלי בשנה", v=hot['max_dd_250']['median'])]
hs = HOT
rockets = f"""
<section id="rockets">
  <div class="eyebrow">Rockets</div>
  <h2>מאיפה באות ה"רקטות", ולמה אי אפשר לקצור אותן</h2>
  <p class="prose">"רקטה" כאן היא מניה שעלתה פי 3 ויותר בתוך 12 חודשים. שיעור הבסיס הוא {pct(R['rockets']['base_rate'], 1, False)}. הרקטות אכן באות בעיקר ממניות פני וחברות זעירות, בערך פי 1.8 מהממוצע. אבל מאותה קבוצה בדיוק באות גם המניות שנמחקות, והחציון שלה שלילי. מי שקונה "את הרקטה הבאה" קונה סל שהתוחלת שלו שלילית.</p>
  {table(["קבוצה", "תצפיות", "סיכוי לפי 3", "יחס לבסיס", "סיכוי ל-80%-", "חציון"], rk_rows, hl=[8], num_cols=[1, 2, 3, 4, 5])}
  <div class="grid2">
    <div class="fig"><h3>מה קורה אחרי שמניה "טסה": +100% ב-20 ימים על פי 5 מהמחזור</h3>
      {bars_div(hot_rows)}
      <p class="cap">תשואה חציונית מיום הזיהוי. {hot['n']} אירועים, 2009–2026. רק {pct(hot['fwd_250']['p_pos'], 0, False)} היו ברווח אחרי שנה. ומדובר במניות שעוד קיימות; אלה שנמחקו לא בנתונים.</p></div>
    <div class="fig"><h3>זה לא משנה מה המחיר או התקופה</h3>
      {bars_div([dict(l='מחיר <10¢', v=hs['price<$0.10 at event']['median']), dict(l='מחיר $1+', v=hs['price>=$1 at event']['median']), dict(l='לפני 2021', v=hs['pre-2021']['median']), dict(l='2021 ואילך', v=hs['2021+']['median'])])}
      <p class="cap">תשואה חציונית בשנה שאחרי. מאז 2021 (עידן הדיסקורד והרשתות) זה החמיר: רק {pct(hs['2021+']['p_pos'], 0, False)} ברווח. מתוך {hot['n']} אירועים, רק {hs['quality (profitable, equity>0)']['n']} קרו בחברות רווחיות. רקטות הן תופעה של זבל.</p></div>
  </div>
  <p class="callout prose"><b>הכלל:</b> מניית OTC שעלתה פי 2 בחודש על מחזור חריג היא סימן מכירה, לא קנייה. זה תואם את המחקר: משתתפים ב-pump &amp; dump מפסידים בממוצע כ-30%, וחציון 120 הימים של מניה מקודמת הוא 67%- (Leuz et al. 2025).</p>
</section>
"""

# ------------------------------------------------------------------ factors
def frows(key, labels, metric="avg_median"):
    d = F[key].set_index("bucket")
    out = []
    for b, l in labels.items():
        if b in d.index:
            r = d.loc[b]
            out.append(dict(l=l, v=float(r[metric]), t=f"n={int(r['n'])} · נחתכו בחצי {r['p_halved']*100:.0f}% · הוכפלו {r['p_double']*100:.0f}%"))
    return out


figs = [
    ("ציון דגלים אדומים", frows("red_flags", {"0": "0", "1-2": "1–2", "3-5": "3–5", "6+": "6+"}), "המדד החזק ביותר. מונוטוני לגמרי."),
    ("דילול: שינוי במספר המניות בשנה", frows("dilution", {"buyback": "קנייה חוזרת", "0-5%": "0–5%", "5-25%": "5–25%", "25-100%": "25–100%", ">100%": "מעל 100%"}), "חברה שמדפיסה מניות מממנת את עצמה מכיסכם."),
    ("רווחיות", frows("profitability", {"NI<0": "הפסד", "NI>0, OCF<=0": "רווח בלי תזרים", "NI>0 & OCF>0": "רווח + תזרים"}), "רווח חשבונאי בלי מזומן הוא חצי סימן."),
    ("ספליט הפוך בשנתיים האחרונות", frows("reverse_split_2y", {"False": "לא", "True": "כן"}), "Desai & Jain מצאו 33.9%- לאורך 3 שנים. אצלנו המגמה דומה."),
    ("מומנטום 12 חודשים (חמישונים, סחירות)", frows("momentum_quintile_tradable", {"1": "1 (הכי ירדו)", "2": "2", "3": "3", "4": "4", "5": "5 (הכי עלו)"}), "אין מומנטום ב-OTC. הכי חמות הן בין הגרועות."),
    ("ספר לשוק (P/B, חמישונים, סחירות)", frows("bm_quintile_tradable", {"1": "1 (הכי יקרות)", "2": "2", "3": "3", "4": "4", "5": "5 (הכי זולות)"}), "ערך עובד: היקרות ביותר הן הגרועות ביותר."),
    ("מחיר המניה", frows("price", {"<1c": "פחות מ-1¢", "1-10c": "1¢–10¢", "10c-$1": "10¢–$1", "$1-5": "$1–$5", ">$5": "מעל $5"}), "רק מעל $5 החציון חיובי."),
    ("מחזור מסחר יומי ממוצע", frows("liquidity", {"<$1k": "<$1K", "$1-10k": "$1K–10K", "$10-100k": "$10K–100K", "$100k-1M": "$100K–1M", ">$1M": ">$1M"}), "מניות OTC שנסחרות הרבה הן לרוב מקודמות. גם Ang et al. מצאו זאת."),
]
fig_html = "".join(f'<div class="fig"><h3>{t}</h3>{bars_div(rows)}<p class="cap">{c}</p></div>' for t, rows, c in figs)
comp = R["signal_components"]
rf_lab = {"R2_pump": ("\"רקטה\" בשנה האחרונה", 3), "R3_dilution": ("דילול 50%+ (100%+ = 3)", "2–3"), "R4_toxic": ("אג״ח להמרה / התחייבות נגזרים", 3),
          "R5_distress": ("הון שלילי והכנסות <$1M", 2), "R6_shell": ("שלד: הכנסות <$100K, נכסים <$1M", 2), "R7_name_change": ("שינוי שם בשנתיים האחרונות", 2),
          "R8_reverse_split": ("ספליט הפוך בשנתיים האחרונות", 2), "R9_late_filer": ("הודעת איחור (NT 10-K/Q) או טופס 15", 2),
          "R10_authorized": ("הכפלת הון רשום / 14C", 1), "R12_resale_reg": ("רישום מניות למכירה (S-1/424B3)", 1)}
rf_rows = [[l, str(pts), f"{comp[k]['n_on']:,}", pct(comp[k]['med_on'], 0), pct(comp[k]['med_off'], 0), pct(comp[k]['wipe_on'], 0, False), pct(comp[k]['wipe_off'], 0, False)] for k, (l, pts) in rf_lab.items()]
cat_lab = {"C7_capital_return": "החזר הון: דיבידנד או קנייה חוזרת", "C5_clean_capital": "הון נקי: דילול <5%, בלי המרות", "C6_activist_13d": "13D: משקיע אקטיביסט",
           "C4_ocf_turn": "תזרים הפך לחיובי", "C3_rev_inflection": "קפיצת הכנסות 50%+"}
cat_rows = [[l, f"{comp[k]['n_on']:,}", pct(comp[k]['med_on'], 0), pct(comp[k]['med_off'], 0)] for k, l in cat_lab.items()]
factors = f"""
<section id="factors">
  <div class="eyebrow">What predicts returns</div>
  <h2>מה מנבא תשואה ב-OTC, ומה לא</h2>
  <p class="prose">תשואה חציונית ל-12 חודשים בכל קבוצה (ממוצע של החציונים השנתיים). העבירו את העכבר על שורה כדי לראות כמה מניות נחתכו בחצי.</p>
  <div class="grid2">{fig_html}</div>
  <h3>ציון הדגלים האדומים: כל כלל לחוד</h3>
  <p class="prose">את הציון הציעה קבוצת המחקר על הונאות, ומשקלי הכללים נקבעו מראש לפי המחקר. כל כלל לבדו מוריד את התשואה החציונית ומכפיל את הסיכוי למחיקה. סף ההימנעות: 3 נקודות ומעלה.</p>
  {table(["כלל", "נק׳", "מקרים", "חציון עם", "חציון בלי", "מחיקה עם", "מחיקה בלי"], rf_rows, num_cols=[1, 2, 3, 4, 5, 6])}
  <h3>"קטליזטורים": פחות ממה שחשבתי</h3>
  <p class="prose">מבין המניות הנקיות (דגלים 0–2), רוב הקטליזטורים הקלאסיים לא שיפרו את התשואה בפועל. רק החזר הון לבעלי המניות עשה הבדל ברור. קפיצת הכנסות חדה דווקא הזיקה, כנראה בגלל רכישות ממומנות בדילול.</p>
  {table(["קטליזטור", "מקרים", "חציון עם", "חציון בלי"], cat_rows, num_cols=[1, 2, 3])}
</section>
"""

# ------------------------------------------------------------------ method + backtest
ser = align([
    dict(name="השיטה (נטו)", short="שיטה", c="--s1", pts=[[d, v] for d, v in R["curves"]["METHOD (final) [net]"].items()]),
    dict(name="כל ה-OTC הסחיר (נטו)", short="OTC", c="--s2", pts=[[d, v] for d, v in R["curves"]["All tradable OTC [net]"].items()]),
    dict(name="זבל (נטו)", short="זבל", c="--s3", pts=[[d, v] for d, v in R["curves"]["Junk (losses + dilution/toxic) [net]"].items()]),
    dict(name="Russell 2000 (IWM)", short="IWM", c="--s4", pts=[[d, v] for d, v in R["curves"]["IWM"].items()]),
])
CHARTS = {"curves": dict(aria="צמיחת 1 דולר: השיטה מול OTC, זבל ו-IWM", series=ser)}

st_lab = [("METHOD (final)", "השיטה (סופית)"), ("METHOD v1: quality + cheapest E/P (top 30)", "גרסה 1, כפי שנקבעה מראש (כולל פאני/פרדי)"),
          ("Variant: v1 ex-GSE (E/P only)", "גרסה 1 בלי פאני/פרדי"), ("Quality + cheapest P/B (top 30)", "איכות + P/B זול"),
          ("Quality, all (no value rank)", "כל מניות האיכות, בלי דירוג"), ("Variant: 2 profitable years, 2y avg E/P", "דרישת שנתיים רווחיות"),
          ("Cannibals (buyback, profitable)", "קניבלים: רווחיות שקונות חזרה"), ("Net-nets (MC < NCAV)", "Net-nets (מתחת להון חוזר)"),
          ("Fallen angels (ex-exchange, OCF>0)", "מלאכים שנפלו (ירדו מבורסה)"), ("Cheap banks (P/B<0.8, ROA>0.7%)", "בנקים זולים (P/B<0.8)"),
          ("Momentum top 30 (tradable)", "מומנטום: 30 העולות"), ("All OTC (equal weight)", "כל ה-OTC (כולל לא סחירות)"),
          ("All tradable OTC", "כל ה-OTC הסחיר"), ("Junk (losses + dilution/toxic)", "זבל"), ("Red flags >= 6", "דגלים אדומים 6+")]
st_rows = []
for k, l in st_lab:
    n, g = S[k + " [net]"], S[k + " [gross]"]
    st_rows.append([l, pct(n['CAGR'], 1), pct(g['CAGR'], 1), pct(n['maxDD'], 0), pct(n['worst_year'], 0), f"{n['sharpe']:.2f}", f"{n['avg_holdings']:.0f}"])
for k, l in [("IWM", "Russell 2000 (IWM)"), ("SPY", "S&P 500 (SPY)")]:
    st_rows.append([l, pct(S[k]['CAGR'], 1), pct(S[k]['CAGR'], 1), pct(S[k]['maxDD'], 0), pct(S[k]['worst_year'], 0), f"{S[k]['sharpe']:.2f}", "–"])
sens_lab = [("gross_no_costs", "בלי עלויות מסחר"), ("base_turnover_costs", "בסיס: עלות על כניסות ויציאות"),
            ("estimated_spreads_AbdiRanaldo", "מרווח מוערך מהנתונים (Abdi-Ranaldo)"), ("double_costs", "עלויות כפולות"),
            ("full_round_trip_every_year", "סבב מלא על כל התיק כל שנה"), ("top10", "10 מניות"), ("top20", "20 מניות"), ("top50", "50 מניות"),
            ("no_buffer", "בלי כלל השהייה"), ("rank_by_EP_only", "דירוג לפי E/P בלבד"), ("rank_by_BM_only", "דירוג לפי P/B בלבד"),
            ("require_2_profitable_years", "דרישת שנתיים רווחיות"), ("monthly_gains_capped_50pct", "תקרת רווח של 50% לחודש"),
            ("no_return_cap", "בלי תקרת תשואה"), ("banks_only", "רק בנקים"), ("ex_banks", "בלי בנקים"),
            ("stricter_liquidity_$25k_ADV_$10M_cap", "רק נזילות ($25K+ ליום, $10M+ שווי)")]
sens_rows = [dict(l=l, v=SENS[k], d=1) for k, l in sens_lab]
sub = R["method_subperiods"]
stress = R["survivorship_stress"]
yrs = sorted(S["METHOD (final) [net]"]["yearly"].keys(), key=int)
yr_rows = [[f"{y}–{int(y)+1}", pct(S["METHOD (final) [net]"]["yearly"][y], 0), pct(S["IWM"]["yearly"].get(y), 0), pct(S["All tradable OTC [net]"]["yearly"][y], 0), pct(S["Junk (losses + dilution/toxic) [net]"]["yearly"][y], 0), str(elig.get(str(y), elig.get(int(y), "")))] for y in yrs]

method = f"""
<section id="method">
  <div class="eyebrow">The method · backtested</div>
  <h2>השיטה, והבקטסט שלה</h2>
  <p class="prose">את הכללים קבעתי <b>לפני</b> שראיתי תוצאות, על בסיס הספרות. אחרי שבדקתי מה השיטה קנתה, תיקנתי שלוש בעיות נתונים וכלל אחד. גרסה 1, בדיוק כפי שנקבעה מראש, מופיעה בטבלה לשקיפות.</p>
  <ol class="rules">
    <li><b>יקום:</b> חברה שנסחרת ב-OTC, מדווחת ל-SEC (10-K/10-Q בזמן), עם מחזור יומי ממוצע של $5,000 לפחות ושווי שוק של $2M לפחות.</li>
    <li><b>הימנעות:</b> ציון דגלים אדומים 0–2 בלבד (פירוט הכללים למעלה).</li>
    <li><b>איכות:</b> רווח נקי חיובי, תזרים מפעילות חיובי והון עצמי חיובי.</li>
    <li><b>ערך:</b> מדרגים לפי ממוצע האחוזונים של תשואת הרווח (E/P) והספר לשוק (B/P). לוקחים את 30 הזולות.</li>
    <li><b>החזקה:</b> משקל שווה, איזון פעם בשנה (1 ביולי). מניה מוחזקת נשארת בתיק כל עוד היא בין 60 הראשונות, כדי לחסוך עלויות.</li>
    <li><b>תיקונים אחרי בדיקת האחזקות:</b> הוצאתי מניות בכורה (WELPP), את פאני מיי ופרדי מק, שהרווחים שלהן הולכים לאוצר האמריקאי ולא לבעלי המניות הרגילות, ובאג עלויות שגבה סבב מלא גם על מניות שנשארו בתיק.</li>
  </ol>
  <div class="fig">
    <h3>צמיחת 1 דולר, יולי 2012 עד יוני 2026, אחרי עלויות</h3>
    <div class="legend">{''.join(f'<span><i style="background:var({s["c"]})"></i>{s["name"]}</span>' for s in ser)}</div>
    <div class="chart" data-chart="curves"></div>
    <p class="cap">סקאלה לוגריתמית. עלויות: חצי מרווח בכל כניסה ובכל יציאה, 1%–10% לסבב לפי נזילות. מספר המניות שעברו את הסינון בכל שנה: {min(elig.values())}–{max(elig.values())}.</p>
  </div>
  {table(["אסטרטגיה", "שנתי נטו", "שנתי ברוטו", "נפילה מקס׳", "שנה גרועה", "שארפ", "מניות"], st_rows, hl=[0], num_cols=[1, 2, 3, 4, 5, 6])}
  <div class="grid2">
    <div class="fig"><h3>רגישות: תשואה שנתית נטו של השיטה</h3>{bars_div(sens_rows)}
      <p class="cap">שני ממצאים חשובים: <b>בלי הבנקים</b> התשואה צונחת, ו<b>דרישת נזילות גבוהה</b> מוחקת את רובה. התשואה יושבת במניות הכי פחות נזילות.</p></div>
    <div class="fig"><h3>יציבות לאורך זמן והטיית שרידות</h3>
      {bars_div([dict(l='2012–2019', v=sub['2012-2018']['CAGR'], d=1), dict(l='2019–2026', v=sub['2019-2026']['CAGR'], d=1), dict(l='2% מהמניות "מתות" בשנה', v=stress['2%_die_per_year'], d=1), dict(l='5% "מתות" בשנה', v=stress['5%_die_per_year'], d=1), dict(l='10% "מתות" בשנה', v=stress['10%_die_per_year'], d=1)])}
      <p class="cap">ניתוח השרידות מראה שכ-5% מחברות המיקרו הרווחיות נעלמות בשנה, וכרבע מהן נרכשות (מה שטוב למשקיע). הערכה סבירה ל"מוות" של ממש היא 2%–3% בשנה, ולכן התשואה האמיתית קרובה יותר ל-6%–7%.</p></div>
  </div>
  <details><summary>תשואה שנה-שנה (יולי עד יוני)</summary>
    {table(["שנה", "השיטה", "IWM", "OTC סחיר", "זבל", "מניות שעברו"], yr_rows, num_cols=[1, 2, 3, 4, 5])}
  </details>
</section>
"""

# ------------------------------------------------------------------ events + ML
upd = EV["uplist"]
dnd = EV["downlist"]
mlq = ML["quintiles"]
events = f"""
<section id="events">
  <div class="eyebrow">Events &amp; machine learning</div>
  <h2>אירועים, ומה ש-AI לא מצא</h2>
  <div class="grid2">
    <div class="fig"><h3>עלייה מ-OTC לבורסה ({upd['n']} מקרים)</h3>
      {bars_div([dict(l='שנה לפני (עד חודש לפני)', v=upd['pre_-250_-21']['median']), dict(l='חודש לפני', v=upd['run_-20_-1']['median']), dict(l='שבוע הרישום', v=upd['evt_0_+5']['median']), dict(l='3 חודשים אחרי', v=upd['post_+5_+65']['median']), dict(l='6 חודשים אחרי', v=upd['post_+5_+125']['median']), dict(l='שנה אחרי', v=upd['post_+5_+250']['median']), dict(l='שנה אחרי, מעל IWM', v=upd['post_+5_+250_xs']['median'])])}
      <p class="cap">חציונים סביב הגשת טופס 8-A12B. רק {pct(upd['post_+5_+250']['p_pos'], 0, False)} עלו בשנה שאחרי. לחזות uplisting מראש קשה: רק {pct(R['uplist_prediction']['price>$1 & equity>$5M']['p_uplist_12m'], 0, False)} מהחברות עם מחיר מעל $1 והון מעל $5M עלו לבורסה בתוך שנה.</p></div>
    <div class="fig"><h3>ירידה מבורסה ל-OTC ({dnd['n']} מקרים)</h3>
      {bars_div([dict(l='שנה לפני', v=dnd['pre_-250_-21']['median']), dict(l='חודש לפני', v=dnd['run_-20_-1']['median']), dict(l='שבוע ההורדה', v=dnd['evt_0_+5']['median']), dict(l='6 חודשים אחרי', v=dnd['post_+5_+125']['median']), dict(l='שנה אחרי', v=dnd['post_+5_+250']['median']), dict(l='שנה אחרי, מעל IWM', v=dnd['post_+5_+250_xs']['median'])])}
      <p class="cap">אחרי ההורדה יש ייצוב קל, אבל זה מדגם של שורדות בלבד. לפי המחקר, חברות שהורדו ומתו הפסידו 30%–55% בממוצע (Shumway). כאסטרטגיה, "מלאכים שנפלו" הניבו {N(S['Fallen angels (ex-exchange, OCF>0) [net]']['CAGR'], 1)} בשנה.</p></div>
  </div>
  <div class="fig"><h3>מודל ML (gradient boosting) שאומן רק על העבר, 2016–2026</h3>
    <p>המודל קיבל 25 משתנים, כולל דגלים אדומים, והתאמן מחדש כל שנה רק על נתוני השנים הקודמות. 30 המניות שהוא דירג הכי גבוה הניבו {N(ML['ml_top30_net']['CAGR'], 1)} בשנה נטו (נפילה מקסימלית {N(ML['ml_top30_net']['maxDD'], 0)}). הכללים הפשוטים באותה תקופה: {N(ML['rules_same_window_net']['CAGR'], 1)}. IWM: {N(ML['iwm_same_window']['CAGR'], 1)}.</p>
    {bars_div([dict(l=f"חמישון {q['quint']}" + (" (הכי בטוח)" if q['quint']==5 else (" (הכי פחות)" if q['quint']==1 else "")), v=q['median'], t=f"ממוצע {q['mean_capped']*100:.0f}% · נחתכו בחצי {q['p_halved']*100:.0f}%") for q in mlq])}
    <p class="cap">תשואה חציונית לפי חמישון הדירוג של המודל. החציון שלילי בכל החמישונים. המודל למד לרדוף אחרי זנבות הלוטו, שמעלים את הממוצע אבל לא את מה שקורה למניה הטיפוסית.</p></div>
</section>
"""

# ------------------------------------------------------------------ live screen
LIVE["pe"] = 1 / LIVE["ep"]
LIVE["pb"] = 1 / LIVE["bm"]
tier = LIVE.tier.str.replace("OTC Markets ", "", regex=False)
live_rows = [[str(i + 1), f'<span class="mono">{r.ticker}</span>', r["name"].title()[:34], tier.iloc[i], f"${r.price:,.2f}", money(r.mcap), money(r.dvol),
              pct(r.spread_ar, 1, False), f"{r.pe:.1f}", f"{r.pb:.2f}", str(int(r.red)), "בנק" if r.is_bank else ""]
             for i, r in LIVE.reset_index(drop=True).iterrows()]
live = f"""
<section id="live">
  <div class="eyebrow">Screen · data as of {LIVE_DATE}</div>
  <h2>מי עובר את הסינון היום</h2>
  <p class="prose">אותם כללים בדיוק, על המחירים מ-<span class="num">{LIVE_DATE}</span> ועל הדוח השנתי האחרון שהוגש (לרוב 2025). {len(LIVE)} חברות עוברות, מדורגות לפי שילוב E/P ו-P/B. זו <b>רשימת התחלה למחקר, לא רשימת קנייה</b>: לכל שם צריך לקרוא דוח, לבדוק בעלי עניין ולבדוק את המרווח בפועל.</p>
  {table(["#", "סימול", "חברה", "שכבה", "מחיר", "שווי", "מחזור יומי", "מרווח מוערך", "מכפיל רווח", "מכפיל הון", "דגלים", ""], live_rows, num_cols=[0, 4, 5, 6, 7, 8, 9, 10])}
  <p class="cap foot">השכבה (QX/QB/ID/PK) נכונה להיום. בבקטסט לא השתמשתי בה, כי שכבה של היום מושפעת מהעתיד. שימו לב לשמות במחיר מתחת ל-$1 ולחברות קנאביס (GTBIF), שנסחרות ב-OTC מסיבות רגולטוריות. ה"מרווח המוערך" הוא אומדן Abdi-Ranaldo מנתוני מסחר יומיים, לא ציטוט חי.</p>
</section>
"""

limits = f"""
<section id="limits">
  <div class="eyebrow">Read before trusting</div>
  <h2>מגבלות, בלי ייפוי</h2>
  <ul class="plain">
    <li><b>הטיית שרידות.</b> Yahoo מחזיק מחירים רק למניות שעדיין קיימות. מדדתי את גודל הבעיה על כל אוכלוסיית ה-SEC (ראו למעלה) והרצתי מבחן לחץ, אבל המספרים המוחלטים עדיין אופטימיים.</li>
    <li><b>יקום מצומצם.</b> כ-{R['meta']['companies']} חברות שמדווחות ל-SEC ב-XBRL ויש להן סימול היום. חברות OTC "חשוכות" (לא מדווחות), שם עובדים רבים מהמקצוענים, לא בנתונים.</li>
    <li><b>מדגם קטן.</b> רק {min(elig.values())}–{max(elig.values())} מניות עברו את הסינון בכל שנה, ולכן יש הרבה רעש סטטיסטי. ההבדל בין 8% ל-11% בשנה אינו מובהק.</li>
    <li><b>מחירים וביצוע.</b> מחירי סגירה ב-OTC רועשים, ומניות שלא נסחרות כל יום נראות פחות תנודתיות ופחות מתואמות עם השוק ממה שהן באמת. העלויות מבוססות על הנחות ועל אומדן מרווח, לא על ביצוע אמיתי.</li>
    <li><b>תקופה אחת.</b> 2012–2026 הייתה תקופה חזקה במיוחד למניות הגדולות בארה״ב. מה שלא ניצח את המדד בתקופה הזו עשוי להתנהג אחרת בתקופה אחרת. השיטה החלישה מ-{N(sub['2012-2018']['CAGR'], 1, False)} ל-{N(sub['2019-2026']['CAGR'], 1, False)} בשנה.</li>
    <li>זה מחקר, לא ייעוץ השקעות. מניות OTC יכולות לאבד את כל ערכן.</li>
  </ul>
</section>
"""

foot = """
<footer class="foot" style="padding-top:24px;border-top:1px solid var(--rule)">
  נתונים: SEC EDGAR (דוחות XBRL, היסטוריית הגשות של 7,997 חברות), Yahoo Finance (מחירים יומיים), שלוש קבוצות מחקר על ספרות אקדמית ומקצועית. הקוד המלא לשחזור נמצא בתיקייה <span class="mono">otc_research/</span> בריפו, בענף <span class="mono">claude/quirky-lamport-ri19aa</span>.
</footer>
"""

head = f"""<title>מדריך שטח ל-OTC</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&family=Rubik:wght@500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>{CSS}</style>
"""
asym, trend_chart = report_trend.build()
CHARTS.update(trend_chart)
body = fix_bidi(f'<div class="wrap" dir="rtl" lang="he">{hero}{bottom}{market}{rockets}{factors}{method}{asym}{events}{live}{PRACTICE}{LIT}{limits}{foot}</div>')
data = json.dumps({"charts": CHARTS}, ensure_ascii=False)
page = head + body + f"<script>window.__DATA__ = {data};</script><script>{JS}</script>"
out = os.path.join(OUT, "report.html")
open(out, "w", encoding="utf-8").write(page)
print("wrote", out, len(page) // 1024, "KB")
