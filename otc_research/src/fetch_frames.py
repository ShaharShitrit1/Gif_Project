"""Download SEC XBRL 'frames': one cross-section of every filer per concept per period.

Annual duration concepts use CY{Y}; balance-sheet instants use CY{Y}Q4I.
Output: data/raw/frames.parquet with columns
  concept, period, cik, entity, end, val, accn
"""
import os
import json
import pandas as pd
from concurrent.futures import ThreadPoolExecutor
from common import sec_get, RAW

YEARS = range(2009, pd.Timestamp.now().year)  # through last calendar year

DURATION = {
    "us-gaap": {
        "USD": ["NetIncomeLoss", "Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
                 "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax",
                 "SalesRevenueGoodsNet", "RevenuesNetOfInterestExpense", "OperatingIncomeLoss", "GrossProfit",
                 "NetCashProvidedByUsedInOperatingActivities",
                 "PaymentsForRepurchaseOfCommonStock", "ProceedsFromIssuanceOfCommonStock",
                 "PaymentsOfDividends", "PaymentsOfDividendsCommonStock",
                 "ProceedsFromConvertibleDebt", "AmortizationOfDebtDiscountPremium"],
        "shares": ["WeightedAverageNumberOfSharesOutstandingBasic"],
    }
}
INSTANT = {
    "us-gaap": {
        "USD": ["Assets", "Liabilities", "StockholdersEquity", "AssetsCurrent", "LiabilitiesCurrent",
                 "CashAndCashEquivalentsAtCarryingValue", "RetainedEarningsAccumulatedDeficit",
                 "ConvertibleNotesPayableCurrent", "DerivativeLiabilitiesCurrent", "LongTermDebtNoncurrent"],
        "shares": ["CommonStockSharesOutstanding", "CommonStockSharesAuthorized"],
    },
    "dei": {"shares": ["EntityCommonStockSharesOutstanding"]},
}


def jobs():
    for y in YEARS:
        for tax, units in DURATION.items():
            for unit, concepts in units.items():
                for c in concepts:
                    yield tax, c, unit, f"CY{y}"
        for tax, units in INSTANT.items():
            for unit, concepts in units.items():
                for c in concepts:
                    yield tax, c, unit, f"CY{y}Q4I"


def fetch(job):
    tax, c, unit, per = job
    url = f"https://data.sec.gov/api/xbrl/frames/{tax}/{c}/{unit}/{per}.json"
    r = sec_get(url)
    if r is None:
        return []
    d = r.json()
    return [(c, per, x["cik"], x.get("entityName"), x.get("end"), x["val"], x.get("accn")) for x in d.get("data", [])]


def main():
    js = list(jobs())
    print("frame requests:", len(js))
    rows = []
    with ThreadPoolExecutor(6) as ex:
        for i, res in enumerate(ex.map(fetch, js)):
            rows.extend(res)
            if i % 50 == 0:
                print(i, len(rows), flush=True)
    df = pd.DataFrame(rows, columns=["concept", "period", "cik", "entity", "end", "val", "accn"])
    df.to_parquet(os.path.join(RAW, "frames.parquet"))
    print(df.groupby("concept").size())


if __name__ == "__main__":
    main()
