import { useState, useEffect } from 'react';

export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = window.navigator.standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkIfInstalled();

    // Online/Offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA Install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
      return true;
    }
    
    return false;
  };

  return {
    isOnline,
    isInstallable,
    isInstalled,
    installPWA
  };
};

// Background sync for offline actions
export const useBackgroundSync = () => {
  const queueUpdate = async (type, data) => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      // Store update in IndexedDB for sync
      try {
        await storeOfflineUpdate(type, data);
        
        // Register background sync
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(type);
        
        return true;
      } catch (error) {
        console.error('Background sync registration failed:', error);
        return false;
      }
    }
    
    return false;
  };

  return { queueUpdate };
};

// Simple IndexedDB wrapper for offline storage
const storeOfflineUpdate = (type, data) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('xruto-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([type], 'readwrite');
      const store = transaction.objectStore(type);
      
      const updateData = {
        id: Date.now(),
        data: data,
        timestamp: new Date().toISOString()
      };
      
      store.add(updateData);
      transaction.oncomplete = () => resolve(updateData);
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      
      // Create object stores for different sync types
      if (!db.objectStoreNames.contains('delivery-status-update')) {
        db.createObjectStore('delivery-status-update', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('upload-orders')) {
        db.createObjectStore('upload-orders', { keyPath: 'id' });
      }
    };
  });
};

// Push notification support
export const usePushNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);
  
  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    }
    return false;
  };
  
  const subscribeToPush = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.VITE_VAPID_PUBLIC_KEY || '')
        });
        
        // Send subscription to your server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        
        return subscription;
      } catch (error) {
        console.error('Push subscription failed:', error);
        return null;
      }
    }
    
    return null;
  };
  
  return {
    permission,
    requestPermission,
    subscribeToPush
  };
};

// Helper function for VAPID key conversion
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
};