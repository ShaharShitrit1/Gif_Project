"""Factor tests + strategy backtests on the OTC formation panel."""
import os
import json
import numpy as np
import pandas as pd
from common import OUT, PRICES

CAP = 5.0  # cap single-stock 12m return at +500% for robust means (data errors / lottery outliers)


def load():
    p = pd.read_parquet(os.path.join(OUT, "panel.parquet"))
    p = p[p.mcap.notna() & (p.mcap > 0)].copy()
    p["ep"] = p.ni / p.mcap
    p["bm"] = p.equity / p.mcap
    p["ncav"] = (p.ca - p.liab) / p.mcap
    p["cash_mc"] = p.cash / p.mcap
    p["roa"] = p.ni / p.assets
    p["profitable"] = (p.ni > 0) & (p.ocf > 0)
    p["toxic"] = (p.deriv.fillna(0) > 0) | (p.conv.fillna(0) > 0) | (p.conv_proceeds.fillna(0) > 0)
    p["shy"] = (p.buyback.fillna(0) + p.dividends.fillna(0)) / p.mcap
    p["r"] = p.ret12.clip(upper=CAP)
    p["cost"] = np.select([p.dvol >= 1e6, p.dvol >= 1e5, p.dvol >= 25e3, p.dvol >= 1e4],
                          [0.01, 0.02, 0.04, 0.06], 0.10)
    p["r_net"] = p.r - p.cost
    # data-driven alternative: Abdi-Ranaldo spread estimate, floored at 0.5%, capped at 30%
    p["cost_est"] = p.spread_ar.clip(0.005, 0.30) if "spread_ar" in p else np.nan
    p["tradable"] = (p.dvol >= 5000) & (p.zero_days < 0.5) & (p.mcap >= 2e6)
    p["ni_avg"] = np.where(p.ni_prev.notna(), (p.ni + p.ni_prev) / 2, p.ni)
    p["ep_avg"] = p.ni_avg / p.mcap
    # GSEs in conservatorship (Fannie/Freddie): reported earnings do not accrue to common holders
    p["special"] = p.sic.astype(str).eq("6111")
    return p


def bucket_stats(p, col, bins=None, labels=None, q=None):
    d = p.copy()
    if q:
        d["b"] = d.groupby("year")[col].transform(lambda s: pd.qcut(s.rank(method="first"), q, labels=False) + 1)
    elif bins is not None:
        d["b"] = pd.cut(d[col], bins=bins, labels=labels)
    else:
        d["b"] = d[col]
    yr = d.groupby(["b", "year"], observed=True).agg(mean=("r", "mean"), med=("ret12", "median"),
                                                   n=("r", "size"))
    out = yr.groupby(level=0, observed=True).agg(avg_yearly_mean=("mean", "mean"), sd=("mean", "std"),
                                                 years=("mean", "size"), avg_median=("med", "mean"), n=("n", "sum"))
    out["t"] = out.avg_yearly_mean / (out.sd / np.sqrt(out.years))
    pooled = d.groupby("b", observed=True).agg(p_double=("ret12", lambda s: (s > 1).mean()),
                                               p_halved=("ret12", lambda s: (s < -0.5).mean()),
                                               p_up=("ret12", lambda s: (s > 0).mean()))
    out = out.join(pooled)
    return out[["n", "avg_yearly_mean", "t", "avg_median", "p_up", "p_double", "p_halved"]]


def select(p, mask, top=None, rank_col=None, ascending=False, buffer=None):
    """Yearly holdings. With `buffer`, a stock already held is kept while it still passes the
    filters and ranks within the top `buffer` (fewer trades = lower costs)."""
    cand_all = p[mask]
    held, out = set(), {}
    for y in sorted(p.year.unique()):
        cand = cand_all[cand_all.year == y]
        if top and rank_col:
            cand = cand.sort_values(rank_col, ascending=ascending)
            order = list(cand.cik)
            if buffer and held:
                keep = [c for c in order[:buffer] if c in held][:top]
                new = [c for c in order if c not in keep][: top - len(keep)]
                chosen = keep + new
            else:
                chosen = order[:top]
            g = cand.set_index("cik").loc[chosen].reset_index()
        else:
            g = cand
        out[y] = g
        held = set(g.cik)
    return out


