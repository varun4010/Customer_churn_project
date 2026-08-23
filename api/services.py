"""
services.py — Business logic for legacy API endpoints.

Refactored to use the centralized model_loader singleton instead of
lazy-loading from disk on every call.
"""

import os
import json

import numpy as np
import pandas as pd

from api import model_loader
from feature_engineering import create_engineered_features

# Static file paths for metadata / boundary JSON 
_ML_ENGINE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'ml_engine',
)
METADATA_PATH = os.path.join(_ML_ENGINE_DIR, 'saved_models', 'metadata.json')
BOUNDARY_PATH = os.path.join(_ML_ENGINE_DIR, 'saved_models', 'decision_boundary.json')

# Cached JSON data (loaded once, kept in memory) 
_cached_metadata = None
_cached_boundary = None


def get_metadata():
    global _cached_metadata
    if _cached_metadata is None:
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, 'r') as f:
                _cached_metadata = json.load(f)
        else:
            _cached_metadata = {
                "best_cv_f1": 0.6113,
                "best_threshold": 0.6534,
                "validation_f1": 0.6213,
                "test_pr_auc": 0.7208,
                "test_f1_tuned": 0.6400,
                "test_f1_default": 0.6296,
                "feature_importances": [],
            }
    return _cached_metadata


def get_decision_boundary():
    global _cached_boundary
    if _cached_boundary is None:
        if os.path.exists(BOUNDARY_PATH):
            with open(BOUNDARY_PATH, 'r') as f:
                _cached_boundary = json.load(f)
        else:
            _cached_boundary = {
                "grid": [],
                "sample_points": [],
                "tuned_threshold": 0.6534,
            }
    return _cached_boundary


def predict_single_customer(data):
    """
    Takes customer dict, applies feature engineering, transforms via pipeline,
    computes probability, tuned threshold comparison, and factor contributions.

    Now reads the pipeline and threshold from the centralized model_loader
    (preloaded at startup) instead of lazy-loading from disk.
    """
    pipeline = model_loader.get_pipeline()
    threshold = model_loader.get_threshold()
    metadata = get_metadata()

    # Default values for missing keys
    default_customer = {
        "CreditScore": 650,
        "Geography": "France",
        "Gender": "Male",
        "Age": 40,
        "Tenure": 3,
        "Balance": 60000.0,
        "NumOfProducts": 2,
        "HasCrCard": 1,
        "IsActiveMember": 1,
        "EstimatedSalary": 100000.0,
        "Satisfaction Score": 3,
        "Point Earned": 500,
        "Card Type": "DIAMOND",
    }

    customer_dict = {**default_customer, **data}

    # Format numeric types
    for key in [
        "CreditScore", "Age", "Tenure", "NumOfProducts",
        "HasCrCard", "IsActiveMember", "Satisfaction Score", "Point Earned",
    ]:
        customer_dict[key] = int(customer_dict[key])
    for key in ["Balance", "EstimatedSalary"]:
        customer_dict[key] = float(customer_dict[key])

    df_raw = pd.DataFrame([customer_dict])
    df_fe = create_engineered_features(df_raw)

    probability = float(pipeline.predict_proba(df_fe)[0, 1])
    is_churn = bool(probability >= threshold)

    # Risk level classification
    if probability < 0.35:
        risk_level = "Low Risk"
        risk_color = "emerald"
    elif probability < threshold:
        risk_level = "Moderate Risk"
        risk_color = "amber"
    elif probability < 0.80:
        risk_level = "High Risk"
        risk_color = "orange"
    else:
        risk_level = "Critical Risk"
        risk_color = "rose"

    # Analyze risk factors
    factors = []
    if customer_dict["Age"] >= 45:
        factors.append({"factor": "Older Age Demographic", "impact": "High Churn Risk (+)", "type": "risk"})
    elif customer_dict["Age"] < 35:
        factors.append({"factor": "Younger Life-stage", "impact": "Lower Churn Risk (-)", "type": "positive"})

    if customer_dict["NumOfProducts"] == 1:
        factors.append({"factor": "Single Product Relationship", "impact": "Higher Churn Vulnerability", "type": "risk"})
    elif customer_dict["NumOfProducts"] >= 3:
        factors.append({"factor": "Multiple Products (3+)", "impact": "High Product Attrition Signal", "type": "risk"})
    elif customer_dict["NumOfProducts"] == 2:
        factors.append({"factor": "Optimal 2-Product Bundle", "impact": "Strong Retention Anchor (-)", "type": "positive"})

    if customer_dict["IsActiveMember"] == 0:
        factors.append({"factor": "Inactive Membership Status", "impact": "High Inactivity Risk (+)", "type": "risk"})
    else:
        factors.append({"factor": "Active Engagement Status", "impact": "Active Customer (-)", "type": "positive"})

    if customer_dict["Balance"] == 0:
        factors.append({"factor": "Zero Account Balance", "impact": "Dormant Account (+)", "type": "risk"})
    elif customer_dict["Balance"] > 100000 and customer_dict["EstimatedSalary"] < 50000:
        factors.append({"factor": "High Balance to Salary Ratio", "impact": "Capital Mobility Potential (+)", "type": "risk"})

    if customer_dict["CreditScore"] < 580:
        factors.append({"factor": "Subprime Credit Score", "impact": "Financial Instability Risk (+)", "type": "risk"})

    # Actionable Recommendations
    recommendations = []
    if is_churn or probability > 0.4:
        if customer_dict["NumOfProducts"] == 1:
            recommendations.append("Offer product bundle promo (e.g. high-yield savings or cash-back credit card) to anchor relationship.")
        if customer_dict["IsActiveMember"] == 0:
            recommendations.append("Enroll customer in VIP activity engagement campaign with personalized bonus incentives.")
        if customer_dict["Card Type"] in ["SILVER", "GOLD"]:
            recommendations.append("Upgrade card tier to PLATINUM or DIAMOND with reduced annual fees to increase loyalty.")
        if not recommendations:
            recommendations.append("Schedule proactive relationship manager reachout with personalized rate retention offer.")
    else:
        recommendations.append("Customer is currently stable. Maintain regular engagement and loyalty reward offerings.")

    # Engineered feature preview
    engineered_summary = {
        "ZeroBalance": int(df_fe["ZeroBalance"].iloc[0]),
        "BalanceSalaryRatio": round(float(df_fe["BalanceSalaryRatio"].iloc[0]), 3),
        "AgeBucket": str(df_fe["AgeBucket"].iloc[0]),
        "TenureAgeRatio": round(float(df_fe["TenureAgeRatio"].iloc[0]), 3),
        "ProductsPerTenure": round(float(df_fe["ProductsPerTenure"].iloc[0]), 3),
    }

    return {
        "probability": round(probability, 4),
        "probability_percentage": round(probability * 100, 1),
        "threshold": round(threshold, 4),
        "is_churn": is_churn,
        "prediction_label": "CHURN (Exited)" if is_churn else "RETAIN (Stayed)",
        "risk_level": risk_level,
        "risk_color": risk_color,
        "factors": factors,
        "recommendations": recommendations,
        "engineered_features": engineered_summary,
        "input": customer_dict,
    }


