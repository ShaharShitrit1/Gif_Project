"""Run every test and write output/results.json for the report.

The PRIMARY METHOD was specified from the literature before looking at backtest results:
  universe  : OTC-traded SEC reporters, avg daily $ volume >= $5k, market cap >= $2M
  avoid     : Red Flag Score <= 2
  quality   : net income > 0, operating cash flow > 0, equity > 0
  value     : rank by earnings yield (E/P), hold the 30 cheapest
  hold      : 12 months, equal weight, rebalance every July 1
Everything else is reported as a variant / robustness check.
"""
import os
import json
import numpy as np
import pandas as pd
from analyze import load, bucket_stats, portfolio, perf, bench
from common import OUT


def red_flags(p):
    sg = p.shares_growth
    r = pd.DataFrame(index=p.index)
    r["R2_pump"] = 3 * p.pump12.astype(int)
    r["R3_dilution"] = np.select([sg >= 1.0, sg >= 0.5], [3, 2], 0)
    r["R4_toxic"] = 3 * p.toxic.astype(int)
    r["R5_distress"] = 2 * ((p.equity < 0) & (p.revenue.fillna(0) < 1e6)).astype(int)
    r["R6_shell"] = 2 * ((p.revenue.fillna(0) < 1e5) & (p.assets < 1e6)).astype(int)
    r["R7_name_change"] = 2 * p.name_change2y.astype(int)
    r["R8_reverse_split"] = 2 * (p.rsplits2y > 0).astype(int)
    r["R9_late_filer"] = 2 * ((p.n_nt > 0) | (p.n_dark > 0)).astype(int)
    r["R10_authorized"] = 1 * ((p.auth_growth >= 1.0) | (p.n_c14 > 0)).astype(int)
    r["R12_resale_reg"] = 1 * (p.n_resale > 0).astype(int)
    return r


def catalysts(p):
    c = pd.DataFrame(index=p.index)
    c["C3_rev_inflection"] = 2 * ((p.revenue >= 5e6) & (p.rev_growth >= 0.5) & (p.gp.fillna(1) > 0)).astype(int)
    c["C4_ocf_turn"] = 2 * ((p.ocf > 0) & (p.ocf_prev < 0)).astype(int)
    c["C5_clean_capital"] = 2 * ((p.shares_growth <= 0.05) & ~p.toxic).astype(int)
    c["C6_activist_13d"] = 2 * (p.n_13d > 0).astype(int)
    c["C7_capital_return"] = 2 * (((p.buyback.fillna(0) > 0) & (p.shares_growth < 0)) | (p.dividends.fillna(0) > 0)).astype(int)
    return c


def dist_stats(s):
    s = s.dropna()
    return dict(n=int(len(s)), mean=float(s.clip(upper=5).mean()), mean_uncapped=float(s.mean()),
                median=float(s.median()), p_up=float((s > 0).mean()), p_double=float((s > 1).mean()),
                p_triple=float((s > 2).mean()), p_halved=float((s < -0.5).mean()), p_wipe=float((s < -0.8).mean()))


