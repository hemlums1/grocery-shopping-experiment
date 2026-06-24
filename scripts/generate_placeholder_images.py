#!/usr/bin/env python3
"""Generates simple SVG placeholder images for new catalog items that don't have
real photos yet. One file per item (not shared per product type) so a real photo
can later be dropped in at the exact same path without touching catalog.js."""

import os

SQUARE = 600
BG = "#f0ece2"
BORDER = "#e8e2d3"
TEXT = "#8a8275"

PLACEHOLDER_TYPES = [
    "Onions", "Carrots", "Avocados", "Sour Cream", "Pork Chops", "Tortillas",
    "Oats", "Pasta Sauce", "Honey", "Soda", "Tofu", "Hummus", "Frozen Pizza",
]


def slugify(product_type):
    return product_type.lower().replace(" ", "-")


def make_svg(label):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SQUARE} {SQUARE}">
  <rect width="{SQUARE}" height="{SQUARE}" fill="{BG}" stroke="{BORDER}" stroke-width="2"/>
  <text x="50%" y="50%" font-family="Georgia, serif" font-size="36" fill="{TEXT}"
        text-anchor="middle" dominant-baseline="middle">{label}</text>
  <text x="50%" y="58%" font-family="Georgia, serif" font-size="18" fill="{TEXT}"
        text-anchor="middle" dominant-baseline="middle">Photo coming soon</text>
</svg>
"""


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "images", "items")
    written = 0
    for product_type in PLACEHOLDER_TYPES:
        slug = slugify(product_type)
        svg = make_svg(product_type)
        for variant in range(1, 5):
            path = os.path.join(out_dir, f"{slug}-{variant}.svg")
            with open(path, "w") as f:
                f.write(svg)
            written += 1
    print(f"Wrote {written} placeholder SVGs")


if __name__ == "__main__":
    main()
