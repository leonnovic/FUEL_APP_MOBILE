'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useFuelStore } from '@/store/fuel-store';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Pre-built responses based on fuel management queries (used as fallback)
function generateResponse(query: string): string {
  const q = query.toLowerCase();
  const store = useFuelStore.getState();
  const salesArr = Object.values(store.salesHistory);
  const totalRevenue = salesArr.reduce((s, sale) => s + sale.totalSales, 0);
  const totalFuel = salesArr.reduce((s, sale) => s + sale.pmsSalesL + sale.agoSalesL, 0);
  const totalExpenses = store.expenses.reduce((s, e) => s + e.amount, 0);
  const clientsArr = Object.values(store.clients);
  const totalDebt = clientsArr.reduce((s, c) => s + c.balanceDue, 0);
  const netProfit = totalRevenue - totalExpenses;

  if (q.includes('revenue') || q.includes('sales') || q.includes('income')) {
    return `📊 **Revenue Overview**\n\n• Total Revenue: Ksh ${totalRevenue.toLocaleString()}\n• Net Profit: Ksh ${netProfit.toLocaleString()}\n• Today's Sales: ${salesArr.filter(s => s.date === new Date().toISOString().slice(0,10)).reduce((sum, s) => sum + s.totalSales, 0).toLocaleString()} Ksh\n\nYour revenue is ${netProfit > 0 ? 'healthy' : 'under pressure'}. ${netProfit > totalRevenue * 0.5 ? 'Profit margin is strong at ' + ((netProfit / totalRevenue) * 100).toFixed(1) + '%.' : 'Consider reviewing expenses to improve margins.'}`;
  }

  if (q.includes('fuel') || q.includes('petrol') || q.includes('diesel') || q.includes('pms') || q.includes('ago')) {
    const pmsSold = salesArr.reduce((s, sale) => s + sale.pmsSalesL, 0);
    const agoSold = salesArr.reduce((s, sale) => s + sale.agoSalesL, 0);
    return `⛽ **Fuel Status**\n\n• PMS (Super Petrol): ${pmsSold.toLocaleString()} L sold @ Ksh ${store.pmsPrice || 212.36}/L\n• AGO (Diesel): ${agoSold.toLocaleString()} L sold @ Ksh ${store.agoPrice || 199.47}/L\n• Total Volume: ${totalFuel.toLocaleString()} L\n\n${store.fuelTypes.length > 0 ? 'Tank levels: ' + store.fuelTypes.map(f => `${f.name}: ${f.currentLevel.toLocaleString()}/${f.tankCapacity.toLocaleString()}L`).join(', ') : 'No tank data available.'}`;
  }

  if (q.includes('expense') || q.includes('cost') || q.includes('spending')) {
    const byCategory: Record<string, number> = {};
    store.expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    return `💰 **Expense Analysis**\n\n• Total Expenses: Ksh ${totalExpenses.toLocaleString()}\n• Categories: ${Object.keys(byCategory).length}\n• Highest: ${topCategory ? topCategory[0] + ' (Ksh ' + topCategory[1].toLocaleString() + ')' : 'N/A'}\n\nExpense-to-Revenue ratio: ${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) + '%' : 'N/A'}`;
  }

  if (q.includes('debt') || q.includes('client') || q.includes('balance') || q.includes('owe')) {
    return `📋 **Debt Overview**\n\n• Total Balance Due: Ksh ${totalDebt.toLocaleString()}\n• Active Clients: ${clientsArr.length}\n${clientsArr.map(c => `• ${c.name}: Ksh ${c.balanceDue.toLocaleString()}`).join('\n')}\n\n${totalDebt > 0 ? '⚠️ Consider following up on overdue payments.' : '✅ All client balances are clear!'}`;
  }

  if (q.includes('employee') || q.includes('staff') || q.includes('team') || q.includes('payroll')) {
    const activeStaff = store.employees.filter(e => e.status === 'active');
    return `👥 **Team Overview**\n\n• Total Staff: ${store.employees.length}\n• Active: ${activeStaff.length}\n• Monthly Payroll: Ksh ${activeStaff.reduce((s, e) => s + e.salary, 0).toLocaleString()}\n\nRoles: ${[...new Set(activeStaff.map(e => e.role))].join(', ')}`;
  }

  if (q.includes('tank') || q.includes('level') || q.includes('stock') || q.includes('inventory')) {
    const lowFuel = store.fuelTypes.filter(f => f.tankCapacity > 0 && (f.currentLevel / f.tankCapacity) < 0.2);
    return `📦 **Tank Levels**\n\n${store.fuelTypes.map(f => {
      const pct = f.tankCapacity > 0 ? ((f.currentLevel / f.tankCapacity) * 100).toFixed(0) : 'N/A';
      return `• ${f.name}: ${f.currentLevel.toLocaleString()}/${f.tankCapacity.toLocaleString()}L (${pct}%)`;
    }).join('\n')}\n\n${lowFuel.length > 0 ? '⚠️ Low stock alert: ' + lowFuel.map(f => f.name).join(', ') + ' below 20%!' : '✅ All tanks at adequate levels.'}`;
  }

  if (q.includes('help') || q.includes('what can')) {
    return `🤖 **FuelPro AI Assistant**\n\nI can help you with:\n• **Revenue** - Sales and income overview\n• **Fuel** - Petrol/diesel prices and volumes\n• **Expenses** - Cost analysis and breakdowns\n• **Debt** - Client balances and overdue payments\n• **Team** - Staff and payroll information\n• **Tank Levels** - Stock and inventory status\n• **Tips** - Business optimization suggestions\n\nJust ask me anything about your fuel station!`;
  }

  if (q.includes('tip') || q.includes('suggest') || q.includes('improve') || q.includes('optimize')) {
    const tips = [
      '💡 Consider implementing dynamic pricing during peak hours to maximize revenue.',
      '💡 Track your pump calibration regularly to minimize fuel losses.',
      '💡 Set up automatic reorders when tank levels drop below 25% capacity.',
      '💡 Review your expense categories monthly to identify cost-cutting opportunities.',
      '💡 Cross-train attendants on both PMS and AGO pumps for better shift coverage.',
      '💡 Implement a loyalty program for repeat customers to boost sales volume.',
    ];
    return tips[Math.floor(Math.random() * tips.length)] + '\n\nWant more tips? Just ask!';
  }

  // Default response
  return `I understand you're asking about "${query}". Here's a quick summary of your station:\n\n• Revenue: Ksh ${totalRevenue.toLocaleString()}\n• Fuel Sold: ${totalFuel.toLocaleString()} L\n• Expenses: Ksh ${totalExpenses.toLocaleString()}\n• Debt Owed: Ksh ${totalDebt.toLocaleString()}\n\nTry asking about specific topics like "revenue", "fuel", "expenses", "debt", "team", or "tank levels" for detailed insights!`;
}

