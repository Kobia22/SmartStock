from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
import pandas as pd
from datetime import datetime

app = FastAPI(title="SmartStock AI Predictive Service")

# Allow requests from your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to your existing PostgreSQL database
DB_URL = "postgresql://postgres:Enkrypt12!@localhost:5432/smartstock_db"
engine = create_engine(DB_URL)

@app.get("/api/predict/stockout")
def predict_stockouts():
    """
    AI Predictive Module: Calculates sales velocity and forecasts stock-out dates.
    """
    try:
        # 1. Fetch current products and their stock
        products_df = pd.read_sql("SELECT id, sku, name, current_stock FROM products", engine)

        # 2. Fetch historical sales data
        sales_query = """
            SELECT product_id, transaction_date, quantity 
            FROM stock_transactions 
            WHERE transaction_type = 'SALE'
        """
        sales_df = pd.read_sql(sales_query, engine)

        predictions = []

        # 3. Analyze each product using Pandas
        for index, product in products_df.iterrows():
            prod_id = product['id']
            current_stock = product['current_stock']

            # Filter sales for this specific product
            prod_sales = sales_df[sales_df['product_id'] == prod_id].copy()

            if prod_sales.empty:
                # If a product has never been sold, we can't predict its velocity
                predictions.append({
                    "sku": product['sku'],
                    "name": product['name'],
                    "currentStock": current_stock,
                    "velocity": 0,
                    "daysRemaining": "N/A",
                    "status": "Insufficient Data"
                })
                continue

            # Convert timestamps to dates and make sales quantities positive
            prod_sales['date'] = pd.to_datetime(prod_sales['transaction_date']).dt.date
            prod_sales['quantity_sold'] = prod_sales['quantity'].abs()

            # Calculate the average daily sales velocity
            first_sale_date = prod_sales['date'].min()
            today = datetime.now().date()
            days_active = (today - first_sale_date).days

            if days_active == 0:
                days_active = 1 # Prevent division by zero if the first sale was today

            total_sold = prod_sales['quantity_sold'].sum()
            daily_velocity = total_sold / days_active

            # Predict how many days of stock are left
            if daily_velocity > 0:
                days_remaining = int(current_stock / daily_velocity)
            else:
                days_remaining = 999 # Practically infinite if velocity drops to 0

            # Classify the AI alert status
            if days_remaining <= 3:
                status = "Critical (Stockout Imminent)"
            elif days_remaining <= 7:
                status = "Warning (Reorder Soon)"
            else:
                status = "Healthy"

            predictions.append({
                "sku": product['sku'],
                "name": product['name'],
                "currentStock": current_stock,
                "velocity": round(daily_velocity, 2),
                "daysRemaining": days_remaining,
                "status": status
            })

        return predictions

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))