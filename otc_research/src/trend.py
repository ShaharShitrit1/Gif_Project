"""'Many small losses, a few huge winners': breakout entries with stop-loss / trailing-stop exits on OTC stocks.

Fairness rules
* Signal on day t's close, entry at day t+1's OPEN (no look-ahead).
* Stops are checked against each day's LOW. If the day opens below the stop (a gap), the exit is at the
  open, not at the stop price. Initial stop and trailing stop (from the highest close since entry).
* Costs per side: half the estimated spread for the stock's liquidity + 0.5% slippage; stop exits pay an
  extra 1% (selling into weakness in a thin book).
* Control: RANDOM entry days that pass the same liquidity/price filters, with identical exits. If the
  signal can't beat random entries, the "edge" is just the stop mechanics.
* Only periods when the stock traded OTC. Survivorship caveats are in the report.
Output: output/trend_trades.parquet, output/trend_results.json
"""
import os
import json
import numpy as np
import pandas as pd
from panel import load_filings, venue_events, venue_at, load_meta, load_price
from common import RAW, OUT, PRICES

rng = np.random.default_rng(7)

SIGNALS = ("breakout52", "donchian50", "spike", "random")
EXITS = {  # name: (initial stop, trailing stop from peak close, max holding days)
    "base": (0.15, 0.25, 250),
    "tight": (0.10, 0.20, 250),
    "wide": (0.25, 0.35, 250),
    "no_stop_60d": (None, None, 60),
}


def half_spread(dvol):
    # median Abdi-Ranaldo spreads measured on this universe, by avg daily $ volume
    return np.select([dvol >= 1e6, dvol >= 1e5, dvol >= 2.5e4, dvol >= 1e4], [0.0025, 0.009, 0.019, 0.024], 0.045)


def clean_ohlc(px):
    c = px["close"].values.astype(float)
    o = px["open"].values.astype(float)
    h = px["high"].values.astype(float)
    lo = px["low"].values.astype(float)
    bad_o = ~np.isfinite(o) | (o <= 0) | (o > 3 * c) | (o < c / 3)
    o[bad_o] = c[bad_o]
    bad_l = ~np.isfinite(lo) | (lo <= 0) | (lo < c / 3) | (lo > c * 1.0001)
    lo[bad_l] = np.minimum(o[bad_l], c[bad_l])
    bad_h = ~np.isfinite(h) | (h > 3 * c) | (h < c * 0.9999)
    h[bad_h] = np.maximum(o[bad_h], c[bad_h])
    return o, h, lo, c


def signals_for(o, h, lo, c, v, eligible):
    n = len(c)
    out = {k: np.zeros(n, bool) for k in SIGNALS}
    cs = pd.Series(c)
    vs = pd.Series(v)
    hi250 = cs.shift(1).rolling(250, min_periods=250).max().values
    hi50 = cs.shift(1).rolling(50, min_periods=50).max().values
    v50 = vs.shift(1).rolling(50, min_periods=50).mean().values
    r1 = cs.pct_change().values
    with np.errstate(invalid="ignore", divide="ignore"):
        out["breakout52"] = eligible & (c > hi250) & (v >= 3 * v50)
        out["donchian50"] = eligible & (c > hi50)
        out["spike"] = eligible & (r1 >= 0.30) & (v >= 5 * v50)
    return out


def simulate(o, h, lo, c, sig_idx, init_stop, trail, max_days, cost_in, cost_out):
    """Non-overlapping trades from a sorted array of signal indices."""
    trades = []
    n = len(c)
    free_from = 0
    for t in sig_idx:
        if t < free_from or t + 1 >= n:
            continue
        e = t + 1
        entry = o[e]
        stop = entry * (1 - init_stop) if init_stop else -np.inf
        peak = entry
        exit_i, exit_px, how = None, None, None
        for d in range(e, min(n, e + max_days)):
            if d > e or True:
                level = stop
                if trail:
                    level = max(level, peak * (1 - trail))
                if lo[d] <= level:
                    gap = o[d] < level and d > e
                    exit_px = o[d] if gap else level
                    exit_i, how = d, ("gap" if gap else "stop")
                    break
            peak = max(peak, c[d])
        if exit_i is None:
            exit_i = min(n - 1, e + max_days - 1)
            exit_px, how = c[exit_i], ("time" if exit_i < n - 1 else "open")
        extra = 0.01 if how in ("stop", "gap") else 0.0
        ret = exit_px * (1 - cost_out[t] - extra) / (entry * (1 + cost_in[t])) - 1
        gross = exit_px / entry - 1
        trades.append((t, e, exit_i, entry, exit_px, ret, gross, how, peak / entry - 1))
        free_from = exit_i + 1
    return trades


