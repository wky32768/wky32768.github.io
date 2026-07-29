#!/usr/bin/env python3
"""Fetch live Bilibili / Google Scholar numbers into assets/stats.json.

Run by .github/workflows/update-stats.yml (weekly). Standard library only.

Design rule: never lose data. Every section is written independently, and a
section that fails to refresh keeps its previous value together with its own
(older) `updated_at`, so the site shows a slightly stale number rather than a
blank. The script only exits non-zero if *nothing* could be refreshed.
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.cookiejar import CookieJar
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "stats.json"

BILIBILI_UID = os.environ.get("BILIBILI_UID", "220871609")
BILIBILI_SEASON_ID = os.environ.get("BILIBILI_SEASON_ID", "1560464")
BILIBILI_FEATURED_BVID = os.environ.get("BILIBILI_FEATURED_BVID", "BV18J3ezoEEj")
SCHOLAR_ID = os.environ.get("SCHOLAR_ID", "U_e6LikAAAAJ")

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# Bilibili applies risk control (code -352) to bare API calls, so requests go
# through a cookie jar primed by a visit to the main site.
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(msg):
    print(msg, flush=True)


def get(url, referer=None, timeout=20):
    headers = {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "*/*",
    }
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with opener.open(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", "replace")


def get_json(url, referer=None):
    """GET a Bilibili endpoint, retrying through risk control (code -352)."""
    last = None
    for attempt in range(4):
        try:
            data = json.loads(get(url, referer=referer))
            if data.get("code") == 0:
                return data["data"]
            last = f"code={data.get('code')} message={data.get('message')!r}"
        except (urllib.error.URLError, ValueError, KeyError, TimeoutError) as exc:
            last = repr(exc)
        time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"{url} failed: {last}")


def warm_up():
    try:
        get("https://www.bilibili.com/")
    except Exception as exc:  # noqa: BLE001 - warm-up is best effort
        log(f"  bilibili warm-up failed (continuing): {exc!r}")


def fetch_bilibili():
    warm_up()
    space = f"https://space.bilibili.com/{BILIBILI_UID}"

    stat = get_json(
        f"https://api.bilibili.com/x/relation/stat?vmid={BILIBILI_UID}", referer=space
    )
    result = {
        "uid": BILIBILI_UID,
        "url": space,
        "follower": int(stat["follower"]),
        "updated_at": now(),
    }

    # Season (collection) archives: 30 per page is the accepted maximum.
    videos, views, featured = 0, 0, None
    page = 1
    while True:
        data = get_json(
            "https://api.bilibili.com/x/polymer/web-space/seasons_archives_list"
            f"?mid={BILIBILI_UID}&season_id={BILIBILI_SEASON_ID}"
            f"&sort_reverse=false&page_num={page}&page_size=30",
            referer=space,
        )
        archives = data.get("archives") or []
        for item in archives:
            videos += 1
            views += int(item["stat"]["view"])
            if item.get("bvid") == BILIBILI_FEATURED_BVID:
                featured = {
                    "bvid": item["bvid"],
                    "title": item.get("title", ""),
                    "views": int(item["stat"]["view"]),
                }
        meta = data.get("page") or {}
        total = int(meta.get("total", videos))
        if videos >= total or not archives:
            break
        page += 1
        time.sleep(1)

    result["collection"] = {
        "season_id": BILIBILI_SEASON_ID,
        "url": f"{space}/lists/{BILIBILI_SEASON_ID}?type=season",
        "videos": videos,
        "views": views,
    }
    if featured:
        result["featured"] = featured
    log(f"  bilibili: {result['follower']} followers, {videos} videos, {views} views")
    return result


def scholar_via_serpapi():
    """Optional fallback used only when the SERPAPI_KEY secret is configured.
    A weekly run costs 4 searches/month, inside SerpApi's free tier."""
    key = os.environ.get("SERPAPI_KEY")
    if not key:
        return None
    raw = get(
        "https://serpapi.com/search.json"
        f"?engine=google_scholar_author&author_id={SCHOLAR_ID}&hl=en&api_key={key}",
        timeout=60,
    )
    table = json.loads(raw)["cited_by"]["table"]
    flat = {k: v for row in table for k, v in row.items()}

    def cell(metric, recent=False):
        row = flat[metric]
        if not recent:
            return int(row["all"])
        # The 5-year column is keyed by the actual year ("since_2021" in 2026),
        # so it rolls over every January - never hard-code it.
        since = next(k for k in row if k.startswith("since_"))
        return int(row[since])

    return {
        "id": SCHOLAR_ID,
        "url": f"https://scholar.google.com/citations?hl=en&user={SCHOLAR_ID}",
        "citations": cell("citations"),
        "citations_5y": cell("citations", recent=True),
        "h_index": cell("h_index"),
        "h_index_5y": cell("h_index", recent=True),
        "i10_index": cell("i10_index"),
        "i10_index_5y": cell("i10_index", recent=True),
        "updated_at": now(),
    }


