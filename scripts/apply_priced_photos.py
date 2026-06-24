import re, os, shutil, json, subprocess

SRC = "/Users/gavin/Desktop/grocery-shopping-experiment/Item Pictures"
DEST = "/Users/gavin/Desktop/grocery-shopping-experiment/public/images/items"

# productType -> basename used in Item Pictures filenames (only the resolved ones)
BASENAME = {
    "Apples": "Apples", "Bananas": "Bananas", "Tomatoes": "Tomatoes", "Spinach": "Spinach",
    "Potatoes": "Potatoes", "Milk": "Milk", "Eggs": "Eggs", "Chicken Breast": "Chicken Breast",
    "Ground Beef": "Ground Beef", "Bacon": "Bacon", "Salmon Fillet": "Salmon", "Bread": "Bread",
    "Pasta": "Spaghetti", "Rice": "Rice", "Cereal": "Cereal", "Olive Oil": "Olive Oil",
    "Canned Tomatoes": "Canned Tomatoes", "Peanut Butter": "Peanut Butter", "Coffee": "Coffee",
    "Chocolate Bar": "Chocolate", "Potato Chips": "Potato Chips", "Orange Juice": "Orange Juice",
}

SLUG = {
    "Apples": "apples", "Bananas": "bananas", "Tomatoes": "tomatoes", "Spinach": "spinach",
    "Potatoes": "potatoes", "Milk": "milk", "Eggs": "eggs", "Chicken Breast": "chicken-breast",
    "Ground Beef": "ground-beef", "Bacon": "bacon", "Salmon Fillet": "salmon", "Bread": "bread",
    "Pasta": "pasta", "Rice": "rice", "Cereal": "cereal", "Olive Oil": "olive-oil",
    "Canned Tomatoes": "canned-tomatoes", "Peanut Butter": "peanut-butter", "Coffee": "coffee",
    "Chocolate Bar": "chocolate", "Potato Chips": "potato-chips", "Orange Juice": "orange-juice",
}

files = [f for f in os.listdir(SRC) if not f.startswith('.')]
numbered = {}
for f in files:
    m = re.match(r'^(.*?)\s*([1-9])\.(\w+)$', f)
    if m:
        name, num, ext = m.group(1).strip(), int(m.group(2)), m.group(3)
        numbered.setdefault(name, {})[num] = (f, ext)

# get catalog items grouped by productType, sorted by price
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
        shutil.copy(os.path.join(SRC, src_file), os.path.join(DEST, dest_name))
        id_to_image[item['id']] = f"/public/images/items/{dest_name}"

print(json.dumps(id_to_image, indent=2))
print(f"\n{len(id_to_image)} items mapped across {len(BASENAME)} product types")
