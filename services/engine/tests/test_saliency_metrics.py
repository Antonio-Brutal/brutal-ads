"""
Core algorithm assertions (STEP 3 spec):
  - single bright Gaussian blob on dark bg -> focalClarity.value > uniform-noise focalClarity.value
  - blob clutter < noise clutter
  - attentionMap is 12x12 and normalized
"""
import numpy as np

from app.saliency.metrics import GRID_SIZE, attention_map_grid, clutter, focal_clarity
from app.saliency.spectral_residual import compute_saliency_map


def test_blob_focal_clarity_exceeds_noise(blob_image_factory):
    from tests.conftest import make_noise_image

    blob_img = blob_image_factory()
    noise_img = make_noise_image()

    blob_saliency = compute_saliency_map(blob_img)
    noise_saliency = compute_saliency_map(noise_img)

    blob_fc = focal_clarity(blob_saliency)
    noise_fc = focal_clarity(noise_saliency)

    assert blob_fc > noise_fc


def test_blob_clutter_lower_than_noise(blob_image_factory):
    from tests.conftest import make_noise_image

    blob_img = blob_image_factory()
    noise_img = make_noise_image()

    blob_gray = np.asarray(blob_img.convert("L"), dtype=np.float64)
    noise_gray = np.asarray(noise_img.convert("L"), dtype=np.float64)

    blob_clutter = clutter(blob_gray)
    noise_clutter = clutter(noise_gray)

    assert blob_clutter < noise_clutter


def test_attention_map_is_12x12_and_normalized(blob_image_factory):
    img = blob_image_factory()
    saliency = compute_saliency_map(img)
    grid = attention_map_grid(saliency)

    assert len(grid) == GRID_SIZE == 12
    for row in grid:
        assert len(row) == GRID_SIZE
        for v in row:
            assert 0.0 <= v <= 1.0

    flat = [v for row in grid for v in row]
    assert max(flat) == 1.0  # normalized: top value hits 1.0 for a blob with real contrast
    assert min(flat) >= 0.0


def test_saliency_map_shape_matches_original_image(blob_image_factory):
    img = blob_image_factory(size=200)
    saliency = compute_saliency_map(img)
    assert saliency.shape == (200, 200)
    assert saliency.min() >= 0.0
    assert saliency.max() <= 1.0
