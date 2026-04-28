import { AuthProvider, useAuth } from './AuthContext';
import AuthScreen from './components/AuthScreen';
import { useState, useEffect, lazy, Suspense, memo } from 'react';
import { 
  notificationService,
  productService,
  orderService,
  clientService,
  userService
} from './services/firebaseService';
import { 
  LayoutDashboard, 
  BarChart2, 
  Package, 
  Tag, 
  DollarSign, 
  Clock, 
  Users, 
  Zap, 
  Activity, 
  Settings, 
  Bell, 
  LogOut,
  ChevronRight,
  Plus,
  Search,
  ShoppingCart,
  User as UserIcon,
  PieChart,
  RefreshCcw,
  AlertTriangle,
  History,
  ShieldCheck,
  ShieldAlert,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AdminDashboard = lazy(() => import('./views/AdminDashboard'));
const StockManager = lazy(() => import('./views/StockManager'));
const ActivityLogs = lazy(() => import('./views/ActivityLogs'));
const AIIntelligence = lazy(() => import('./views/AIIntelligence'));
const ShopDashboard = lazy(() => import('./views/ShopDashboard'));
const OrderForm = lazy(() => import('./views/OrderForm'));
const ClientManager = lazy(() => import('./views/ClientManager'));
const Analytics = lazy(() => import('./views/Analytics'));
const SalesHistory = lazy(() => import('./views/SalesHistory'));

const ViewLoading = () => (
  <div className="w-full h-64 flex items-center justify-center">
    <RefreshCcw className="text-indigo-500/20 animate-spin" size={32} />
  </div>
);

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number | string;
}

function RoleRegistration({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'shop'>('shop');
  const [authKey, setAuthKey] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!user) return;
    setError('');
    setIsRegistering(true);

    try {
      if (selectedRole === 'admin' && authKey !== 'LEONE_ADMIN_2026') {
        throw new Error('Invalid Enterprise Authorization Key. Access Denied.');
      }

      await userService.createUserProfile(user.uid, {
        email: user.email,
        displayName: user.displayName,
        role: selectedRole,
        authKey: selectedRole === 'admin' ? authKey : undefined
      });

      // Handled by snapshot listeners
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0f172a] relative overflow-hidden">
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg glass-card p-12 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Identity Activation</h2>
          <p className="text-white/40 text-sm">Select your authorized designation for VaultStock Enterprise.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400 text-sm animate-shake">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
           <button 
             onClick={() => setSelectedRole('admin')}
             className={cn(
               "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group",
               selectedRole === 'admin' ? "bg-indigo-500/10 border-indigo-500 shadow-xl shadow-indigo-500/10" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] grayscale group-hover:grayscale-0"
             )}
           >
             <div className={cn("p-3 rounded-xl transition-all", selectedRole === 'admin' ? "bg-indigo-500 text-white" : "bg-white/10 text-white/30 group-hover:text-white")}>
               <ShieldAlert size={20} />
             </div>
             <span className={cn("font-bold text-xs uppercase tracking-widest", selectedRole === 'admin' ? "text-white" : "text-white/40")}>Administrator</span>
           </button>

           <button 
             onClick={() => setSelectedRole('shop')}
             className={cn(
               "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group",
               selectedRole === 'shop' ? "bg-emerald-500/10 border-emerald-500 shadow-xl shadow-emerald-500/10" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] grayscale group-hover:grayscale-0"
             )}
           >
             <div className={cn("p-3 rounded-xl transition-all", selectedRole === 'shop' ? "bg-emerald-500 text-white" : "bg-white/10 text-white/30 group-hover:text-white")}>
               <Users size={20} />
             </div>
             <span className={cn("font-bold text-xs uppercase tracking-widest", selectedRole === 'shop' ? "text-white" : "text-white/40")}>Shopkeeper</span>
           </button>
        </div>

        {selectedRole === 'admin' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 space-y-3"
          >
            <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
               <Key size={10} />
               Enterprise Authorization Key
            </label>
            <input 
              type="password"
              placeholder="••••••••••••••"
              value={authKey}
              onChange={(e) => setAuthKey(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
            />
          </motion.div>
        )}

        <button 
          onClick={handleRegister}
          disabled={isRegistering || (selectedRole === 'admin' && !authKey)}
          className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          {isRegistering ? <RefreshCcw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
          Activate Account
        </button>
      </motion.div>
    </div>
  );
}

