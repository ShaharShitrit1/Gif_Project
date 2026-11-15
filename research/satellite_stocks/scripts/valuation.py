"""Reproducible scenario valuation + scoring for the satellite-stock research.
Run: python3 scripts/valuation.py   (from research/satellite_stocks/; needs pandas)
Method (per scenario):
  EPS_5 = fwd_EPS * (1+g)^5 ; value_5 = EPS_5 * exit_PE ; fair_value_today = value_5 / (1+r)^5
  r = required return (default 10%/yr, USD). Net cash is NOT added (conservative for net-cash firms).
Reverse check: EPS CAGR needed over 5y to earn r at the BASE exit multiple, starting from today's price.
Scores: weighted 1-5 scale, weights in WEIGHTS below. Quality bar: weighted >= 3.7 and no '1' in quality/resilience/management/cash_balance.
"""
import pandas as pd
R, YEARS = 0.10, 5
WEIGHTS = dict(quality=.20, growth=.15, management=.10, resilience=.15, cash_balance=.10,
               valuation=.15, canslim_chart=.05, portfolio_fit=.05, tax_access=.05)
m = pd.read_csv("data/raw/market_inputs.csv").set_index("ticker")
s = pd.read_csv("data/raw/scenarios.csv")
s["eps_y5"] = s.apply(lambda x: m.loc[x.ticker, "fwd_eps_usd"] * (1 + x.eps_cagr_5y) ** YEARS, axis=1)
s["fair_value_today"] = s.eps_y5 * s.exit_pe / (1 + R) ** YEARS
s["price"] = s.ticker.map(m.price_usd)
s["upside_pct"] = (s.fair_value_today / s.price - 1) * 100
s.round(1).to_csv("data/derived/scenario_values.csv", index=False)
piv = s.pivot(index="ticker", columns="scenario", values="fair_value_today")[["bear", "base", "bull"]]
base_pe = s[s.scenario == "base"].set_index("ticker").exit_pe
out = piv.assign(price=m.price_usd, fwd_pe=m.price_usd / m.fwd_eps_usd)
out["implied_eps_cagr_for_10pct"] = ((out.price * (1 + R) ** YEARS / base_pe / m.fwd_eps_usd) ** (1 / YEARS) - 1) * 100
out["mos_zone_below"] = out.base * 0.85      # >=15% below base fair value
out["expensive_above"] = out.base * 1.20     # >=20% above base fair value
out.round(1).to_csv("data/derived/valuation_summary.csv")
sc = pd.read_csv("data/raw/scores.csv").set_index("ticker")
sc["weighted"] = sum(sc[k] * w for k, w in WEIGHTS.items())
crit = sc[["quality", "resilience", "management", "cash_balance"]].min(axis=1)
sc["passes_bar"] = (sc.weighted >= 3.7) & (crit > 1)
sc.sort_values("weighted", ascending=False).round(2).to_csv("data/derived/scores_weighted.csv")
print(out.round(1).to_string()); print(); print(sc.sort_values("weighted", ascending=False).round(2).to_string())
