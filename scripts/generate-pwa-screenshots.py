#!/usr/bin/env python3
"""Generate genuine desktop and mobile screenshots of the SmartFrota login UI for the PWA manifest."""
from __future__ import annotations

import argparse
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="dist", help="Built site directory")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    if not (root / "index.html").is_file():
        raise SystemExit(f"index.html não encontrado em {root}")
    shots = root / "screenshots"
    shots.mkdir(parents=True, exist_ok=True)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *handler_args, **handler_kwargs):
            super().__init__(*handler_args, directory=str(root), **handler_kwargs)

        def translate_path(self, path: str) -> str:
            path_only = urlsplit(path).path
            prefix = "/SmartFrota/"
            if path_only == "/SmartFrota":
                path_only = prefix
            if path_only.startswith(prefix):
                path_only = path_only[len(prefix):]
            if not path_only or path_only == "/":
                path_only = "/index.html"
            return str(root / path_only.lstrip("/"))

        def log_message(self, format: str, *args: object) -> None:
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                variants = [
                    ("smartfrota-desktop.png", {"width": 1440, "height": 1000}),
                    ("smartfrota-mobile.png", {"width": 390, "height": 844}),
                ]
                for filename, viewport in variants:
                    page = browser.new_page(viewport=viewport, device_scale_factor=1)
                    response = page.goto("http://127.0.0.1:8765/SmartFrota/", wait_until="domcontentloaded", timeout=30000)
                    if response is None or not response.ok:
                        raise RuntimeError(f"Não foi possível abrir a interface para screenshot: {filename}")
                    page.locator("#loginView").wait_for(state="visible", timeout=15000)
                    page.evaluate("() => document.fonts.ready")
                    page.wait_for_timeout(1200)
                    page.screenshot(path=str(shots / filename), full_page=False, animations="disabled")
                    print(f"Screenshot real gerada: {shots / filename} ({viewport['width']}x{viewport['height']})")
                    page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
