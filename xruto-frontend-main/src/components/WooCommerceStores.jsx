import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const wooAPI = {
  listStores: () => fetch(`${API_BASE_URL}/orders/woocommerce/stores`).then(r => r.json()),
  registerStore: (data) =>
    fetch(`${API_BASE_URL}/orders/woocommerce/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  syncStore: (storeId) =>
    fetch(`${API_BASE_URL}/orders/sync-woocommerce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId }),
    }).then(r => r.json()),
  removeStore: (storeId) =>
    fetch(`${API_BASE_URL}/orders/woocommerce/${encodeURIComponent(storeId)}`, { method: 'DELETE' })
      .then(r => r.json()),
};

const EMPTY_FORM = { storeId: '', name: '', url: '', consumerKey: '', consumerSecret: '' };

const WooCommerceStores = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [actionError, setActionError] = useState('');

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await wooAPI.listStores();
      setStores(data.stores || []);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStores(); }, [loadStores]);

  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleAddStore = async (e) => {
    e.preventDefault();
    if (!form.storeId || !form.url || !form.consumerKey || !form.consumerSecret) {
      setFormError('Store ID, URL, Consumer Key, and Consumer Secret are required.');
      return;
    }
    setFormSaving(true);
    setFormError('');
    try {
      const data = await wooAPI.registerStore(form);
      if (data.success) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        loadStores();
      } else {
        setFormError(data.message || 'Failed to add store.');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to add store.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleSync = async (storeId) => {
    setSyncingId(storeId);
    setSyncResult(null);
    setActionError('');
    try {
      const data = await wooAPI.syncStore(storeId);
      setSyncResult({ storeId, message: data.message || (data.success ? 'Sync completed' : 'Sync failed'), success: data.success });
      loadStores();
    } catch (err) {
      setActionError(err.message || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleRemove = async (storeId) => {
    if (!window.confirm(`Remove store "${storeId}"? This cannot be undone.`)) return;
    setActionError('');
    try {
      const data = await wooAPI.removeStore(storeId);
      if (data.success) {
        loadStores();
      } else {
        setActionError(data.message || 'Failed to remove store.');
      }
    } catch (err) {
      setActionError(err.message || 'Failed to remove store.');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">WooCommerce Stores</h2>
          <p className="text-gray-400 text-sm">Connect WordPress/WooCommerce sites to pull home delivery orders</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFormError(''); setForm(EMPTY_FORM); }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Store'}
        </button>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          {actionError}
          <button onClick={() => setActionError('')} className="font-bold ml-3">&times;</button>
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className={`border px-4 py-3 rounded-lg text-sm flex items-center justify-between ${
          syncResult.success ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-red-500/20 border-red-500/40 text-red-300'
        }`}>
          <span><strong>{syncResult.storeId}:</strong> {syncResult.message}</span>
          <button onClick={() => setSyncResult(null)} className="font-bold ml-3">&times;</button>
        </div>
      )}

      {/* Add store form */}
      {showForm && (
        <form onSubmit={handleAddStore} className="bg-gray-800/80 rounded-xl p-5 border border-gray-700 space-y-4">
          <h3 className="text-white font-semibold">Add WooCommerce Store</h3>
          {formError && (
            <p className="text-red-400 text-sm">{formError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">Store ID <span className="text-red-400">*</span></label>
              <input
                name="storeId"
                value={form.storeId}
                onChange={handleFormChange}
                placeholder="e.g. store_1 or my-shop"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Store Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="e.g. My Warrington Shop"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-400 text-xs mb-1">WordPress Site URL <span className="text-red-400">*</span></label>
              <input
                name="url"
                value={form.url}
                onChange={handleFormChange}
                placeholder="https://myshop.com"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Consumer Key <span className="text-red-400">*</span></label>
              <input
                name="consumerKey"
                value={form.consumerKey}
                onChange={handleFormChange}
                placeholder="ck_xxxxxxxx"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Consumer Secret <span className="text-red-400">*</span></label>
              <input
                name="consumerSecret"
                value={form.consumerSecret}
                onChange={handleFormChange}
                placeholder="cs_xxxxxxxx"
                type="password"
                className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={formSaving}
              className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {formSaving ? 'Saving...' : 'Add Store'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(''); }}
              className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-gray-500 text-xs">
            Generate your Consumer Key &amp; Secret in WooCommerce → Settings → Advanced → REST API.
            Set permissions to <strong className="text-gray-400">Read</strong>.
          </p>
        </form>
      )}

      {/* Store list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading stores...</p>
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-10 bg-gray-900/40 rounded-xl border border-gray-800">
          <div className="text-4xl mb-3">🛒</div>
          <h3 className="text-white font-semibold mb-1">No WooCommerce Stores</h3>
          <p className="text-gray-400 text-sm">Add a store above to start pulling home delivery orders automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map(store => (
            <div
              key={store.storeId}
              className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold truncate">{store.storeId}</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Active" />
                </div>
                <p className="text-gray-400 text-xs truncate">{store.url}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                  <span>Orders synced: <strong className="text-gray-400">{store.orderCount ?? 0}</strong></span>
                  <span>Last sync: <strong className="text-gray-400">{formatDate(store.lastSyncAt)}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleSync(store.storeId)}
                  disabled={syncingId === store.storeId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {syncingId === store.storeId ? 'Syncing…' : 'Sync Now'}
                </button>
                <button
                  onClick={() => handleRemove(store.storeId)}
                  className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg text-xs font-medium hover:bg-red-600/30 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WooCommerceStores;