def portfolio(p, mask, name, cost=True, top=None, rank_col=None, ascending=False, cap=CAP,
              cost_model="turnover", cost_col="cost", buffer=None):
    """Equal-weight portfolio, rebalanced every July 1, buy-and-hold within the year.
    cost_model 'turnover': pay half the round-trip cost on every entry and every exit.
    cost_model 'full'    : pay a full round trip on the whole book every year (most conservative)."""
    groups = {y: g for y, g in select(p, mask, top, rank_col, ascending, buffer).items() if len(g)}
    monthly = []
    prev_w, last_cost = {}, {}
    sel_parts = []
    for y in sorted(p.year.unique()):
        idx = pd.date_range(f"{y}-07-31", periods=12, freq="ME")
        if y not in groups:  # nothing qualifies -> hold cash (sell what we had)
            c = sum(w * last_cost.get(k, 0.05) / 2 for k, w in prev_w.items()) if (cost and cost_model == "turnover") else 0
            s0 = pd.Series(0.0, index=idx)
            s0.iloc[0] = -c
            monthly.append(s0)
            prev_w = {}
            continue
        g = groups[y]
        sel_parts.append(g)
        paths = np.full((len(g), 12), 0.0)
        for i, m in enumerate(g.mrets):
            m = np.asarray(m, dtype=float)[:12]
            m = np.clip(m, -1, 3)  # monthly sanity clip (data errors)
            paths[i, : len(m)] = m
        # buy-and-hold equal weight within the year
        growth = np.cumprod(1 + paths, axis=1)
        if cap is not None:  # a single stock can contribute at most +cap within a year
            growth = np.minimum(growth, 1 + cap)
        val = growth.mean(axis=0)
        costs = dict(zip(g.cik, g[cost_col].fillna(g["cost"]).values))
        if cost:
            if cost_model == "full":
                c = float(np.mean(list(costs.values())))
            else:
                n = len(g)
                cur = set(g.cik)
                c = sum(costs[k] / 2 / n for k in cur - set(prev_w)) + \
                    sum(w * last_cost.get(k, 0.05) / 2 for k, w in prev_w.items() if k not in cur)
            val = val * (1 - c)
        last_cost.update(costs)
        # end-of-year weights (drifted) for next year's exit costs
        endw = growth[:, -1] / growth[:, -1].sum()
        prev_w = dict(zip(g.cik, endw))
        prev = np.concatenate([[1.0], val[:-1]])
        mr = val / prev - 1
        monthly.append(pd.Series(mr, index=idx))
    s = pd.concat(monthly).sort_index()
    s.name = name
    sel = pd.concat(sel_parts) if sel_parts else p.iloc[:0]
    counts = sel.groupby("year").size().reindex(sorted(p.year.unique()), fill_value=0)
    return s, counts


def perf(s):
    s = s.dropna()
    curve = (1 + s).cumprod()
    yrs = len(s) / 12
    cagr = curve.iloc[-1] ** (1 / yrs) - 1
    vol = s.std() * np.sqrt(12)
    dd = (curve / curve.cummax() - 1).min()
    sharpe = (s.mean() * 12 - 0.02) / vol if vol > 0 else np.nan
    return dict(CAGR=cagr, vol=vol, maxDD=dd, sharpe=sharpe, final_x=curve.iloc[-1],
                worst_year=s.groupby(s.index.year).apply(lambda x: (1 + x).prod() - 1).min())


def bench(ticker):
    df = pd.read_parquet(os.path.join(PRICES, f"{ticker}.parquet")).set_index("date")
    m = df.adjclose.resample("ME").last()
    return m.pct_change().loc["2012-07-31":"2026-06-30"].rename(ticker)


if __name__ == "__main__":
    p = load()
    print(len(p), p.cik.nunique())
    print(bucket_stats(p, "price", bins=[0, 0.01, 0.1, 1, 5, 1e9], labels=["<1c", "1-10c", "10c-$1", "$1-5", ">$5"]))
