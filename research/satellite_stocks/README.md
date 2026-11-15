# מחקר מניות לוויין – Satellite Stocks Research
**מטרה:** לזהות 5 חברות איכותיות ולצמצם ל-2, להשקעה ארוכת טווח ברכיב הלוויין (20%) של תיק דולרי. מסגרת המחקר משלבת את Tom Nash (עסק ושווי) ואת O'Neil (CAN SLIM וגרף).
**סטטוס (15.11.2026):** ✅ הושלם סבב ראשון. **תוצאה: ISRG + ASML**, ו-MA כעתודה.

| קובץ | תוכן |
|---|---|
| [final_two.md](final_two.md) | שתי המובילות והשורה התחתונה |
| [investment_playbook.md](investment_playbook.md) | מדרגות קנייה, הקפאה, יציאה ומעקב |
| [comparison_matrix.md](comparison_matrix.md) | השוואה, ניקוד ושווי |
| [shortlist_5.md](shortlist_5.md) | 5 המועמדות והפסולות |
| [research_universe.csv](research_universe.csv) | יקום של 23 חברות וסינון |
| [companies/](companies/) | דוח עומק לכל חברה (ISRG, ‏ASML, ‏FTNT, ‏MA, ‏MELI) |
| [sources.md](sources.md) | מקורות, אמינות ופערי אימות |
| `data/raw/` → `scripts/valuation.py` → `data/derived/` | קלט גולמי, חישוב ותוצרים |

## הרצה
```bash
cd research/satellite_stocks && pip install pandas && python3 scripts/valuation.py
```
הנוסחה מתועדת בראש הסקריפט: EPS צפוי × (1+g)^5 × מכפיל יציאה ÷ 1.10^5. מזומן נטו לא מתווסף.

## מגבלות מרכזיות
- הסביבה חסמה גישה ל-SEC EDGAR ול-API של מחירים. הנתונים נאספו בחיפוש רשת (ראו `sources.md`).
- ממוצעים נעים 50/200, חוזק יחסי מספרי ואחזקות מוסדיות **לא חושבו**, כי אין סדרות מחירים.
- זמינות ב-Blink **לא אומתה** לאף נייר.
- זה לא ייעוץ השקעות או מס.
