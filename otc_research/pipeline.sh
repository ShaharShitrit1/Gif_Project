#!/usr/bin/env bash
# OTC research pipeline.
#   ./pipeline.sh offline   rebuild the live screen + report from cached data (no downloads, ~2 min)
#   ./pipeline.sh live      refresh OTC prices + OTC filing histories + SEC financials, then screen + report (~30-45 min)
#   ./pipeline.sh full      refresh everything and rerun the whole backtest, events, ML, screen and report (~60-90 min)
# Downloads are polite: SEC <= 8 req/s with a generic User-Agent, Yahoo ~2 req/s with backoff on HTTP 429.
set -euo pipefail
MODE="${1:-offline}"
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/src"
LOG="$HERE/data/pipeline.log"
mkdir -p "$HERE/data/raw" "$HERE/output"
step() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

refresh_tickers() {
  step "SEC ticker/exchange list"
  curl -sS -A "OTC research script research@example.com" https://www.sec.gov/files/company_tickers_exchange.json -o ../data/raw/company_tickers_exchange.json
  python3 -c "
import json; d=json.load(open('../data/raw/company_tickers_exchange.json'))
t=[r[2] for r in d['data'] if r[3]=='OTC' and r[2]]
open('../data/otc_tickers.txt','w').write('\n'.join(list(dict.fromkeys(t))+['IWM','SPY']))
print(len(t),'OTC tickers')"
}

case "$MODE" in
  offline)
    ;;
  live)
    refresh_tickers
    step "SEC XBRL frames (all filers, all years)"; python3 fetch_frames.py >> "$LOG" 2>&1
    step "filing histories of OTC companies (cache older than 7 days)"; MAX_AGE_DAYS=7 python3 fetch_subs.py otc >> "$LOG" 2>&1
    step "prices of OTC tickers + benchmarks (files older than 1 day)"; MAX_AGE_DAYS=1 python3 fetch_prices.py ../data/otc_tickers.txt >> "$LOG" 2>&1
    ;;
  full)
    refresh_tickers
    step "SEC XBRL frames"; python3 fetch_frames.py >> "$LOG" 2>&1
    step "filing histories, all companies (cache older than 7 days)"; MAX_AGE_DAYS=7 python3 fetch_subs.py >> "$LOG" 2>&1
    step "prices of OTC tickers + benchmarks"; MAX_AGE_DAYS=1 python3 fetch_prices.py ../data/otc_tickers.txt >> "$LOG" 2>&1
    step "prices of uplisted companies"; python3 extra_tickers.py >> "$LOG" 2>&1
    MAX_AGE_DAYS=1 python3 fetch_prices.py ../data/extra_tickers.txt >> "$LOG" 2>&1
    step "survival analysis"; python3 survival.py >> "$LOG" 2>&1
    step "event studies (writes confirmed uplistings)"; python3 events.py >> "$LOG" 2>&1
    step "historical panel"; python3 build_universe.py >> "$LOG" 2>&1
    step "backtests"; python3 run_all.py >> "$LOG" 2>&1
    step "walk-forward ML"; python3 ml.py >> "$LOG" 2>&1
    ;;
  *) echo "usage: $0 offline|live|full"; exit 2 ;;
esac

step "live universe"; python3 build_universe.py --live >> "$LOG" 2>&1
step "screen"; python3 screen_now.py | tee -a "$LOG" | sed -n '1,45p'
step "report"; python3 make_report.py | tee -a "$LOG"
step "done: output/report.html, output/screen_now.csv, output/results.json"
