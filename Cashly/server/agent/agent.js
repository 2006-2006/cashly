const OpenAI = require('openai');
const { tools, toolDescriptions } = require('./tools');

// Initialize client safely
let client = null;
let modelName = "meta-llama/llama-3.2-3b-instruct:free"; // Default for OpenRouter

const initClient = () => {
    // 1. Try OpenRouter
    const orKey = process.env.OPENROUTER_API_KEY || process.env.BACKUP_OPENROUTER_API_KEY;
    if (orKey && orKey.startsWith('sk-or-v1-')) {
        console.log('✓ Initializing Agent LLM via OpenRouter');
        modelName = "meta-llama/llama-3.2-3b-instruct:free";
        return new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: orKey,
            defaultHeaders: {
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Cashly"
            }
        });
    }

    // 2. Try Groq (OpenAI-compatible, fast inference)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKey.startsWith('gsk_')) {
        console.log('✓ Initializing Agent LLM via Groq');
        modelName = "llama3-8b-8192";
        return new OpenAI({
            baseURL: "https://api.groq.com/openai/v1",
            apiKey: groqKey,
        });
    }

    // 3. Try Google Gemini (OpenAI Compatible)
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
        console.log('✓ Initializing Agent LLM via Google Gemini (OpenAI Compatible)');
        modelName = "gemini-1.5-flash"; // Correct model for Google
        return new OpenAI({
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
            apiKey: geminiKey
        });
    }

    return null;
};


client = initClient();

if (!client) {
    console.warn('✗ Failed to initialize Agent LLM (no valid API key found). using local fallback.');
}

class CashlyAgent {
    constructor() {
        this.tools = tools;
        this.toolDescriptions = toolDescriptions;
        this.steps = [];
        this.context = {};
    }

    // Check if query is finance-related - STRICT FILTER
    isFinanceRelated(query) {
        if (!query) return false;
        const q = query.toLowerCase().trim();

        // Finance keywords - query MUST contain at least one of these
        const financeKeywords = [
            'cash', 'flow', 'money', 'profit', 'loss', 'revenue', 'income', 'expense',
            'cost', 'budget', 'sales', 'sell', 'sold', 'buy', 'purchase', 'payment',
            'invoice', 'receivable', 'payable', 'debt', 'owe', 'credit', 'debit',
            'tax', 'gst', 'vat', 'margin', 'roi', 'return', 'investment', 'invest',
            'forecast', 'predict', 'projection', 'trend', 'growth', 'decline',
            'business', 'company', 'financial', 'finance', 'account', 'accounting',
            'balance', 'sheet', 'statement', 'report', 'analysis', 'analyze',
            'inventory', 'stock', 'customer', 'vendor', 'supplier', 'client',
            'transaction', 'transfer', 'bank', 'loan', 'interest', 'rate',
            'save', 'saving', 'spend', 'spending', 'cut', 'reduce', 'increase',
            'how much', 'total', 'sum', 'average', 'mean', 'highest', 'lowest',
            'top', 'best', 'worst', 'performance', 'metric', 'kpi', 'indicator',
            'risk', 'danger', 'warning', 'alert', 'issue', 'problem', 'opportunity',
            'strategy', 'plan', 'goal', 'target', 'runway', 'burn', 'rate',
            'collection', 'collect', 'due', 'overdue', 'pending', 'outstanding',
            'liquidity', 'solvency', 'asset', 'liability', 'equity',
            'price', 'pricing', 'discount', 'markup', 'amount', 'value', 'worth',
            'category', 'breakdown', 'summary', 'overview', 'health', 'status',
            'calculate', 'computation', 'formula', 'percentage', 'ratio',
            'monthly', 'weekly', 'daily', 'yearly', 'annual', 'quarter',
            'compare', 'comparison', 'versus', 'vs', 'difference', 'change',
            'rupee', 'rupees', '₹', 'inr', 'dollar', '$', 'currency',
            'salary', 'wage', 'payroll', 'employee', 'overhead', 'fixed', 'variable',
            'product', 'service', 'order', 'billing', 'receipt', 'voucher',
            'earning', 'earnings', 'net', 'gross', 'deduction', 'receivables'
        ];

        // Basic greetings or help requests
        const greetings = ['hi', 'hello', 'hey', 'start', 'help', 'who are you', 'what can you do', 'clear', 'reset'];

        // Check for finance keywords
        const hasFinanceKeyword = financeKeywords.some(keyword => q.includes(keyword));
        const isGreeting = greetings.some(g => q.includes(g));

        if (!hasFinanceKeyword && !isGreeting) {
            console.log(`Query rejected - No finance keyword found in: "${query}"`);
            return false;
        }

        return true;
    }

