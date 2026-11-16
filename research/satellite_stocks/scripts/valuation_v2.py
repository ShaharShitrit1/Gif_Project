"""Valuation v2 (review of 16.11.2026) - unified for core + financial tracks.
Run from research/satellite_stocks/:  python3 scripts/valuation_v2.py   (needs pandas)
Per scenario (g = EPS CAGR, PE = exit multiple, r = discount rate per ticker, p = payout):
  EPS_t = fwd_EPS*(1+g)^(t-1), t=1..5 ; value = sum(p*EPS_t/(1+r)^t) + fwd_EPS*(1+g)^5*PE/(1+r)^5
  Change vs v1: adds PV of dividends (v1 ignored them) and allows an EM risk premium (r=13% for NU, MELI).
Valuation score is mechanical from base-case upside: >25%:5 | 10..25:4 | -10..10:3 | -25..-10:2 | < -25:1
Quality bar: weighted >= 3.7 and no 1 in quality/resilience/management/cash_balance.
"""
import pandas as pd
W = dict(quality=.20, growth=.15, management=.10, resilience=.15, cash_balance=.10,
         valuation=.15, canslim_chart=.05, portfolio_fit=.05, tax_access=.05)
d = pd.read_csv("data/raw/v2_inputs.csv").set_index("ticker")
def fv(x, g, pe):
    divs = sum(x.payout * x.fwd_eps_usd * (1 + g) ** (t - 1) / (1 + x.discount_rate) ** t for t in range(1, 6))
    return divs + x.fwd_eps_usd * (1 + g) ** 5 * pe / (1 + x.discount_rate) ** 5
for s in ("bear", "base", "bull"):
    d[s] = d.apply(lambda x: fv(x, x[f"{s}_g"], x[f"{s}_pe"]), axis=1)
d["fwd_pe"] = d.price_usd / d.fwd_eps_usd
d["base_upside_pct"] = (d.base / d.price_usd - 1) * 100
d["mos_below"], d["expensive_above"] = d.base * 0.85, d.base * 1.20
def implied_g(x):  # bisection: g that makes base value == price
    lo, hi = -0.2, 0.6
    for _ in range(60):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if fv(x, mid, x.base_pe) < x.price_usd else (lo, mid)
    return mid * 100
d["implied_g_pct"] = d.apply(implied_g, axis=1)
u = d.base_upside_pct
d["valuation"] = pd.cut(u, [-1e9, -25, -10, 10, 25, 1e9], labels=[1, 2, 3, 4, 5]).astype(int)
sc = pd.read_csv("data/raw/v2_scores.csv").set_index("ticker").join(d[["track", "valuation"]])
sc["weighted"] = sum(sc[k] * w for k, w in W.items())
sc["passes_bar"] = (sc.weighted >= 3.7) & (sc[["quality", "resilience", "management", "cash_balance"]].min(axis=1) > 1)
cols = ["track", "price_usd", "fwd_pe", "bear", "base", "bull", "base_upside_pct", "implied_g_pct", "mos_below", "expensive_above"]
d[cols].round(1).to_csv("data/derived/v2_valuation.csv")
sc.sort_values("weighted", ascending=False).round(2).to_csv("data/derived/v2_scores_weighted.csv")
print(d[cols].round(1).to_string()); print(); print(sc.sort_values("weighted", ascending=False).round(2).to_string())
