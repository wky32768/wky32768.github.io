"""Refresh public Douban records and a complete Top250 snapshot.

Usage: python scripts/update_douban.py (requires beautifulsoup4).
No cookies or account credentials are used. Any incomplete refresh leaves the
previous JSON untouched. Book editions are matched by exact subject ID.
"""
import json
import re
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
UID = '257515089'


def page(url):
    print('Reading ' + url, flush=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.douban.com/'})
    with urllib.request.urlopen(req, timeout=25) as response:
        soup = BeautifulSoup(response.read().decode('utf-8'), 'html.parser')
    time.sleep(0.5)
    return soup


def subject(link):
    match = re.search(r'/subject/(\d+)', link.get('href', ''))
    if not match:
        raise ValueError('Missing subject ID')
    return match.group(1)


def collect(kind):
    base = f'https://{kind}.douban.com'
    records = []
    expected = None
    start = 0
    while expected is None or start < expected:
        soup = page(f'{base}/people/{UID}/collect?start={start}&sort=time&mode=grid')
        if expected is None:
            heading = soup.select_one('h1')
            match = re.search(r'\((\d+)\)', heading.get_text() if heading else '')
            if not match:
                raise ValueError('Collection total unavailable')
            expected = int(match.group(1))
        items = soup.select('.grid-view .item') if kind == 'movie' else soup.select('.subject-item')
        if not items and expected:
            raise ValueError('Collection page missing')
        for item in items:
            link = item.select_one('.title a') if kind == 'movie' else item.select_one('h2 a')
            if link is None:
                raise ValueError('Collection title missing')
            rating = item.select_one('[class*="rating"]')
            match = re.search(r'rating(\d)-t', ' '.join(rating.get('class', []))) if rating else None
            records.append({'id': subject(link), 'title': link.get_text(' ', strip=True),
                            'rating': int(match.group(1)) if match else None})
        start += len(items)
        if not items:
            break
    if len(records) != expected or len({r['id'] for r in records}) != expected:
        raise ValueError('Collection count mismatch')
    return records


def ranking(kind):
    entries = []
    for start in range(0, 250, 25):
        soup = page(f'https://{kind}.douban.com/top250?start={start}')
        items = soup.select('.grid_view .item') if kind == 'movie' else soup.select('tr.item')
        if len(items) != 25:
            raise ValueError('Incomplete Top250 page')
        for item in items:
            link = item.select_one('.hd a') if kind == 'movie' else item.select_one('.pl2 a')
            title = item.select_one('.title').get_text(strip=True) if kind == 'movie' else link.get('title', link.get_text(strip=True))
            entries.append({'id': subject(link), 'title': title, 'rank': len(entries) + 1})
    if len({r['id'] for r in entries}) != 250:
        raise ValueError('Duplicate ranking IDs')
    return entries


def main():
    output = {'user_id': UID, 'updated_at': datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(timespec='seconds'), 'categories': {}}
    for kind in ('movie', 'book'):
        records = collect(kind)
        top = ranking(kind)
        output['categories'][kind] = {'records': records, 'top250': top}
    target = ROOT / 'assets' / 'douban.json'
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(target)
    print('Saved complete snapshot.', flush=True)


if __name__ == '__main__':
    main()
