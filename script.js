// ==========================================
// STATE & LOCAL STORAGE
// ==========================================
let transactions = JSON.parse(localStorage.getItem('aura_transactions')) || [];
let savingsGoal = parseFloat(localStorage.getItem('aura_savings_goal')) || 5000;
let isDarkMode = localStorage.getItem('aura_theme') !== 'light';

// ==========================================
// DOM ELEMENTS
// ==========================================
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const listEl = document.getElementById('transaction-list');
const form = document.getElementById('transaction-form');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const notesInput = document.getElementById('notes');

// Savings Goal
const savingsText = document.getElementById('savings-text');
const savingsProgress = document.getElementById('savings-progress');
const editGoalBtn = document.getElementById('edit-goal-btn');
const goalModal = document.getElementById('goal-modal');
const closeModal = document.querySelector('.close-modal');
const saveGoalBtn = document.getElementById('save-goal-btn');
const goalAmountInput = document.getElementById('goal-amount');
const savingsCardTitle = document.querySelector('.savings-card .card-header-flex p');

// Actions
const themeToggle = document.getElementById('theme-toggle');
const exportBtn = document.getElementById('export-btn');
const syncBtn = document.getElementById('sync-btn');

// Charts
let barChartInstance = null;
let pieChartInstance = null;

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    // Set default date to today
    dateInput.valueAsDate = new Date();
    
    // Apply theme
    applyTheme();

    // Setup Charts
    initCharts();

    // Render Data
    updateUI();
}

// ==========================================
// UI UPDATES
// ==========================================
function updateUI() {
    listEl.innerHTML = '';
    
    // Sort transactions by date descending
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(addTransactionDOM);
    updateValues();
    updateCharts();
    generateAIInsights();
}

function updateValues() {
    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    
    const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0).toFixed(2);
    const expense = (amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1).toFixed(2);

    balanceEl.innerText = `$${Number(total).toLocaleString()}`;
    incomeEl.innerText = `$${Number(income).toLocaleString()}`;
    expenseEl.innerText = `$${Number(expense).toLocaleString()}`;

    // Update Savings Goal
    savingsCardTitle.innerText = `Savings Goal ($${savingsGoal.toLocaleString()})`;
    const currentSavings = total > 0 ? total : 0;
    let percentage = (currentSavings / savingsGoal) * 100;
    if (percentage > 100) percentage = 100;
    if (percentage < 0) percentage = 0;

    savingsProgress.style.width = `${percentage}%`;
    savingsText.innerText = `${percentage.toFixed(1)}% Achieved`;
}

