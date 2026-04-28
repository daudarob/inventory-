import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Services for Products
export const productService = {
  subscribeToProducts: (callback: (products: any[]) => void) => {
    return onSnapshot(collection(db, 'products'), (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(products);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));
  },
  addProduct: async (product: any) => {
    try {
      return await addDoc(collection(db, 'products'), { ...product, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  },
  updateProduct: async (productId: string, updates: any) => {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
    }
  },
  deleteProduct: async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  }
};

// Services for Clients
export const clientService = {
  subscribeToClients: (callback: (clients: any[]) => void) => {
    return onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(clients);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'clients'));
  },
  addClient: async (client: any) => {
    try {
      return await addDoc(collection(db, 'clients'), { ...client, createdAt: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  },
  deleteClient: async (clientId: string) => {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${clientId}`);
    }
  }
};

// Services for Orders
export const orderService = {
  subscribeToOrders: (callback: (orders: any[]) => void) => {
    return onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(orders);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'orders'));
  },
  addOrder: async (order: any) => {
    try {
      return await addDoc(collection(db, 'orders'), { ...order, timestamp: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  }
};

// Services for Logs
export const logService = {
  subscribeToLogs: (callback: (logs: any[]) => void) => {
    return onSnapshot(query(collection(db, 'logs'), orderBy('timestamp', 'desc')), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(logs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'logs'));
  },
  addLog: async (log: any) => {
    try {
      return await addDoc(collection(db, 'logs'), { ...log, timestamp: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'logs');
    }
  }
};

// Services for AI Insights
export const insightService = {
  subscribeToInsights: (callback: (insights: any[]) => void) => {
    return onSnapshot(query(collection(db, 'insights'), orderBy('timestamp', 'desc')), (snapshot) => {
      const insights = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(insights);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'insights'));
  },
  addInsight: async (insight: any) => {
    try {
      return await addDoc(collection(db, 'insights'), { 
        ...insight, 
        timestamp: serverTimestamp() 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'insights');
    }
  }
};

// Services for Users
export const userService = {
  getUserProfile: async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    }
  },
  createUserProfile: async (userId: string, data: any) => {
    try {
      // 1. Create the base User Profile
      const userProfile = {
        email: data.email || null,
        displayName: data.displayName || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        contact: data.contact || null,
        role: data.role,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', userId), userProfile);
      
      // 2. If Admin role, elevate to admins collection
      if (data.role === 'admin' && data.authKey) {
        await setDoc(doc(db, 'admins', userId), {
          email: data.email || null,
          authKey: data.authKey,
          authorizedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  }
};

// Services for Notifications
export const notificationService = {
  subscribeToNotifications: (userId: string, callback: (notifications: any[]) => void) => {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(notifications);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notifications'));
  },
  addNotification: async (notification: any) => {
    try {
      return await addDoc(collection(db, 'notifications'), { 
        ...notification, 
        read: false, 
        timestamp: serverTimestamp() 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  },
  markAsRead: async (notificationId: string) => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  },
  deleteNotification: async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${notificationId}`);
    }
  }
};

// Admin Check
export const checkIsAdmin = async (userId: string) => {
  try {
    const adminDoc = await getDoc(doc(db, 'admins', userId));
    return adminDoc.exists();
  } catch (error) {
    console.error("Error checking admin status", error);
    return false;
  }
};
