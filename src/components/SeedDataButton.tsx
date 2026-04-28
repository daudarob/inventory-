import { productService, clientService, logService, insightService } from '../services/firebaseService';
import { db } from '../lib/firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { RefreshCcw, Database, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function SeedDataButton() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const seed = async () => {
    if (!confirm('This will seed the database with enterprise starting data and authorize your account as Administrator. Proceed?')) return;
    setLoading(true);
    try {
      // Authorize current user as Admin
      if (user) {
        await setDoc(doc(db, 'admins', user.uid), {
          email: user.email,
          authKey: 'LEONE_ADMIN_2026',
          authorizedAt: serverTimestamp(),
          grantedBy: 'System Bootstrap'
        });
      }

      // Products
      const prods = [
        { sku: 'VS-001', name: "Men's Slim Denim Jeans", category: "Men", sizes: ['30','32','34','36'], wholesalePrice: 1800, retailPrice: 2400, stock: 143, minStockAlert: 20 },
        { sku: 'VS-002', name: "Men's Casual Shirt", category: "Men", sizes: ['S','M','L','XL'], wholesalePrice: 700, retailPrice: 950, stock: 211, minStockAlert: 15 },
        { sku: 'VS-003', name: "Floral Dress Lace", category: "Women", sizes: ['S','M','L'], wholesalePrice: 2200, retailPrice: 3500, stock: 28, minStockAlert: 15 },
        { sku: 'VS-006', name: "Women's Blazer", category: "Women", sizes: ['S','M','L','XL'], wholesalePrice: 2800, retailPrice: 4200, stock: 67, minStockAlert: 10 }
      ];

      for (const p of prods) {
        await addDoc(collection(db, 'products'), { ...p, updatedAt: serverTimestamp() });
      }

      // Clients
      const clients = [
        { name: 'Kariuki & Sons', type: 'Wholesale', location: 'Nairobi CBD', phone: '+254 711 111 222', creditLimit: 200000, balance: 0 },
        { name: 'Zawadi Boutique', type: 'Wholesale', location: 'Westlands', phone: '+254 722 333 444', creditLimit: 150000, balance: 75000 }
      ];

      for (const c of clients) {
        await addDoc(collection(db, 'clients'), { ...c, createdAt: serverTimestamp() });
      }

      // Insights
      const insights = [
        { type: 'alert', message: 'Kids Polo Shirt down to 6 units — restock recommended.', timestamp: serverTimestamp() },
        { type: 'insight', message: "Women's category up 23% this week.", timestamp: serverTimestamp() }
      ];

      for (const i of insights) {
        await addDoc(collection(db, 'insights'), { ...i });
      }

      alert('Demo data seeded successfully!');
    } catch (e) {
      console.error(e);
      alert('Seeding failed. See console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={seed}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase rounded-xl border border-indigo-500/20 transition-all disabled:opacity-50"
    >
      {loading ? <RefreshCcw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
      Seed & Authorize Admin
    </button>
  );
}
