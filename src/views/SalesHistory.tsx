import { useState, useEffect, useMemo } from 'react';
import { orderService } from '../services/firebaseService';
import { Clock, Search, Filter, ArrowUpRight, Download, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SalesHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    return orderService.subscribeToOrders(setOrders);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = (o.clientName?.toLowerCase().includes(search.toLowerCase()) || o.id?.toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;
      
      if (filter === 'All') return true;
      if (filter === 'Paid') return o.paymentStatus === 'Paid';
      if (filter === 'Pending') return o.paymentStatus !== 'Paid';
      if (filter === 'Wholesale') return o.type === 'Wholesale';
      return true;
    });
  }, [orders, search, filter]);

  const stats = useMemo(() => {
    const totalVolume = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const count = filteredOrders.length;
    const avg = count ? Math.round(totalVolume / count) : 0;
    return { totalVolume, count, avg };
  }, [filteredOrders]);

  const handleGenerateReport = () => {
    // Basic CSV Generation
    const headers = ['Order ID', 'Client', 'Type', 'Total (Le)', 'Status', 'Date'];
    const rows = filteredOrders.map(o => [
      o.id,
      o.clientName,
      o.type,
      o.total,
      o.paymentStatus,
      new Date(o.timestamp?.toDate ? o.timestamp.toDate() : Date.now()).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 print:p-0">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Transaction Ledger</h2>
          <p className="text-sm text-white/40 font-medium uppercase tracking-[0.2em]">Verified archival of all enterprise sales & exchanges</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="relative flex-1 xl:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Search by ID or Client..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 glass-card border-white/10 text-sm focus:outline-none focus:border-indigo-500/50 text-white placeholder:text-white/20"
            />
          </div>

          <div className="glass-card p-1 flex items-center bg-white/5 border-white/10">
            {['All', 'Paid', 'Pending', 'Wholesale'].map(tag => (
              <button 
                key={tag}
                onClick={() => setFilter(tag)}
                className={cn(
                  "px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                  filter === tag ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-white/40 hover:text-white"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="glass-card p-6 bg-white/[0.02]">
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Total Volume</p>
           <p className="text-2xl font-bold text-white">Le {stats.totalVolume.toLocaleString()}</p>
        </div>
        <div className="glass-card p-6 bg-white/[0.02]">
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Transaction Count</p>
           <p className="text-2xl font-bold text-white">{stats.count}</p>
        </div>
        <div className="glass-card p-6 bg-white/[0.02]">
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Average Ticket</p>
           <p className="text-2xl font-bold text-white">Le {stats.avg.toLocaleString()}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01] print:hidden">
          <h4 className="text-xl font-bold tracking-tight text-white">Execution Registry</h4>
          <button 
            onClick={handleGenerateReport}
            className="flex items-center gap-2 px-6 py-3 glass-card bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all rounded-xl text-[10px] font-bold uppercase tracking-widest"
          >
            <Download size={14} />
            Generate Report
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-10 py-5">Protocol ID</th>
                <th className="px-10 py-5">Entitiy / Client</th>
                <th className="px-10 py-5">Exchange Type</th>
                <th className="px-10 py-5 text-right">Value (Le)</th>
                <th className="px-10 py-5">Clearance Status</th>
                <th className="px-10 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.map((order, idx) => (
                <motion.tr 
                  key={order.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-10 py-6 font-mono text-[11px] text-white/40 group-hover:text-white transition-colors">
                    {order.id?.slice(0, 14)}...
                  </td>
                  <td className="px-10 py-6">
                    <div className="font-bold text-white group-hover:text-indigo-400 transition-colors text-base">{order.clientName || 'Unregistered Stakeholder'}</div>
                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">AUTH: {order.shopkeeperName?.split(' ')[0]}</div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-md border",
                      order.type === 'Wholesale' ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    )}>
                      {order.type}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right font-bold text-white font-mono text-base">
                    {order.total?.toLocaleString()}
                  </td>
                  <td className="px-10 py-6">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest backdrop-blur-md",
                      order.paymentStatus === 'Paid' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}>
                      {order.paymentStatus === 'Paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {order.paymentStatus}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="p-3 glass-card bg-white/5 border-white/5 text-white/30 hover:text-white hover:border-white/20 transition-all rounded-xl"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-xl print:hidden"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-3xl glass-card relative z-10 overflow-hidden shadow-2xl border-white/10 print:shadow-none print:border-none print:bg-white print:text-black print:max-w-none print:static"
            >
              <div className="p-10 border-b border-white/5 bg-white/[0.02] flex items-center justify-between print:bg-white print:border-black/10">
                <div>
                  <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 print:text-black/50">Protocol Review</h4>
                  <h2 className="text-2xl font-bold text-white tracking-tight print:text-black">Order Details: {selectedOrder.id?.slice(0, 8)}</h2>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-3 text-white/20 hover:text-white hover:bg-white/5 rounded-2xl transition-all print:hidden">
                   <AlertCircle size={24} className="rotate-45" />
                </button>
              </div>

              <div className="p-10 print:text-black">
                 <div className="grid grid-cols-2 gap-10 mb-10">
                    <div className="space-y-4">
                       <h5 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] print:text-black/50">Initiated Asset Holder</h5>
                       <div className="glass-card p-5 border-white/5 bg-white/[0.02] print:bg-transparent print:border-black/10">
                          <p className="font-bold text-white text-lg print:text-black">{selectedOrder.clientName}</p>
                          <p className="text-xs text-white/40 mt-1 uppercase font-bold tracking-widest print:text-black/60">{selectedOrder.type} Protocol</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h5 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] print:text-black/50">Transaction Metadata</h5>
                       <div className="glass-card p-5 border-white/5 bg-white/[0.02] print:bg-transparent print:border-black/10">
                          <p className="text-xs text-white/60 font-bold uppercase tracking-widest mb-1 print:text-black/80">Status: <span className="text-emerald-400 print:text-emerald-600">{selectedOrder.paymentStatus}</span></p>
                          <p className="text-[10px] text-white/40 font-mono tracking-widest print:text-black/60">TS: {new Date(selectedOrder.timestamp?.toDate ? selectedOrder.timestamp.toDate() : Date.now()).toLocaleString()}</p>
                       </div>
                    </div>
                 </div>

                 <h5 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 print:text-black/50">Itemized Ledger</h5>
                 <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2 print:max-h-none print:overflow-visible">
                    {selectedOrder.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 glass-card border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors print:bg-transparent print:border-black/10">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 glass-card bg-indigo-500/10 flex items-center justify-center text-xl print:bg-indigo-100">
                              📦
                           </div>
                           <div>
                              <p className="font-bold text-white text-sm print:text-black">{item.name}</p>
                              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest print:text-black/60">Qty: {item.quantity}</p>
                           </div>
                        </div>
                        <p className="font-bold text-white font-mono print:text-black">Le {item.total?.toLocaleString()}</p>
                      </div>
                    ))}
                 </div>

                 <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between print:border-black/10">
                    <div>
                       <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] print:text-black/50">Aggregate Valuation</p>
                       <p className="text-3xl font-bold text-white mt-1 print:text-black">Le {selectedOrder.total?.toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={handlePrint}
                      className="px-10 py-5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95 print:hidden"
                    >
                       Print Manifest
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
