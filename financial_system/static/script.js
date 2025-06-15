// Global state
let transactions = [];
let budgets = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Set today's date as default
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('budget-month').value = new Date().toISOString().slice(0, 7);
    
    // Load initial data
    loadTransactions();
    loadBudgets();
    updateSummary();
}

function setupEventListeners() {
    // Transaction form
    document.getElementById('transaction-form').addEventListener('submit', handleTransactionSubmit);
    
    // Budget form
    document.getElementById('budget-form').addEventListener('submit', handleBudgetSubmit);
}

// Tab functionality
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Transaction handling
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const formData = {
        type: document.getElementById('transaction-type').value,
        amount: parseFloat(document.getElementById('transaction-amount').value),
        category: document.getElementById('transaction-category').value,
        description: document.getElementById('transaction-description').value,
        date: document.getElementById('transaction-date').value
    };
    
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            document.getElementById('transaction-form').reset();
            document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
            loadTransactions();
            updateSummary();
            showNotification('Transaction added successfully!', 'success');
        } else {
            showNotification('Error adding transaction', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error adding transaction', 'error');
    }
}

// Budget handling
async function handleBudgetSubmit(e) {
    e.preventDefault();
    
    const formData = {
        category: document.getElementById('budget-category').value,
        limit: parseFloat(document.getElementById('budget-limit').value),
        month: document.getElementById('budget-month').value
    };
    
    try {
        const response = await fetch('/api/budgets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            document.getElementById('budget-form').reset();
            document.getElementById('budget-month').value = new Date().toISOString().slice(0, 7);
            loadBudgets();
            showNotification('Budget created successfully!', 'success');
        } else {
            showNotification('Error creating budget', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error creating budget', 'error');
    }
}

// Load transactions
async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions');
        transactions = await response.json();
        displayTransactions();
    } catch (error) {
        console.error('Error loading transactions:', error);
        showNotification('Error loading transactions', 'error');
    }
}

// Load budgets
async function loadBudgets() {
    try {
        const response = await fetch('/api/budgets');
        budgets = await response.json();
        displayBudgets();
    } catch (error) {
        console.error('Error loading budgets:', error);
        showNotification('Error loading budgets', 'error');
    }
}

// Display transactions
function displayTransactions() {
    const container = document.getElementById('transactions-list');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No transactions yet. Add your first transaction!</p>';
        return;
    }
    
    container.innerHTML = transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(transaction => `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-details">
                    <div class="transaction-amount">
                        ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                    </div>
                    <div class="transaction-meta">
                        <strong>${transaction.category}</strong> - ${transaction.description}
                        <br>
                        <small>${formatDate(transaction.date)}</small>
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteTransaction(${transaction.id})" title="Delete Transaction">
                    ❌
                </button>
            </div>
        `).join('');
}

// Display budgets
function displayBudgets() {
    const container = document.getElementById('budgets-list');
    
    if (budgets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No budgets set. Create your first budget!</p>';
        return;
    }
    
    container.innerHTML = budgets.map(budget => {
        const spent = calculateSpent(budget.category, budget.month);
        const percentage = (spent / budget.limit) * 100;
        const status = percentage > 100 ? '⚠️ Over Budget' : percentage > 80 ? '⚡ Near Limit' : '✅ On Track';
        
        return `
            <div class="budget-item">
                <div class="budget-details">
                    <div class="budget-amount">
                        ${budget.category} - $${spent.toFixed(2)} / $${budget.limit.toFixed(2)}
                    </div>
                    <div class="budget-meta">
                        ${status} - ${formatMonth(budget.month)} (${percentage.toFixed(0)}%)
                    </div>
                    <div class="budget-progress">
                        <div class="budget-progress-bar" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteBudget(${budget.id})" title="Delete Budget">
                    ❌
                </button>
            </div>
        `;
    }).join('');
}

// Calculate spent amount for a category in a specific month
function calculateSpent(category, month = null) {
    return transactions
        .filter(t => {
            const isExpense = t.type === 'expense';
            const isCategory = t.category === category;
            const isMonth = month ? t.date.startsWith(month) : true;
            return isExpense && isCategory && isMonth;
        })
        .reduce((sum, t) => sum + t.amount, 0);
}

// Update summary
async function updateSummary() {
    try {
        const response = await fetch('/api/summary');
        const summary = await response.json();
        
        document.getElementById('total-income').textContent = `$${summary.income.toFixed(2)}`;
        document.getElementById('total-expenses').textContent = `$${summary.expenses.toFixed(2)}`;
        document.getElementById('balance').textContent = `$${summary.balance.toFixed(2)}`;
        
        // Update balance color
        const balanceElement = document.getElementById('balance');
        if (summary.balance > 0) {
            balanceElement.style.color = '#4CAF50';
        } else if (summary.balance < 0) {
            balanceElement.style.color = '#f44336';
        } else {
            balanceElement.style.color = '#2196F3';
        }
    } catch (error) {
        console.error('Error updating summary:', error);
        showNotification('Error updating summary', 'error');
    }
}

// Get AI advice
async function getAdvice() {
    const query = document.getElementById('advice-query').value.trim();
    const responseDiv = document.getElementById('advice-response');
    
    if (!query) {
        showNotification('Please enter a question first', 'error');
        return;
    }
    
    responseDiv.innerHTML = '<div class="loading">🤖 Getting AI advice...</div>';
    
    try {
        const response = await fetch('/api/financial-advice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
        });
        
        if (response.ok) {
            const result = await response.json();
            responseDiv.innerHTML = result.advice;
            document.getElementById('advice-query').value = '';
        } else {
            responseDiv.innerHTML = 'Sorry, I couldn\'t get advice right now. Please try again.';
        }
    } catch (error) {
        console.error('Error getting advice:', error);
        responseDiv.innerHTML = 'Sorry, I couldn\'t get advice right now. Please try again.';
    }
}

// Delete transaction
async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadTransactions();
            updateSummary();
            showNotification('Transaction deleted successfully!', 'success');
        } else {
            showNotification('Error deleting transaction', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error deleting transaction', 'error');
    }
}

// Delete budget
async function deleteBudget(id) {
    if (!confirm('Are you sure you want to delete this budget?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/budgets/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadBudgets();
            showNotification('Budget deleted successfully!', 'success');
        } else {
            showNotification('Error deleting budget', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error deleting budget', 'error');
    }
}

// Utility functions
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatMonth(monthString) {
    const [year, month] = monthString.split('-');
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#FF9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }
    
    // Add to document
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Export data functionality
function exportData() {
    const data = {
        transactions: transactions,
        budgets: budgets,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully!', 'success');
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+Enter to submit forms
    if (e.ctrlKey && e.key === 'Enter') {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            const form = activeTab.querySelector('form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    }
    
    // Escape to clear advice query
    if (e.key === 'Escape') {
        const adviceQuery = document.getElementById('advice-query');
        if (document.activeElement === adviceQuery) {
            adviceQuery.value = '';
        }
    }
});

// Auto-save functionality (optional)
function autoSave() {
    const data = {
        transactions: transactions,
        budgets: budgets,
        lastSaved: new Date().toISOString()
    };
    
    try {
        // Note: localStorage is not available in Claude artifacts
        // This would work in a real browser environment
        // localStorage.setItem('financialData', JSON.stringify(data));
        console.log('Auto-save would save data:', data);
    } catch (error) {
        console.log('Auto-save not available in this environment');
    }
}

// Set up auto-save every 30 seconds (optional)
// setInterval(autoSave, 30000);