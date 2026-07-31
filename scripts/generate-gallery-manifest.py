from pathlib import Path
import json
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SERVICES = ROOT / 'assets' / 'images' / 'services'
OUT = ROOT / 'assets' / 'data' / 'galleries.json'
EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'}

files = [
    p for p in sorted(SERVICES.iterdir(), key=lambda x: x.name.lower())
    if p.is_file() and p.suffix.lower() in EXTS
]

images = []
for f in files:
    rel = f.relative_to(ROOT).as_posix()
    url = '/' + '/'.join(quote(part) for part in rel.split('/'))
    name = f.stem.replace('-', ' ').replace('_', ' ').title()
    images.append({'url': url, 'name': name})

galleries = [{
    'slug': 'services',
    'title': 'Our Service Work',
    'icon': '★',
    'count': len(images),
    'cover': images[0]['url'] if images else None,
    'images': images
}]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({'generated': True, 'galleries': galleries}, indent=2) + '\n')
print(f'Wrote {OUT} with {len(images)} service photos')
