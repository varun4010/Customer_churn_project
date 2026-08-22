import os
import joblib

# Point to your new CatBoost pipeline
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'ml_engine',  # or wherever your model file is located
    'bank_churn_catboost_pipeline.joblib'
)

_model = None

def load_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model

def get_model():
    if _model is None:
        return load_model()
    return _model