    // Execute a specific tool
    async executeTool(toolName, params = {}) {
        const tool = this.tools[toolName];
        if (!tool) {
            return { error: `Tool ${toolName} not found` };
        }

        try {
            // Our tools expect a params object (businessId, token, etc.)
            const result = await tool(params);
            return result;
        } catch (error) {
            console.error(`Tool execution error [${toolName}]:`, error);
            return { error: error.message };
        }
    }

    // Determine which tools to use based on query
    async planTools(query) {
        const q = query.toLowerCase();
        const toolsToUse = [];

        // Receivables/Collection questions
        if (q.includes('receivable') || q.includes('owed') || q.includes('pending') ||
            q.includes('collect') || q.includes('invoice') || q.includes('debtor') ||
            q.includes('payment') || q.includes('outstanding') || q.includes('due') ||
            q.includes('customer') || q.includes('client')) {
            toolsToUse.push('getReceivables');
        }

        // Expense questions
        if (q.includes('expense') || q.includes('cost') || q.includes('spending') ||
            q.includes('reduce') || q.includes('cut') || q.includes('save') ||
            q.includes('spend') || q.includes('overhead') || q.includes('budget')) {
            toolsToUse.push('getExpensesData');
        }

        // Sales/Revenue questions
        if (q.includes('sales') || q.includes('revenue') || q.includes('income') ||
            q.includes('earning') || q.includes('sell') || q.includes('sold') ||
            q.includes('growth') || q.includes('top product') || q.includes('best selling')) {
            toolsToUse.push('getSalesData');
        }

        // Inventory questions
        if (q.includes('inventory') || q.includes('stock') || q.includes('item') ||
            q.includes('product') || q.includes('supply')) {
            toolsToUse.push('getInventoryData');
        }

        // Risk questions
        if (q.includes('risk') || q.includes('danger') || q.includes('warning') ||
            q.includes('issue') || q.includes('problem') || q.includes('alert') ||
            q.includes('concern') || q.includes('worry') || q.includes('threat')) {
            toolsToUse.push('analyzeRisks');
        }

        // Cash flow / profit / overview questions
        if (q.includes('cash flow') || q.includes('profit') || q.includes('overview') ||
            q.includes('summary') || q.includes('overall') || q.includes('health') ||
            q.includes('how is my') || q.includes('how am i') || q.includes('status') ||
            q.includes('performance') || q.includes('doing') || q.includes('going')) {
            toolsToUse.push('getCashFlow');
        }

        // Forecast/Prediction questions
        if (q.includes('forecast') || q.includes('predict') || q.includes('future') ||
            q.includes('projection') || q.includes('next month') || q.includes('outlook') ||
            q.includes('trend') || q.includes('runway') ||
            q.match(/(\d+)\s*(month|year|day)s?/i)) {
            toolsToUse.push('getForecast');
        }

        // For comprehensive/complete/all questions, get everything
        if (q.includes('complete') || q.includes('comprehensive') || q.includes('everything') ||
            q.includes('all') || q.includes('full') || q.includes('detailed') ||
            q.includes('entire') || q.includes('whole')) {
            return ['getCashFlow', 'getSalesData', 'getExpensesData', 'getReceivables', 'analyzeRisks'];
        }

        // Default: if nothing matched, get cash flow and risks
        if (toolsToUse.length === 0) {
            toolsToUse.push('getCashFlow');
            toolsToUse.push('analyzeRisks');
        }

        // Always add risks if asking about recommendations or suggestions
        if ((q.includes('recommend') || q.includes('suggest') || q.includes('advice') ||
            q.includes('should') || q.includes('improve')) && !toolsToUse.includes('analyzeRisks')) {
            toolsToUse.push('analyzeRisks');
        }

        return [...new Set(toolsToUse)];
    }