function MainApp() {
  const { user, isAdmin, userRole, signOut, loginWithEmail, registerWithEmail, loading } = useAuth();
  const [role, setRole] = useState<'admin' | 'shop'>('shop');
  const [activeView, setActiveView] = useState('dashboard');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (userRole) {
      setRole(userRole);
    } else if (isAdmin) {
      setRole('admin');
    }
  }, [userRole, isAdmin]);

  useEffect(() => {
    if (user) {
      return notificationService.subscribeToNotifications(user.uid, setNotifications);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-12 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full animate-pulse-slow"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center gap-8"
        >
          <div className="relative">
            <RefreshCcw className="text-indigo-400 animate-spin-slow" size={56} strokeWidth={1.5} />
            <div className="absolute inset-0 bg-indigo-400/20 blur-xl animate-pulse"></div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white tracking-[0.3em] uppercase mb-1">Authenticating</h3>
            <p className="text-white/20 text-[10px] font-bold tracking-widest uppercase">Securing Enterprise Assets</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const navItems: NavItem[] = role === 'admin' ? [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Intelligence', icon: BarChart2 },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'sales', label: 'Sales History', icon: History },
    { id: 'logs', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'ai', label: 'AI Insights', icon: Zap },
  ] : [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'orders', label: 'New Sale', icon: ShoppingCart },
    { id: 'inventory', label: 'Stock Lookup', icon: Package },
    { id: 'sales', label: 'My Sales', icon: History },
  ];

  if (!user) {
    return <AuthScreen />;
  }

  if (user && !userRole && !isAdmin) {
    return <RoleRegistration onComplete={() => {}} />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return role === 'admin' ? <AdminDashboard onNavigate={setActiveView} /> : <ShopDashboard onNavigate={setActiveView} />;
      case 'analytics': return <Analytics />;
      case 'inventory': return <StockManager role={role} />;
      case 'sales': return <SalesHistory />;
      case 'logs': return <ActivityLogs />;
      case 'ai': return <AIIntelligence />;
      case 'orders': return <OrderForm />;
      case 'clients': return <ClientManager onNavigate={setActiveView} />;
      default: return role === 'admin' ? <AdminDashboard onNavigate={setActiveView} /> : <ShopDashboard onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-white font-sans selection:bg-indigo-500/30">
      <aside className="w-64 glass-sidebar flex flex-col z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">V</div>
          <span className="text-xl font-bold tracking-tighter">VaultStock</span>
        </div>

        <nav className="flex-1 px-4 py-2 overflow-y-auto space-y-1 custom-scrollbar">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-4 mb-4">
            {role === 'admin' ? 'Enterprise' : 'Workspace'}
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "nav-item-glass group",
                activeView === item.id && "active"
              )}
            >
              <item.icon size={18} className={cn("transition-colors", activeView === item.id ? "text-white" : "text-white/40 group-hover:text-white")} />
              <span className="text-sm font-medium">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-rosy-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/20">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 m-4 rounded-2xl bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white uppercase text-sm border-2 border-white/10">
              {user.displayName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">{user.displayName}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-tight">{role} Account</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={signOut}
              className="w-full px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              <span className="text-xs font-bold uppercase tracking-widest">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Elements */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        
        <header className="h-20 glass-header px-10 flex items-center justify-between z-[100] shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-bold tracking-tight text-white">
               {navItems.find(i => i.id === activeView)?.label || activeView}
            </h2>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 backdrop-blur-md">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold uppercase tracking-widest">Enterprise Secured</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 text-white/60 hover:text-white transition-all relative border border-white/10 rounded-xl hover:bg-white/[0.05]"
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0f172a]"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-[110]" 
                      onClick={() => setShowNotifications(false)}
                    ></div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 top-full mt-4 w-96 glass-card overflow-hidden z-[120] border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] origin-top-right whitespace-normal bg-[#0f172a]/95 backdrop-blur-2xl"
                    >
                      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                         <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white">System Notifications</h4>
                         <span className="text-[10px] font-bold text-white/30">{notifications.filter(n => !n.read).length} Unread</span>
                      </div>
                      <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                         {notifications.length > 0 ? (
                           <div className="divide-y divide-white/5">
                             {notifications.map((n) => (
                               <div 
                                 key={n.id} 
                                 className={cn(
                                   "p-6 hover:bg-white/[0.03] transition-colors cursor-pointer relative group",
                                   !n.read && "bg-indigo-500/[0.02]"
                                 )}
                                 onClick={() => {
                                   if (!n.read) notificationService.markAsRead(n.id);
                                 }}
                               >
                                  <div className="flex items-start gap-4">
                                     <div className={cn(
                                       "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                       n.type === 'warning' ? "bg-amber-500/10 text-amber-500" :
                                       n.type === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                                       n.type === 'error' ? "bg-rose-500/10 text-rose-500" : "bg-indigo-500/10 text-indigo-500"
                                     )}>
                                        {n.type === 'warning' ? <AlertTriangle size={14} /> : 
                                         n.type === 'success' ? <RefreshCcw size={14} /> : 
                                         n.type === 'error' ? <Zap size={14} /> : <Bell size={14} />}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <p className={cn("text-sm mb-1", !n.read ? "text-white font-bold" : "text-white/60 font-medium")}>{n.title}</p>
                                        <p className="text-xs text-white/40 leading-relaxed break-words">{n.message}</p>
                                        <p className="text-[9px] text-white/20 mt-2 font-bold uppercase tracking-widest">
                                          {n.timestamp?.toDate ? new Date(n.timestamp.toDate()).toLocaleTimeString() : 'Just now'}
                                        </p>
                                     </div>
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         notificationService.deleteNotification(n.id);
                                       }}
                                       className="opacity-0 group-hover:opacity-100 p-1 text-white/10 hover:text-rose-500 transition-all"
                                     >
                                        <LogOut size={12} className="rotate-90" />
                                     </button>
                                  </div>
                               </div>
                             ))}
                           </div>
                         ) : (
                           <div className="py-20 text-center px-10">
                              <Bell className="mx-auto text-white/5 mb-4" size={40} />
                              <p className="text-sm text-white/20 font-medium">No encrypted transmissions detected.</p>
                           </div>
                         )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <div className="h-10 w-px bg-white/10 mx-2"></div>
            <div className="flex items-center gap-3">
               <span className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] hidden md:block">
                 {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
               </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar z-0 relative">
          <Suspense fallback={<ViewLoading />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${role}-${activeView}`}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.02, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