def fetch_scholar():
    """Scrape the public profile. Google rate-limits aggressively; the caller
    keeps the previous value when every attempt fails."""
    url = (
        "https://scholar.google.com/citations"
        f"?user={SCHOLAR_ID}&hl=en&view_op=list_works&sortby=pubdate"
    )
    html = None
    last = None
    for attempt in range(4):
        try:
            html = get(url, referer="https://scholar.google.com/", timeout=30)
            if "gsc_rsb_std" in html:
                break
            last = "profile table not present (likely a captcha / rate limit page)"
            html = None
        except urllib.error.HTTPError as exc:
            last = repr(exc)
            # A redirect to /sorry/index is Google's captcha wall for low-reputation
            # (datacenter / VPN) exit IPs. Retrying can never clear it, so stop and
            # let the caller fall back instead of burning runner minutes.
            if exc.code == 429 or "/sorry/" in exc.url:
                log("  google served its captcha wall (/sorry) - not retryable")
                break
        except (urllib.error.URLError, TimeoutError) as exc:
            last = repr(exc)
        time.sleep(10 * (attempt + 1))
    if html is None:
        try:
            fallback = scholar_via_serpapi()
        except Exception as exc:  # noqa: BLE001 - report the original block too
            log(f"  serpapi fallback failed: {exc!r}")
            fallback = None
        if fallback:
            log(f"  scholar via serpapi: {fallback['citations']} citations")
            return fallback
        raise RuntimeError(f"google scholar failed: {last}")

    # The summary table is six cells: citations/h-index/i10, all-time then 5-year.
    cells = [int(n) for n in re.findall(r'class="gsc_rsb_std">(\d+)<', html)]
    if len(cells) < 6:
        raise RuntimeError(f"unexpected scholar table: {cells}")

    result = {
        "id": SCHOLAR_ID,
        "url": f"https://scholar.google.com/citations?hl=en&user={SCHOLAR_ID}",
        "citations": cells[0],
        "citations_5y": cells[1],
        "h_index": cells[2],
        "h_index_5y": cells[3],
        "i10_index": cells[4],
        "i10_index_5y": cells[5],
        "updated_at": now(),
    }
    log(f"  scholar: {result['citations']} citations, h-index {result['h_index']}")
    return result


def main():
    previous = {}
    if OUT.exists():
        try:
            previous = json.loads(OUT.read_text(encoding="utf-8"))
        except ValueError:
            log("existing stats.json is not valid JSON, rebuilding from scratch")

    stats = {}
    ok = []
    for key, fetcher in (("bilibili", fetch_bilibili), ("scholar", fetch_scholar)):
        log(f"fetching {key}...")
        try:
            fresh = fetcher()
            old = previous.get(key)
            # `updated_at` tracks when a number last *moved*, so an unchanged
            # week produces an identical file and therefore no commit at all.
            if old and {k: v for k, v in old.items() if k != "updated_at"} == {
                k: v for k, v in fresh.items() if k != "updated_at"
            }:
                fresh["updated_at"] = old["updated_at"]
                log("  unchanged since last run")
            stats[key] = fresh
            ok.append(key)
        except Exception as exc:  # noqa: BLE001 - one source must not sink the run
            log(f"  !! {key} failed: {exc}")
            if key in previous:
                stats[key] = previous[key]
                log(f"  -> keeping previous {key} value from {previous[key].get('updated_at')}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(stats, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log(f"wrote {OUT.relative_to(ROOT)} (refreshed: {', '.join(ok) or 'nothing'})")

    if not ok:
        sys.exit("every source failed")


if __name__ == "__main__":
    main()
