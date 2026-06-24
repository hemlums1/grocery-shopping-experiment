import os, shutil, json, subprocess

SRC = "/Users/gavin/Desktop/grocery-shopping-experiment/Item Pictures"
DEST = "/Users/gavin/Desktop/grocery-shopping-experiment/public/images/items"

# Source photos for these 13 new product types were dropped into Item Pictures/
# by Gavin (found, not added by this script) -- wire them in the same way
# apply_priced_photos.py did for the original batch, replacing their placeholder SVGs.
BASENAME = {
    "Avocados": "Avocadoes", "Carrots": "Carrots", "Onions": "Onions", "Sour Cream": "Sour Cream",
    "Pork Chops": "Pork Chops", "Tortillas": "Tortillas", "Oats": "Oats", "Pasta Sauce": "Pasta Sauce",
    "Honey": "Honey", "Soda": "Soda", "Tofu": "Tofu", "Hummus": "Hummus", "Frozen Pizza": "Pizza",
}
SLUG = {
    "Avocados": "avocados", "Carrots": "carrots", "Onions": "onions", "Sour Cream": "sour-cream",
    "Pork Chops": "pork-chops", "Tortillas": "tortillas", "Oats": "oats", "Pasta Sauce": "pasta-sauce",
    "Honey": "honey", "Soda": "soda", "Tofu": "tofu", "Hummus": "hummus", "Frozen Pizza": "frozen-pizza",
}

import re
files = [f for f in os.listdir(SRC) if not f.startswith('.')]
numbered = {}
for f in files:
    m = re.match(r'^(.*?)\s*([1-9])\.(\w+)$', f)
    if m:
        name, num, ext = m.group(1).strip(), int(m.group(2)), m.group(3)
        numbered.setdefault(name, {})[num] = (f, ext)

result = subprocess.run(
    ['node', '-e', "console.log(JSON.stringify(require('./src/catalog').CATALOG))"],
    cwd="/Users/gavin/Desktop/grocery-shopping-experiment", capture_output=True, text=True
)
catalog = json.loads(result.stdout)
by_type = {}
for item in catalog:
    by_type.setdefault(item['productType'], []).append(item)

id_to_image = {}
for product_type, basename in BASENAME.items():
    items = sorted(by_type[product_type], key=lambda i: i['priceCents'])
    assert len(items) == 4, f"{product_type} has {len(items)} variants, expected 4"
    tiers = numbered[basename]
    assert set(tiers.keys()) == {1, 2, 3, 4}, f"{basename} tiers found: {sorted(tiers.keys())}"
    slug = SLUG[product_type]
    for rank, item in enumerate(items, start=1):
        src_file, ext = tiers[rank]
        dest_name = f"{slug}-{rank}.{ext}"
        old_placeholder = os.path.join(DEST, f"{slug}-{rank}.svg")
        if os.path.exists(old_placeholder):
            os.remove(old_placeholder)
        shutil.copy(os.path.join(SRC, src_file), os.path.join(DEST, dest_name))
        id_to_image[item['id']] = f"/public/images/items/{dest_name}"

print(json.dumps(id_to_image, indent=2))
print(f"\n{len(id_to_image)} items mapped across {len(BASENAME)} product types")
