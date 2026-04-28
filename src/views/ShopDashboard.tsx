import { useState, useEffect } from 'react';
import { productService, orderService, clientService, logService } from '../services/firebaseService';
import { useAuth } from '../AuthContext';
import { ShoppingBag, Users, DollarSign, Package, Plus, TrendingUp, Clock, AlertTriangle, History } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ShopDashboardProps {
  onNavigate: (view: string) => void;
}

export default function ShopDashboard({ onNavigate }: ShopDashboardProps) {
  const { user } = useAuth();
  const [mySalesToday, setMySalesToday] = useState(0);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [itemsIssued, setItemsIssued] = useState(0);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  useEffect(() => {
    // In real app, filter orders for this user
    return orderService.subscribeToOrders((orders) => {
      const filtered = orders.filter(o => o.shopkeeperId === user?.uid);
      const today = new Date().toLocaleDateString();
      const todaySales = filtered
        .filter(o => new Date(o.timestamp?.toDate ? o.timestamp.toDate() : Date.now()).toLocaleDateString() === today)
        .reduce((s, o) => s + (o.total || 0), 0);
      setMySalesToday(todaySales);
      setMyOrders(filtered);
    });
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'My Sales Today', value: `Le ${mySalesToday.toLocaleString()}`, accent: 'bg-emerald-500', icon: ShoppingBag },
          { label: 'Transactions', value: myOrders.length, accent: 'bg-indigo-500', icon: Clock },
          { label: 'Pending Payments', value: myOrders.filter(o => o.paymentStatus !== 'Paid').length, accent: 'bg-amber-500', icon: AlertTriangle },
          { label: 'Items Issued', value: myOrders.reduce((s, o) => s + (o.items?.length || 0), 0), accent: 'bg-blue-500', icon: Package }
        ].map((item, idx) => (
          <div key={idx} className="glass-card p-8 relative overflow-hidden group hover:bg-white/[0.05] transition-all">
            <div className={cn("absolute top-0 left-0 w-full h-1", item.accent)}></div>
            <div className="flex justify-between items-start mb-6">
              <p className="text-[10px] uppercase font-bold text-white/30 tracking-[0.2em]">{item.label}</p>
              <item.icon size={20} className="text-white/20 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-3xl font-bold font-sans text-white tracking-tight">{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-8 flex items-start gap-5 backdrop-blur-md">
        <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20"><AlertTriangle size={24} /></div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-amber-400 mb-1 uppercase tracking-[0.2em]">Priority Action: Collections</h4>
          <p className="text-sm text-white/50 leading-relaxed">
            There are <strong>{myOrders.filter(o => o.paymentStatus !== 'Paid').length}</strong> open transactions awaiting full settlement. Ensure effective follow-up protocols are maintained.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8">
           <h4 className="text-xl font-bold mb-8 tracking-tight text-white">Operational Workspace</h4>
           <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Record Order', icon: ShoppingBag, color: 'text-indigo-400', id: 'orders' },
                { label: 'New Client', icon: Users, color: 'text-blue-400', id: 'clients' },
                { label: 'History', icon: History, color: 'text-emerald-400', id: 'sales' },
                { label: 'Inventory', icon: Package, color: 'text-rose-400', id: 'inventory' }
              ].map((act, i) => (
                <button 
                  key={i} 
                  onClick={() => onNavigate(act.id)}
                  className="flex flex-col items-center justify-center gap-5 p-10 glass-card bg-white/[0.02] border-white/5 rounded-[2.5rem] hover:bg-indigo-500/5 hover:border-indigo-500/20 transition-all group active:scale-95"
                >
                  <div className={cn("p-5 rounded-2xl bg-white/5 group-hover:bg-white/10 group-hover:scale-110 transition-all duration-300 backdrop-blur-md shadow-lg", act.color)}>
                    <act.icon size={32} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">{act.label}</span>
                </button>
              ))}
           </div>
        </div>

        <div className="glass-card p-8">
           <h4 className="text-xl font-bold mb-8 tracking-tight text-white">Recent Log Entries</h4>
           <div className="space-y-6">
              {myOrders.slice(0, 5).map((order, i) => (
                <div key={i} className="flex items-start gap-5 p-4 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border backdrop-blur-md",
                    order.paymentStatus === 'Paid' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {order.paymentStatus === 'Paid' ? <DollarSign size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                       <span className="text-sm font-bold text-white">{order.clientName || 'Walk-in'}</span>
                       <span className="text-[11px] font-bold font-mono text-white/80">Le {order.total?.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                      Recorded {order.type} order • {order.items?.length} items
                    </p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
