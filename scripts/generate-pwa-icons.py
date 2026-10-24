#!/usr/bin/env python3
"""Generate square PWA icons from the official SmartFrota logo without cropping it."""
from pathlib import Path
import argparse
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()

source_path = Path(args.source)
output_dir = Path(args.output)
output_dir.mkdir(parents=True, exist_ok=True)

with Image.open(source_path) as original:
    logo = original.convert("RGBA")
    for size in (192, 512):
        scaled = logo.copy()
        scaled.thumbnail((size, size), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        x = (size - scaled.width) // 2
        y = (size - scaled.height) // 2
        canvas.alpha_composite(scaled, (x, y))
        destination = output_dir / f"logo-{size}.png"
        canvas.save(destination, format="PNG", optimize=True)
        with Image.open(destination) as check:
            if check.size != (size, size):
                raise RuntimeError(f"Ícone inválido: {destination} tem {check.size}, esperado {(size, size)}")
        print(f"Gerado {destination}: {size}x{size}, derivado de {source_path}")
