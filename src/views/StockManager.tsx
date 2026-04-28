import { useState, useEffect } from 'react';
import { productService, clientService, orderService, logService, notificationService } from '../services/firebaseService';
import { Package, Search, Plus, Filter, ArrowUpRight, ArrowDownRight, Tag, AlertCircle, Settings, X, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StockManagerProps {
  role: 'admin' | 'shop';
}

export default function StockManager({ role }: StockManagerProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Men',
    sku: '',
    stock: 0,
    wholesalePrice: 0,
    retailPrice: 0,
    minStockAlert: 10
  });

  useEffect(() => {
    return productService.subscribeToProducts(setProducts);
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (role !== 'admin') {
        throw new Error("Insufficient authority: Only Enterprise Administrators can register new assets.");
      }

      await productService.addProduct(newProduct);
      await logService.addLog({
        shopkeeperId: user?.uid,
        shopkeeperName: user?.displayName,
        action: 'Inventory Inbound',
        details: `registered ${newProduct.stock} units of ${newProduct.name} (${newProduct.sku})`
      });

      await notificationService.addNotification({
        userId: user?.uid,
        title: 'Asset Registered',
        message: `${newProduct.name} has been added to the enterprise catalog with ${newProduct.stock} units.`,
        type: 'info'
      });

      setShowAddModal(false);
      setNewProduct({
        name: '',
        category: 'Men',
        sku: '',
        stock: 0,
        wholesalePrice: 0,
        retailPrice: 0,
        minStockAlert: 10
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to register asset. Check authorization levels.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.sku) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (role !== 'admin') {
        throw new Error("Insufficient authority: Only Enterprise Administrators can modify assets.");
      }

      const { id, ...updates } = editingProduct;
      await productService.updateProduct(id, updates);
      
      await logService.addLog({
        shopkeeperId: user?.uid,
        shopkeeperName: user?.displayName,
        action: 'Asset Modification',
        details: `updated ${editingProduct.name} (${editingProduct.sku}) parameters`
      });

      await notificationService.addNotification({
        userId: user?.uid,
        title: 'Asset Optimized',
        message: `System parameters for ${editingProduct.name} have been re-calibrated.`,
        type: 'info'
      });

      setEditingProduct(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to update asset. Check authorization levels.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setIsDeleting(true);
    try {
      const p = products.find(prod => prod.id === productId);
      await productService.deleteProduct(productId);
      
      await logService.addLog({
        shopkeeperId: user?.uid,
        shopkeeperName: user?.displayName,
        action: 'Asset Decommission',
        details: `decommissioned ${p?.name || 'unknown asset'} (${p?.sku || 'N/A'})`
      });

      setShowDeleteConfirm(null);
      setEditingProduct(null);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Decommission failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = filter === 'all' || p.category.toLowerCase() === filter.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Search & Filters */}
      <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
        <div className="relative flex-1 max-w-xl w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input 
            type="text" 
            placeholder="Search enterprise inventory, SKUs, styles..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 glass-card border-white/10 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/20 text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="glass-card bg-white/5 border-white/5 p-1 flex items-center shrink-0 backdrop-blur-md">
            {['all', 'men', 'women', 'kids'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl transition-all",
                  filter === cat ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-white/40 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          {role === 'admin' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95 shrink-0 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              <span>Register Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 group hover:bg-white/[0.05] transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 backdrop-blur-md transition-transform group-hover:scale-110">
              <Package size={18} />
            </div>
            <p className="text-[10px] uppercase font-bold text-white/30 tracking-[0.2em]">Active Enterprise SKUs</p>
          </div>
          <p className="text-3xl font-bold tracking-tight text-white">{products.length}</p>
        </div>
        
        <div className="glass-card p-6 group hover:bg-white/[0.05] transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20 backdrop-blur-md transition-transform group-hover:scale-110">
              <AlertCircle size={18} />
            </div>
            <p className="text-[10px] uppercase font-bold text-white/30 tracking-[0.2em]">Depleted Stocks</p>
          </div>
          <p className="text-3xl font-bold tracking-tight text-white">{products.filter(p => p.stock === 0).length}</p>
        </div>

        <div className="glass-card p-6 group hover:bg-white/[0.05] transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 backdrop-blur-md transition-transform group-hover:scale-110">
              <Tag size={18} />
            </div>
            <p className="text-[10px] uppercase font-bold text-white/30 tracking-[0.2em]">Asset Valuation</p>
          </div>
          <p className="text-3xl font-bold tracking-tight text-white">Le {products.reduce((s, p) => s + (p.stock * p.wholesalePrice), 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <h4 className="text-xl font-bold tracking-tight text-white">Inventory Asset Ledger</h4>
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{filteredProducts.length} RECORDS SYNCED</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-10 py-5">Asset Identification</th>
                <th className="px-10 py-5">Vertical</th>
                <th className="px-10 py-5">Current Volume</th>
                <th className="px-10 py-5">Wholesale / Retail</th>
                <th className="px-10 py-5">Availability</th>
                <th className="px-10 py-5 text-right">Config</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 glass-card bg-white/[0.02] border-white/5 flex items-center justify-center text-2xl transition-all group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20">
                        {p.category === 'Men' ? '👔' : p.category === 'Women' ? '👗' : '🧒'}
                      </div>
                      <div>
                        <div className="font-bold text-white mb-0.5 group-hover:text-indigo-400 transition-colors text-base">{p.name}</div>
                        <div className="text-[10px] font-mono text-white/30 tracking-[0.2em] font-bold uppercase">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-white/60">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex flex-col gap-3 w-40">
                      <div className="flex justify-between items-end">
                        <span className="text-2xl font-bold font-sans text-white">{p.stock}</span>
                        <span className="text-[10px] text-white/30 font-bold mb-1 tracking-widest">UNITS</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden backdrop-blur-md">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((p.stock / (Math.max(p.minStockAlert, 1) * 3)) * 100, 100)}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.2)]",
                            p.stock <= p.minStockAlert ? "bg-rose-500" : 
                            p.stock <= p.minStockAlert * 2 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.1em]">W. Le {p.wholesalePrice?.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.1em]">R. Le {p.retailPrice?.toLocaleString()}</div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className={cn(
                      "inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-[0.2em] backdrop-blur-md",
                      p.stock === 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                      p.stock <= p.minStockAlert ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]",
                        p.stock === 0 ? "bg-rose-400 shadow-rose-400/50" : 
                        p.stock <= p.minStockAlert ? "bg-amber-400 shadow-amber-400/50" : "bg-emerald-400 shadow-emerald-400/50"
                      )}></div>
                      {p.stock === 0 ? 'Stockout' : p.stock <= p.minStockAlert ? 'Low Stock' : 'Optimized'}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => setEditingProduct(p)}
                      className="p-3 text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
                    >
                      <Settings size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl glass-card relative z-10 overflow-hidden shadow-2xl border-white/10"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                 <h2 className="text-2xl font-bold text-white tracking-tight">Configure Asset: {editingProduct.name}</h2>
                 <button onClick={() => setEditingProduct(null)} className="p-2 text-white/20 hover:text-white transition-colors">
                   <X size={24} />
                 </button>
              </div>

               <form onSubmit={handleUpdateProduct} className="p-10 space-y-6">
                  {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <p className="text-xs font-bold leading-relaxed">{error}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Designation</label>
                       <input 
                         required
                         value={editingProduct.name}
                         onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Category</label>
                       <select 
                         value={editingProduct.category}
                         onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:border-indigo-500/50 focus:outline-none"
                       >
                         <option className="bg-[#0f172a]">Men</option>
                         <option className="bg-[#0f172a]">Women</option>
                         <option className="bg-[#0f172a]">Kids</option>
                       </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">SKU ID</label>
                       <input 
                         required
                         value={editingProduct.sku}
                         onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono uppercase focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Stock Units</label>
                       <input 
                         required
                         type="number"
                         value={editingProduct.stock}
                         onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Wholesale (Le)</label>
                       <input 
                         required
                         type="number"
                         value={editingProduct.wholesalePrice}
                         onChange={e => setEditingProduct({...editingProduct, wholesalePrice: Number(e.target.value)})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Retail (Le)</label>
                       <input 
                         required
                         type="number"
                         value={editingProduct.retailPrice}
                         onChange={e => setEditingProduct({...editingProduct, retailPrice: Number(e.target.value)})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Min. Alert</label>
                       <input 
                         required
                         type="number"
                         value={editingProduct.minStockAlert}
                         onChange={e => setEditingProduct({...editingProduct, minStockAlert: Number(e.target.value)})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-white/5">
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(editingProduct.id)}
                      disabled={isDeleting}
                      className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-rose-500/20"
                    >
                      Decommission
                    </button>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="px-6 py-3 text-white/40 hover:text-white uppercase text-[10px] font-bold tracking-widest"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-3"
                      >
                        {isSubmitting ? <RefreshCcw size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                        Save Config
                      </button>
                    </div>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl glass-card relative z-10 overflow-hidden shadow-2xl border-white/10"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                 <h2 className="text-2xl font-bold text-white tracking-tight">Register New Enterprise SKU</h2>
                 <button onClick={() => setShowAddModal(false)} className="p-2 text-white/20 hover:text-white transition-colors">
                   <X size={24} />
                 </button>
              </div>

               <form onSubmit={handleAddProduct} className="p-10 space-y-6">
                  {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <p className="text-xs font-bold leading-relaxed">{error}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Designation</label>
                       <input 
                         required
                         value={newProduct.name}
                         onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                         placeholder="e.g. Urban Slim Fit Denim"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Category</label>
                       <select 
                         value={newProduct.category}
                         onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:border-indigo-500/50 focus:outline-none"
                       >
                         <option className="bg-[#0f172a]">Men</option>
                         <option className="bg-[#0f172a]">Women</option>
                         <option className="bg-[#0f172a]">Kids</option>
                       </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">SKU ID</label>
                       <input 
                         required
                         value={newProduct.sku}
                         onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono uppercase focus:border-indigo-500/50 focus:outline-none"
                         placeholder="VAULT-DENIM-01"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Initial Stock</label>
                       <input 
                         required
                         type="number"
                         value={newProduct.stock}
                         onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Wholesale (Le)</label>
                       <input 
                         required
                         type="number"
                         value={newProduct.wholesalePrice}
                         onChange={e => setNewProduct({...newProduct, wholesalePrice: Number(e.target.value)})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Retail (Le)</label>
                       <input 
                         required
                         type="number"
                         value={newProduct.retailPrice}
                         onChange={e => setNewProduct({...newProduct, retailPrice: Number(e.target.value)})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Min. Alert</label>
                       <input 
                         required
                         type="number"
                         value={newProduct.minStockAlert}
                         onChange={e => setNewProduct({...newProduct, minStockAlert: Number(e.target.value)})}
                         className="w-full glass-card bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-indigo-500/50 focus:outline-none"
                       />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                    <button 
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-6 py-3 text-white/40 hover:text-white uppercase text-[10px] font-bold tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="px-10 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-3"
                    >
                      {isSubmitting ? <RefreshCcw size={14} className="animate-spin" /> : <Plus size={14} />}
                      Authorize Registration
                    </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md glass-card relative z-10 p-10 border-rose-500/20 shadow-2xl shadow-rose-950/20"
            >
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20 mx-auto">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-4">Decommission Asset?</h3>
              <p className="text-white/50 text-center text-sm mb-10 leading-relaxed">
                This will permanently remove the asset from the enterprise ledger. This action is irreversible and will be logged.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDeleteProduct(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? <RefreshCcw size={16} className="animate-spin" /> : null}
                  Confirm Decommission
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
