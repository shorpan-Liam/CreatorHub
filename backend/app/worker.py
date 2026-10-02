"""Compatibility entry point for local startup scripts."""

from app.jobs.errors import RenderError, browser_failure
from app.jobs.queue import claim, finish, maintain, stage, touch_worker
from app.jobs.renderer import render
from app.jobs.worker import main, process

__all__ = [
    "RenderError",
    "browser_failure",
    "claim",
    "finish",
    "maintain",
    "stage",
    "touch_worker",
    "render",
    "main",
    "process",
]

if __name__ == "__main__":
    main()
