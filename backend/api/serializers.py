"""
serializers.py — DRF input validation for customer churn prediction.

Validates raw customer input fields before feature engineering or ML inference.
Supports flexible payload formats:
  - snake_case (e.g. credit_score, estimated_salary, num_of_products, points_earned)
  - PascalCase (e.g. CreditScore, EstimatedSalary, NumOfProducts, PointEarned)
  - Space Case (e.g. "Satisfaction Score", "Point Earned", "Card Type")
"""

from rest_framework import serializers

def normalize_payload_dict(raw_data: dict) -> dict:
    """Normalize input dictionary keys from snake_case/Space Case to PascalCase."""
    if not isinstance(raw_data, dict):
        return {}

    # Key alias map -> standard field name
    key_aliases = {
        'credit_score': 'CreditScore',
        'creditscore': 'CreditScore',
        'geography': 'Geography',
        'gender': 'Gender',
        'age': 'Age',
        'tenure': 'Tenure',
        'balance': 'Balance',
        'num_of_products': 'NumOfProducts',
        'num_products': 'NumOfProducts',
        'numofproducts': 'NumOfProducts',
        'has_cr_card': 'HasCrCard',
        'has_credit_card': 'HasCrCard',
        'hascrcard': 'HasCrCard',
        'is_active_member': 'IsActiveMember',
        'isactivemember': 'IsActiveMember',
        'estimated_salary': 'EstimatedSalary',
        'estimatedsalary': 'EstimatedSalary',
        'satisfaction_score': 'SatisfactionScore',
        'satisfaction score': 'SatisfactionScore',
        'satisfactionscore': 'SatisfactionScore',
        'card_type': 'CardType',
        'card type': 'CardType',
        'cardtype': 'CardType',
        'points_earned': 'PointEarned',
        'point_earned': 'PointEarned',
        'point earned': 'PointEarned',
        'pointearned': 'PointEarned',
    }

    normalized = {}
    for key, val in raw_data.items():
        clean_key = str(key).strip()
        lower_key = clean_key.lower()

        target_key = key_aliases.get(lower_key, clean_key)
        normalized[target_key] = val

    return normalized


class CustomerDataSerializer(serializers.Serializer):
    """
    Validates a single customer record for churn prediction.
    """

    CreditScore = serializers.IntegerField(min_value=300, max_value=900, default=650)
    Geography = serializers.ChoiceField(choices=['France', 'Germany', 'Spain'], default='France')
    Gender = serializers.ChoiceField(choices=['Male', 'Female'], default='Male')
    Age = serializers.IntegerField(min_value=18, max_value=100, default=40)
    Tenure = serializers.IntegerField(min_value=0, max_value=10, default=3)
    Balance = serializers.FloatField(min_value=0, default=60000.0)
    NumOfProducts = serializers.IntegerField(min_value=1, max_value=4, default=2)
    HasCrCard = serializers.IntegerField(min_value=0, max_value=1, default=1)
    IsActiveMember = serializers.IntegerField(min_value=0, max_value=1, default=1)
    EstimatedSalary = serializers.FloatField(min_value=0, default=100000.0)
    SatisfactionScore = serializers.IntegerField(min_value=1, max_value=5, default=3)
    CardType = serializers.ChoiceField(
        choices=['SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
        default='DIAMOND'
    )
    PointEarned = serializers.IntegerField(min_value=0, default=500)

    def to_internal_value(self, data):
        normalized_data = normalize_payload_dict(data)
        return super().to_internal_value(normalized_data)

    def to_model_input(self) -> dict:
        d = self.validated_data
        return {
            'CreditScore': d['CreditScore'],
            'Geography': d['Geography'],
            'Gender': d['Gender'],
            'Age': d['Age'],
            'Tenure': d['Tenure'],
            'Balance': d['Balance'],
            'NumOfProducts': d['NumOfProducts'],
            'HasCrCard': d['HasCrCard'],
            'IsActiveMember': d['IsActiveMember'],
            'EstimatedSalary': d['EstimatedSalary'],
            'Satisfaction Score': d['SatisfactionScore'],
            'Point Earned': d['PointEarned'],
            'Card Type': d['CardType'],
        }
