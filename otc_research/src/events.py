"""Event studies on OTC stocks.

1. Uplisting:   first 8-A12B (exchange registration) by a company that was already an SEC
                reporter and already traded (>=120 trading days of prices before the event).
2. Downlisting: 25-NSE (exchange delisting) of companies that now trade OTC ("fallen angels").
3. Hot stocks:  OTC stock up >100% in 20 trading days on >5x normal volume (classic pump /
                breakout signature). What happens next?
Returns measured in trading days relative to the event, raw and in excess of IWM.
"""
import os
import json
import numpy as np
import pandas as pd
from panel import load_filings, load_price, load_meta, venue_events, venue_at
from common import RAW, OUT, PRICES

WIN = {"pre_-250_-21": (-250, -21), "run_-20_-1": (-20, -1), "evt_0_+5": (0, 5),
       "post_+5_+65": (5, 65), "post_+5_+125": (5, 125), "post_+5_+250": (5, 250)}


def window_ret(s, i0, a, b):
    ia, ib = i0 + a, i0 + b
    if ia < 0 or ib >= len(s):
        return np.nan
    return s.iloc[ib] / s.iloc[ia] - 1


def iwm_series():
    d = pd.read_parquet(os.path.join(PRICES, "IWM.parquet")).set_index("date")
    return d.adjclose


def excess(px, iwm, i0, a, b):
    r = window_ret(px.adjclose, i0, a, b)
    ia, ib = i0 + a, i0 + b
    if np.isnan(r):
        return np.nan, np.nan
    d0, d1 = px.index[max(ia, 0)], px.index[min(ib, len(px) - 1)]
    bi = iwm.reindex([d0, d1], method="ffill")
    return r, r - (bi.iloc[1] / bi.iloc[0] - 1)


def prim_map():
    tk = json.load(open(os.path.join(RAW, "company_tickers_exchange.json")))
    prim = {}
    for cik, name, t, ex in tk["data"]:
        prim.setdefault(cik, (t, ex, name))
    return prim


def uplistings(fil, meta, prim, iwm):
    per = fil[fil.form.isin(["10-K", "10-Q", "10-KSB", "10-QSB"])].groupby("cik").filingDate.min()
    rows = []
    for cik, g in fil[fil.form.isin(["8-A12B", "25-NSE", "25"])].sort_values("filingDate").groupby("cik"):
        first = g.iloc[0]
        if first.form != "8-A12B" or first.filingDate < pd.Timestamp("2010-01-01"):
            continue
        if cik not in per.index or per[cik] > first.filingDate - pd.Timedelta(days=180):
            continue
        if cik not in prim:
            continue
        t, ex, name = prim[cik]
        if t not in meta.index or meta.loc[t, "status"] != "ok":
            continue
        px = load_price(t, meta.loc[t, "splits"])
        if px is None:
            continue
        i0 = px.index.searchsorted(first.filingDate)
        if i0 < 130 or i0 >= len(px):
            continue
        pre = px.iloc[i0 - 120:i0]
        if (pre.volume.fillna(0) > 0).mean() < 0.3:  # was not really trading before
            continue
        row = dict(cik=cik, ticker=t, name=name, date=first.filingDate, cur_exchange=ex,
                   price_pre=pre.raw.iloc[-1], dvol_pre=float(np.median(pre.close * pre.volume.fillna(0))),
                   dvol_post=float(np.median((px.iloc[i0 + 5:i0 + 125].close * px.iloc[i0 + 5:i0 + 125].volume.fillna(0)))) if i0 + 125 < len(px) else np.nan)
        # a real OTC->exchange move: thin trading before, clearly more trading after.
        # (8-A12B is also used to list bonds/preferreds of companies already on an exchange.)
        if not (row["dvol_pre"] < 1e6 and (np.isnan(row["dvol_post"]) or row["dvol_post"] > 1.5 * max(row["dvol_pre"], 1))):
            continue
        for k, (a, b) in WIN.items():
            row[k], row[k + "_xs"] = excess(px, iwm, i0, a, b)
        rows.append(row)
    return pd.DataFrame(rows)


