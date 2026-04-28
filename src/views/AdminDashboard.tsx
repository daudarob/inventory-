import { useState, useEffect, useMemo } from 'react';
import { productService, orderService, clientService, insightService } from '../services/firebaseService';
import { TrendingUp, TrendingDown, Package, DollarSign, Clock, AlertCircle, Zap, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import SeedDataButton from '../components/SeedDataButton';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    const unsubProducts = productService.subscribeToProducts(setProducts);
    const unsubOrders = orderService.subscribeToOrders(setOrders);
    const unsubClients = clientService.subscribeToClients(setClients);
    const unsubInsights = insightService.subscribeToInsights(setInsights);

    return () => {
      unsubProducts();
      unsubOrders();
      unsubClients();
      unsubInsights();
    };
  }, []);

  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + (o.total || 0), 0), [orders]);
  const totalUnits = useMemo(() => orders.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0), 0), [orders]);
  const lowStockCount = useMemo(() => products.filter(p => p.stock <= (p.minStockAlert || 10)).length, [products]);
  const pendingPayments = useMemo(() => orders.filter(o => o.paymentStatus !== 'Paid').length, [orders]);

  const [chartRange, setChartRange] = useState<'month' | 'week'>('month');

  return (
    <div className="space-y-8">
      {products.length === 0 && (
        <div className="flex items-center justify-between p-6 glass-card bg-indigo-500/10 border-indigo-500/20">
          <p className="text-sm font-medium text-indigo-300">Get started by seeding demo data into your enterprise.</p>
          <SeedDataButton />
        </div>
      )}
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `Le ${(totalRevenue / 1000).toFixed(1)}K`, sub: '↑ 12%', accent: 'bg-emerald-500', icon: DollarSign, textColor: 'text-emerald-400', view: 'sales' },
          { label: 'Units Sold', value: totalUnits.toLocaleString(), sub: '↑ 8%', accent: 'bg-indigo-500', icon: Package, textColor: 'text-indigo-400', view: 'sales' },
          { label: 'Pending Payments', value: pendingPayments, sub: 'Needs follow-up', accent: 'bg-amber-500', icon: Clock, textColor: 'text-amber-400', view: 'sales' },
          { label: 'Low Stock Items', value: lowStockCount, sub: 'Needs restock', accent: 'bg-rose-500', icon: AlertCircle, textColor: 'text-rose-400', view: 'inventory' }
        ].map((item, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onNavigate(item.view)}
            className="glass-card p-6 relative overflow-hidden group hover:bg-white/[0.05] transition-all cursor-pointer active:scale-95"
          >
            {/* Accent Line */}
            <div className={cn("absolute top-0 left-0 w-full h-1", item.accent)}></div>
            
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] uppercase font-bold text-white/30 tracking-[0.2em]">{item.label}</p>
              <item.icon size={16} className="text-white/20 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-3xl font-bold font-sans tracking-tight text-white mb-1">{item.value}</h3>
            <p className="text-xs text-white/40 flex items-center gap-1 font-medium">
              <span className={item.textColor}>{item.sub}</span> 
              this period
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h4 className="text-xl font-bold tracking-tight text-white">Sales Trajectory</h4>
              <p className="text-sm text-white/40">Performance across channels</p>
            </div>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-md">
              <button 
                onClick={() => setChartRange('month')}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all",
                  chartRange === 'month' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-white/40 hover:text-white"
                )}
              >
                Month
              </button>
              <button 
                onClick={() => setChartRange('week')}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all",
                  chartRange === 'week' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-white/40 hover:text-white"
                )}
              >
                Week
              </button>
            </div>
          </div>
          
          <div className="h-64 flex items-end gap-3 group/chart">
            {Array.from({ length: 14 }).map((_, i) => {
              const h1 = Math.random() * 70 + 20;
              const h2 = Math.random() * 30 + 10;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="w-full flex items-end gap-0.5 h-full relative">
                    <div 
                      className="flex-1 bg-indigo-500/40 hover:bg-indigo-500 rounded-t-md transition-all relative group/bar backdrop-blur-sm" 
                      style={{ height: `${h1}%` }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 glass-card bg-indigo-500/90 text-white text-[9px] py-1 px-2 rounded-lg opacity-0 group-hover/bar:opacity-100 whitespace-nowrap pointer-events-none z-10 transition-all scale-75 group-hover/bar:scale-100">
                        Le {(h1 * 10).toFixed(0)}K
                      </div>
                    </div>
                    <div 
                      className="flex-1 bg-emerald-500/40 hover:bg-emerald-500 rounded-t-md transition-all relative group/bar backdrop-blur-sm" 
                      style={{ height: `${h2}%` }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 glass-card bg-emerald-500/90 text-white text-[9px] py-1 px-2 rounded-lg opacity-0 group-hover/bar:opacity-100 whitespace-nowrap pointer-events-none z-10 transition-all scale-75 group-hover/bar:scale-100">
                        Le {(h2 * 5).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-6 px-2">
            {['1 Apr','7 Apr','14 Apr','21 Apr','28 Apr'].map((d, i) => (
              <span key={i} className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{d}</span>
            ))}
          </div>
        </div>

        {/* AI Insight Sidebar */}
        <div className="glass-card p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
          
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 backdrop-blur-md">
              <Zap size={20} fill="currentColor" />
            </div>
            <h4 className="text-xl font-bold tracking-tight text-white">AI Analyst</h4>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
            {insights.length > 0 ? insights.slice(0, 4).map((insight, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "p-5 rounded-2xl border backdrop-blur-md group hover:bg-white/[0.02] transition-colors relative transition-all",
                  insight.type === 'alert' ? "bg-rose-500/5 border-rose-500/20" :
                  insight.type === 'insight' ? "bg-emerald-500/5 border-emerald-500/20" :
                  "bg-amber-500/5 border-amber-500/20"
                )}
              >
                <p className="text-xs font-medium leading-relaxed text-white/80">
                  {insight.message}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                    {new Date(insight.timestamp?.toDate ? insight.timestamp.toDate() : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button 
                    onClick={() => {
                      const msg = insight.message.toLowerCase();
                      if (msg.includes('stock') || msg.includes('inventory')) onNavigate('inventory');
                      else if (msg.includes('sale') || msg.includes('revenue') || msg.includes('payment')) onNavigate('sales');
                      else onNavigate('intelligence');
                    }}
                    className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-400 hover:text-indigo-300 transition-all active:scale-95 px-2 py-1 rounded hover:bg-indigo-400/10"
                  >
                    Action ↗
                  </button>
                </div>
              </motion.div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <RefreshCcw className="text-white/10 animate-spin-slow mb-6" size={40} />
                <p className="text-white/30 text-sm font-medium">Gathering intelligence...</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            <button 
              onClick={() => onNavigate('analytics')}
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              Run Full Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="glass-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <h4 className="text-xl font-bold tracking-tight text-white">Enterprise Transactions</h4>
          <button 
            onClick={() => onNavigate('sales')}
            className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View Ledger ↗
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-10 py-5">Client</th>
                <th className="px-10 py-5">Origin</th>
                <th className="px-10 py-5 text-right">Value</th>
                <th className="px-10 py-5">Status</th>
                <th className="px-10 py-5">Authorized By</th>
                <th className="px-10 py-5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-10 py-6">
                    <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{order.clientName || 'Walk-in'}</div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border backdrop-blur-md",
                      order.type === 'Wholesale' ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    )}>
                      {order.type}
                    </span>
                  </td>
                  <td className="px-10 py-6 font-mono font-bold text-right text-white">Le {order.total?.toLocaleString()}</td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                       <div className={cn(
                         "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]",
                         order.paymentStatus === 'Paid' ? "bg-emerald-400 shadow-emerald-400/50" : "bg-amber-400 shadow-amber-400/50"
                       )}></div>
                       <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">{order.paymentStatus}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-white/50 font-medium text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-300">
                        {order.shopkeeperName?.charAt(0)}
                      </div>
                      {order.shopkeeperName?.split(' ')[0]}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-white/30 font-bold text-[10px] uppercase tracking-widest">
                    {new Date(order.timestamp?.toDate ? order.timestamp.toDate() : Date.now()).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
