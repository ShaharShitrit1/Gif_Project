"""Walk-forward machine-learning ranker (out-of-sample only).

For each test year Y, train a gradient-boosting classifier on formation years <= Y-1 (their
12-month returns end on July 1 of Y, so they are known at formation) and predict
P(top-quintile return) for year Y. Then hold the top-30 predicted stocks (tradable only).
Features are characteristics observable at formation; no forward information.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from analyze import load, portfolio, perf

FEATS = ["ep", "bm", "ncav", "cash_mc", "roa", "shares_growth", "rev_growth", "mom12_1", "ret1m", "vol",
         "dvol", "zero_days", "mcap", "price", "rsplits2y", "shy", "profitable", "toxic", "was_listed"]


def prep(p):
    X = p[FEATS].copy()
    for c in ["dvol", "mcap", "price"]:
        X[c] = np.log10(X[c].clip(lower=1e-6))
    for c in ["profitable", "toxic", "was_listed"]:
        X[c] = X[c].astype(float)
    for c in ["ep", "bm", "ncav", "cash_mc", "roa", "shares_growth", "rev_growth", "mom12_1", "ret1m", "shy"]:
        X[c] = X[c].clip(X[c].quantile(0.01), X[c].quantile(0.99))
    return X


def run(p, start=2016, top=30):
    p = p.copy()
    X = prep(p)
    # label: top-quintile 12m return within its year
    p["y"] = p.groupby("year").ret12.transform(lambda s: s.rank(pct=True) >= 0.8).astype(int)
    p["score"] = np.nan
    for Y in range(start, p.year.max() + 1):
        tr = p.year <= Y - 1  # formation Y-1 returns are known on July 1 of Y
        te = p.year == Y
        clf = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=200,
                                             min_samples_leaf=50, l2_regularization=1.0, random_state=0)
        clf.fit(X[tr], p.loc[tr, "y"])
        p.loc[te, "score"] = clf.predict_proba(X[te])[:, 1]
    return p


if __name__ == "__main__":
    import json, os
    from run_all import red_flags
    from analyze import bench
    from common import OUT
    p = load()
    p["red"] = red_flags(p).sum(axis=1)
    for c in ["pump12", "name_change2y"]:
        p[c] = p[c].astype(float)
    FEATS += ["red", "n_13d", "n_nt", "n_resale", "pump12", "name_change2y"]
    q = run(p, start=2016)
    inv = q.tradable & ~q.special & q.score.notna()
    out = {}
    for cost in (False, True):
        s, _ = portfolio(q, inv, "ml", cost=cost, top=30, rank_col="score", buffer=60)
        out["ml_top30_" + ("net" if cost else "gross")] = perf(s)
    qq = q[inv].copy()
    qq["quint"] = qq.groupby("year").score.transform(lambda s: pd.qcut(s.rank(method="first"), 5, labels=False) + 1)
    out["quintiles"] = qq.groupby("quint").agg(mean_capped=("r", "mean"), median=("ret12", "median"),
                                              p_halved=("ret12", lambda s: (s < -0.5).mean()), n=("r", "size")).reset_index().to_dict("records")
    p["quality"] = p.profitable & (p.equity > 0)
    mf = p.tradable & (p.red <= 2) & p.quality & ~p.special
    s, _ = portfolio(p, mf, "rules", cost=True, top=30, rank_col="bm", buffer=60)
    out["rules_same_window_net"] = perf(s.loc["2016-07-01":])
    out["iwm_same_window"] = perf(bench("IWM").loc["2016-07-01":])
    json.dump(out, open(os.path.join(OUT, "ml.json"), "w"), default=float, indent=1)
    print({k: (round(v["CAGR"], 3) if isinstance(v, dict) and "CAGR" in v else v) for k, v in out.items()})
