#!/usr/bin/env python3
"""Generate assets/data/galleries.json from service image folders."""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
SERVICES = ROOT / "assets" / "images" / "services"
OUT_DIR = ROOT / "assets" / "data"
OUT_FILE = OUT_DIR / "galleries.json"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"}
TITLE_OVERRIDES = {
    "home-cleanouts": "Home Cleanouts",
    "furniture-removal": "Furniture Removal",
    "construction-debris": "Construction Debris",
    "yard-and-outdoor-debris": "Yard & Outdoor Debris",
    "appliances-and-heavy-items": "Appliances & Heavy Items",
    "business-and-office": "Business & Office",
    "estate-cleanouts": "Estate Cleanouts",
    "sheds-and-small-structures": "Sheds & Small Structures",
}

def natural_key(value: str):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", value)]

def pretty_name(filename: str):
    stem = Path(filename).stem
    stem = re.sub(r"[-_]+", " ", stem)
    stem = re.sub(r"\s+", " ", stem).strip()
    return stem.title()

galleries = []
if SERVICES.exists():
    for folder in sorted((p for p in SERVICES.iterdir() if p.is_dir()), key=lambda p: natural_key(p.name)):
        images = []
        for image in sorted((p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXTENSIONS), key=lambda p: natural_key(p.name)):
            rel = image.relative_to(ROOT).as_posix()
            images.append({
                "url": f"/{rel}",
                "name": pretty_name(image.name),
                "filename": image.name,
            })
        galleries.append({
            "slug": folder.name,
            "title": TITLE_OVERRIDES.get(folder.name, folder.name.replace("-", " ").title()),
            "count": len(images),
            "cover": images[0]["url"] if images else "/assets/images/social-share2.jpg",
            "images": images,
        })

OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE.write_text(json.dumps({"generated": True, "galleries": galleries}, indent=2) + "\n", encoding="utf-8")
print(f"Generated {OUT_FILE.relative_to(ROOT)} with {sum(g['count'] for g in galleries)} images in {len(galleries)} galleries.")
