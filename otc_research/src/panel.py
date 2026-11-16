import warnings; warnings.filterwarnings("ignore")
"""Build the point-in-time research panel.

Key design choices (documented in the report):
* Fundamentals come from SEC XBRL frames (fiscal year ~ calendar year Y).
* A fundamental row is only usable at formation date F if the company actually filed a
  10-K covering that period before F (checked against EDGAR filing history).
* Venue (OTC vs exchange) at any date is reconstructed from EDGAR forms:
  8-A12B => listed on an exchange from that date, 25-NSE/25 => delisted (back to OTC).
* Prices: Yahoo split-adjusted closes; raw price reconstructed from the split history so that
  market cap = raw price x reported shares is consistent.
"""
import os
import json
import numpy as np
import pandas as pd
from common import RAW, PRICES

REV_TAGS = ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"]


# ----------------------------------------------------------------------------- fundamentals
def load_fundamentals():
    f = pd.read_parquet(os.path.join(RAW, "frames.parquet"))
    f["year"] = f["period"].str.slice(2, 6).astype(int)
    f["instant"] = f["period"].str.endswith("I")
    # one value per cik/concept/year
    f = f.sort_values("accn").drop_duplicates(["cik", "concept", "year"], keep="last")
    w = f.pivot_table(index=["cik", "year"], columns="concept", values="val", aggfunc="last")
    ends = f[f.concept.isin(["Assets", "NetIncomeLoss"])].pivot_table(
        index=["cik", "year"], columns="concept", values="end", aggfunc="last")
    w["end_bs"] = ends.get("Assets")
    w["end_is"] = ends.get("NetIncomeLoss")
    rev = None
    for t in REV_TAGS:
        if t in w:
            rev = w[t] if rev is None else rev.fillna(w[t])
    w["Revenue"] = rev
    div = w.get("PaymentsOfDividends")
    if "PaymentsOfDividendsCommonStock" in w:
        div = div.fillna(w["PaymentsOfDividendsCommonStock"]) if div is not None else w["PaymentsOfDividendsCommonStock"]
    w["Dividends"] = div
    sh = w["CommonStockSharesOutstanding"].copy()
    sh = sh.fillna(w.get("EntityCommonStockSharesOutstanding"))
    sh = sh.fillna(w.get("WeightedAverageNumberOfSharesOutstandingBasic"))
    w["Shares"] = sh.where(sh > 0)
    w = w.reset_index()
    w = w.sort_values(["cik", "year"])
    g = w.groupby("cik")
    prev = g.shift(1)
    same = (w["year"] - prev["year"]) == 1
    w["shares_growth"] = np.where(same, w["Shares"] / prev["Shares"] - 1, np.nan)
    w["rev_growth"] = np.where(same & (prev["Revenue"] > 0), w["Revenue"] / prev["Revenue"] - 1, np.nan)
    w["ni_prev"] = np.where(same, prev["NetIncomeLoss"], np.nan)
    w["assets_prev"] = np.where(same, prev["Assets"], np.nan)
    w["ocf_prev"] = np.where(same, prev["NetCashProvidedByUsedInOperatingActivities"], np.nan)
    w["rev_prev"] = np.where(same, prev["Revenue"], np.nan)
    w["auth_growth"] = np.where(same & (prev["CommonStockSharesAuthorized"] > 0),
                                w["CommonStockSharesAuthorized"] / prev["CommonStockSharesAuthorized"] - 1, np.nan)
    return w


# ----------------------------------------------------------------------------- filings / venue
def load_filings():
    fil = pd.read_parquet(os.path.join(RAW, "filings.parquet"))
    fil["filingDate"] = pd.to_datetime(fil["filingDate"], errors="coerce")
    fil["reportDate"] = pd.to_datetime(fil["reportDate"], errors="coerce")
    return fil


def load_companies():
    c = pd.read_parquet(os.path.join(RAW, "companies.parquet"))
    for col in ("tickers", "exchanges", "formerNames"):
        c[col] = c[col].apply(json.loads)
    return c


def venue_events(fil):
    """Return dict cik -> sorted list of (date, state) where state in {'X' (exchange), 'O' (OTC)}."""
    ev = fil[fil.form.isin(["8-A12B", "25-NSE", "25"])].copy()
    ev["state"] = np.where(ev.form == "8-A12B", "X", "O")
    out = {}
    for cik, g in ev.sort_values("filingDate").groupby("cik"):
        out[cik] = list(zip(g.filingDate, g.state))
    return out


def first_periodic(fil):
    p = fil[fil.form.isin(["10-K", "10-Q", "10-K405", "10-KSB", "10-QSB"])]
    return p.groupby("cik").filingDate.min()


def venue_at(cik, date, events, current_exchange, first_per):
    """Best-effort venue reconstruction."""
    evs = events.get(cik, [])
    past = [s for d, s in evs if d <= date]
    if past:
        return past[-1]
    if evs:
        # before the first event: opposite of first event's state
        first_state = evs[0][1]
        if first_state == "X":
            # became listed later; if it was already a reporting company, it traded OTC (or not at all)
            return "O"
        return "X"
    return "O" if current_exchange == "OTC" else "X"


def tenk_dates(fil):
    k = fil[fil.form.isin(["10-K", "10-K/A", "10-KSB", "10-K405", "10-KT"])].dropna(subset=["reportDate"])
    return k[["cik", "reportDate", "filingDate"]]


# ----------------------------------------------------------------------------- prices
def load_price(ticker, splits=None):
    path = os.path.join(PRICES, f"{ticker}.parquet")
    if not os.path.exists(path):
        return None
    df = pd.read_parquet(path)
    if df.empty:
        return None
    df = df.dropna(subset=["close"]).copy()
    df = df[df.close > 0]
    if len(df) < 30:
        return None
    df = df.drop_duplicates("date").set_index("date").sort_index()
    # bad-tick filter: one-day spikes that fully reverse the next day
    for col in ("close", "adjclose"):
        r = np.log(df[col]).diff()
        spike = ((r > np.log(3)) & (r.shift(-1) < -np.log(2.5))) | ((r < -np.log(3)) & (r.shift(-1) > np.log(2.5)))
        df.loc[spike, col] = np.nan
        df[col] = df[col].ffill()
    # raw (as-traded) price from split history
    f = pd.Series(1.0, index=df.index)
    if splits:
        for ts, num, den in splits:
            d = pd.Timestamp(ts, unit="s").normalize()
            if num and den:
                f[df.index < d] *= num / den
    df["raw"] = df["close"] * f
    df["dvol"] = df["raw"] * df["volume"].fillna(0) / f  # volume is split-adjusted too
    return df


def load_meta():
    rows = [json.loads(l) for l in open(os.path.join(RAW, "yahoo_meta.jsonl"))]
    m = pd.DataFrame(rows).drop_duplicates("ticker", keep="last").set_index("ticker")
    return m