    // ⚡ Fast Path: Immediate answers using cached context
    checkFastPath(query, context) {
        if (!query) return null;
        const q = query.toLowerCase();
        const { metrics, situation } = context;

        if (!metrics) return null;

        // Simple Revenue
        if (q === 'revenue' || q === 'sales' || q === 'income' || q.includes('total sales') || q.includes('total revenue') || q.includes('total income')) {
            return {
                response: `## 📈 Total Revenue\n\nYour total revenue is **₹${metrics.totalSales?.toLocaleString()}** across **${metrics.salesCount}** transactions.`,
                steps: [{ id: 1, type: 'fast', message: 'Instant Retrieval from Cache' }],
                duration: '0.0s',
                toolsUsed: [],
                classification: { category: 'Revenue', tone: 'Precise' },
                isFastPath: true
            };
        }

        // Simple Expenses
        if (q === 'expenses' || q === 'cost' || q.includes('total expenses')) {
            return {
                response: `## 📉 Total Expenses\n\nYour total expenses are **₹${metrics.totalExpenses?.toLocaleString()}** across **${metrics.expensesCount}** transactions.`,
                steps: [{ id: 1, type: 'fast', message: 'Instant Retrieval from Cache' }],
                duration: '0.0s',
                toolsUsed: [],
                classification: { category: 'Expenses', tone: 'Precise' },
                isFastPath: true
            };
        }

        // Net Profit
        if (q === 'net profit' || q === 'profit' || q.includes('margin')) {
            const isProfitable = metrics.netProfit >= 0;
            return {
                response: `## 💰 Net Profit\n\nYou are **${isProfitable ? 'Profitable ✅' : 'Loss Making ⚠️'}**.\n\n- **Net Profit:** ₹${metrics.netProfit?.toLocaleString()}\n- **Margin:** ${metrics.profitMargin}%`,
                steps: [{ id: 1, type: 'fast', message: 'Instant Retrieval from Cache' }],
                duration: '0.0s',
                toolsUsed: [],
                classification: { category: 'Profitability', tone: 'Precise' },
                isFastPath: true
            };
        }

        // Receivables
        if (q.includes('receivable') || q.includes('owed') || q.includes('pending payment')) {
            return {
                response: `## ⏳ Receivables Overview\n\nYou have **₹${metrics.totalReceivables?.toLocaleString()}** currently pending collection.`,
                steps: [{ id: 1, type: 'fast', message: 'Instant Retrieval from Cache' }],
                duration: '0.0s',
                toolsUsed: [],
                classification: { category: 'Receivables', tone: 'Precise' },
                isFastPath: true
            };
        }

        // Overview / Stats / Dashboard
        // EXCLUDE forecast queries to allow tool execution
        if ((q.includes('overview') || q.includes('stats') || q.includes('summary') || q.includes('dashboard') || q.includes('report')) &&
            !q.includes('forecast') && !q.includes('predict') && !q.includes('future') && !q.includes('next')) {
            const isProfitable = metrics.netProfit >= 0;
            const margin = metrics.profitMargin || ((metrics.totalSales > 0 ? (metrics.netProfit / metrics.totalSales) * 100 : 0)).toFixed(1);

            return {
                response: `## 📊 Financial Overview\n\nHere is your current business snapshot:\n\n- **Revenue:** ₹${metrics.totalSales?.toLocaleString('en-IN')}\n- **Expenses:** ₹${metrics.totalExpenses?.toLocaleString('en-IN')}\n- **Net Profit:** ₹${metrics.netProfit?.toLocaleString('en-IN')}\n- **Margin:** ${margin}%\n\n**Status:** ${isProfitable ? '✅ Profitable' : '⚠️ Loss Making'}\n*Based on ${metrics.salesCount} sales and ${metrics.expensesCount} expenses.*`,
                steps: [{ id: 1, type: 'fast', message: 'Instant Retrieval from Cache' }],
                duration: '0.0s',
                toolsUsed: [],
                classification: { category: 'Overview', tone: 'Precise' },
                isFastPath: true
            };
        }

        // Cash Flow Fast Path
        // EXCLUDE forecast queries so 'Forecast cash flow' goes to the real tool
        if ((q.includes('cash flow') || q.includes('cashflow') || q.includes('how is my business')) &&
            !q.includes('forecast') && !q.includes('predict') && !q.includes('future') && !q.includes('next') && !q.includes('year') && !q.includes('month')) {
            const isPositive = (metrics.netProfit || 0) >= 0;
            const flow = metrics.netProfit || 0;
            // Calculate margin dynamically if missing
            let margin = metrics.profitMargin;
            if (margin === undefined && metrics.totalSales > 0) {
                margin = ((metrics.netProfit / metrics.totalSales) * 100).toFixed(1);
            }
            margin = margin || 0;

            return {
                response: `## 💰 Cash Flow Analysis\n\nYour cash flow is **${isPositive ? 'Positive ✅' : 'Negative ⚠️'}**.\n\n- **Revenue:** ₹${metrics.totalSales?.toLocaleString('en-IN') || 0}\n- **Expenses:** ₹${metrics.totalExpenses?.toLocaleString('en-IN') || 0}\n- **Net Profit:** ₹${flow.toLocaleString('en-IN')}\n- **Margin:** ${margin}%\n\n*You are running at a ${margin}% profit margin.*`,
                steps: [{ id: 1, type: 'fast', message: 'Instant Retrieval from Cache' }],
                duration: '0.0s',
                toolsUsed: [],
                classification: { category: 'Cash Flow', tone: 'Precise' },
                isFastPath: true
            };
        }

        // Risk Analysis Fast Path
        // Skip fast path if the user is asking for a specific duration or future projection
        if ((q.includes('risk') || q.includes('safe') || q.includes('health')) &&
            !q.match(/(\d+)\s*(month|year|day)s?/i) && !q.includes('next')) {
            // Support both backend (healthScore) and frontend (score) structures
            const healthScore = situation?.healthScore || situation?.score || 50;
            const runway = situation?.runway !== undefined ? situation.runway : (situation?.components?.runway || 0);

            const risks = [];
            if (metrics.netProfit < 0) risks.push('Negative Profitability');
            if (runway < 30) risks.push('Low Runway (< 30 days)');
            if (situation?.dailyBurn > (metrics.totalSales / 30)) risks.push('High Daily Burn');

            const riskLevel = risks.length > 0 ? (healthScore < 40 ? 'Critical' : 'Medium') : 'Low';
            const riskMsg = risks.length > 0 ? risks.map(r => `- **${r}**`).join('\n') : '✅ No critical financial risks detected.';

            return {
                response: `## 🛡️ Risk Assessment\n\n**Health Score:** ${healthScore}/100\n**Risk Level:** ${riskLevel}\n\n${riskMsg}\n\n*Runway calculated: ${runway} days*`,
                steps: [{ id: 1, type: 'fast', message: 'Instant Retrieval from Cache' }],
                duration: '0.0s',
                toolsUsed: [],
                classification: { category: 'Risk', tone: 'Professional' },
                isFastPath: true
            };
        }

        return null;
    }

