"""
model_loader.py — Singleton module for global model preloading.

Loads the CatBoost pipeline and decision threshold from the serialized
joblib file ONCE at Django startup (via AppConfig.ready()).
All HTTP request handlers read from module-level variables — no disk I/O
per request.
"""

import os
import logging

import joblib

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level singleton state
# ---------------------------------------------------------------------------
_pipeline = None
_threshold = None
_model_loaded = False


def load_model():
    """
    Load bank_churn_pipeline.joblib into module-level globals.

    Expected file structure:
        {'pipeline': <sklearn.pipeline.Pipeline>, 'threshold': <float>}

    Called exactly once from ApiConfig.ready().
    """
    global _pipeline, _threshold, _model_loaded

    model_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'ml_engine', 'saved_models', 'bank_churn_pipeline.joblib',
    )

    try:
        data = joblib.load(model_path)

        if isinstance(data, dict) and 'pipeline' in data:
            _pipeline = data['pipeline']
            _threshold = data.get('threshold', 0.5)
        else:
            # Fallback: file contains the pipeline object directly
            _pipeline = data
            _threshold = 0.5

        _model_loaded = True
        logger.info(
            "Model loaded successfully from %s  |  threshold=%.4f",
            model_path, _threshold,
        )

    except FileNotFoundError:
        logger.warning(
            "Model file not found at %s. "
            "Run train_and_save.py first to generate the model.",
            model_path,
        )
        _model_loaded = False

    except Exception as exc:
        logger.error("Failed to load model from %s: %s", model_path, exc)
        _model_loaded = False


# ---------------------------------------------------------------------------
# Public accessors
# ---------------------------------------------------------------------------

def get_pipeline():
    """Return the loaded sklearn Pipeline. Raises RuntimeError if not loaded."""
    if _pipeline is None:
        raise RuntimeError(
            "Model pipeline is not loaded. "
            "Ensure bank_churn_pipeline.joblib exists and restart the server."
        )
    return _pipeline


def get_threshold():
    """Return the tuned decision threshold. Raises RuntimeError if not loaded."""
    if _threshold is None:
        raise RuntimeError(
            "Decision threshold is not available. "
            "Ensure bank_churn_pipeline.joblib exists and restart the server."
        )
    return _threshold


def is_model_loaded() -> bool:
    """Return True if the model was successfully loaded at startup."""
    return _model_loaded
