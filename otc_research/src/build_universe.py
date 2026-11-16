"""Build the annual formation panel: one row per (company, formation date) for companies that
were trading OTC at the formation date, with point-in-time fundamentals, market data and
forward 12-month returns.  Output: output/panel.parquet
"""
import os
import json
import numpy as np
import pandas as pd
from panel import (load_fundamentals, load_filings, venue_events, venue_at, load_price, load_meta)
from common import RAW, OUT

YEARS = range(2012, 2026)  # formation each July 1
LIVE_DATE = pd.Timestamp("2026-11-13")  # last full trading day before this research run


def main(live=False):
    fund = load_fundamentals()
    fil = load_filings()
    meta = load_meta()
    tk = json.load(open(os.path.join(RAW, "company_tickers_exchange.json")))
    prim = {}
    for cik, name, t, ex in tk["data"]:
        prim.setdefault(cik, (t, ex, name))
    comps = pd.read_parquet(os.path.join(RAW, "companies.parquet")).set_index("cik")
    events = venue_events(fil)
    # current exchange-listed companies count as OTC before their (confirmed) uplisting date only
    conf_path = os.path.join(OUT, "uplist_confirmed.json")
    confirmed = {int(k): pd.Timestamp(v) for k, v in json.load(open(conf_path)).items()} if os.path.exists(conf_path) else {}
    per = fil[fil.form.isin(["10-K", "10-K/A", "10-KT", "10-Q", "10-Q/A", "10-KSB", "10-QSB"])].dropna(subset=["reportDate"])
    per_by = {c: g[["form", "reportDate", "filingDate"]].values for c, g in per.groupby("cik")}
    fund_by = {c: g.set_index("year") for c, g in fund.groupby("cik")}
    CATS = {"13d": ["SC 13D", "SCHEDULE 13D"], "form4": ["4"], "f144": ["144"], "nt": ["NT 10-K", "NT 10-Q"],
            "resale": ["S-1", "424B3", "S-1/A"], "c14": ["PRE 14C", "DEF 14C"], "s8": ["S-8"],
            "dark": ["15-12G", "15-12B", "15-15D"]}
    cat_dates = {}
    sub = fil[fil.form.isin(sum(CATS.values(), []))]
    for k, forms in CATS.items():
        g = sub[sub.form.isin(forms)].groupby("cik").filingDate
        cat_dates[k] = {c: np.sort(v.values) for c, v in g}
    former = {}
    for c, fn in comps["formerNames"].items():
        try:
            former[c] = [pd.Timestamp(x["to"][:10]) for x in json.loads(fn) if x.get("to")]
        except Exception:
            former[c] = []

    def count(k, cik, F, days=365):
        a = cat_dates[k].get(cik)
        if a is None:
            return 0
        lo, hi = np.datetime64(F - pd.Timedelta(days=days)), np.datetime64(F)
        return int(np.searchsorted(a, hi) - np.searchsorted(a, lo))

    rows = []
    ciks = [c for c in prim if c in fund_by]
    print("candidate ciks", len(ciks), flush=True)
    for i, cik in enumerate(ciks):
        t, cur_ex, name = prim[cik]
        if t not in meta.index or meta.loc[t, "status"] != "ok":
            continue
        if meta.loc[t].get("currency") not in ("USD", None):
            continue
        # 5-letter OTC symbols: 5th letter P/O/N = preferred, W = warrant, U = unit, R = right
        if len(t) == 5 and t[4] in "PONWUR":
            continue
        sic = comps.loc[cik, "sic"] if cik in comps.index else None
        if sic in ("6770",):  # blank checks / SPACs
            continue
        px = load_price(t, meta.loc[t, "splits"])
        if px is None:
            continue
        fb = fund_by[cik]
        pf = per_by.get(cik)
        if pf is None:
            continue
        forms = [(LIVE_DATE.year, LIVE_DATE)] if live else [(Y, pd.Timestamp(f"{Y}-07-01")) for Y in YEARS]
        for Y, F in forms:
            if F > px.index[-1] + pd.Timedelta(days=15) or F < px.index[0] + pd.Timedelta(days=380):
                continue
            if cur_ex != "OTC":
                if not (cik in confirmed and F < confirmed[cik]):
                    continue
            elif venue_at(cik, F, events, cur_ex, None) != "O":
                continue
            evs = events.get(cik, [])
            was_listed = any(st == "X" and d < F for d, st in evs) or (bool(evs) and evs[0][1] == "O" and evs[0][0] > F)
            uplist12 = (cik in confirmed and F < confirmed[cik] <= F + pd.Timedelta(days=365)) or \
                (cur_ex == "OTC" and any(st == "X" and F < d <= F + pd.Timedelta(days=365) for d, st in evs))
            # most recent fiscal year with a filed report before F
            fy = None
            for yy in (Y - 1, Y - 2):
                if yy not in fb.index:
                    continue
                r = fb.loc[yy]
                end = pd.to_datetime(r["end_bs"]) if pd.notna(r["end_bs"]) else None
                if end is None:
                    continue
                ok = any((abs((rd - end).days) <= 10) and (fd < F) for _, rd, fd in pf)
                if ok:
                    fy = yy
                    break
            if fy is None:
                continue
            r = fb.loc[fy]
            end = pd.to_datetime(r["end_bs"])
            hist = px[px.index <= F]
            if len(hist) < 260 or (F - hist.index[-1]).days > 15:
                continue
            p_end = px[px.index <= end]
            if p_end.empty:
                continue
            p0 = hist.iloc[-1]
            pe = p_end.iloc[-1]
            shares = r["Shares"] if pd.notna(r["Shares"]) and r["Shares"] >= 1e4 else np.nan
            mc = shares * pe["raw"] * (p0["adjclose"] / pe["adjclose"])
            sg = r["shares_growth"]
            if pd.isna(sg) or not (-0.95 < sg < 200):
                sg = np.nan
            last63 = hist.iloc[-63:]
            dv = last63["close"] * last63["volume"].fillna(0)
            dvol = float(dv.mean())  # average daily $ volume (median is 0 for stocks that trade sporadically)
            dvol_med = float(dv.median())
            zero_days = float((last63["volume"].fillna(0) == 0).mean())
            # Abdi & Ranaldo (2017) effective spread from close/high/low, on days that actually traded
            tr = hist.iloc[-126:]
            tr = tr[(tr["volume"].fillna(0) > 0) & (tr["high"] > 0) & (tr["low"] > 0)]
            spread_ar = np.nan
            if len(tr) >= 20:
                c = np.log(tr["close"].values)
                eta = (np.log(tr["high"].values) + np.log(tr["low"].values)) / 2
                s2 = 4 * np.mean((c[:-1] - eta[:-1]) * (c[:-1] - eta[1:]))
                spread_ar = float(np.sqrt(max(s2, 0)))
            mom = hist["adjclose"].iloc[-22] / hist["adjclose"].iloc[-253] - 1
            ret1m = hist["adjclose"].iloc[-1] / hist["adjclose"].iloc[-22] - 1
            vol = np.log(hist["adjclose"].iloc[-253:]).diff().std() * np.sqrt(252)
            # reverse splits in the 2 years before F
            rsplits = sum(1 for ts, n, d in (meta.loc[t, "splits"] or [])
                          if n and d and n / d < 1 and F - pd.Timedelta(days=730) <= pd.Timestamp(ts, unit="s") < F)
            # pump signature in the 250 trading days before F: +100% in 20d on >5x volume
            a = hist["adjclose"].values[-271:]
            v = hist["volume"].fillna(0).values[-271:]
            pump12 = False
            if len(a) > 160:
                r20 = a[20:] / a[:-20] - 1
                cv = np.concatenate([[0], np.cumsum(v)])
                for j in np.where(r20 > 1.0)[0]:
                    e = j + 20
                    if e >= 140:
                        v20 = (cv[e + 1] - cv[e - 19]) / 20
                        v120 = (cv[e - 19] - cv[e - 139]) / 120
                        if v120 > 0 and v20 > 5 * v120:
                            pump12 = True
                            break
            sig = {f"n_{k}": count(k, cik, F) for k in CATS}
            sig["name_change2y"] = any(F - pd.Timedelta(days=730) <= d <= F for d in former.get(cik, []))
            if live:
                ret12, complete, mrets = np.nan, False, []
            else:
                fut = px[(px.index > F) & (px.index <= F + pd.DateOffset(years=1))]
                if fut.empty:
                    continue
                complete = (F + pd.DateOffset(years=1) - fut.index[-1]).days <= 20
                ret12 = fut["adjclose"].iloc[-1] / p0["adjclose"] - 1
                # monthly path for portfolio curves
                m = pd.concat([hist["adjclose"].iloc[-1:], fut["adjclose"]]).resample("ME").last().ffill()
                mrets = (m.pct_change().dropna().values[:12]).tolist()
            rows.append(dict(
                cik=cik, ticker=t, name=name, sic=sic, year=Y, fy=fy, cur_exchange=cur_ex,
                tier=meta.loc[t, "fullExchange"], price=p0["raw"], mcap=mc, dvol=dvol, dvol_med=dvol_med, zero_days=zero_days, spread_ar=spread_ar,
                mom12_1=mom, ret1m=ret1m, vol=vol, rsplits2y=rsplits,
                assets=r["Assets"], liab=r.get("Liabilities"), equity=r.get("StockholdersEquity"),
                ca=r.get("AssetsCurrent"), cl=r.get("LiabilitiesCurrent"), cash=r.get("CashAndCashEquivalentsAtCarryingValue"),
                re=r.get("RetainedEarningsAccumulatedDeficit"), revenue=r.get("Revenue"), ni=r.get("NetIncomeLoss"),
                ni_prev=r.get("ni_prev"), oi=r.get("OperatingIncomeLoss"), gp=r.get("GrossProfit"),
                ocf=r.get("NetCashProvidedByUsedInOperatingActivities"), buyback=r.get("PaymentsForRepurchaseOfCommonStock"),
                dividends=r.get("Dividends"), issuance=r.get("ProceedsFromIssuanceOfCommonStock"),
                deriv=r.get("DerivativeLiabilitiesCurrent"), conv=r.get("ConvertibleNotesPayableCurrent"),
                conv_proceeds=r.get("ProceedsFromConvertibleDebt"), debt_disc_amort=r.get("AmortizationOfDebtDiscountPremium"),
                shares=shares, shares_growth=sg, rev_growth=r["rev_growth"],
                authorized=r.get("CommonStockSharesAuthorized"),
                ret12=ret12, complete=complete, mrets=mrets, was_listed=was_listed, uplist12=uplist12,
                ocf_prev=r.get("ocf_prev"), rev_prev=r.get("rev_prev"), auth_growth=r.get("auth_growth"),
                pump12=pump12, **sig))
        if i % 500 == 0:
            print(i, len(rows), flush=True)
    df = pd.DataFrame(rows)
    df.to_parquet(os.path.join(OUT, "live.parquet" if live else "panel.parquet"))
    print("panel rows", len(df), "companies", df.cik.nunique())
    print(df.groupby("year").size())


if __name__ == "__main__":
    import sys
    main(live="--live" in sys.argv)
