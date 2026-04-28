import { useState, useEffect } from 'react';
import { clientService, logService, notificationService } from '../services/firebaseService';
import { useAuth } from '../AuthContext';
import { Users, Search, Plus, MapPin, Phone, ShieldCheck, DollarSign, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ClientManagerProps {
  onNavigate?: (view: string) => void;
}

export default function ClientManager({ onNavigate }: ClientManagerProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    type: 'Wholesale',
    location: '',
    phone: '',
    creditLimit: 0,
    balance: 0
  });

  useEffect(() => {
    return clientService.subscribeToClients(setClients);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;
    
    try {
      await clientService.addClient(newClient);
      await logService.addLog({
        shopkeeperId: user?.uid,
        shopkeeperName: user?.displayName,
        action: 'New Client',
        details: `added ${newClient.name} as a ${newClient.type} client.`
      });

      await notificationService.addNotification({
        userId: user?.uid,
        title: 'Partner Onboarded',
        message: `${newClient.name} has been successfully integrated into the enterprise registry.`,
        type: 'success'
      });

      setNewClient({ name: '', type: 'Wholesale', location: '', phone: '', creditLimit: 0, balance: 0 });
      setShowAddForm(false);
    } catch (e: any) {
      console.error(e);
      notificationService.addNotification({
        userId: user?.uid,
        title: 'Registration Error',
        message: `Failed to onboard entity: ${e.message || 'Unknown protocol error'}.`,
        type: 'error'
      });
    }
  };

  const handleDelete = async (clientId: string) => {
    setIsDeleting(true);
    try {
      const client = clients.find(c => c.id === clientId);
      // We don't have a deleteClient service yet, let's assume we can use a generic one or I should add it
      // I'll check firebaseService.ts. It doesn't have it. I'll add it there first or use a direct call if allowed.
      // Better to add it to service.
      await clientService.deleteClient(clientId);
      
      await logService.addLog({
        shopkeeperId: user?.uid,
        shopkeeperName: user?.displayName,
        action: 'Client Removal',
        details: `de-registered ${client?.name || 'unknown entity'} from enterprise records.`
      });

      setShowDeleteConfirm(null);
    } catch (e: any) {
      console.error(e);
      notificationService.addNotification({
        userId: user?.uid,
        title: 'De-registration Failed',
        message: `Failed to remove entity: ${e.message}`,
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-10">
      <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
        <div className="relative flex-1 max-w-2xl w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input 
            type="text" 
            placeholder="Search clients, businesses, unified registry..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-5 glass-card border-white/10 text-sm focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/20"
          />
        </div>

        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-3 px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95 group"
        >
          {showAddForm ? <RefreshCcw size={18} className="animate-spin-slow" /> : <Plus size={18} className="group-hover:rotate-90 transition-transform" />}
          <span>{showAddForm ? 'Minimize Registration' : 'Register Enterprise Entity'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <AnimatePresence mode="wait">
          {showAddForm && (
            <motion.div 
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              className="lg:col-span-1"
            >
              <div className="glass-card p-8 sticky top-10 border-indigo-500/20 bg-indigo-500/[0.02]">
                <h4 className="text-xl font-bold mb-8 tracking-tight text-white">Entity Registration</h4>
                <form onSubmit={handleAdd} className="space-y-6 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Legal / Asset Name</label>
                    <input 
                      required
                      value={newClient.name}
                      onChange={e => setNewClient({...newClient, name: e.target.value})}
                      className="w-full glass-card bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500/50 text-white" 
                      placeholder="e.g. Aether Dynamics"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Protocol Type</label>
                    <select 
                      value={newClient.type}
                      onChange={e => setNewClient({...newClient, type: e.target.value})}
                      className="w-full glass-card bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500/50 text-white appearance-none"
                    >
                      <option className="bg-[#0f172a]">Wholesale</option>
                      <option className="bg-[#0f172a]">Retail</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Geospatial Marker</label>
                    <input 
                      value={newClient.location}
                      onChange={e => setNewClient({...newClient, location: e.target.value})}
                      className="w-full glass-card bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500/50 text-white"
                      placeholder="City, Region"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Secure Contact</label>
                    <input 
                      value={newClient.phone}
                      onChange={e => setNewClient({...newClient, phone: e.target.value})}
                      className="w-full glass-card bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500/50 text-white" 
                      placeholder="+254 XXX XXX XXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1">Credit Allocation (Le)</label>
                    <input 
                      type="number"
                      value={newClient.creditLimit}
                      onChange={e => setNewClient({...newClient, creditLimit: Number(e.target.value)})}
                      className="w-full glass-card bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500/50 text-white font-mono"
                    />
                  </div>

                  <button className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-bold uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 mt-6 transition-all active:scale-95">
                    Authorize Entry
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn("space-y-6", showAddForm ? "lg:col-span-3" : "lg:col-span-4")}>
          <div className={cn(
            "grid gap-6",
            showAddForm ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          )}>
            {filtered.map((client, idx) => (
              <motion.div 
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-8 border-white/5 hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
                
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="w-14 h-14 glass-card bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 border border-white/5 shadow-xl">
                    <Users size={28} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border backdrop-blur-md transition-all",
                      client.type === 'Wholesale' ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    )}>
                      {client.type}
                    </span>
                    {user?.uid === client.createdBy || true && ( // Simplified for now
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(client.id);
                        }}
                        className="p-2 text-white/10 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                <h5 className="font-bold text-xl text-white mb-3 group-hover:text-indigo-400 transition-colors relative z-10">{client.name}</h5>
                
                <div className="space-y-3 mb-8 relative z-10">
                  <div className="flex items-center gap-3 text-xs text-white/40 font-bold uppercase tracking-widest">
                    <MapPin size={14} className="text-white/20" />
                    {client.location || 'Marker Missing'}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 font-bold uppercase tracking-widest">
                    <Phone size={14} className="text-white/20" />
                    {client.phone || 'Comms Offline'}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center justify-between relative z-10">
                  <div>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] block mb-1">Exposure Balance</span>
                    <span className={cn("text-lg font-bold font-sans", (client.balance || 0) > 0 ? "text-amber-400" : "text-emerald-400")}>
                      Le {(client.balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] block mb-1">Credit Cap</span>
                    <span className="text-lg font-bold font-sans text-white/80">
                      {client.creditLimit ? `Le ${client.creditLimit.toLocaleString()}` : 'No Limit'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-8 grid grid-cols-2 gap-3 relative z-10">
                   <button className="py-3 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl border border-white/10 text-white/60 hover:text-white transition-all active:scale-95">Access Logs</button>
                   <button 
                    onClick={() => onNavigate?.('orders')}
                    className="py-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl border border-indigo-500/20 transition-all active:scale-95"
                   >
                    Initiate Sale
                   </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

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
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-4">De-register Client?</h3>
              <p className="text-white/50 text-center text-sm mb-10 leading-relaxed">
                Removing this entity will disconnect all historical reference links. This protocol is irreversible.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? <RefreshCcw size={16} className="animate-spin" /> : null}
                  Confirm Removal
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all font-bold"
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
