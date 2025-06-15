from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import requests
import os
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
EURI_API_TOKEN = os.getenv('EURI_API_TOKEN')
EURI_API_BASE = os.getenv('EURI_API_BASE')

# In-memory storage
transactions = []
budgets = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/transactions', methods=['GET', 'POST'])
def handle_transactions():
    if request.method == 'GET':
        return jsonify(transactions)
    
    data = request.get_json()
    transaction = {
        'id': len(transactions) + 1,
        'type': data.get('type'),
        'amount': float(data.get('amount')),
        'category': data.get('category'),
        'description': data.get('description'),
        'date': data.get('date', datetime.now().strftime('%Y-%m-%d'))
    }
    transactions.append(transaction)
    return jsonify(transaction), 201

# ADD THESE NEW ROUTES HERE
@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    global transactions
    transactions = [t for t in transactions if t.get('id') != transaction_id]
    return jsonify({'message': 'Transaction deleted successfully'}), 200

@app.route('/api/budgets', methods=['GET', 'POST'])
def handle_budgets():
    if request.method == 'GET':
        return jsonify(budgets)
    
    data = request.get_json()
    budget = {
        'id': len(budgets) + 1,
        'category': data.get('category'),
        'limit': float(data.get('limit')),
        'spent': calculate_spent(data.get('category')),
        'month': data.get('month', datetime.now().strftime('%Y-%m'))
    }
    budgets.append(budget)
    return jsonify(budget), 201

# ADD THIS NEW ROUTE HERE
@app.route('/api/budgets/<int:budget_id>', methods=['DELETE'])
def delete_budget(budget_id):
    global budgets
    budgets = [b for b in budgets if b.get('id') != budget_id]
    return jsonify({'message': 'Budget deleted successfully'}), 200

@app.route('/api/financial-advice', methods=['POST'])
def get_financial_advice():
    try:
        data = request.get_json()
        user_query = data.get('query', '')
        
        # Calculate summary
        summary = calculate_summary()
        
        context = f"""
        Financial Summary:
        - Income: ${summary['income']:.2f}
        - Expenses: ${summary['expenses']:.2f}
        - Balance: ${summary['balance']:.2f}
        - Transactions: {len(transactions)}
        
        Question: {user_query}
        
        Provide helpful financial advice.
        """
        
        # Try Euri API first, then Groq as fallback
        advice = get_ai_response(context)
        
        return jsonify({
            'advice': advice,
            'summary': summary
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/summary', methods=['GET'])
def get_summary():
    return jsonify(calculate_summary())

def calculate_summary():
    income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    expenses = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    
    categories = {}
    for t in transactions:
        if t['type'] == 'expense':
            categories[t['category']] = categories.get(t['category'], 0) + t['amount']
    
    return {
        'income': income,
        'expenses': expenses,
        'balance': income - expenses,
        'categories': categories,
        'transaction_count': len(transactions)
    }

def calculate_spent(category):
    return sum(t['amount'] for t in transactions 
              if t['type'] == 'expense' and t['category'] == category)

def get_ai_response(prompt):
    # Try Euri API
    euri_response = call_euri_api(prompt)
    if euri_response:
        return euri_response
    
    # Fallback to Groq
    return call_groq_api(prompt)

def call_euri_api(prompt):
    try:
        headers = {
            'Authorization': f'Bearer {EURI_API_TOKEN}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'messages': [{'role': 'user', 'content': prompt}],
            'model': 'gpt-4.1-nano',
            'max_tokens': 300
        }
        
        response = requests.post(
            f'{EURI_API_BASE}/chat/completions',
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['data']['choices'][0]['message']['content']
        
    except Exception as e:
        print(f"Euri API error: {e}")
    
    return None

def call_groq_api(prompt):
    try:
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'messages': [
                {'role': 'system', 'content': 'You are a financial advisor.'},
                {'role': 'user', 'content': prompt}
            ],
            'model': 'mixtral-8x7b-32768',
            'max_tokens': 300
        }
        
        response = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content']
        
    except Exception as e:
        print(f"Groq API error: {e}")
    
    return "Unable to get AI advice at the moment."

if __name__ == '__main__':
    app.run(debug=True, port=5000)