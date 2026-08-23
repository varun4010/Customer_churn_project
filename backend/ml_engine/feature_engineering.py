import pandas as pd
import numpy as np

def create_engineered_features(df_input):
    """
    Applies the churn-relevant feature engineering transformations.
    Converts single dict or DataFrame into transformed DataFrame ready for preprocessor.
    """
    if isinstance(df_input, dict):
        df = pd.DataFrame([df_input])
    else:
        df = df_input.copy()
        
    # Standardize column names if needed
    column_mapping = {
        'Credit_Score': 'CreditScore',
        'Num_Of_Products': 'NumOfProducts',
        'Estimated_Salary': 'EstimatedSalary',
        'Point_Earned': 'Point Earned',
        'Card_Type': 'Card Type'
    }
    df.rename(columns=column_mapping, inplace=True)
    
    # Required original columns:
    # CreditScore, Geography, Gender, Age, Tenure, Balance, NumOfProducts, HasCrCard, IsActiveMember, EstimatedSalary, Point Earned, Card Type

    # Feature 1: ZeroBalance
    df['ZeroBalance'] = (df['Balance'] == 0).astype(int)
    
    # Feature 2: BalanceSalaryRatio
    df['BalanceSalaryRatio'] = df['Balance'] / (df['EstimatedSalary'] + 1)
    
    # Feature 3: AgeBucket
    df['AgeBucket'] = pd.cut(
        df['Age'], bins=[17, 30, 40, 50, 60, 100],
        labels=['18-30', '31-40', '41-50', '51-60', '60+'],
        include_lowest=True
    ).astype(str)
    
    # Feature 4: TenureAgeRatio
    df['TenureAgeRatio'] = df['Tenure'] / (df['Age'] + 1)
    
    # Feature 5: ProductsPerTenure
    df['ProductsPerTenure'] = df['NumOfProducts'] / (df['Tenure'] + 1)
    
    return df

numeric_cols = [
    'CreditScore', 'Age', 'Tenure', 'Balance', 'NumOfProducts',
    'EstimatedSalary', 'Point Earned', 'BalanceSalaryRatio',
    'TenureAgeRatio', 'ProductsPerTenure'
]

onehot_cols = ['Geography', 'Gender', 'AgeBucket']
ordinal_cols = ['Card Type']
passthrough_cols = ['HasCrCard', 'IsActiveMember', 'ZeroBalance']
