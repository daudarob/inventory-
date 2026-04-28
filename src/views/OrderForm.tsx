import { useState, useEffect, useMemo } from 'react';
import { productService, clientService, orderService, logService, notificationService } from '../services/firebaseService';
import { useAuth } from '../AuthContext';
import { ShoppingBag, ChevronRight, Minus, Plus, Search, Tag, DollarSign, CheckCircle, Package, RefreshCcw, AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function OrderForm() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    productService.subscribeToProducts(setProducts);
    clientService.subscribeToClients(setClients);
  }, []);

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const client = useMemo(() => clients.find(c => c.id === selectedClient), [clients, selectedClient]);

  // Sync cart prices when client changes
  useEffect(() => {
    if (cart.length === 0) return;
    
    setCart(prevCart => prevCart.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return item;
      
      const newPrice = client?.type === 'Wholesale' ? product.wholesalePrice : product.retailPrice;
      return { ...item, price: newPrice };
    }));
  }, [selectedClient, products, client?.type]);

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = (productId: string | any) => {
    // Determine if we were passed an ID or a full product object
    const product = typeof productId === 'string' 
      ? products.find(p => p.id === productId) 
      : productId;
      
    if (!product) return;

    // Stock validation
    const existing = cart.find(i => i.id === product.id);
    const cartQty = existing ? existing.quantity : 0;
    
    if (cartQty >= product.stock) {
      notificationService.addNotification({
        userId: user?.uid,
        title: 'Inventory Constraint',
        message: `Unable to add ${product.name}. Enterprise stock limit reached (${product.stock} units).`,
        type: 'warning'
      });
      return;
    }

    const client = clients.find(c => c.id === selectedClient);
    const price = client?.type === 'Wholesale' ? product.wholesalePrice : product.retailPrice;
    
    if (existing) {
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { id: product.id, name: product.name, price, quantity: 1, sku: product.sku }]);
    }
  };

  const removeFromCart = (id: string) => {
    const existing = cart.find(i => i.id === id);
    if (existing?.quantity === 1) {
      setCart(cart.filter(i => i.id !== id));
    } else {
      setCart(cart.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i));
    }
  };

  const deleteFromCart = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const handleSubmit = async () => {
    if (!cart.length) return;
    setIsSubmitting(true);
    const orderData = {
      shopkeeperId: user?.uid,
      shopkeeperName: user?.displayName,
      clientId: selectedClient || null,
      clientName: client?.name || 'Walk-in',
      items: cart,
      total,
      type: client?.type || 'Retail',
      paymentStatus,
    };

    try {
      await orderService.addOrder(orderData);
      
      // Parallelize stock updates and low stock checks
      await Promise.all(cart.map(async (item) => {
        const prod = products.find(p => p.id === item.id);
        if (prod) {
          const newStock = prod.stock - item.quantity;
          await productService.updateProduct(item.id, { stock: newStock });
          
          if (newStock <= (prod.minStockAlert || 5)) {
            await notificationService.addNotification({
              userId: user?.uid,
              title: 'Critical Inventory Alert',
              message: `${prod.name} stock level is at ${newStock} units. Depletion imminent.`,
              type: 'warning'
            });
          }
        }
      }));

      // Log action
      await logService.addLog({
        shopkeeperId: user?.uid,
        shopkeeperName: user?.displayName,
        action: 'New Order',
        details: `issued ${cart.length} items to ${orderData.clientName} (Le ${total.toLocaleString()})`
      });

      // Notify User
      await notificationService.addNotification({
        userId: user?.uid,
        title: 'Transaction Authorized',
        message: `Order for ${orderData.clientName} successfully committed (Le ${total.toLocaleString()}).`,
        type: 'success'
      });

      setLastOrder({ ...orderData, id: 'Pending Reference' }); // For local receipt preview
      setCart([]);
      setSelectedClient('');
    } catch (e: any) {
      console.error(e);
      notificationService.addNotification({
        userId: user?.uid,
        title: 'Transaction Failure',
        message: `Failed to commit order: ${e.message || 'Ledger synchronization error'}.`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearCart = () => setCart([]);

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
      {/* Product Selection */}
      <div className="lg:col-span-3 space-y-8">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Search enterprise catalog by name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-5 glass-card border-white/10 text-sm focus:outline-none focus:border-indigo-500/50 placeholder:text-white/20 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border",
                  selectedCategory === cat 
                    ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20" 
                    : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-20 flex flex-col items-center justify-center text-center space-y-4 bg-white/[0.01]"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Search className="text-white/10" size={32} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">No assets detected for given parameters</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredProducts.map((p, idx) => {
              const cartItem = cart.find(i => i.id === p.id);
              const isExhausted = cartItem ? cartItem.quantity >= p.stock : p.stock <= 0;
              
              return (
                <motion.button 
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => addToCart(p)}
                  disabled={isExhausted}
                  className="p-6 glass-card hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all group disabled:opacity-50 text-left relative overflow-hidden"
                >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full transform translate-x-8 -translate-y-8"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 bg-white/5 rounded-2xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all backdrop-blur-md border border-white/5 shadow-lg">
                  <Package size={22} />
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border backdrop-blur-md",
                  p.stock <= (p.minStockAlert || 10) ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                )}>
                  {p.stock} units
                </span>
              </div>
              
              <h5 className="font-bold text-lg text-white mb-2 relative z-10">{p.name}</h5>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] font-mono text-white/30 tracking-[0.2em] font-bold uppercase">{p.sku}</span>
                <span className="text-base font-bold text-indigo-400">
                  Le { (client?.type === 'Wholesale' ? p.wholesalePrice : p.retailPrice)?.toLocaleString() }
                </span>
              </div>
            </motion.button>
          );
        })}
        </div>
      )}
    </div>

      {/* Cart & Checkout */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-card flex flex-col h-[700px] shadow-2xl relative overflow-hidden ring-1 ring-white/10">
          <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.01]">
             <h4 className="text-xl font-bold tracking-tight text-white">Order Summary</h4>
             <div className="flex items-center gap-4">
                {cart.length > 0 && (
                  <button 
                    onClick={clearCart}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest transition-colors mr-2"
                  >
                    Clear All
                  </button>
                )}
                <span className="text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">{cart.length} ASSETS</span>
             </div>
          </div>

          <div className="p-8 border-b border-white/5 shrink-0 bg-white/[0.02]">
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 block">Entity Correlation</label>
            <select 
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full glass-card bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-indigo-500/50 text-white appearance-none cursor-pointer hover:bg-white/10 transition-colors"
            >
              <option value="" className="bg-[#0f172a]">Direct Retail Access</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="bg-[#0f172a]">
                  {c.name} — {c.type} Protocol
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 backdrop-blur-xl border border-white/5">
                  <ShoppingBag size={40} className="text-white/20" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Awaiting Entry</p>
              </div>
            ) : cart.map((item) => (
              <div key={item.id} className="flex items-center gap-5 group">
                <div className="w-12 h-12 glass-card flex items-center justify-center text-xl shrink-0 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white mb-0.5 group-hover:text-indigo-400 transition-colors truncate">{item.name}</div>
                  <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span>Le {item.price.toLocaleString()}</span>
                    <span>×</span>
                    <span>{item.quantity}</span>
                    <span className="text-white/10">|</span>
                    <span className="text-indigo-400/80">Le {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md">
                    <button onClick={() => removeFromCart(item.id)} className="p-1 px-2 hover:bg-rose-500/10 hover:text-rose-400 text-white/40 rounded-lg transition-all"><Minus size={12} /></button>
                    <span className="text-xs font-bold font-mono w-4 text-center text-white">{item.quantity}</span>
                    <button onClick={() => addToCart(item.id)} className="p-1 px-2 hover:bg-emerald-500/10 hover:text-emerald-400 text-white/40 rounded-lg transition-all"><Plus size={12} /></button>
                  </div>
                  <button 
                    onClick={() => deleteFromCart(item.id)}
                    className="p-2 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    title="Remove from cart"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-10 bg-white/[0.03] border-t border-white/10 shrink-0">
             <div className="space-y-5 mb-10">
               <div className="flex justify-between items-center">
                 <span className="text-white/40 font-bold text-[10px] uppercase tracking-[0.2em]">Transaction Total</span>
                 <span className="text-2xl font-bold font-sans text-white tracking-tighter">Le {total.toLocaleString()}</span>
               </div>
               
               <div className="space-y-3">
                 <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] block">Settlemet Vector</label>
                 <div className="grid grid-cols-3 gap-3">
                    {['Paid', 'Partial', 'Awaiting'].map((st) => (
                      <button 
                        key={st}
                        onClick={() => setPaymentStatus(st)}
                        className={cn(
                          "py-3 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] border transition-all backdrop-blur-md",
                          paymentStatus === st 
                            ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                 </div>
               </div>
             </div>

             <button 
               onClick={handleSubmit}
               disabled={isSubmitting || !cart.length}
               className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-bold uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
             >
               {isSubmitting ? <RefreshCcw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
               Commit Transaction
             </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lastOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLastOrder(null)}
              className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-xl print:hidden"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card relative z-10 overflow-hidden shadow-2xl border-white/10 print:shadow-none print:border-none print:bg-white print:text-black print:static"
            >
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between print:hidden">
                <h2 className="text-xl font-bold text-white tracking-tight">Transaction Summary</h2>
                <button onClick={() => setLastOrder(null)} className="text-white/20 hover:text-white">
                  <RefreshCcw size={20} />
                </button>
              </div>

              <div className="p-10 print:p-0">
                <div className="flex flex-col items-center justify-center mb-8 print:hidden">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Execution Success</h3>
                  <p className="text-xs text-white/40 mt-1 uppercase font-bold tracking-widest">Protocol Reference Auth</p>
                </div>

                <div className="space-y-6 mb-10 print:space-y-4">
                  <div className="pb-4 border-b border-white/5 print:border-black/10">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1 print:text-black/50">Recipient</p>
                    <p className="text-lg font-bold text-white print:text-black">{lastOrder.clientName}</p>
                  </div>
                  
                  <div className="pb-4 border-b border-white/5 print:border-black/10">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1 print:text-black/50">Itemization</p>
                    <div className="space-y-2 mt-3">
                      {lastOrder.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-white/60 print:text-black">{item.quantity}× {item.name}</span>
                          <span className="font-mono text-white/80 print:text-black">Le {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-4 bg-white/5 px-6 rounded-2xl print:bg-transparent print:px-0 print:border-t-2 print:border-black">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] print:text-black">Total Aggregate</span>
                    <span className="text-2xl font-bold text-white print:text-black">Le {lastOrder.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 print:hidden">
                  <button 
                    onClick={handlePrintReceipt}
                    className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3"
                  >
                    Download / Print Receipt
                  </button>
                  <button 
                    onClick={() => setLastOrder(null)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all"
                  >
                    Exit Portal
                  </button>
                </div>

                <div className="hidden print:block text-[8px] text-black/40 mt-10 text-center uppercase tracking-widest font-bold">
                  VaultStock Enterprise Protocol • {new Date().toLocaleString()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
