import os
import sys

from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        """
        Called once when Django starts.

        1. Adds ml_engine/ to sys.path so `feature_engineering` can be
           imported anywhere without per-module sys.path hacks.
        2. Loads the serialized CatBoost pipeline into memory via
           model_loader.load_model().
        """
        # 1. Make ml_engine importable globally
        ml_engine_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'ml_engine',
        )
        if ml_engine_dir not in sys.path:
            sys.path.insert(0, ml_engine_dir)

        # 2. Preload model (once)
        from api import model_loader  # noqa: delay import to avoid AppRegistryNotReady
        model_loader.load_model()
