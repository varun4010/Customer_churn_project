"""
views.py — API endpoints for the churn prediction service.

New production endpoints (class-based):
    POST /api/predict/   → PredictView   (single or bulk inference)
    GET  /api/health/    → HealthView    (server + model status)

Legacy endpoints (function-based, preserved for frontend compatibility):
    GET  /api/model-info/
    POST /api/what-if/
    GET  /api/decision-boundary/
    GET  /api/sample-customers/
"""

import pandas as pd

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .serializers import CustomerDataSerializer
from . import model_loader
from .services import (
    get_metadata, get_decision_boundary,
    predict_single_customer, get_what_if_curve,
    get_sample_preset_customers,
)

from feature_engineering import create_engineered_features



# NEW — Production Inference & Health Endpoints


class PredictView(APIView):
    """
    POST /api/predict/

    Accepts either:
      • A single JSON object  → returns a single result object.
      • A JSON array of objects → returns an array of result objects.

    Each result contains:
      - churn_prediction  (0 or 1)
      - churn_probability (float, 4 decimals)
      - risk_level        ("Low" | "Medium" | "High")
    """

    def post(self, request):
        # Guard: model must be loaded 
        if not model_loader.is_model_loaded():
            return Response(
                {
                    'error': (
                        'Model not loaded. Run train_and_save.py first, '
                        'then restart the server.'
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        #  Normalise input: single dict → list-of-one 
        raw = request.data
        is_single = not isinstance(raw, list)
        if is_single:
            raw = [raw]

        #  Validate via DRF serializer 
        serializer = CustomerDataSerializer(data=raw, many=True)
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Map validated data → internal column names 
        model_inputs = []
        for item in serializer.validated_data:
            model_inputs.append({
                'CreditScore':        item['CreditScore'],
                'Geography':          item['Geography'],
                'Gender':             item['Gender'],
                'Age':                item['Age'],
                'Tenure':             item['Tenure'],
                'Balance':            item['Balance'],
                'NumOfProducts':      item['NumOfProducts'],
                'HasCrCard':          item['HasCrCard'],
                'IsActiveMember':     item['IsActiveMember'],
                'EstimatedSalary':    item['EstimatedSalary'],
                'Satisfaction Score': item['SatisfactionScore'],
                'Point Earned':       item['PointEarned'],
                'Card Type':          item['CardType'],
            })

        #  Feature engineering → inference 
        df = pd.DataFrame(model_inputs)
        df_engineered = create_engineered_features(df)

        pipeline = model_loader.get_pipeline()
        threshold = model_loader.get_threshold()

        probabilities = pipeline.predict_proba(df_engineered)[:, 1]

        # Build response (compatible with all UI components)
        results = []
        for prob in probabilities:
            prob_float = round(float(prob), 4)
            prediction = int(prob >= threshold)

            if prob < 0.35:
                risk_level = 'Low Risk'
                risk_color = 'emerald'
            elif prob < 0.50:
                risk_level = 'Medium Risk'
                risk_color = 'amber'
            elif prob < 0.80:
                risk_level = 'High Risk'
                risk_color = 'orange'
            else:
                risk_level = 'Critical Risk'
                risk_color = 'rose'

            pred_detail = {
                'probability': prob_float,
                'probability_percentage': round(prob_float * 100, 1),
                'threshold': round(threshold, 4),
                'is_churn': bool(prediction == 1),
                'prediction_label': 'CHURN (Exited)' if prediction == 1 else 'RETAIN (Stayed)',
                'risk_level': risk_level,
                'risk_color': risk_color,
            }

            results.append({
                'churn_prediction':  prediction,
                'churn_probability': prob_float,
                'risk_level':        risk_level,
                'risk_color':        risk_color,
                'is_churn':          bool(prediction == 1),
                'prediction':        pred_detail,
            })

        if is_single:
            return Response(results[0], status=status.HTTP_200_OK)
        return Response(results, status=status.HTTP_200_OK)


class HealthView(APIView):
    """
    GET /api/health/

    Returns server status, whether the model is loaded, and the
    current decision threshold.
    """

    def get(self, request):
        loaded = model_loader.is_model_loaded()
        threshold = None
        if loaded:
            try:
                threshold = round(model_loader.get_threshold(), 4)
            except RuntimeError:
                pass

        return Response(
            {
                'status': 'healthy',
                'model_loaded': loaded,
                'decision_threshold': threshold,
            },
            status=status.HTTP_200_OK,
        )



# LEGACY — Preserved for existing frontend compatibility


@api_view(['GET'])
def model_info(request):
    """Returns model metrics, tuned threshold, and feature importances."""
    try:
        metadata = get_metadata()
        return Response({
            "status": "success",
            "metadata": metadata
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def what_if_analysis(request):
    """Generates sensitivity curve for varying a specific feature."""
    try:
        data = request.data.get('customer', {})
        variable_feature = request.data.get('variable_feature', 'Balance')
        curve_data = get_what_if_curve(data, variable_feature=variable_feature)
        return Response({
            "status": "success",
            "what_if": curve_data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def decision_boundary_data(request):
    """Returns 2D grid matrix data for rendering Age vs Balance decision boundary."""
    try:
        boundary_data = get_decision_boundary()
        return Response({
            "status": "success",
            "boundary": boundary_data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def sample_customers(request):
    """Returns preset customer profiles for testing."""
    try:
        presets = get_sample_preset_customers()
        return Response({
            "status": "success",
            "presets": presets
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
