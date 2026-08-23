import os
import json
import joblib

import numpy as np
import pandas as pd

import kagglehub

import optuna
from optuna.samplers import TPESampler

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import (
    classification_report, average_precision_score, f1_score,
    precision_recall_curve
)
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, OrdinalEncoder
from sklearn.pipeline import Pipeline
from catboost import CatBoostClassifier

from feature_engineering import create_engineered_features, numeric_cols, onehot_cols, ordinal_cols

RANDOM_STATE = 42

def train_and_export():
    print("=== Step 1: Downloading & Loading Dataset ===")
    try:
        path = kagglehub.dataset_download("radheshyamkollipara/bank-customer-churn")
        csv_path = os.path.join(path, 'Customer-Churn-Records.csv')
        df = pd.read_csv(csv_path)
        print(f"Loaded dataset from Kaggle: {df.shape}")
    except Exception as e:
        print(f"Kaggle download note: {e}. Checking local fallback...")
        csv_path = os.path.join(os.path.dirname(__file__), 'Customer-Churn-Records.csv')
        df = pd.read_csv(csv_path)

    # Drop non-predictive columns
    for col in ['Complain', 'RowNumber', 'CustomerId', 'Surname']:
        if col in df.columns:
            df.drop(col, axis=1, inplace=True)

    y = df['Exited']
    X_raw = df.drop(['Exited'], axis=1)

    print("=== Step 2: Feature Engineering ===")
    X_fe = create_engineered_features(X_raw)

    print("=== Step 3: Stratified Split (train / validation / test) ===")
    xtr_full, xts, ytr_full, yts = train_test_split(
        X_fe, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )
    xtr, xval, ytr, yval = train_test_split(
        xtr_full, ytr_full, test_size=0.2, stratify=ytr_full, random_state=RANDOM_STATE
    )

    num_neg = np.sum(ytr == 0)
    num_pos = np.sum(ytr == 1)
    estimated_weight = float(num_neg / num_pos)
    print(f"Train split: {len(xtr)} samples. Estimated scale_pos_weight: {estimated_weight:.4f}")

    print("=== Step 4: Preprocessing Pipeline Setup ===")
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_cols),
            ('cat', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'), onehot_cols),
            ('ord', OrdinalEncoder(categories=[['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']], handle_unknown='use_encoded_value', unknown_value=-1), ordinal_cols)
        ],
        remainder='passthrough'
    )

    print("=== Step 5: Hyperparameter Search with Optuna ===")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    def objective(trial):
        cb_params = {
            'iterations': trial.suggest_categorical('iterations', [150, 250, 350, 500]),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.1, log=True),
            'depth': trial.suggest_int('depth', 3, 8),
            'l2_leaf_reg': trial.suggest_float('l2_leaf_reg', 1.0, 10.0),
            'subsample': trial.suggest_float('subsample', 0.6, 1.0),
            'scale_pos_weight': estimated_weight,
            'random_seed': RANDOM_STATE,
            'verbose': 0
        }

        f1_scores = []
        for train_idx, val_idx in cv.split(xtr, ytr):
            X_train_cv, X_val_cv = xtr.iloc[train_idx], xtr.iloc[val_idx]
            y_train_cv, y_val_cv = ytr.iloc[train_idx], ytr.iloc[val_idx]

            pipeline_cv = Pipeline([
                ('preprocessor', preprocessor),
                ('catboost', CatBoostClassifier(**cb_params))
            ])

            pipeline_cv.fit(X_train_cv, y_train_cv)

            preds = pipeline_cv.predict(X_val_cv)
            f1_scores.append(f1_score(y_val_cv, preds))

        return np.mean(f1_scores)

    optuna.logging.set_verbosity(optuna.logging.WARNING)

    study = optuna.create_study(
        direction="maximize",
        sampler=TPESampler(seed=RANDOM_STATE)
    )

    print("Starting Optuna optimization using Pipeline (60 trials)...")
    study.optimize(objective, n_trials=60, show_progress_bar=False)

    best_cv_f1 = float(study.best_value)
    print(f"Best CV F1 Score: {best_cv_f1:.4f}")
    print("Best hyperparameters:", study.best_params)

    print("=== Step 6: Fit Final Pipeline on Entire Training Set ===")
    best_params = study.best_params.copy()
    best_params.update({
        'scale_pos_weight': estimated_weight,
        'random_seed': RANDOM_STATE,
        'verbose': 0
    })

    final_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('catboost', CatBoostClassifier(**best_params))
    ])

    final_pipeline.fit(xtr, ytr)

    print("=== Step 7: Fixed Threshold Setup (Default 0.5) ===")
    fixed_threshold = 0.5
    val_preds = final_pipeline.predict(xval)
    val_f1 = float(f1_score(yval, val_preds))
    print(f"Validation F1 (Threshold 0.5): {val_f1:.4f}")

    print("=== Step 8: Final Evaluation on Test Set (Strict Isolation) ===")
    test_preds = final_pipeline.predict(xts)
    test_proba = final_pipeline.predict_proba(xts)[:, 1]

    test_f1 = float(f1_score(yts, test_preds))
    test_prauc = float(average_precision_score(yts, test_proba))

    print(f"Final Test F1 Score (f1_score(y_test, model.predict(X_test))): {test_f1:.4f}")
    print(f"Final Test PR-AUC: {test_prauc:.4f}")
    print(classification_report(yts, test_preds, target_names=["Stayed (0)", "Churned (1)"]))

    print("=== Step 9: Extract Feature Importances ===")
    model_obj = final_pipeline.named_steps['catboost']
    prep = final_pipeline.named_steps['preprocessor']
    feature_names = [name.split('__')[-1] for name in prep.get_feature_names_out()]

    if hasattr(model_obj, 'get_feature_importance'):
        importances = model_obj.get_feature_importance()
    elif hasattr(model_obj, 'feature_importances_'):
        importances = model_obj.feature_importances_
    else:
        importances = np.ones(len(feature_names)) / len(feature_names)

    feature_importance_list = [
        {"feature": name, "importance": float(imp)}
        for name, imp in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
    ]

    print("=== Step 10: Generate 2D Decision Boundary Data (Age vs Balance) ===")
    x_feat = 'Age'
    y_feat = 'Balance'

    base_row = xtr.iloc[0].copy()
    for col in xtr.columns:
        if xtr[col].dtype == 'object':
            base_row[col] = xtr[col].mode()[0]
        else:
            base_row[col] = xtr[col].median()

    x_min, x_max = float(xts[x_feat].min() - 5), float(xts[x_feat].max() + 5)
    y_min, y_max = float(xts[y_feat].min() - 10000), float(xts[y_feat].max() + 10000)

    x_span = np.linspace(x_min, x_max, 40)
    y_span = np.linspace(y_min, y_max, 40)
    xx, yy = np.meshgrid(x_span, y_span)

    grid_points = np.c_[xx.ravel(), yy.ravel()]
    mesh_df = pd.DataFrame([base_row] * len(grid_points), columns=xtr.columns)
    mesh_df[x_feat] = grid_points[:, 0]
    mesh_df[y_feat] = grid_points[:, 1]

    Z = final_pipeline.predict_proba(mesh_df)[:, 1]

    grid_data = []
    for i in range(len(grid_points)):
        grid_data.append({
            "age": float(grid_points[i, 0]),
            "balance": float(grid_points[i, 1]),
            "probability": float(Z[i])
        })

    sample_ts = xts.sample(min(150, len(xts)), random_state=RANDOM_STATE)
    sample_y = yts.loc[sample_ts.index]
    sample_points = []
    for idx, row in sample_ts.iterrows():
        sample_points.append({
            "age": float(row['Age']),
            "balance": float(row['Balance']),
            "exited": int(sample_y.loc[idx])
        })

    boundary_export = {
        "x_feat": x_feat,
        "y_feat": y_feat,
        "x_range": [x_min, x_max],
        "y_range": [y_min, y_max],
        "tuned_threshold": fixed_threshold,
        "grid": grid_data,
        "sample_points": sample_points
    }

    print("=== Step 11: Save Model Pipeline & Best Threshold with Joblib ===")
    models_dir = os.path.join(os.path.dirname(__file__), 'saved_models')
    os.makedirs(models_dir, exist_ok=True)

    model_data = {
        'pipeline': final_pipeline,
        'threshold': fixed_threshold
    }

    # Save to both bank_churn_pipeline.joblib and churn_pipeline.joblib
    joblib_path1 = os.path.join(models_dir, 'bank_churn_pipeline.joblib')
    joblib_path2 = os.path.join(models_dir, 'churn_pipeline.joblib')
    joblib.dump(model_data, joblib_path1)
    joblib.dump(model_data, joblib_path2)
    print(f"Saved model pipeline & threshold dict to '{joblib_path1}' and '{joblib_path2}'")

    metadata = {
        "best_cv_f1": best_cv_f1,
        "best_threshold": fixed_threshold,
        "validation_f1": val_f1,
        "test_pr_auc": test_prauc,
        "test_f1": test_f1,
        "test_f1_tuned": test_f1,
        "test_f1_default": test_f1,
        "best_params": {
            k: int(v) if isinstance(v, (int, np.integer))
            else float(v) if isinstance(v, (float, np.floating))
            else v
            for k, v in study.best_params.items()
        },
        "feature_importances": feature_importance_list,
        "model_type": "CatBoost (Optuna Tuned)"
    }

    metadata_path = os.path.join(models_dir, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    boundary_path = os.path.join(models_dir, 'decision_boundary.json')
    with open(boundary_path, 'w') as f:
        json.dump(boundary_export, f, indent=2)

    print("=== Done Training & Exporting Model Artifacts with Optuna! ===")

if __name__ == '__main__':
    train_and_export()
