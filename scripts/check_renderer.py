"""Fail fast when the Playwright Chromium bundle is incomplete."""
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError, sync_playwright


def main() -> None:
    with sync_playwright() as playwright:
        executable = Path(playwright.chromium.executable_path)
        if not executable.exists():
            raise SystemExit(
                "Playwright Chromium is missing. Run .venv\\Scripts\\python.exe -m playwright install chromium"
            )
        try:
            browser = playwright.chromium.launch(headless=True, args=["--no-proxy-server"])
            browser.close()
        except PlaywrightError as exc:
            raise SystemExit(
                "Playwright Chromium is incomplete. Run .venv\\Scripts\\python.exe -m playwright install chromium"
            ) from exc
    print(f"Playwright Chromium ready: {executable}")


if __name__ == "__main__":
    main()