// Build station context string from the store for the API
function buildStationContext(): string {
  const store = useFuelStore.getState();
  const salesArr = Object.values(store.salesHistory);
  const totalRevenue = salesArr.reduce((s, sale) => s + sale.totalSales, 0);
  const totalFuel = salesArr.reduce((s, sale) => s + sale.pmsSalesL + sale.agoSalesL, 0);
  const totalExpenses = store.expenses.reduce((s, e) => s + e.amount, 0);
  const clientsArr = Object.values(store.clients);
  const totalDebt = clientsArr.reduce((s, c) => s + c.balanceDue, 0);
  const netProfit = totalRevenue - totalExpenses;
  const activeStaff = store.employees.filter(e => e.status === 'active');
  const monthlyPayroll = activeStaff.reduce((s, e) => s + e.salary, 0);

  const pmsSold = salesArr.reduce((s, sale) => s + sale.pmsSalesL, 0);
  const agoSold = salesArr.reduce((s, sale) => s + sale.agoSalesL, 0);

  const contextParts: string[] = [
    `Station: ${store.companyData.name}`,
    `Total Revenue: Ksh ${totalRevenue.toLocaleString()}`,
    `Net Profit: Ksh ${netProfit.toLocaleString()}`,
    `Total Expenses: Ksh ${totalExpenses.toLocaleString()}`,
    `Total Debt Owed by Clients: Ksh ${totalDebt.toLocaleString()}`,
    `PMS Price: Ksh ${store.pmsPrice}/L | AGO Price: Ksh ${store.agoPrice}/L`,
    `PMS Sold: ${pmsSold.toLocaleString()} L | AGO Sold: ${agoSold.toLocaleString()} L`,
    `Total Fuel Sold: ${totalFuel.toLocaleString()} L`,
    `Active Staff: ${activeStaff.length} | Monthly Payroll: Ksh ${monthlyPayroll.toLocaleString()}`,
    `Active Clients: ${clientsArr.length}`,
  ];

  if (store.fuelTypes.length > 0) {
    const tankInfo = store.fuelTypes.map(f =>
      `${f.name}: ${f.currentLevel.toLocaleString()}/${f.tankCapacity.toLocaleString()}L (${f.tankCapacity > 0 ? ((f.currentLevel / f.tankCapacity) * 100).toFixed(0) : 'N/A'}%)`
    ).join(', ');
    contextParts.push(`Tank Levels: ${tankInfo}`);
  }

  if (clientsArr.length > 0) {
    const clientDebts = clientsArr.map(c => `${c.name}: Ksh ${c.balanceDue.toLocaleString()}`).join(', ');
    contextParts.push(`Client Balances: ${clientDebts}`);
  }

  if (store.expenses.length > 0) {
    const byCategory: Record<string, number> = {};
    store.expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      contextParts.push(`Top Expense Category: ${topCategory[0]} (Ksh ${topCategory[1].toLocaleString()})`);
    }
  }

  return contextParts.join('\n');
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 Welcome to FuelPro AI Assistant!\n\nI can help you analyze your fuel station data, track sales, monitor inventory, and provide business insights.\n\nTry asking me about your revenue, fuel levels, expenses, or debt!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const queryText = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      // Build context from current store state
      const context = buildStationContext();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          context,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.response) {
        throw new Error('Empty response from API');
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.warn('[AI Chatbot] API call failed, falling back to local response:', error);

      // Fallback to the hardcoded generateResponse function
      const fallbackResponse = generateResponse(queryText);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Show a subtle toast notification about the fallback
      toast.warning('Using offline mode', {
        description: 'AI service unavailable. Showing local insights.',
        duration: 3000,
      });
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'Revenue overview',
    'Fuel levels',
    'Expense analysis',
    'Debt status',
  ];

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 size-12 rounded-full bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/25 flex items-center justify-center transition-all hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <MessageSquare className="size-5" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-16 md:bottom-6 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/30 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="size-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">FuelPro AI</h3>
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[8px] font-medium border-amber-500/40 text-amber-400 bg-amber-500/10 gap-0.5"
                  >
                    <Zap className="size-2.5" />
                    AI Powered
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-400">Online</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 text-slate-400 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`size-7 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'assistant'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <Bot className="size-3.5" />
                    ) : (
                      <User className="size-3.5" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-amber-500/20 text-amber-100'
                    }`}
                  >
                    {msg.content.split('\n').map((line, i) => (
                      <span key={i}>
                        {line.startsWith('•') ? (
                          <span className="block ml-2">{line}</span>
                        ) : line.startsWith('**') ? (
                          <strong className="text-white font-semibold">
                            {line.replace(/\*\*/g, '')}
                          </strong>
                        ) : (
                          line
                        )}
                        {i < msg.content.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2">
                  <div className="size-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Bot className="size-3.5" />
                  </div>
                  <div className="bg-slate-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="size-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="size-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-2.5 py-1 rounded-full text-[10px] bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your station..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 text-xs h-9"
                disabled={isTyping}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black size-9 p-0 shrink-0 disabled:opacity-50"
              >
                {isTyping ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