    // Run the agent
    async run(query, context = {}) {
        this.steps = [];
        this.startTime = Date.now();
        this.context = { ...context, query }; // Include query in context for tools to access

        if (!query) {
            return {
                response: "Please ask a valid question.",
                steps: [],
                duration: "0s",
                toolsUsed: []
            };
        }

        // ⚡ FAST PATH CHECK
        const fastResponse = this.checkFastPath(query, context);
        if (fastResponse) {
            return fastResponse;
        }

        try {
            // Check if query is finance-related
            if (!this.isFinanceRelated(query)) {
                return {
                    response: "## ❌ Action Cannot Be Proceeded\n\nI'm Cashly AI, your dedicated **financial advisor**. I can only help with questions related to:\n\n- Cash flow and financial health\n- Sales, revenue, and income analysis\n- Expense tracking and cost reduction\n- Receivables and payment collection\n- Business risks and recommendations\n- Financial forecasting and planning\n- Inventory and stock management\n\n**Please ask me a finance or business-related question!**\n\nFor example:\n- \"How's my cash flow?\"\n- \"Where can I reduce expenses?\"\n- \"What are my business risks?\"\n- \"Analyze my receivables\"",
                    steps: [{ id: 1, type: 'validation', message: 'Query validation failed - Not finance related' }],
                    duration: '0.1s',
                    toolsUsed: []
                };
            }

            // 1. Planning
            this.addStep('planning', 'Analyzing your question...');
            const toolsToRun = await this.planTools(query);
            this.addStep('planning', `Tools selected: ${toolsToRun.join(', ')}`);

            // 2. Execution
            const toolResults = {};
            for (const toolName of toolsToRun) {
                this.addStep('execution', `Fetching ${toolName}...`);
                const result = await this.executeTool(toolName, this.context);
                toolResults[toolName] = result;

                // Optimization: Inject results into context for subsequent tools to reuse
                if (result && result.result) {
                    if (toolName === 'getSalesData') this.context.salesData = result;
                    if (toolName === 'getExpensesData') this.context.expensesData = result;
                    if (toolName === 'getCashFlow') this.context.cashFlowData = result;
                    if (toolName === 'getReceivables') this.context.receivablesData = result;
                }

                this.addStep('execution', `✓ ${toolName} complete`);
            }

            // 3. Response Generation
            this.addStep('generation', 'Generating comprehensive analysis...');
            const response = await this.generateResponse(query, toolResults);

            const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);

            return {
                response,
                steps: this.steps,
                duration: `${duration}s`,
                toolsUsed: toolsToRun,
                classification: { category: 'Financial Analysis', tone: 'Professional' },
                chartData: toolResults.getForecast?.result?.forecast || null
            };
        } catch (error) {
            console.error('Agent execution error:', error);
            return {
                response: "I encountered an error while processing your request. Please try again or rephrase your question.",
                steps: this.steps,
                duration: "0s",
                toolsUsed: []
            };
        }
    }

    addStep(type, message) {
        this.steps.push({
            id: Date.now() + Math.random(),
            type,
            message,
            timestamp: new Date().toISOString()
        });
    }

    // Generate final response using LLM
    async generateResponse(query, toolResults) {
        // Build comprehensive context from tool results
        const toolContext = Object.entries(toolResults)
            .map(([tool, data]) => {
                const result = data.result || data;
                return `=== ${tool} ===\nFormatted: ${result?.formatted || 'N/A'}\nRaw Data: ${JSON.stringify(result, null, 2)}`;
            })
            .join('\n\n');

        // Inject Visual Context from Frontend (Match what user sees)
        const visualContext = `
=== VISUAL DASHBOARD STATE (PRIORITY) ===
• Current Cash: ₹${this.context.currentCash?.toLocaleString() || 'Unknown'}
• Dashboard Metrics: ${JSON.stringify(this.context.metrics || {}, null, 2)}
• Business Health: ${JSON.stringify(this.context.situation || {}, null, 2)}
• Live Forecast State: ${this.context.forecastData ? 'Available and plotted in browser' : 'Not calculated'}
        `;

        const contextData = `${visualContext}\n\n${toolContext}`;

        if (client) {
            try {
                // ⚡ SPEED OVERRIDE: If we have a forecast, skip LLM to guarantee <3s latency
                if (toolResults.getForecast?.result) {
                    console.log('⚡ Skipping LLM for Forecast to ensure speed & accuracy.');
                    return this.generateLocalResponse(query, toolResults);
                }

                const systemPrompt = `You are Cashly AI — a precise financial assistant for Indian MSMEs.

=== NON-NEGOTIABLE RULES ===
1. **ANSWER THE QUESTION DIRECTLY** — Your very first sentence must be the direct answer. No greetings, no "I'll help you with...", no preamble.
2. **ONLY use data provided** — Never invent or estimate figures. If data is missing, say so explicitly.
3. **MATCH THE DASHBOARD** — If the VISUAL DASHBOARD STATE contradicts tool results, use the dashboard figures (that's what the user sees).
4. **NO FILLER** — Do not say "Great question!", "Of course!", "I'm Cashly", or any intro phrase.

USER'S EXACT QUESTION: "${query}"

VISUAL DASHBOARD STATE (use these figures first — they match what user sees):
${visualContext}

TOOL DATA (detailed breakdown):
${toolContext}

=== FORMAT RULES ===
- Use **## Heading** for the main topic (matches the question, e.g. "## Burn Rate" or "## Expense Breakdown")
- Use **bold** for all ₹ amounts and key metrics
- Use bullet lists with emoji icons (✅ good, ⚠️ risk, 💡 tip, 📈 revenue, 📉 expense)
- Use > blockquote for strategic insights
- Keep responses concise and scannable — no walls of text
- ₹ symbol before all Indian rupee values

Remember: Start with the direct answer. Do NOT contradict the dashboard.`;

                const completion = await client.chat.completions.create({
                    model: modelName,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: query }
                    ],
                    max_tokens: 1500,
                    temperature: 0.5
                }, { timeout: 2800 }); // <3s Latency Guarantee

                return completion.choices[0].message.content;
            } catch (error) {
                console.error('LLM API Error/Timeout:', error.status || 'Timeout', error.message);
                console.log('Falling back to local logic for speed.');
            }
        }

        // Local fallback
        return this.generateLocalResponse(query, toolResults);
    }

    // Smart local response - answers specific questions directly
    generateLocalResponse(query, toolResults) {
        const q = query.toLowerCase();
        const { metrics, situation, currentCash } = this.context; // Visual context from frontend

        if (q.includes('hello') || q.includes('hi ') || q === 'hi' || q.includes('hey')) {
            // Instead of a generic greeting, immediately summarise what we know
            if (metrics && metrics.totalRevenue !== undefined) {
                const isProfitable = (metrics.netProfit || 0) >= 0;
                return `**Here's your business at a glance:**\n\n- **Revenue:** ₹${(metrics.totalRevenue || 0).toLocaleString('en-IN')}\n- **Expenses:** ₹${(metrics.totalExpenses || 0).toLocaleString('en-IN')}\n- **Net Profit:** ₹${(metrics.netProfit || 0).toLocaleString('en-IN')} ${isProfitable ? '✅' : '⚠️'}\n- **Burn Rate:** ₹${(metrics.burnRate || 0).toLocaleString('en-IN')}/day\n\nAsk me anything specific — expenses, revenue trends, risks, or forecasts.`;
            }
            return `Ask me anything about your finances — expenses, revenue, burn rate, risks, or forecasts. I'll answer directly from your uploaded data.`;
        }

        // PRIORITIZE VISUAL CONTEXT (MATCH THE DASHBOARD)
        if (metrics && (q.includes('revenue') || q.includes('sales') || q.includes('income'))) {
            return `## 📈 Total Revenue\n\nYour **total revenue** is **₹${metrics.totalSales?.toLocaleString() || 0}**.`;
        }

        if (metrics && (q.includes('expense') || q.includes('cost') || q.includes('spending'))) {
            return `## 📉 Total Expenses\n\nYour **total expenses** are **₹${metrics.totalExpenses?.toLocaleString() || 0}**.`;
        }

        if (currentCash && (q.includes('balance') || q.includes('cash') || q.includes('how much money'))) {
            return `## 💰 Cash Balance\n\nYour current cash balance is **₹${currentCash.toLocaleString()}**.`;
        }

        const cashFlow = toolResults.getCashFlow?.result;
        const sales = toolResults.getSalesData?.result;
        const expenses = toolResults.getExpensesData?.result;
        const receivables = toolResults.getReceivables?.result;
        const risks = toolResults.analyzeRisks?.result;
        const forecast = toolResults.getForecast?.result;

        // Check if we have NO data at all
        if (!cashFlow && !sales && !expenses && !receivables && !forecast) {
            return `## ⚠️ No Financial Data Found\n\nI couldn't find any financial transactions for your business. Please upload data via the **Upload** page first.`;
        }

        // Average expense
        if (q.includes('average') && (q.includes('expense') || q.includes('spending'))) {
            if (expenses) {
                return `## 💰 Average Expense\n\nYour **average expense** is **₹${expenses.averageExpense?.toLocaleString() || 0}** per transaction.\n\n- Total: ₹${expenses.totalExpenses?.toLocaleString()}\n- Transactions: ${expenses.transactionCount}`;
            }
        }

        // Reduce Expenses / Cut Costs
        if ((q.includes('reduce') || q.includes('cut') || q.includes('save')) && (q.includes('expense') || q.includes('cost') || q.includes('spending'))) {
            if (expenses && expenses.topCategories && expenses.topCategories.length > 0) {
                const top = expenses.topCategories[0];
                return `## 📉 Expense Reduction Analysis\n\nYour highest spending category is **${top.category}** (₹${top.amount.toLocaleString()}).\n\n**Recommendation:**\nReview your **${top.category}** expenses first as they make up a significant portion of your outflow. Cutting this by even 10% could save you **₹${Math.round(top.amount * 0.1).toLocaleString()}**.`;
            } else if (expenses) {
                return `## 📉 Reduce Expenses\n\nYou have spent a total of **₹${expenses.totalExpenses?.toLocaleString()}**.\n\nI recommend reviewing your detailed expense validation report to identify specific anomalies/outliers.`;
            }
        }

        // Total expense
        if ((q.includes('total') || q.includes('how much')) && q.includes('expense')) {
            if (expenses) {
                return `## 📊 Total Expenses\n\nYour **total expenses** are **₹${expenses.totalExpenses?.toLocaleString() || 0}** across **${expenses.transactionCount}** transactions.`;
            }
        }

        // Total sales
        if ((q.includes('total') || q.includes('how much')) && (q.includes('sales') || q.includes('revenue') || q.includes('income'))) {
            const totalSales = sales?.totalSales || cashFlow?.totalSales || 0;
            return `## 📈 Total Revenue\n\nYour **total revenue** is **₹${totalSales.toLocaleString()}**.`;
        }

        // Cash Flow
        if (q.includes('cash flow') || q.includes('cashflow') || q.includes('how is my business')) {
            if (cashFlow) {
                const stat = cashFlow.netCashFlow >= 0 ? '✅ Healthy' : '⚠️ Risk';
                return `## 💰 Cash Flow Analysis\n\nYour business cash flow is currently **${stat}**.\n\n*   **Net Cash Flow:** ₹${cashFlow.netCashFlow?.toLocaleString()}\n*   **Revenue:** ₹${cashFlow.totalSales?.toLocaleString()}\n*   **Expenses:** ₹${cashFlow.totalExpenses?.toLocaleString()}\n\n> **Insight:** Maintaining a positive net flow is critical for your long-term runway and operational health.`;
            }
        }

        // Overdue
        if (q.includes('overdue') || q.includes('who owes')) {
            if (receivables) {
                return `## ⚠️ Collection Alerts\n\nYou have **${receivables.overdueCount || 0} overdue invoices** requiring immediate attention.\n\n*   **Total Overdue:** ₹${receivables.overdueAmount?.toLocaleString() || 0}\n*   **Pending Count:** ${receivables.overdueCount || 0}\n\n💡 **Recommendation:** We suggest following up with these clients today to accelerate your cash inflow.`;
            }
        }

        // Risks
        if (q.includes('risk') || q.includes('problem')) {
            if (risks && risks.riskCount > 0) {
                let resp = `## ⚠️ Business Risk Analysis\n\n**${risks.riskCount} risks identified:**\n\n`;
                risks.risks?.forEach((r, i) => {
                    resp += `### ${i + 1}. ${r.title}\n${r.description}\n\n`;
                });
                return resp;
            } else {
                return `## ✅ Risk Assessment\n\nNo significant risks detected!`;
            }
        }

        // Forecast / Next Month
        if (q.includes('forecast') || q.includes('predict') || q.includes('next month') || q.includes('future') || q.includes('projection')) {
            const forecast = toolResults.getForecast?.result;
            if (forecast) {
                return `## 🔭 Future Forecast\n\n${forecast.formatted}\n\n- **Projected Status:** ${forecast.status}\n- **Ending Balance:** ₹${forecast.endingBalance?.toLocaleString()}`;
            }
        }

        return this.generateFullReport(cashFlow, sales, expenses, receivables, risks);
    }
    generateFullReport(cashFlow, sales, expenses, receivables, risks) {
        let resp = '## 📊 Financial Overview\n\n';

        // Robust fallback: Calculate from individual tools if cashFlow tool wasn't run
        const revenue = cashFlow?.totalSales || sales?.totalSales || 0;
        const exp = cashFlow?.totalExpenses || expenses?.totalExpenses || 0;
        const net = cashFlow?.netCashFlow !== undefined ? cashFlow.netCashFlow : (revenue - exp);

        resp += `- Net Cash Flow: **₹${net.toLocaleString()}**\n`;
        resp += `- Revenue: ₹${revenue.toLocaleString()}\n`;
        resp += `- Expenses: ₹${exp.toLocaleString()}\n\n`;

        if (risks && risks.riskCount > 0) {
            resp += `### ⚠️ Risks Detected\n${risks.risks[0].title}: ${risks.risks[0].description}`;
        } else {
            resp += `*Your financial data has been analyzed successfully.*`;
        }
        return resp;
    }
}

module.exports = CashlyAgent;
