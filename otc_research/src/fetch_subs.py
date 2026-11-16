"""Download EDGAR submissions JSON (filing history) for every CIK with a current ticker.

Keeps a compact per-company table of filings: form, filingDate, accessionNumber, reportDate.
For companies whose 'recent' block is truncated (1000 filings) we also fetch the older pages,
so 8-A12B (exchange listing) / 25-NSE (delisting) history is complete.
Output: data/raw/filings.parquet and data/raw/companies.parquet
"""
import os
import json
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
from common import sec_get, RAW, SUBS

KEEP_FORMS = None  # keep all; compact anyway


def get_company(cik):
    path = os.path.join(SUBS, f"{cik}.json")
    if os.path.exists(path):
        return json.load(open(path))
    r = sec_get(f"https://data.sec.gov/submissions/CIK{cik:010d}.json")
    if r is None:
        return None
    d = r.json()
    rec = d.get("filings", {}).get("recent", {})
    cols = ["form", "filingDate", "accessionNumber", "reportDate"]
    filings = [list(x) for x in zip(*[rec.get(c, []) for c in cols])]
    for f in d.get("filings", {}).get("files", []):
        r2 = sec_get("https://data.sec.gov/submissions/" + f["name"])
        if r2 is None:
            continue
        d2 = r2.json()
        filings += [list(x) for x in zip(*[d2.get(c, []) for c in cols])]
    out = {
        "cik": cik,
        "name": d.get("name"),
        "tickers": d.get("tickers"),
        "exchanges": d.get("exchanges"),
        "sic": d.get("sic"),
        "sicDescription": d.get("sicDescription"),
        "category": d.get("category"),
        "stateOfIncorporation": d.get("stateOfIncorporation"),
        "fiscalYearEnd": d.get("fiscalYearEnd"),
        "formerNames": d.get("formerNames"),
        "filings": filings,
    }
    json.dump(out, open(path, "w"))
    return out


def main():
    tk = json.load(open(os.path.join(RAW, "company_tickers_exchange.json")))
    ciks = sorted({r[0] for r in tk["data"]})
    print("ciks:", len(ciks), flush=True)
    comps, fil = [], []
    with ThreadPoolExecutor(8) as ex:
        for i, d in enumerate(ex.map(get_company, ciks)):
            if i % 500 == 0:
                print(i, flush=True)
            if not d:
                continue
            comps.append({k: v for k, v in d.items() if k != "filings"})
            for f in d["filings"]:
                fil.append((d["cik"], *f))
    cdf = pd.DataFrame(comps)
    for c in ("tickers", "exchanges", "formerNames"):
        cdf[c] = cdf[c].apply(json.dumps)
    cdf.to_parquet(os.path.join(RAW, "companies.parquet"))
    fdf = pd.DataFrame(fil, columns=["cik", "form", "filingDate", "accn", "reportDate"])
    fdf.to_parquet(os.path.join(RAW, "filings.parquet"))
    print(len(cdf), len(fdf))


if __name__ == "__main__":
    main()
