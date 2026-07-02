"""Shared fixtures: synthetic test images (no external assets) + app-import helper."""
import base64
import io
import importlib
import sys

import numpy as np
import pytest
from PIL import Image


def _png_b64(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def make_blob_image(size=256, center=None, radius=24, bg=20, peak=235) -> Image.Image:
    """A single bright Gaussian blob on a dark background."""
    h = w = size
    if center is None:
        center = (size // 2, size // 2)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    cy, cx = center
    dist2 = (xx - cx) ** 2 + (yy - cy) ** 2
    blob = np.exp(-dist2 / (2.0 * radius ** 2))
    gray = bg + blob * (peak - bg)
    gray = np.clip(gray, 0, 255).astype(np.uint8)
    rgb = np.stack([gray, gray, gray], axis=-1)
    return Image.fromarray(rgb)


def make_noise_image(size=256, seed=7) -> Image.Image:
    """Uniform random noise — no single focal point, high local gradient everywhere."""
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 256, size=(size, size, 3), dtype=np.uint8)
    return Image.fromarray(arr)


@pytest.fixture
def blob_image_b64():
    return _png_b64(make_blob_image())


@pytest.fixture
def noise_image_b64():
    return _png_b64(make_noise_image())


@pytest.fixture
def blob_image_factory():
    return make_blob_image


@pytest.fixture
def png_b64_factory():
    return _png_b64


@pytest.fixture
def fresh_app_module(monkeypatch):
    """
    Reload app.main (and app.saliency.scoring, which it imports) with a given env, so tests
    can control ENGINE_SHARED_SECRET / ENGAGEMENT_BACKEND / RESEARCH_MODE per-test without
    cross-test contamination (module-level state is read once at import time).
    """
    def _reload(env: dict):
        for key in ("ENGINE_SHARED_SECRET", "ENGAGEMENT_BACKEND", "RESEARCH_MODE"):
            if key in env:
                monkeypatch.setenv(key, env[key])
            else:
                monkeypatch.delenv(key, raising=False)
        # Drop cached modules so module-level guardrail code re-executes with the new env.
        for mod_name in list(sys.modules):
            if mod_name == "app.main" or mod_name.startswith("app.main"):
                del sys.modules[mod_name]
        import app.main as main_module
        importlib.reload(main_module)
        return main_module

    return _reload