def get_what_if_curve(base_data, variable_feature='Balance', steps=20):
    """
    Generates a probability curve as variable_feature varies across its range.
    """
    pipeline = model_loader.get_pipeline()
    threshold = model_loader.get_threshold()

    ranges = {
        'Age': np.linspace(18, 80, steps),
        'Balance': np.linspace(0, 250000, steps),
        'CreditScore': np.linspace(350, 850, steps),
        'EstimatedSalary': np.linspace(10000, 200000, steps),
        'Tenure': np.linspace(0, 10, steps),
        'NumOfProducts': np.array([1, 2, 3, 4]),
    }

    if variable_feature not in ranges:
        variable_feature = 'Balance'

    values = ranges[variable_feature]
    curve_points = []

    for val in values:
        temp_data = base_data.copy()
        if variable_feature == 'NumOfProducts':
            temp_data[variable_feature] = int(val)
        else:
            temp_data[variable_feature] = float(val)

        df_raw = pd.DataFrame([temp_data])
        df_fe = create_engineered_features(df_raw)
        prob = float(pipeline.predict_proba(df_fe)[0, 1])

        curve_points.append({
            "value": round(float(val), 2),
            "probability": round(prob, 4),
            "probability_pct": round(prob * 100, 1),
            "is_churn": bool(prob >= threshold),
        })

    return {
        "variable_feature": variable_feature,
        "threshold": threshold,
        "curve": curve_points,
    }


def get_sample_preset_customers():
    return [
        {
            "name": "High Risk Customer (Sarah)",
            "data": {
                "CreditScore": 590, "Geography": "Germany", "Gender": "Female",
                "Age": 52, "Tenure": 1, "Balance": 125000.0, "NumOfProducts": 1,
                "HasCrCard": 1, "IsActiveMember": 0, "EstimatedSalary": 65000.0,
                "Satisfaction Score": 1, "Point Earned": 340, "Card Type": "SILVER",
            },
        },
        {
            "name": "Low Risk Customer (Alex)",
            "data": {
                "CreditScore": 760, "Geography": "France", "Gender": "Male",
                "Age": 28, "Tenure": 6, "Balance": 45000.0, "NumOfProducts": 2,
                "HasCrCard": 1, "IsActiveMember": 1, "EstimatedSalary": 110000.0,
                "Satisfaction Score": 5, "Point Earned": 820, "Card Type": "DIAMOND",
            },
        },
        {
            "name": "Moderate Risk / Boundary Case (Marcus)",
            "data": {
                "CreditScore": 640, "Geography": "Spain", "Gender": "Male",
                "Age": 42, "Tenure": 4, "Balance": 98000.0, "NumOfProducts": 1,
                "HasCrCard": 0, "IsActiveMember": 1, "EstimatedSalary": 85000.0,
                "Satisfaction Score": 3, "Point Earned": 510, "Card Type": "GOLD",
            },
        },
        {
            "name": "Multi-Product Attrition (Elena)",
            "data": {
                "CreditScore": 680, "Geography": "Germany", "Gender": "Female",
                "Age": 46, "Tenure": 2, "Balance": 140000.0, "NumOfProducts": 3,
                "HasCrCard": 1, "IsActiveMember": 0, "EstimatedSalary": 92000.0,
                "Satisfaction Score": 2, "Point Earned": 610, "Card Type": "PLATINUM",
            },
        },
    ]
