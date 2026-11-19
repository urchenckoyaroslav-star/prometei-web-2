"""Build weekly ballots from the Music section of country charts."""
import concurrent.futures
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

regions = {"us": ["us"], "latam": ["mx","br","ar","co"], "eu": ["uk","de","fr","es"]}
def country(code):
    if "--local" in sys.argv:
        page = Path("/tmp/tr_"+code).read_text()
    else:
        with urllib.request.urlopen("https://kworb.net/youtube/trending/"+code+".html", timeout=25) as res:
            page = res.read().decode()
    music = page.split('<div class="music"',1)[1].split('</table>',1)[0]
    rows = re.findall(r'watch\?v=([\w-]{11})">([^<]+)</a>',music)
    return code, [(vid, html.unescape(title).strip()) for vid,title in rows]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    charts = dict(pool.map(country, [cc for group in regions.values() for cc in group]))
catalog = {}
for region,countries in regions.items():
    scores, titles = {}, {}
    for cc in countries:
        for rank,(vid,title) in enumerate(charts[cc][:50],1):
            scores[vid] = scores.get(vid,0) + 51-rank
            titles[vid] = title
    selected = sorted(scores,key=lambda vid:(-scores[vid],vid))[:20]
    if len(selected)!=20: raise ValueError("Incomplete chart: "+region)
    catalog[region]=[{"id":vid,"title":titles[vid]} for vid in selected]
Path("fm-ballot.json").write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+"\n")
