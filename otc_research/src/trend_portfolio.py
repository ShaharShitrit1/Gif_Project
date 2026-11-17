"""Portfolio simulation of the trend trades (output/trend_trades.parquet) as a real trader would run them:
N equal slots, each new trade gets 1/N of current equity, signals taken in date order (most liquid first),
daily mark-to-market, costs as in trend.py. Also significance tests vs random entries.
Output: output/trend_results.json
"""
import os
import json
import numpy as np
import pandas as pd
from scipy import stats
from panel import load_meta, load_price
from common import OUT, PRICES


def closes_for(tickers, meta):
    out = {}
    for t in tickers:
        px = load_price(t, meta.loc[t, "splits"])
        if px is not None:
            out[t] = px["close"]
    return out


def simulate(tr, closes, slots, start="2010-01-01", end=None):
    tr = tr.sort_values(["entry_date", "dvol20"], ascending=[True, False])
    days = pd.bdate_range(start, end or tr.exit_date.max())
    by_entry = {d: g for d, g in tr.groupby("entry_date")}
    cash, openp, curve, taken = 1.0, [], [], 0
    for d in days:
        # exits first (realize at the trade's net return)
        still = []
        for pos in openp:
            if pos["exit"] <= d:
                cash += pos["alloc"] * (1 + pos["ret"])
            else:
                still.append(pos)
        openp = still
        mtm = 0.0
        for pos in openp:
            s = pos["px"]
            cp = s.asof(d) if len(s) else np.nan
            mtm += pos["alloc"] * (cp / pos["entry"] if np.isfinite(cp) and pos["entry"] > 0 else 1.0)
        equity = cash + mtm
        if d in by_entry:
            held = {p["ticker"] for p in openp}
            for _, r in by_entry[d].iterrows():
                if len(openp) >= slots or r.ticker in held:
                    continue
                alloc = equity / slots
                if alloc > cash:
                    break
                cash -= alloc
                s = closes.get(r.ticker, pd.Series(dtype=float))
                openp.append(dict(ticker=r.ticker, alloc=alloc, entry=r.entry, ret=r.ret, exit=r.exit_date,
                                  px=s.loc[r.entry_date:r.exit_date]))
                held.add(r.ticker)
                taken += 1
        curve.append(equity)
    eq = pd.Series(curve, index=days)
    yrs = (eq.index[-1] - eq.index[0]).days / 365.25
    cagr = eq.iloc[-1] ** (1 / yrs) - 1
    dd = (eq / eq.cummax() - 1).min()
    m = eq.resample("ME").last().pct_change().dropna()
    return dict(CAGR=float(cagr), maxDD=float(dd), final_x=float(eq.iloc[-1]), trades=int(taken),
                trades_per_year=float(taken / yrs), sharpe=float((m.mean() * 12 - 0.02) / (m.std() * np.sqrt(12))),
                worst_year=float(m.groupby(m.index.year).apply(lambda x: (1 + x).prod() - 1).min())), eq


