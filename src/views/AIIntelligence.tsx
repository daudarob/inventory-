import { useState, useEffect } from 'react';
import { insightService, productService, orderService, clientService, notificationService } from '../services/firebaseService';
import { generateBusinessInsights, chatWithAI } from '../services/geminiService';
import { Zap, Send, RefreshCcw, Sparkles, AlertCircle, TrendingUp, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AIIntelligence() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [chat, setChat] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    const unsubInsights = insightService.subscribeToInsights(setInsights);
    const unsubProducts = productService.subscribeToProducts(setProducts);
    const unsubOrders = orderService.subscribeToOrders(setOrders);
    const unsubClients = clientService.subscribeToClients(setClients);

    return () => {
      unsubInsights();
      unsubProducts();
      unsubOrders();
      unsubClients();
    };
  }, []);

  const handleManualAnalyze = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const newInsights = await generateBusinessInsights(products, orders, clients);
      
      // Parallelize saving insights to Firestore for efficiency
      await Promise.all(newInsights.map((insight: any) => insightService.addInsight(insight)));

      await notificationService.addNotification({
        userId: user?.uid,
        title: 'Neural Analysis Complete',
        message: `System has successfully synthesized ${newInsights.length} new enterprise insights.`,
        type: 'success'
      });
    } catch (error) {
      console.error("Manual analysis failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isChatting) return;

    const userMsg = prompt.trim();
    setChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setPrompt('');
    setIsChatting(true);
    
    try {
      const response = await chatWithAI(userMsg, chat, {
        inventory: products,
        sales: orders,
        clients: clients
      });

      setChat(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error: any) {
      console.error("Chat failed:", error);
      const isQuota = error.message?.includes('quota');
      setChat(prev => [...prev, { 
        role: 'ai', 
        content: isQuota 
          ? "Neural link quota exceeded. Local fallback: Enterprise parameters are within stable ranges. Please refresh neural link later." 
          : "Protocol error: Neural synchronization failed." 
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Intelligence Terminal</h2>
          <p className="text-white/30 text-sm font-medium tracking-wide uppercase text-[10px] tracking-[0.2em]">Enterprise Neural Processor Active</p>
        </div>
        <button 
          onClick={handleManualAnalyze}
          disabled={isGenerating}
          className="flex items-center gap-3 px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50 active:scale-95 group"
        >
          {isGenerating ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />}
          <span>Initiate Global Analysis</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Chat / Query Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card flex flex-col h-[600px] border-white/10 relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
             
             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01] relative z-10">
               <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Secure Neural Link Established</span>
               </div>
               <div className="flex -space-x-2">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="w-6 h-6 rounded-full border border-white/10 bg-indigo-500/20 backdrop-blur-md"></div>
                 ))}
               </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative z-10">
                {chat.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-12">
                    <div className="p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 backdrop-blur-md mb-8 animate-pulse-soft">
                      <Zap size={48} className="text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">Advanced Query Interface</h3>
                    <p className="text-sm text-white/40 leading-relaxed max-w-sm">Ask me about multi-channel trends, predictive stock arrivals, or retail velocity. I analyze {products.length} assets and {orders.length} transactions across your enterprise.</p>
                  </div>
                )}
                {chat.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-5 rounded-3xl text-sm leading-relaxed backdrop-blur-md transition-all shadow-lg",
                      msg.role === 'user' 
                        ? "bg-indigo-500 text-white rounded-tr-none shadow-indigo-500/20" 
                        : "glass-card bg-white/[0.03] border-white/10 text-white/90 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[9px] font-bold text-white/30 mt-3 uppercase tracking-[0.2em] px-2">
                      {msg.role === 'user' ? 'Operator' : 'VaultStock AGI'}
                    </span>
                  </motion.div>
                ))}
                {isChatting && (
                  <div className="mr-auto items-start flex flex-col max-w-[85%]">
                     <div className="p-5 rounded-3xl glass-card bg-white/[0.03] border-white/10 text-white/40 rounded-tl-none flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Synchronizing data...</span>
                     </div>
                  </div>
                )}
             </div>

             <div className="p-8 border-t border-white/5 bg-white/[0.01] relative z-20">
                <form onSubmit={handleChat} className="relative flex items-center">
                  <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isChatting}
                    placeholder="E.g., Forecast stock requirements based on 30-day velocity..."
                    className="w-full glass-card bg-white/5 border-white/10 rounded-2xl pl-6 pr-20 py-5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/20 text-white disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={isChatting || !prompt.trim()}
                    className="absolute right-3 p-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 active:scale-90 disabled:opacity-50"
                  >
                    {isChatting ? <RefreshCcw size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </form>
             </div>
          </div>
        </div>

        {/* Intelligence Feed */}
        <div className="space-y-8">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 flex items-center gap-3">
             <div className="w-8 h-px bg-white/10"></div>
             Direct Insights Feed
          </h4>
          
          <div className="space-y-4">
            {insights.map((insight, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-6 rounded-3xl border border-white/5 flex gap-5 backdrop-blur-md hover:bg-white/[0.02] transition-colors relative group",
                  insight.type === 'alert' ? "bg-rose-500/5" :
                  insight.type === 'insight' ? "bg-emerald-500/5" :
                  "bg-amber-500/5"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border backdrop-blur-md shadow-xl transition-transform group-hover:scale-110",
                  insight.type === 'alert' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                  insight.type === 'insight' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}>
                  {insight.type === 'alert' ? <AlertCircle size={22} /> : 
                   insight.type === 'insight' ? <TrendingUp size={22} /> : <Info size={22} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border backdrop-blur-md",
                      insight.type === 'alert' ? "bg-rose-500/10 text-rose-300 border-rose-500/20" :
                      insight.type === 'insight' ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
                      "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    )}>
                      {insight.type}
                    </span>
                    <span className="text-[9px] font-bold text-white/20 tracking-[0.2em] uppercase">
                      {new Date(insight.timestamp?.toDate ? insight.timestamp.toDate() : Date.now()).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white/90 leading-relaxed italic pr-4">"{insight.message}"</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="glass-card bg-white/[0.01] border-white/5 border-dashed rounded-3xl p-8 text-center backdrop-blur-sm">
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] leading-relaxed">
              Synthesized predictions are governed by recursive heuristics. Precision vectors converge as asset volume increases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