def main():
    p = load()
    rf = red_flags(p)
    cf = catalysts(p)
    p["red"] = rf.sum(axis=1)
    p["cat"] = cf.sum(axis=1)
    p["quality"] = p.profitable & (p.equity > 0)
    p["junk"] = (p.ni < 0) & ((p.shares_growth > 0.25) | p.toxic)
    p["is_bank"] = p.sic.isin(["6021", "6022", "6035", "6036"])
    res = {"meta": {"rows": int(len(p)), "companies": int(p.cik.nunique()),
                    "years": [int(p.year.min()), int(p.year.max())],
                    "rows_by_year": {int(k): int(v) for k, v in p.groupby("year").size().items()},
                    "tradable_by_year": {int(k): int(v) for k, v in p[p.tradable].groupby("year").size().items()}}}

    # ---------------------------------------------------------------- base rates
    groups = {
        "all": p.index == p.index,
        "tradable": p.tradable,
        "penny_<$0.10": p.price < 0.10,
        "junk": p.junk,
        "red>=6": p.red >= 6,
        "quality": p.quality,
        "quality_tradable_red<=2": p.quality & p.tradable & (p.red <= 2),
    }
    res["base"] = {k: dist_stats(p.loc[m, "ret12"]) for k, m in groups.items()}

    # ---------------------------------------------------------------- factor buckets
    fb = {}
    fb["price"] = bucket_stats(p, "price", bins=[0, 0.01, 0.1, 1, 5, 1e9], labels=["<1c", "1-10c", "10c-$1", "$1-5", ">$5"])
    fb["mcap"] = bucket_stats(p, "mcap", bins=[0, 5e6, 25e6, 100e6, 500e6, 1e13], labels=["<$5M", "$5-25M", "$25-100M", "$100-500M", ">$500M"])
    fb["dilution"] = bucket_stats(p, "shares_growth", bins=[-1, -0.005, 0.05, 0.25, 1.0, 1e9], labels=["buyback", "0-5%", "5-25%", "25-100%", ">100%"])
    p["prof_bucket"] = np.select([p.profitable, p.ni > 0], ["NI>0 & OCF>0", "NI>0, OCF<=0"], "NI<0")
    fb["profitability"] = bucket_stats(p, "prof_bucket")
    fb["red_flags"] = bucket_stats(p, "red", bins=[-1, 0, 2, 5, 100], labels=["0", "1-2", "3-5", "6+"])
    fb["ep_quintile_profitable"] = bucket_stats(p[p.profitable & p.tradable], "ep", q=5)
    fb["bm_quintile_tradable"] = bucket_stats(p[p.tradable & (p.equity > 0)], "bm", q=5)
    fb["momentum_quintile_tradable"] = bucket_stats(p[p.tradable], "mom12_1", q=5)
    fb["liquidity"] = bucket_stats(p, "dvol", bins=[-1, 1e3, 1e4, 1e5, 1e6, 1e13], labels=["<$1k", "$1-10k", "$10-100k", "$100k-1M", ">$1M"])
    fb["tier"] = bucket_stats(p, "tier")
    fb["fallen_angel"] = bucket_stats(p, "was_listed")
    p["rs"] = p.rsplits2y > 0
    fb["reverse_split_2y"] = bucket_stats(p, "rs")
    fb["pump_last_12m"] = bucket_stats(p, "pump12")
    q = p[p.red <= 2]
    fb["catalyst_score_red<=2"] = bucket_stats(q, "cat", bins=[-1, 0, 2, 4, 100], labels=["0", "2", "4", "6+"])
    res["factors"] = {k: v.reset_index().rename(columns={"b": "bucket"}).astype({"bucket": str}).to_dict("records")
                      for k, v in fb.items()}
    # single red-flag components: mean return with vs without flag
    comp = {}
    for c in rf.columns:
        on = rf[c] > 0
        comp[c] = dict(n_on=int(on.sum()), med_on=float(p.ret12[on].median()), med_off=float(p.ret12[~on].median()),
                       mean_on=float(p.r[on].mean()), mean_off=float(p.r[~on].mean()),
                       wipe_on=float((p.ret12[on] < -0.8).mean()), wipe_off=float((p.ret12[~on] < -0.8).mean()))
    for c in cf.columns:
        on = (cf[c] > 0) & (p.red <= 2)
        off = (cf[c] == 0) & (p.red <= 2)
        comp[c] = dict(n_on=int(on.sum()), med_on=float(p.ret12[on].median()), med_off=float(p.ret12[off].median()),
                       mean_on=float(p.r[on].mean()), mean_off=float(p.r[off].mean()),
                       wipe_on=float((p.ret12[on] < -0.8).mean()), wipe_off=float((p.ret12[off] < -0.8).mean()))
    res["signal_components"] = comp

    # ---------------------------------------------------------------- strategies
    base = p.tradable & (p.red <= 2)
    # METHOD v2 (after reviewing v1 holdings): 2 profitable years, 2-year average earnings,
    # composite value rank (avg-earnings yield + book/price), no GSEs, keep holdings while in top 60.
    # FINAL METHOD: the pre-specified filter + data fixes (no GSEs), composite value rank, buffer
    mf = base & p.quality & ~p.special
    p["frank"] = np.nan
    cand = p[mf]
    p.loc[mf, "frank"] = (cand.groupby("year").ep.rank(pct=True) + cand.groupby("year").bm.rank(pct=True)) / 2
    V2 = dict(mask=mf, top=30, rank_col="frank", buffer=60)
    res["method_definition"] = "tradable (ADV>=$5k, cap>=$2M) & red<=2 & NI>0 & OCF>0 & equity>0 & not GSE; rank avg(pct E/P, pct B/P); top 30; keep while in top 60"
    m2 = mf & (p.ni_prev > 0)
    p["v2rank"] = np.nan
    cand = p[m2]
    p.loc[m2, "v2rank"] = (cand.groupby("year").ep_avg.rank(pct=True) + cand.groupby("year").bm.rank(pct=True)) / 2
    strat_defs = {
        "METHOD (final)": V2,
        "Variant: 2 profitable years, 2y avg E/P": dict(mask=m2, top=30, rank_col="v2rank", buffer=60),
        "Variant: v1 ex-GSE (E/P only)": dict(mask=mf, top=30, rank_col="ep"),
        "METHOD v1: quality + cheapest E/P (top 30)": dict(mask=base & p.quality, top=30, rank_col="ep"),
        "Quality, all (no value rank)": dict(mask=base & p.quality),
        "Quality + cheapest P/B (top 30)": dict(mask=base & p.quality, top=30, rank_col="bm"),
        "Net-nets (MC < NCAV)": dict(mask=p.tradable & (p.ncav >= 1.0)),
        "Net-nets, profitable": dict(mask=p.tradable & (p.ncav >= 1.0) & (p.ni > 0)),
        "Cannibals (buyback, profitable)": dict(mask=base & p.quality & (p.shares_growth < -0.005)),
        "Fallen angels (ex-exchange, OCF>0)": dict(mask=p.tradable & p.was_listed & (p.ocf > 0) & (p.equity > 0)),
        "Cheap banks (P/B<0.8, ROA>0.7%)": dict(mask=p.tradable & p.is_bank & (p.bm >= 1.25) & (p.roa >= 0.007)),
        "Momentum top 30 (tradable)": dict(mask=p.tradable, top=30, rank_col="mom12_1"),
        "All OTC (equal weight)": dict(mask=p.index == p.index),
        "All tradable OTC": dict(mask=p.tradable),
        "Junk (losses + dilution/toxic)": dict(mask=p.junk),
        "Red flags >= 6": dict(mask=p.red >= 6),
    }
    curves, stats = {}, {}
    for name, d in strat_defs.items():
        for cost in (False, True):
            s, n = portfolio(p, d["mask"], name, cost=cost, top=d.get("top"), rank_col=d.get("rank_col"), buffer=d.get("buffer"))
            key = name + (" [net]" if cost else " [gross]")
            st = perf(s)
            st["avg_holdings"] = float(n.mean())
            st["min_holdings"] = int(n.min())
            yearly = s.groupby((s.index - pd.offsets.MonthEnd(6)).year).apply(lambda x: (1 + x).prod() - 1)
            st["yearly"] = {int(k): float(v) for k, v in yearly.items()}
            stats[key] = st
            curves[key] = {str(k.date()): float(v) for k, v in (1 + s).cumprod().items()}
    for b in ("IWM", "SPY"):
        try:
            s = bench(b)
            st = perf(s)
            yearly = s.groupby((s.index - pd.offsets.MonthEnd(6)).year).apply(lambda x: (1 + x).prod() - 1)
            st["yearly"] = {int(k): float(v) for k, v in yearly.items()}
            stats[b] = st
            curves[b] = {str(k.date()): float(v) for k, v in (1 + s).cumprod().items()}
        except Exception as e:
            print("bench fail", b, e)
    res["strategies"] = stats
    res["curves"] = curves

    # sub-period robustness for the method
    def run2(pp=None, **kw):
        args = dict(V2)
        args.update(kw)
        return portfolio(p if pp is None else pp, args.pop("mask"), "m2", cost=True, **args)

    s, _ = run2()
    res["method_subperiods"] = {"2012-2018": perf(s.loc[:"2019-06-30"]), "2019-2026": perf(s.loc["2019-07-01":])}
    # sensitivity: top N and cost multiplier
    sens = {}
    s, _ = portfolio(p, V2["mask"], "g", cost=False, top=30, rank_col="frank", buffer=60)
    sens["gross_no_costs"] = perf(s)["CAGR"]
    sens["base_turnover_costs"] = perf(run2()[0])["CAGR"]
    sens["estimated_spreads_AbdiRanaldo"] = perf(run2(cost_col="cost_est")[0])["CAGR"]
    sens["full_round_trip_every_year"] = perf(run2(cost_model="full")[0])["CAGR"]
    pp = p.copy()
    pp["cost"] = pp["cost"] * 2
    sens["double_costs"] = perf(run2(pp)[0])["CAGR"]
    for N in (10, 20, 50):
        sens[f"top{N}"] = perf(run2(top=N, buffer=2 * N)[0])["CAGR"]
    sens["no_buffer"] = perf(run2(buffer=None)[0])["CAGR"]
    pp = p.copy()
    pp["mrets"] = pp["mrets"].apply(lambda m: [min(x, 0.5) for x in m])
    sens["monthly_gains_capped_50pct"] = perf(run2(pp)[0])["CAGR"]
    sens["no_return_cap"] = perf(run2(cap=None)[0])["CAGR"]
    sens["stricter_liquidity_$25k_ADV_$10M_cap"] = perf(run2(mask=V2["mask"] & (p.dvol >= 25e3) & (p.mcap >= 10e6))[0])["CAGR"]
    sens["banks_only"] = perf(run2(mask=V2["mask"] & p.is_bank)[0])["CAGR"]
    sens["ex_banks"] = perf(run2(mask=V2["mask"] & ~p.is_bank)[0])["CAGR"]
    sens["rank_by_EP_only"] = perf(run2(rank_col="ep")[0])["CAGR"]
    sens["require_2_profitable_years"] = perf(run2(mask=V2["mask"] & (p.ni_prev > 0))[0])["CAGR"]
    sens["rank_by_BM_only"] = perf(run2(rank_col="bm")[0])["CAGR"]
    res["method_sensitivity"] = sens

    # survivorship stress: assume X% of method picks silently died (-100%) each year
    stress = {}
    s0, _ = run2()
    for death in (0.02, 0.05, 0.10):
        adj = s0.copy()
        # spread a -100% loss on `death` share of the book evenly over 12 months
        yearly_factor = (1 - death) ** (1 / 12)
        adj = (1 + adj) * yearly_factor - 1
        stress[f"{int(death*100)}%_die_per_year"] = perf(adj)["CAGR"]
    res["survivorship_stress"] = stress
    res["eligible_per_year"] = {int(k): int(v) for k, v in p[V2["mask"]].groupby("year").size().items()}
    sm = run2()[0]
    res["method_vs_iwm_corr"] = float(pd.concat([sm, bench("IWM")], axis=1).dropna().corr().iloc[0, 1])

    # ---------------------------------------------------------------- rockets: where do 3x stocks come from?
    p["rocket"] = p.ret12 > 2.0
    base_rate = p.rocket.mean()
    lifts = {}
    for name, m in {"penny <$0.10": p.price < 0.10, "junk": p.junk, "red>=6": p.red >= 6,
                    "quality": p.quality, "quality & red<=2 & tradable": p.quality & (p.red <= 2) & p.tradable,
                    "pump in last 12m": p.pump12, "catalyst>=4 & red<=2": (p.cat >= 4) & (p.red <= 2),
                    "MC < $5M": p.mcap < 5e6, "revenue inflection": cf.C3_rev_inflection > 0,
                    "OCF turned positive": cf.C4_ocf_turn > 0}.items():
        sub = p[m]
        lifts[name] = dict(n=int(len(sub)), p_rocket=float(sub.rocket.mean()), lift=float(sub.rocket.mean() / base_rate),
                           p_wipe=float((sub.ret12 < -0.8).mean()), median=float(sub.ret12.median()),
                           mean_capped=float(sub.r.mean()))
    res["rockets"] = {"base_rate": float(base_rate), "groups": lifts}

    # uplisting prediction: who uplists in the next 12 months?
    up = {}
    for name, m in {"all": p.index == p.index, "quality & equity>$5M": p.quality & (p.equity > 5e6),
                    "junk": p.junk, "price>$1 & equity>$5M": (p.price > 1) & (p.equity > 5e6)}.items():
        up[name] = dict(n=int(m.sum()), p_uplist_12m=float(p.loc[m, "uplist12"].mean()),
                        median_ret_if_uplist=float(p.loc[m & p.uplist12, "ret12"].median()) if (m & p.uplist12).any() else None)
    res["uplist_prediction"] = up

    # yearly holdings of the method (for transparency)
    from analyze import select
    hold = select(p, V2["mask"], 30, "frank", False, 60)
    res["method_holdings"] = {int(y): g[["ticker", "name", "ep_avg", "bm", "mcap", "ret12", "is_bank"]].round(4).to_dict("records")
                              for y, g in hold.items()}
    turn = []
    prev = None
    for y, g in hold.items():
        cur = set(g.cik)
        if prev:
            turn.append(len(cur - prev) / max(len(cur), 1))
        prev = cur
    res["method_turnover"] = float(np.mean(turn)) if turn else None
    res["method_bank_share"] = float(pd.concat(hold.values()).is_bank.mean())
    json.dump(res, open(os.path.join(OUT, "results.json"), "w"), default=float, indent=1)
    p.drop(columns=["mrets"]).to_parquet(os.path.join(OUT, "panel_scored.parquet"))
    # console summary
    print(pd.DataFrame(res["base"]).T.round(3).to_string())
    print(pd.DataFrame({k: {m: v.get(m) for m in ("CAGR", "maxDD", "sharpe", "worst_year", "avg_holdings")}
                        for k, v in stats.items()}).T.round(3).to_string())
    for k, v in fb.items():
        print("\n==", k)
        print(v.round(3).to_string())
    print(json.dumps(res["method_sensitivity"], indent=1))
    print(json.dumps(res["survivorship_stress"], indent=1))
    print(json.dumps(res["rockets"], indent=1))
    print(json.dumps(res["uplist_prediction"], indent=1))
    print(pd.DataFrame(comp).T.round(3).to_string())


if __name__ == "__main__":
    main()
