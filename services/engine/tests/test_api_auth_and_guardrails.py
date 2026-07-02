"""
API-level guardrail tests (STEP 3 spec):
  - auth: no/wrong X-Engine-Secret -> 401
  - request with backend=tribe_research (RESEARCH_MODE unset) -> 400
"""
from fastapi.testclient import TestClient


def test_missing_secret_returns_401(fresh_app_module, blob_image_b64):
    main = fresh_app_module({"ENGINE_SHARED_SECRET": "s3cr3t"})
    client = TestClient(main.app)

    resp = client.post("/v1/score", json={"kind": "render", "image_b64": blob_image_b64})
    assert resp.status_code == 401


def test_wrong_secret_returns_401(fresh_app_module, blob_image_b64):
    main = fresh_app_module({"ENGINE_SHARED_SECRET": "s3cr3t"})
    client = TestClient(main.app)

    resp = client.post(
        "/v1/score",
        json={"kind": "render", "image_b64": blob_image_b64},
        headers={"X-Engine-Secret": "wrong"},
    )
    assert resp.status_code == 401


def test_correct_secret_succeeds(fresh_app_module, blob_image_b64):
    main = fresh_app_module({"ENGINE_SHARED_SECRET": "s3cr3t"})
    client = TestClient(main.app)

    resp = client.post(
        "/v1/score",
        json={"kind": "render", "image_b64": blob_image_b64},
        headers={"X-Engine-Secret": "s3cr3t"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["backend"] == "saliency"


def test_tribe_research_backend_without_research_mode_returns_400(fresh_app_module, blob_image_b64):
    main = fresh_app_module({"ENGINE_SHARED_SECRET": "s3cr3t"})  # RESEARCH_MODE unset
    client = TestClient(main.app)

    resp = client.post(
        "/v1/score",
        json={"kind": "render", "image_b64": blob_image_b64, "backend": "tribe_research"},
        headers={"X-Engine-Secret": "s3cr3t"},
    )
    assert resp.status_code == 400


def test_engagement_backend_tribe_research_without_research_mode_fails_closed_at_import(fresh_app_module):
    import pytest

    with pytest.raises(RuntimeError):
        fresh_app_module({"ENGAGEMENT_BACKEND": "tribe_research", "RESEARCH_MODE": "false"})


def test_health_endpoint(fresh_app_module):
    main = fresh_app_module({"ENGINE_SHARED_SECRET": "s3cr3t"})
    client = TestClient(main.app)
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["backend"] == "saliency"
    assert body["tribe_enabled"] is False