function addTransactionDOM(transaction) {
    const sign = transaction.type === 'income' ? '+' : '-';
    const item = document.createElement('li');
    item.classList.add('transaction-item');
    
    // Icon mapping
    const icons = {
        'Food & Dining': 'fa-utensils',
        'Housing': 'fa-house',
        'Transportation': 'fa-car',
        'Entertainment': 'fa-film',
        'Shopping': 'fa-bag-shopping',
        'Utilities': 'fa-bolt',
        'Salary': 'fa-money-bill-wave',
        'Other': 'fa-box'
    };
    
    const iconClass = icons[transaction.category] || 'fa-tag';
    
    item.innerHTML = `
        <div class="t-info">
            <div class="t-icon ${transaction.type}">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="t-details">
                <h4>${transaction.category}</h4>
                <p>${transaction.notes || transaction.date}</p>
            </div>
        </div>
        <div class="t-amount ${transaction.type}">
            <h4>${sign}$${Math.abs(transaction.amount).toLocaleString()}</h4>
            <button class="delete-btn" onclick="removeTransaction('${transaction.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
    
    listEl.appendChild(item);
}

// ==========================================
// ACTIONS (ADD, DELETE, LOCAL STORAGE)
// ==========================================
function generateID() {
    return Math.floor(Math.random() * 100000000).toString();
}

function addTransaction(e) {
    e.preventDefault();

    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = +amountInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;
    const notes = notesInput.value.trim();

    if (amountInput.value.trim() === '' || category === '') {
        alert('Please add an amount and select a category');
        return;
    }

    const transaction = {
        id: generateID(),
        type,
        amount,
        category,
        date,
        notes
    };

    transactions.push(transaction);
    updateLocalStorage();
    updateUI();

    // Reset specific fields
    amountInput.value = '';
    notesInput.value = '';
    categoryInput.selectedIndex = 0;
}

function removeTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    updateUI();
}

function updateLocalStorage() {
    localStorage.setItem('aura_transactions', JSON.stringify(transactions));
}

// ==========================================
// CHARTS LOGIC (Chart.js)
// ==========================================
function initCharts() {
    const barCtx = document.getElementById('barChart').getContext('2d');
    const pieCtx = document.getElementById('pieChart').getContext('2d');

    Chart.defaults.color = isDarkMode ? '#94a3b8' : '#64748b';
    Chart.defaults.font.family = "'Inter', sans-serif";

    barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });

    pieChartInstance = new Chart(pieCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } }
        }
    });
}

function updateCharts() {
    // Colors
    const expenseColor = '#ef4444';
    const incomeColor = '#10b981';
    
    // --- Bar Chart (Last 6 Months Cash Flow) ---
    const monthlyData = {};
    const last6Months = [];
    
    // Setup last 6 months labels
    for(let i=5; i>=0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthYear = d.toLocaleString('default', { month: 'short' });
        last6Months.push(monthYear);
        monthlyData[monthYear] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
        const d = new Date(t.date);
        const m = d.toLocaleString('default', { month: 'short' });
        if(monthlyData[m] !== undefined) {
            if(t.type === 'income') monthlyData[m].income += t.amount;
            else monthlyData[m].expense += t.amount;
        }
    });

    const incomeData = last6Months.map(m => monthlyData[m].income);
    const expenseData = last6Months.map(m => monthlyData[m].expense);

    barChartInstance.data = {
        labels: last6Months,
        datasets: [
            { label: 'Income', data: incomeData, backgroundColor: incomeColor, borderRadius: 4 },
            { label: 'Expense', data: expenseData, backgroundColor: expenseColor, borderRadius: 4 }
        ]
    };
    barChartInstance.update();

    // --- Pie Chart (Expenses by Category) ---
    const expensesOnly = transactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expensesOnly.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const pieLabels = Object.keys(categoryTotals);
    const pieData = Object.values(categoryTotals);
    // Colorful palette for categories
    const pieColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

    pieChartInstance.data = {
        labels: pieLabels.length ? pieLabels : ['No Expenses'],
        datasets: [{
            data: pieData.length ? pieData : [1],
            backgroundColor: pieData.length ? pieColors.slice(0, pieLabels.length) : ['#334155'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };
    pieChartInstance.update();
}

// ==========================================
// AI INSIGHTS
// ==========================================
function generateAIInsights() {
    const aiText = document.getElementById('ai-text');
    const aiLoading = document.querySelector('.ai-loading');
    
    aiText.classList.add('hidden');
    aiLoading.classList.remove('hidden');

    // Simulate AI thinking time
    setTimeout(() => {
        aiLoading.classList.add('hidden');
        aiText.classList.remove('hidden');

        if(transactions.length === 0) {
            aiText.innerText = "Welcome to Aura Finance! Start adding transactions to receive personalized AI financial advice.";
            return;
        }

        const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
        const total = amounts.reduce((acc, item) => (acc += item), 0);
        
        const expenses = transactions.filter(t => t.type === 'expense');
        const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);

        if (total < 0) {
            aiText.innerHTML = `<strong>Alert:</strong> Your expenses exceed your income. Consider reviewing high-spending categories immediately to avoid debt.`;
            return;
        }

        if (expenses.length > 0) {
            // Find highest expense category
            const categoryTotals = {};
            expenses.forEach(t => categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount);
            
            let highestCategory = '';
            let highestAmount = 0;
            for(const [cat, amt] of Object.entries(categoryTotals)) {
                if(amt > highestAmount) {
                    highestAmount = amt;
                    highestCategory = cat;
                }
            }

            const percentage = ((highestAmount / totalExpense) * 100).toFixed(0);
            
            if(percentage > 40) {
                aiText.innerHTML = `You're spending <strong>${percentage}%</strong> of your expenses on <strong>${highestCategory}</strong>. Cutting back here is the fastest way to reach your $${savingsGoal} goal!`;
            } else if (total > savingsGoal * 0.1) {
                aiText.innerHTML = `Great job! Your current balance is growing. Consider moving some funds into a high-yield savings account or investing to beat inflation.`;
            } else {
                aiText.innerHTML = `Your spending looks balanced across categories. Keep tracking daily to stay on top of your financial goals.`;
            }
        } else {
            aiText.innerText = "You have income but no recorded expenses. Make sure to track everything to get an accurate financial picture.";
        }
        
    }, 1500); // 1.5s delay for realistic "AI" feel
}

// ==========================================
// THEME & EXTRAS
// ==========================================
function applyTheme() {
    if(isDarkMode) {
        document.body.classList.remove('light-mode');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.add('light-mode');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    Chart.defaults.color = isDarkMode ? '#94a3b8' : '#64748b';
    if(barChartInstance) initCharts(); // Re-init to apply color changes
}

themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('aura_theme', isDarkMode ? 'dark' : 'light');
    applyTheme();
    updateCharts();
});

// Sync Button Mock
syncBtn.addEventListener('click', () => {
    const icon = syncBtn.querySelector('i');
    const text = syncBtn.querySelector('span');
    
    icon.className = 'fa-solid fa-arrows-rotate fa-spin';
    text.innerText = 'Syncing...';
    
    setTimeout(() => {
        icon.className = 'fa-solid fa-cloud-arrow-up';
        text.innerText = 'Synced';
    }, 2000);
});

// Export CSV
exportBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if(transactions.length === 0) return alert("No transactions to export.");

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Date,Type,Category,Amount,Notes\n";

    transactions.forEach(t => {
        const row = `${t.id},${t.date},${t.type},${t.category},${t.amount},"${t.notes || ''}"`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "aura_finance_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ==========================================
// MODAL & GOAL LOGIC
// ==========================================
editGoalBtn.addEventListener('click', () => {
    goalAmountInput.value = savingsGoal;
    goalModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    goalModal.classList.add('hidden');
});

saveGoalBtn.addEventListener('click', () => {
    const val = parseFloat(goalAmountInput.value);
    if(val > 0) {
        savingsGoal = val;
        localStorage.setItem('aura_savings_goal', savingsGoal);
        updateValues();
        goalModal.classList.add('hidden');
        generateAIInsights(); // Re-trigger AI with new goal
    }
});

// Close modal on outside click
window.addEventListener('click', (e) => {
    if(e.target === goalModal) {
        goalModal.classList.add('hidden');
    }
});

// Event Listeners
form.addEventListener('submit', addTransaction);

// Init App
init();
