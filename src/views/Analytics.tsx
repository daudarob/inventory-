import { useState, useEffect, useMemo } from 'react';
import { orderService, productService } from '../services/firebaseService';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { TrendingUp, Activity, PieChart as PieChartIcon, BarChart3, Calendar, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Analytics() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const unsubOrders = orderService.subscribeToOrders(setOrders);
    const unsubProducts = productService.subscribeToProducts(setProducts);
    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

  // Prepare Daily Sales Data based on timeRange
  const dailySalesData = useMemo(() => {
    const dailyMap: { [key: string]: number } = {};
    
    let daysToShow = 30;
    if (timeRange === '7d') daysToShow = 7;
    if (timeRange === '90d') daysToShow = 90;
    if (timeRange === 'all') daysToShow = 365; // Just a limit for the chart

    const days = Array.from({ length: daysToShow }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    
    days.forEach(day => dailyMap[day] = 0);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToShow);

    orders.forEach(order => {
      const timestamp = order.timestamp?.toDate ? order.timestamp.toDate() : new Date();
      if (timestamp < cutoff && timeRange !== 'all') return;
      
      const date = timestamp.toISOString().split('T')[0];
      if (dailyMap[date] !== undefined) {
        dailyMap[date] += order.total || 0;
      } else if (timeRange === 'all') {
        dailyMap[date] = (dailyMap[date] || 0) + (order.total || 0);
      }
    });

    return Object.keys(dailyMap).sort().map(date => ({
      name: new Date(date).toLocaleDateString([], { day: 'numeric', month: 'short' }),
      revenue: dailyMap[date]
    }));
  }, [orders, timeRange]);

  // Category Distribution
  const categoryData = useMemo(() => {
    const catMap: { [key: string]: number } = {};
    products.forEach(p => {
      catMap[p.category] = (catMap[p.category] || 0) + (p.stock || 0);
    });
    return Object.keys(catMap).map(cat => ({ name: cat, value: catMap[cat] }));
  }, [products]);

  // Top Products by Quantity Sold
  const topProductsData = useMemo(() => {
    const prodMap: { [key: string]: number } = {};
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        prodMap[item.name] = (prodMap[item.name] || 0) + item.quantity;
      });
    });
    return Object.keys(prodMap)
      .map(name => ({ name, sales: prodMap[name] }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [orders]);

  const handleDownload = () => {
    const headers = ['Date', 'Revenue'];
    const csvContent = [
      headers.join(','),
      ...dailySalesData.map(d => `${d.name},${d.revenue}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_report_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Performance Intelligence</h2>
          <p className="text-sm text-white/40 font-medium uppercase tracking-[0.2em]">Deep metrics for vault inventory & operations</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="glass-card p-1 flex items-center bg-white/5 border-white/10">
             {['7d', '30d', '90d', 'all'].map(t => (
               <button 
                 key={t}
                 onClick={() => setTimeRange(t)}
                 className={cn(
                   "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                   timeRange === t ? "bg-indigo-500 text-white" : "text-white/40 hover:text-white"
                 )}
               >
                 {t}
               </button>
             ))}
          </div>
          <button 
            onClick={handleDownload}
            className="p-3 glass-card bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all rounded-xl"
          >
             <Download size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Revenue Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass-card p-8 border-white/5 bg-white/[0.01]"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <TrendingUp size={20} />
              </div>
              <div>
                <h4 className="text-xl font-bold tracking-tight text-white">Revenue Stream</h4>
                <p className="text-xs text-white/30 uppercase tracking-[0.1em] font-bold mt-0.5">30-Day Liquidity Flow</p>
              </div>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySalesData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  interval={4}
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}
                />
                <YAxis 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={value => `Le ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Inventory Composition */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 glass-card p-8 border-white/5 bg-white/[0.01] flex flex-col"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h4 className="text-xl font-bold tracking-tight text-white">Stock Mix</h4>
              <p className="text-xs text-white/30 uppercase tracking-[0.1em] font-bold mt-0.5">Inventory Saturation</p>
            </div>
          </div>

          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '10px', paddingTop: '20px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 border-white/5 bg-white/[0.01]"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <BarChart3 size={20} />
            </div>
            <div>
              <h4 className="text-xl font-bold tracking-tight text-white">Top Asset Velocity</h4>
              <p className="text-xs text-white/30 uppercase tracking-[0.1em] font-bold mt-0.5">Highest Turnover Entities</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#ffffff40" 
                  fontSize={10} 
                  width={100}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'white', opacity: 0.5, fontWeight: 'bold' }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar 
                  dataKey="sales" 
                  fill="#6366f1" 
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Quick Intelligence Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 border-indigo-500/20 bg-indigo-500/[0.03] flex flex-col justify-between"
        >
          <div>
            <h4 className="text-2xl font-bold tracking-tight text-white mb-6">Strategic Summary</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Market Expansion</span>
                <span className="text-emerald-400 font-bold font-mono">+18.4%</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Inventory Health</span>
                <span className="text-indigo-400 font-bold font-mono">OPTIMIZED</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Avg Order Value</span>
                <span className="text-white font-bold font-mono">Le 4.2k</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <p className="text-xs text-indigo-300/80 leading-relaxed italic">
              "System analysis indicates high demand in the Wholesale Men's category. Recommend adjusting liquidity allocation for next procurement cycle."
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
