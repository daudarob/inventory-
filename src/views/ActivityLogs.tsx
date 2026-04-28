import { useState, useEffect } from 'react';
import { logService } from '../services/firebaseService';
import { useAuth } from '../AuthContext';
import { Clock, User as UserIcon, Shield, Database, ChevronRight, DollarSign, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    return logService.subscribeToLogs(setLogs);
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action?.toLowerCase().includes(search.toLowerCase()) || 
    log.shopkeeperName?.toLowerCase().includes(search.toLowerCase()) ||
    log.details?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadCSV = () => {
    const headers = ['Action', 'User', 'Details', 'Reference', 'Timestamp'];
    const rows = filteredLogs.map(log => [
      log.action,
      log.shopkeeperName,
      `"${log.details || ''}"`,
      log.id,
      new Date(log.timestamp?.toDate ? log.timestamp.toDate() : Date.now()).toLocaleString()
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
      link.setAttribute('download', `audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // subscribeToLogs is already real-time, but this gives visual confirmation
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-8">
      <div className="glass-card overflow-hidden shadow-2xl ring-1 ring-white/10">
        <div className="p-10 border-b border-white/5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white/[0.01]">
          <div>
            <h4 className="text-2xl font-bold tracking-tight text-white mb-1">Enterprise Audit Ledger</h4>
            <p className="text-sm font-medium text-white/30 tracking-wide uppercase text-[10px] tracking-[0.2em]">Immutable Real-time Action Tracking</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <div className="relative group flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-indigo-400 transition-colors">
                <Database size={16} />
              </div>
              <input 
                type="text"
                placeholder="Search audit stream..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full glass-card bg-white/5 border-white/10 rounded-xl pl-12 pr-5 py-3 text-sm focus:border-indigo-500/50 text-white placeholder:text-white/20 transition-all outline-none"
              />
            </div>
            
            <div className="flex gap-3">
               <button 
                onClick={handleDownloadCSV}
                className="flex-1 sm:flex-none px-6 py-3 glass-card bg-white/5 hover:bg-white/10 border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 hover:text-white transition-all active:scale-95"
               >
                 Download CSV
               </button>
               <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex-1 sm:flex-none px-6 py-3 glass-card bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 transition-all active:scale-95 flex items-center justify-center gap-2"
               >
                 <Shield size={14} className={cn(isRefreshing && "animate-spin")} />
                 {isRefreshing ? 'Syncing...' : 'Refresh Sync'}
               </button>
            </div>
          </div>
        </div>

        <div className="p-0 overflow-y-auto max-h-[75vh] custom-scrollbar bg-[#0f172a]/50">
          {filteredLogs.length > 0 ? (
            <div className="divide-y divide-white/5">
              {filteredLogs.map((log, idx) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-8 hover:bg-white/[0.02] transition-all flex items-start gap-8 group border-l-4 border-l-transparent hover:border-l-indigo-500"
                >
                  <div className="w-12 h-12 glass-card bg-white/5 border-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all duration-300 shadow-lg text-white/40 group-hover:text-indigo-400">
                    {log.action?.toLowerCase().includes('sale') || log.action?.toLowerCase().includes('order') ? <DollarSign size={20} /> : 
                     log.action?.toLowerCase().includes('stock') ? <Package size={20} /> : <UserIcon size={20} />}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{log.action || 'Core Protocol Execution'}</div>
                      <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] flex items-center gap-2.5 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-md">
                        <Clock size={12} className="text-white/40" />
                        {new Date(log.timestamp?.toDate ? log.timestamp.toDate() : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                    <p className="text-[15px] text-white/50 font-medium leading-relaxed max-w-3xl">
                      <strong className="text-white font-bold">{log.shopkeeperName}</strong> {log.details || 'authorized an encrypted system operation.'}
                    </p>
                    <div className="pt-3 flex items-center gap-4">
                       <span className="text-[9px] font-bold text-white/20 bg-white/5 px-3 py-1 rounded-full border border-white/5 uppercase tracking-[0.2em]">
                         Reference: {log.id?.slice(0, 12)}
                       </span>
                       <div className="h-1 w-1 bg-white/10 rounded-full"></div>
                       <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
                         {new Date(log.timestamp?.toDate ? log.timestamp.toDate() : Date.now()).toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' })}
                       </span>
                    </div>
                  </div>
                  
                  <ChevronRight size={20} className="text-white/10 group-hover:text-indigo-500 transition-all self-center transform group-hover:translate-x-1" />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center px-12">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-10 backdrop-blur-3xl border border-white/5 shadow-2xl">
                <Database className="text-white/10" size={48} />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">Audit Stream Offline</h3>
              <p className="text-sm text-white/30 max-w-sm font-medium leading-relaxed">System is awaiting initial telemetry. Administrative operations and trade executions will be logged here in real-time.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
