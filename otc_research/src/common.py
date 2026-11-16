"""Shared helpers: paths, polite HTTP session for SEC + Yahoo."""
import os
import time
import threading
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
RAW = os.path.join(DATA, "raw")
PRICES = os.path.join(DATA, "prices")
SUBS = os.path.join(DATA, "subs")
OUT = os.path.join(ROOT, "output")
for d in (DATA, RAW, PRICES, SUBS, OUT):
    os.makedirs(d, exist_ok=True)

# SEC asks automated clients to identify themselves; generic placeholder contact.
SEC_UA = "OTC research script research@example.com"
YH_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


class RateLimiter:
    def __init__(self, per_sec):
        self.min_gap = 1.0 / per_sec
        self.lock = threading.Lock()
        self.last = 0.0

    def wait(self):
        with self.lock:
            now = time.time()
            gap = self.last + self.min_gap - now
            if gap > 0:
                time.sleep(gap)
            self.last = time.time()


_sec_rl = RateLimiter(8)
_sec_sess = threading.local()


def sec_get(url, retries=5):
    s = getattr(_sec_sess, "s", None)
    if s is None:
        s = requests.Session()
        s.headers.update({"User-Agent": SEC_UA, "Accept-Encoding": "gzip, deflate"})
        _sec_sess.s = s
    for i in range(retries):
        _sec_rl.wait()
        try:
            r = s.get(url, timeout=60)
            if r.status_code == 200:
                return r
            if r.status_code == 404:
                return None
            time.sleep(2 * (i + 1))
        except requests.RequestException:
            time.sleep(2 * (i + 1))
    return None