def downlistings(fil, meta, prim, iwm):
    rows = []
    for cik, g in fil[fil.form.isin(["8-A12B", "25-NSE", "25"])].sort_values("filingDate").groupby("cik"):
        if cik not in prim or prim[cik][1] != "OTC":
            continue
        last = g.iloc[-1]
        if last.form == "8-A12B" or last.filingDate < pd.Timestamp("2010-01-01"):
            continue
        t, ex, name = prim[cik]
        if t not in meta.index or meta.loc[t, "status"] != "ok":
            continue
        px = load_price(t, meta.loc[t, "splits"])
        if px is None:
            continue
        i0 = px.index.searchsorted(last.filingDate)
        if i0 < 60 or i0 >= len(px) - 5:
            continue
        row = dict(cik=cik, ticker=t, name=name, date=last.filingDate, form=last.form,
                   price_at=px.raw.iloc[i0])
        for k, (a, b) in WIN.items():
            row[k], row[k + "_xs"] = excess(px, iwm, i0, a, b)
        rows.append(row)
    return pd.DataFrame(rows)


def hot_stocks(fil, meta, prim, iwm, events):
    rows = []
    for cik, (t, ex, name) in prim.items():
        if t not in meta.index or meta.loc[t, "status"] != "ok":
            continue
        px = load_price(t, meta.loc[t, "splits"])
        if px is None or len(px) < 400:
            continue
        a = px.adjclose.values
        v = px.volume.fillna(0).values
        dv = (px.close * px.volume.fillna(0)).values
        cv = np.concatenate([[0], np.cumsum(v)])
        cdv = np.concatenate([[0], np.cumsum(dv)])
        i = 140
        while i < len(px) - 5:
            r20 = a[i] / a[i - 20] - 1
            if r20 > 1.0:
                v20 = (cv[i + 1] - cv[i - 19]) / 20
                v120 = (cv[i - 19] - cv[i - 139]) / 120
                d20 = (cdv[i + 1] - cdv[i - 19]) / 20
                if v120 > 0 and v20 > 5 * v120 and d20 > 20000 and venue_at(cik, px.index[i], events, ex, None) == "O":
                    row = dict(cik=cik, ticker=t, date=px.index[i], r20=r20, vratio=v20 / v120, dvol20=d20,
                               price=px.raw.iloc[i])
                    for k, (aa, bb) in {"fwd_20": (0, 20), "fwd_60": (0, 60), "fwd_125": (0, 125), "fwd_250": (0, 250)}.items():
                        row[k], row[k + "_xs"] = excess(px, iwm, i, aa, bb)
                    # how much of the run-up is given back: min over next 250 days vs event price
                    fwd = a[i:i + 251]
                    row["max_dd_250"] = fwd.min() / a[i] - 1
                    row["max_up_250"] = fwd.max() / a[i] - 1
                    rows.append(row)
                    i += 250
                    continue
            i += 1
    return pd.DataFrame(rows)


def summarize(df, cols):
    out = {}
    for c in cols:
        s = df[c].dropna()
        out[c] = dict(n=len(s), mean=s.clip(upper=5).mean(), median=s.median(), pct_pos=(s > 0).mean())
    return pd.DataFrame(out).T


if __name__ == "__main__":
    fil = load_filings()
    meta = load_meta()
    prim = prim_map()
    iwm = iwm_series()
    ev = venue_events(fil)
    up = uplistings(fil, meta, prim, iwm)
    up.to_parquet(os.path.join(OUT, "ev_uplist.parquet"))
    json.dump({int(c): str(d.date()) for c, d in zip(up.cik, up.date)}, open(os.path.join(OUT, "uplist_confirmed.json"), "w"))
    print("UPLISTINGS", len(up))
    print(summarize(up, [k for k in WIN] + [k + "_xs" for k in WIN]).round(3))
    dn = downlistings(fil, meta, prim, iwm)
    dn.to_parquet(os.path.join(OUT, "ev_downlist.parquet"))
    print("DOWNLISTINGS", len(dn))
    print(summarize(dn, [k for k in WIN] + [k + "_xs" for k in WIN]).round(3))
    hs = hot_stocks(fil, meta, prim, iwm, ev)
    hs.to_parquet(os.path.join(OUT, "ev_hot.parquet"))
    print("HOT STOCKS", len(hs))
    print(summarize(hs, ["fwd_20", "fwd_60", "fwd_125", "fwd_250", "fwd_250_xs", "max_dd_250"]).round(3))
