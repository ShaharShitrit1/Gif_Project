import re
import json
import html

# numeric ranges like 2012–2019, 0–5%, $1K–10K flip order inside RTL text; isolate them as LTR runs
RANGE = re.compile(r"(\$?\d[\d,.]*[%¢KMBx]?\s?–\s?\$?\d[\d,.]*[%¢KMBx+]?)")


def wrap_ranges(text):
    return RANGE.sub(r'<span class="num">\1</span>', text)


def fix_bidi(markup):
    """Apply wrap_ranges to text between tags only (never inside tags/attributes)."""
    parts = re.split(r"(<[^>]+>)", markup)
    return "".join(p if p.startswith("<") else wrap_ranges(p) for p in parts)


def pct(v, d=0, sign=True):
    if v is None or v != v:
        return "–"
    s = f"{v*100:.{d}f}%"
    return ("+" + s) if (sign and v > 0) else s


def money(v):
    if v is None or v != v:
        return "–"
    a = abs(v)
    if a >= 1e9:
        return f"${v/1e9:.1f}B"
    if a >= 1e6:
        return f"${v/1e6:.1f}M"
    if a >= 1e3:
        return f"${v/1e3:.0f}K"
    return f"${v:.0f}"


def cls(v):
    return "pos-t" if v is not None and v == v and v > 0 else ("neg-t" if v is not None and v == v and v < 0 else "")


def bars_div(rows, fmt="s", color="--pos"):
    """rows: list of dict(l=label, v=value, d=decimals, t=tooltip)"""
    rows = [dict(r, l=wrap_ranges(r["l"])) for r in rows]
    data = html.escape(json.dumps(rows, ensure_ascii=False), quote=True)
    return f'<div class="bars" data-bars data-fmt="{fmt}" data-color="{color}" data-rows="{data}"></div>'


def table(headers, rows, hl=None, num_cols=None):
    """rows: list of lists (already formatted strings). num_cols: indices rendered as numbers."""
    num_cols = set(num_cols or [])
    h = "".join(f"<th>{x}</th>" for x in headers)
    body = []
    for i, r in enumerate(rows):
        tds = "".join(f'<td class="n">{c}</td>' if j in num_cols else f"<td>{c}</td>" for j, c in enumerate(r))
        body.append(f'<tr class="{"hl" if hl and i in hl else ""}">{tds}</tr>')
    return f'<div class="tablewrap"><table><thead><tr>{h}</tr></thead><tbody>{"".join(body)}</tbody></table></div>'


def curve_series(curves, key, name, short, color, w=2, dash=False):
    c = curves[key]
    pts = [[d, v] for d, v in c.items()]
    return dict(name=name, short=short, c=color, w=w, dash=dash, pts=pts)


def align(series_list, start="2012-06"):
    """Align all series on their common months and prepend a 1.0 starting point."""
    common = None
    for s in series_list:
        ds = {p[0][:7] for p in s["pts"]}
        common = ds if common is None else common & ds
    common = sorted(common)
    for s in series_list:
        m = {p[0][:7]: p[1] for p in s["pts"]}
        s["pts"] = [[start, 1.0]] + [[d, m[d]] for d in common]
    return series_list
