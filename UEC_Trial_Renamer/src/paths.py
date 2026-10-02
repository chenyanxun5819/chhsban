"""Locate project resources both in development and inside a PyInstaller exe.

Layout (dev):            Layout (packaged):
  <root>/src/*.py          <exe dir>/UEC_Trial_Renamer.exe
  <root>/config/*.json     <exe dir>/config/*.json   (editable by user)
  <root>/assets/*.png      <exe dir>/assets/*.png
"""
import sys
from pathlib import Path


def app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


ROOT = app_root()
CONFIG_DIR = ROOT / "config"
ASSETS_DIR = ROOT / "assets"
CACHE_DIR = ROOT / ".cache"
