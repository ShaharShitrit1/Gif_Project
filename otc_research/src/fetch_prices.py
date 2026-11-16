"""Download daily OHLCV (split-adjusted) + dividends/splits from Yahoo's chart API
for every ticker in SEC's company_tickers_exchange list.

Output: data/prices/{TICKER}.parquet  (date, open, high, low, close, adjclose, volume)
        data/raw/yahoo_meta.parquet    (ticker, exchange, tier, firstTradeDate, currency)
        data/raw/splits.parquet        (ticker, date, num, den)
"""
import os
import sys
import json
import time
import threading
import requests
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
from common import RAW, PRICES, RateLimiter

rl = RateLimiter(2)
tl = threading.local()
P1, P2 = 1230768000, int(time.time())  # 2009-01-01 .. now


def sess():
    s = getattr(tl, "s", None)
    if s is None:
        s = requests.Session()
        s.headers.update({"User-Agent": "Mozilla/5.0"})
        tl.s = s
    return s


def fetch(ticker):
    path = os.path.join(PRICES, f"{ticker}.parquet")
    if os.path.exists(path):
        return None
    url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
           f"?period1={P1}&period2={P2}&interval=1d&events=div%7Csplit")
    for i in range(5):
        rl.wait()
        try:
            r = sess().get(url, timeout=30)
        except requests.RequestException:
            time.sleep(2 * (i + 1))
            continue
        if r.status_code == 429:
            print("429 backoff", ticker, flush=True)
            time.sleep(60 * 2 ** i)
            continue
        if r.status_code == 404:
            return {"ticker": ticker, "status": "404"}
        if r.status_code != 200:
            time.sleep(2 * (i + 1))
            continue
        try:
            res = r.json()["chart"]["result"][0]
        except Exception:
            return {"ticker": ticker, "status": "noresult"}
        meta = res.get("meta", {})
        info = {"ticker": ticker, "status": "ok", "exchange": meta.get("exchangeName"),
                "fullExchange": meta.get("fullExchangeName"), "currency": meta.get("currency"),
                "firstTradeDate": meta.get("firstTradeDate"), "instrumentType": meta.get("instrumentType"),
                "splits": [], "divs": 0}
        ts = res.get("timestamp")
        if not ts:
            info["status"] = "empty"
            pd.DataFrame(columns=["date", "open", "high", "low", "close", "adjclose", "volume"]).to_parquet(path)
            return info
        q = res["indicators"]["quote"][0]
        adj = res["indicators"].get("adjclose", [{}])[0].get("adjclose", q["close"])
        df = pd.DataFrame({"date": pd.to_datetime(ts, unit="s").normalize(), "open": q["open"], "high": q["high"],
                           "low": q["low"], "close": q["close"], "adjclose": adj, "volume": q["volume"]})
        for c in ("open", "high", "low", "close", "adjclose", "volume"):
            df[c] = pd.to_numeric(df[c], errors="coerce").astype(float)
        if df["adjclose"].isna().all():
            df["adjclose"] = df["close"]
        df.to_parquet(path)
        ev = res.get("events", {})
        info["splits"] = [(int(v["date"]), v["numerator"], v["denominator"]) for v in ev.get("splits", {}).values()]
        info["divs"] = len(ev.get("dividends", {}))
        return info
    return {"ticker": ticker, "status": "fail"}


def main():
    tk = json.load(open(os.path.join(RAW, "company_tickers_exchange.json")))
    # OTC first (core universe), then the rest
    rows = sorted(tk["data"], key=lambda r: (r[3] != "OTC", r[2]))
    tickers = list(dict.fromkeys(r[2] for r in rows if r[2]))
    if len(sys.argv) > 1 and sys.argv[1].endswith(".txt"):
        tickers = [t.strip() for t in open(sys.argv[1]) if t.strip()]
    elif len(sys.argv) > 1:
        tickers = tickers[: int(sys.argv[1])]
    print("tickers:", len(tickers), flush=True)
    metas = []
    with ThreadPoolExecutor(4) as ex:
        for i, m in enumerate(ex.map(fetch, tickers)):
            if m:
                metas.append(m)
                with open(os.path.join(RAW, "yahoo_meta.jsonl"), "a") as f:
                    f.write(json.dumps(m) + "\n")
            if i % 250 == 0:
                print(i, flush=True)
    print("done", len(metas))


if __name__ == "__main__":
    main()
