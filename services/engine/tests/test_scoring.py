"""
End-to-end scoring tests (STEP 3 spec):
  - blob centered inside a cta-role box -> ctaAttention.value > value for a far-away empty box
"""
from app.saliency.scoring import score_image


def test_cta_box_over_blob_scores_higher_than_empty_box(blob_image_factory):
    size = 256
    center = (size // 2, size // 2)
    img = blob_image_factory(size=size, center=center, radius=24)

    # CTA box centered on the blob.
    cta_on_blob = [{"id": "cta1", "role": "cta", "x": center[0] - 30, "y": center[1] - 30, "w": 60, "h": 60}]
    # CTA box far away from the blob, in a dark corner.
    cta_far_away = [{"id": "cta2", "role": "cta", "x": 4, "y": 4, "w": 30, "h": 30}]

    result_on_blob = score_image(image_b64=_to_b64(img), layers=cta_on_blob)
    result_far_away = score_image(image_b64=_to_b64(img), layers=cta_far_away)

    assert result_on_blob["ctaAttention"]["value"] > result_far_away["ctaAttention"]["value"]


def test_score_image_response_shape(blob_image_factory):
    img = blob_image_factory()
    result = score_image(image_b64=_to_b64(img))

    assert result["backend"] == "saliency"
    assert result["saliencySource"] == "saliency.spectral_residual"
    assert result["modelVersion"] == "sr-1.0"
    for key in ("focalClarity", "valuePropAttention", "ctaAttention", "clutter", "stoppingPower"):
        scored = result[key]
        assert 0.0 <= scored["value"] <= 1.0
        assert len(scored["band"]) == 2
        assert 0.0 <= scored["confidence"] <= 1.0

    band = result["predictedCtrBand"]
    assert band["low"] < band["high"]
    assert band["confidence"] <= 0.3  # documented WIDE + low confidence, uncalibrated

    assert result["raw"]["uncalibrated"] is True
    assert len(result["attentionMap"]) == 12
    assert "scoredAt" in result and result["scoredAt"].endswith("Z")


def _to_b64(img):
    from tests.conftest import _png_b64

    return _png_b64(img)