def main():
    fil = load_filings()
    events = venue_events(fil)
    meta = load_meta()
    tk = json.load(open(os.path.join(RAW, "company_tickers_exchange.json")))
    prim = {}
    for cik, name, t, ex in tk["data"]:
        prim.setdefault(cik, (t, ex, name))
    conf = {int(k): pd.Timestamp(v) for k, v in json.load(open(os.path.join(OUT, "uplist_confirmed.json"))).items()}
    comps = pd.read_parquet(os.path.join(RAW, "companies.parquet")).set_index("cik")
    rows = []
    n_stocks = 0
    for cik, (t, ex, name) in prim.items():
        if len(t) == 5 and t[4] in "PONWUR":
            continue
        if ex != "OTC" and cik not in conf:
            continue
        if cik in comps.index and comps.loc[cik, "sic"] == "6770":
            continue
        if t not in meta.index or meta.loc[t, "status"] != "ok":
            continue
        px = load_price(t, meta.loc[t, "splits"])
        if px is None or len(px) < 300:
            continue
        idx = px.index
        if ex != "OTC":
            otc = idx < conf[cik]
        else:
            evs = events.get(cik, [])
            otc = np.array([venue_at(cik, d, events, ex, None) == "O" for d in idx]) if evs else np.ones(len(idx), bool)
        o, h, lo, c = clean_ohlc(px)
        v = px["volume"].fillna(0).values.astype(float)
        dv20 = pd.Series(c * v).rolling(20, min_periods=20).mean().values
        raw = px["raw"].values
        eligible = otc & (dv20 >= 1e4) & (raw >= 0.05) & np.isfinite(dv20)
        if not eligible.any():
            continue
        n_stocks += 1
        sig = signals_for(o, h, lo, c, v, eligible)
        # random control: same count of candidate days as the breakout signal, spread over eligible days
        el_idx = np.where(eligible)[0]
        k = max(int(sig["breakout52"].sum()), 1)
        if len(el_idx):
            pick = rng.choice(el_idx, size=min(k * 3, len(el_idx)), replace=False)
            sig["random"][pick] = True
        cost = half_spread(np.nan_to_num(dv20)) + 0.005
        for sname, mask in sig.items():
            sidx = np.where(mask)[0]
            if not len(sidx):
                continue
            for ename, (ist, tr, md) in EXITS.items():
                for tr_ in simulate(o, h, lo, c, sidx, ist, tr, md, cost, cost):
                    ti, e, x, ep, xp, ret, gross, how, mfe = tr_
                    rows.append((cik, t, sname, ename, idx[ti], idx[e], idx[x], x - e + 1, ep, xp, ret, gross, how, mfe,
                                 float(dv20[ti]), float(raw[ti]), float(cost[ti])))
    df = pd.DataFrame(rows, columns=["cik", "ticker", "signal", "exit", "sig_date", "entry_date", "exit_date", "days",
                                     "entry", "exit_px", "ret", "gross", "how", "mfe", "dvol20", "price", "cost_side"])
    # attach fundamentals (red-flag score / quality) from the annual panel when available
    p = pd.read_parquet(os.path.join(OUT, "panel_scored.parquet"))[["cik", "year", "red", "quality"]]
    df["year"] = np.where(df.entry_date.dt.month >= 7, df.entry_date.dt.year, df.entry_date.dt.year - 1)
    df = df.merge(p, on=["cik", "year"], how="left")
    df.to_parquet(os.path.join(OUT, "trend_trades.parquet"))
    print("stocks", n_stocks, "trades", len(df))
    print(df.groupby(["signal", "exit"]).ret.agg(["size", "mean", "median"]).round(3))


if __name__ == "__main__":
    main()
