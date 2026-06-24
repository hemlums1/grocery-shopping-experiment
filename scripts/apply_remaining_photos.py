import os, shutil, json, subprocess

SRC = "/Users/gavin/Desktop/grocery-shopping-experiment/Item Pictures"
DEST = "/Users/gavin/Desktop/grocery-shopping-experiment/public/images/items"

# Explicit tier->(filename, ext) overrides resolved with Gavin: the branded
# photo fills the gap matching the Brand tier; the generic/unbranded photo
# keeps its original number (which already matched an Off-Brand tier).
MANUAL = {
    "Butter": {
        1: ("Butter1.avif", "avif"),
        2: ("Butter3.avif", "avif"),   # Great Value (branded) -> fills missing tier 2
        3: ("Butter3.jpg", "jpg"),     # generic stacked sticks -> stays tier 3
        4: ("Butter4.png", "png"),
    },
    "Canned Tuna": {
        1: ("Canned Tuna 1.avif", "avif"),
        2: ("Canned Tuna 2.jpg", "jpg"),
        3: ("Canned Tuna 4.jpeg", "jpeg"),   # generic gold tin -> fills missing tier 3
        4: ("Canned Tuna 4.webp", "webp"),   # John West (branded) -> stays tier 4
    },
    "Cheddar Cheese": {
        1: ("Cheddar1.jpeg", "jpeg"),
        2: ("Cheddar2.jpg", "jpg"),
        3: ("Cheddar4.jpg", "jpg"),     # generic block -> fills missing tier 3
        4: ("Cheddar4.webp", "webp"),   # Milbona (branded) -> stays tier 4
    },
    "Yogurt": {
        1: ("Yogurt1.jpg", "jpg"),
        2: ("Yogurt2.webp", "webp"),
        3: ("Yogurt3.png", "png"),
        4: ("Yogurt4.png", "png"),
    },
}

SLUG = {"Butter": "butter", "Canned Tuna": "canned-tuna", "Cheddar Cheese": "cheddar-cheese", "Yogurt": "yogurt"}

result = subprocess.run(
    ['node', '-e', "console.log(JSON.stringify(require('./src/catalog').CATALOG))"],
    cwd="/Users/gavin/Desktop/grocery-shopping-experiment", capture_output=True, text=True
)
catalog = json.loads(result.stdout)
by_type = {}
for item in catalog:
    by_type.setdefault(item['productType'], []).append(item)

id_to_image = {}
for product_type, tiers in MANUAL.items():
    items = sorted(by_type[product_type], key=lambda i: i['priceCents'])
    assert len(items) == 4, f"{product_type} has {len(items)} variants"
    slug = SLUG[product_type]
    for rank, item in enumerate(items, start=1):
        src_file, ext = tiers[rank]
        dest_name = f"{slug}-{rank}.{ext}"
        shutil.copy(os.path.join(SRC, src_file), os.path.join(DEST, dest_name))
        id_to_image[item['id']] = f"/public/images/items/{dest_name}"

print(json.dumps(id_to_image, indent=2))
