"""Deterministic optimization/typesetting of original local assets, no network calls.
Run with Pillow. Generated art sources are recorded in shipping-art.json.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
for entry in json.loads((root / "docs/assets/shipping-art.json").read_text())["shipping"]:
    image = Image.open(entry["source"]).convert("RGB")
    image.thumbnail((600, 400) if "paper" not in entry["file"] else (256, 256))
    image.save(root / entry["file"], "WEBP", quality=80, method=6)

out = root / "public/media/deck-2026-10-05"
fontpath = str(root / "public/fonts/atkinson-bold.ttf")
def text(draw, xy, value, size, fill):
    draw.text(xy, value, font=ImageFont.truetype(fontpath, size), fill=fill, anchor="mm")
image = Image.new("RGB", (600, 400), "#f5e9cf")
d = ImageDraw.Draw(image)
d.rounded_rectangle((222, 60, 378, 216), radius=15, fill="#292722")
text(d, (300, 138), "F", 116, "#fff5df")
text(d, (300, 284), "Press F to pay respects", 36, "#292722")
image.save(out / "press-f.webp", quality=85)
image = Image.new("RGB", (600, 400), "#f5e9cf")
d = ImageDraw.Draw(image)
text(d, (300, 148), "404", 128, "#292722")
text(d, (300, 280), "Not Found", 48, "#292722")
image.save(out / "404.webp", quality=85)
frames = []
for i in range(40):
    image = Image.new("RGB", (600, 400), "#18362e")
    d = ImageDraw.Draw(image)
    # Constant color, gentle continuous motion, no flashing, no audio.
    x = 110 + (i if i < 20 else 40-i) * 16
    y = 104 + (i if i < 20 else 40-i) * 9
    text(d, (x, y), "DVD", 64, "#f5e9cf")
    frames.append(image)
frames[0].save(out / "dvd-poster.webp", quality=85)
frames[0].save(out / "dvd.gif", save_all=True, append_images=frames[1:], duration=100, loop=0, optimize=True)