def main():
    d = pd.read_parquet(os.path.join(OUT, "trend_trades.parquet"))
    meta = load_meta()
    end = d.exit_date.max()
    res = {"trade_stats": {}, "portfolios": {}, "tests": {}}

    def tstats(g):
        r = g.ret
        w, l = r[r > 0], r[r <= 0]
        srt = np.sort(r.values)[::-1]
        top = max(1, int(round(len(r) * 0.05)))
        return dict(n=int(len(r)), win=float((r > 0).mean()), avg_win=float(w.mean()), avg_loss=float(l.mean()),
                    payoff=float(w.mean() / -l.mean()), mean=float(r.mean()), gross_mean=float(g.gross.mean()),
                    median=float(r.median()), profit_factor=float(w.sum() / -l.sum()), p_double=float((r > 1).mean()),
                    p_5x=float((r > 4).mean()), top5_share=float(srt[:top].sum() / w.sum()),
                    gap_exits=float((g.how == "gap").mean()), median_days=float(g.days.median()),
                    cost_side=float(g.cost_side.mean()))

    for (s, e), g in d.groupby(["signal", "exit"]):
        res["trade_stats"][f"{s}|{e}"] = tstats(g)
    q = d[(d.red <= 2) & (d.quality == True)]
    for (s, e), g in q.groupby(["signal", "exit"]):
        res["trade_stats"][f"{s}+quality|{e}"] = tstats(g)

    # significance: breakout vs random (same exits), trade-level Welch t and year-clustered bootstrap
    for e in ("base", "no_stop_60d", "wide"):
        a = d[(d.signal == "breakout52") & (d.exit == e)]
        b = d[(d.signal == "random") & (d.exit == e)]
        t = stats.ttest_ind(a.ret, b.ret, equal_var=False)
        t0 = stats.ttest_1samp(a.ret, 0)
        ya, yb = a.groupby(a.entry_date.dt.year).ret.mean(), b.groupby(b.entry_date.dt.year).ret.mean()
        diff = (ya - yb).dropna()
        rng = np.random.default_rng(1)
        boot = [rng.choice(diff.values, len(diff)).mean() for _ in range(5000)]
        res["tests"][e] = dict(mean_breakout=float(a.ret.mean()), mean_random=float(b.ret.mean()),
                               diff=float(a.ret.mean() - b.ret.mean()), welch_t=float(t.statistic), welch_p=float(t.pvalue),
                               breakout_vs_zero_t=float(t0.statistic), breakout_vs_zero_p=float(t0.pvalue),
                               years_breakout_beats_random=f"{int((diff > 0).sum())}/{len(diff)}",
                               boot_ci_yearly_diff=[float(np.percentile(boot, 2.5)), float(np.percentile(boot, 97.5))])

    closes = closes_for(sorted(set(d.ticker)), meta)
    variants = {
        "breakout52 | base stops | 20 slots": (d.signal == "breakout52") & (d.exit == "base"),
        "breakout52 | wide stops | 20 slots": (d.signal == "breakout52") & (d.exit == "wide"),
        "breakout52 | no stop, 60d | 20 slots": (d.signal == "breakout52") & (d.exit == "no_stop_60d"),
        "breakout52 + quality | base | 10 slots": (d.signal == "breakout52") & (d.exit == "base") & (d.red <= 2) & (d.quality == True),
        "donchian50 | base | 20 slots": (d.signal == "donchian50") & (d.exit == "base"),
        "spike (rocket) | base | 20 slots": (d.signal == "spike") & (d.exit == "base"),
        "random entries | base | 20 slots": (d.signal == "random") & (d.exit == "base"),
    }
    curves = {}
    for name, m in variants.items():
        slots = 10 if "10 slots" in name else 20
        st, eq = simulate(d[m], closes, slots, end=end)
        # same trades with zero costs, to show what costs take away
        g = d[m].copy()
        g["ret"] = g["gross"]
        st0, _ = simulate(g, closes, slots, end=end)
        st["CAGR_no_costs"] = st0["CAGR"]
        res["portfolios"][name] = st
        curves[name] = {str(k.date()): float(v) for k, v in eq.resample("ME").last().items()}
        print(name, {k: round(v, 3) if isinstance(v, float) else v for k, v in st.items()}, flush=True)
    iwm = pd.read_parquet(os.path.join(PRICES, "IWM.parquet")).set_index("date").adjclose.loc["2010-01-01":end]
    yrs = (iwm.index[-1] - iwm.index[0]).days / 365.25
    res["portfolios"]["IWM (Russell 2000)"] = dict(CAGR=float((iwm.iloc[-1] / iwm.iloc[0]) ** (1 / yrs) - 1),
                                                    maxDD=float((iwm / iwm.cummax() - 1).min()))
    curves["IWM (Russell 2000)"] = {str(k.date()): float(v) for k, v in (iwm / iwm.iloc[0]).resample("ME").last().items()}
    res["curves"] = curves
    # survivorship stress: some trades end in a halt / revocation the data can't show (-90%, no exit possible)
    a = d[(d.signal == "breakout52") & (d.exit == "base")].ret
    res["halt_stress"] = {f"{int(k*100)}%_of_trades_halted": float((1 - k) * a.mean() + k * -0.9) for k in (0.01, 0.02, 0.05)}
    json.dump(res, open(os.path.join(OUT, "trend_results.json"), "w"), indent=1)
    print(json.dumps(res["tests"], indent=1))
    print(json.dumps(res["halt_stress"], indent=1))
    print("IWM", res["portfolios"]["IWM (Russell 2000)"])


if __name__ == "__main__":
    main()
