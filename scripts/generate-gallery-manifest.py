from pathlib import Path
import json
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SERVICES = ROOT / 'assets' / 'images' / 'services'
OUT = ROOT / 'assets' / 'data' / 'galleries.json'
EXTS = {'.jpg','.jpeg','.png','.webp','.gif','.avif','.svg'}
TITLES = {
 'home-cleanouts':'Home Cleanouts','furniture-removal':'Furniture Removal',
 'construction-debris':'Construction Debris','yard-and-outdoor-debris':'Yard & Outdoor Debris',
 'appliances-and-heavy-items':'Appliances & Heavy Items','business-and-office':'Business & Office',
 'estate-cleanouts':'Estate Cleanouts','sheds-and-small-structures':'Sheds & Small Structures'
}
ICON = {
 'home-cleanouts':'⌂','furniture-removal':'▱','construction-debris':'▧','yard-and-outdoor-debris':'♧',
 'appliances-and-heavy-items':'▣','business-and-office':'▤','estate-cleanouts':'◇','sheds-and-small-structures':'△'
}
items=[]
for folder in sorted([p for p in SERVICES.iterdir() if p.is_dir()]):
    files=[p for p in sorted(folder.iterdir(), key=lambda x:x.name.lower()) if p.is_file() and p.suffix.lower() in EXTS]
    images=[]
    for f in files:
        rel=f.relative_to(ROOT).as_posix()
        url='/' + '/'.join(quote(part) for part in rel.split('/'))
        images.append({'url':url,'name':f.stem.replace('-',' ').replace('_',' ').title()})
    items.append({'slug':folder.name,'title':TITLES.get(folder.name,folder.name.replace('-',' ').title()),'icon':ICON.get(folder.name,'•'),'count':len(images),'cover':images[0]['url'] if images else None,'images':images})
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps({'generated':True,'galleries':items},indent=2)+"\n")
print(f'Wrote {OUT} with {len(items)} galleries')
