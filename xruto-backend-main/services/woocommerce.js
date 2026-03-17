const axios = require('axios');
const { getSupabase } = require('../config/supabase');

class WooCommerceService {
  constructor(config = {}) {
    this.stores = new Map();
    this.syncInterval = config.syncInterval || 15 * 60 * 1000; // 15 minutes default
  }

  /**
   * Load all stores from Supabase into the in-memory Map.
   * Called once at server startup so registered stores survive restarts.
   */
  async initFromDatabase() {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data: rows, error } = await supabase
        .from('woocommerce_stores')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      for (const row of rows || []) {
        this.stores.set(row.store_id, {
          storeId: row.store_id,
          name: row.name || row.store_id,
          baseUrl: row.url,
          consumerKey: row.consumer_key,
          consumerSecret: row.consumer_secret,
          lastSyncAt: row.last_sync_at || null,
          orderCount: row.order_count || 0,
        });
      }
      console.log(`✅ Loaded ${this.stores.size} WooCommerce store(s) from database`);
    } catch (err) {
      console.warn('Could not load WooCommerce stores from database:', err.message);
    }
  }

  /**
   * Register a WooCommerce store for order syncing.
   * Persists to Supabase `woocommerce_stores` table when available.
   * @param {string} storeId - Unique identifier for this store
   * @param {object} credentials - { url, consumerKey, consumerSecret, name }
   */
  registerStore(storeId, credentials) {
    if (!credentials.url || !credentials.consumerKey || !credentials.consumerSecret) {
      throw new Error('Missing required WooCommerce credentials: url, consumerKey, consumerSecret');
    }

    // Normalize URL (remove trailing slash)
    const baseUrl = credentials.url.replace(/\/+$/, '');

    this.stores.set(storeId, {
      storeId,
      name: credentials.name || storeId,
      baseUrl,
      consumerKey: credentials.consumerKey,
      consumerSecret: credentials.consumerSecret,
      lastSyncAt: null,
      orderCount: 0,
    });

    // Persist to Supabase asynchronously (non-blocking)
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('woocommerce_stores').upsert({
        store_id: storeId,
        name: credentials.name || storeId,
        url: baseUrl,
        consumer_key: credentials.consumerKey,
        consumer_secret: credentials.consumerSecret,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'store_id' }).then(({ error }) => {
        if (error) console.warn(`Could not persist store ${storeId} to database:`, error.message);
        else console.log(`✅ WooCommerce store persisted to database: ${storeId}`);
      });
    }

    console.log(`✅ WooCommerce store registered: ${storeId} (${baseUrl})`);
    return { success: true, storeId };
  }

  /**
   * Remove a registered store.
   * Also marks it as inactive in Supabase when available.
   */
  removeStore(storeId) {
    const removed = this.stores.delete(storeId);

    if (removed) {
      const supabase = getSupabase();
      if (supabase) {
        supabase.from('woocommerce_stores')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('store_id', storeId)
          .then(({ error }) => {
            if (error) console.warn(`Could not deactivate store ${storeId} in database:`, error.message);
          });
      }
    }

    return { success: removed, storeId };
  }

  /**
   * List all registered stores.
   */
  listStores() {
    return Array.from(this.stores.values()).map(s => ({
      storeId: s.storeId,
      name: s.name || s.storeId,
      url: s.baseUrl,
      lastSyncAt: s.lastSyncAt,
      orderCount: s.orderCount,
    }));
  }

  /**
   * Fetch orders from a WooCommerce store.
   * @param {string} storeId
   * @param {object} params - { status, after, before, per_page }
   */
  async fetchOrders(storeId, params = {}) {
    const store = this.stores.get(storeId);
    if (!store) throw new Error(`Store not found: ${storeId}`);

    const {
      status = 'processing',
      after = null,
      before = null,
      per_page = 50,
      page = 1,
    } = params;

    try {
      const queryParams = {
        consumer_key: store.consumerKey,
        consumer_secret: store.consumerSecret,
        status,
        per_page,
        page,
        orderby: 'date',
        order: 'desc',
      };

      if (after) queryParams.after = after;
      if (before) queryParams.before = before;

      const response = await axios.get(`${store.baseUrl}/wp-json/wc/v3/orders`, {
        params: queryParams,
        timeout: 30000,
      });

      const wcOrders = response.data || [];
      console.log(`📦 Fetched ${wcOrders.length} orders from ${storeId}`);

      return {
        success: true,
        orders: wcOrders,
        total: parseInt(response.headers['x-wp-total'] || '0', 10),
        totalPages: parseInt(response.headers['x-wp-totalpages'] || '1', 10),
      };
    } catch (error) {
      console.error(`WooCommerce API error (${storeId}):`, error.message);
      throw new Error(`Failed to fetch orders from ${storeId}: ${error.message}`);
    }
  }

  /**
   * Transform WooCommerce orders into xRuto format.
   */
  transformOrders(wcOrders, storeId) {
    return wcOrders
      .filter(order => order.shipping && order.shipping.address_1)
      .map(order => {
        const shipping = order.shipping;
        const postcode = shipping.postcode || '';

        return {
          wc_order_id: order.id,
          store_id: storeId,
          customer_name: `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() || 'Unknown',
          customer_email: order.billing?.email || '',
          customer_phone: order.billing?.phone || '',
          delivery_address: [shipping.address_1, shipping.address_2, shipping.city, shipping.state]
            .filter(Boolean).join(', '),
          postcode,
          city: shipping.city || '',
          order_value: parseFloat(order.total) || 0,
          weight: this.calculateOrderWeight(order.line_items),
          delivery_date: new Date().toISOString().split('T')[0],
          status: 'pending',
          source: 'woocommerce',
          wc_status: order.status,
          latitude: null,
          longitude: null,
        };
      });
  }

  /**
   * Calculate total weight from line items.
   */
  calculateOrderWeight(lineItems) {
    if (!lineItems || lineItems.length === 0) return 1;
    return lineItems.reduce((total, item) => {
      const weight = parseFloat(item.weight || item.meta_data?.find(m => m.key === 'weight')?.value || 0);
      return total + (weight * (item.quantity || 1));
    }, 0) || 1;
  }

  /**
   * Sync orders from a store and save to Supabase.
   */
  async syncStore(storeId) {
    const store = this.stores.get(storeId);
    if (!store) throw new Error(`Store not found: ${storeId}`);

    console.log(`🔄 Syncing orders from ${storeId}...`);

    try {
      // Fetch all processing orders
      const { orders: wcOrders, total } = await this.fetchOrders(storeId, {
        status: 'processing',
        per_page: 100,
      });

      // Transform to xRuto format
      const transformedOrders = this.transformOrders(wcOrders, storeId);

      if (transformedOrders.length === 0) {
        store.lastSyncAt = new Date().toISOString();
        return { success: true, synced: 0, total, message: 'No new deliverable orders' };
      }

      // Try to save to Supabase
      const supabase = getSupabase();
      let insertedCount = 0;

      if (supabase) {
        // Upsert based on wc_order_id + store_id to avoid duplicates
        for (const order of transformedOrders) {
          try {
            const { data: existing } = await supabase
              .from('orders')
              .select('id')
              .eq('wc_order_id', order.wc_order_id)
              .eq('store_id', order.store_id)
              .single();

            if (!existing) {
              const { error } = await supabase.from('orders').insert(order);
              if (!error) insertedCount++;
            }
          } catch {
            // Order already exists or insert failed, skip
          }
        }
      }

      store.lastSyncAt = new Date().toISOString();
      store.orderCount = total;

      // Update last_sync_at and order_count in Supabase
      if (supabase) {
        supabase.from('woocommerce_stores')
          .update({ last_sync_at: store.lastSyncAt, order_count: total, updated_at: store.lastSyncAt })
          .eq('store_id', storeId)
          .then(({ error }) => {
            if (error) console.warn(`Could not update sync metadata for ${storeId}:`, error.message);
          });
      }

      console.log(`✅ Synced ${insertedCount} new orders from ${storeId}`);

      return {
        success: true,
        synced: insertedCount,
        total: transformedOrders.length,
        totalInStore: total,
        storeId,
      };
    } catch (error) {
      console.error(`Sync failed for ${storeId}:`, error.message);
      throw error;
    }
  }

  /**
   * Sync all registered stores.
   */
  async syncAllStores() {
    const results = [];
    for (const [storeId] of this.stores) {
      try {
        const result = await this.syncStore(storeId);
        results.push(result);
      } catch (error) {
        results.push({ success: false, storeId, error: error.message });
      }
    }
    return results;
  }

  /**
   * Push a delivery status update back to WooCommerce.
   * Called after a driver marks an order as delivered or failed.
   *
   * @param {string} storeId        - Registered store ID
   * @param {string|number} wcOrderId - WooCommerce order ID
   * @param {string} wcStatus       - WooCommerce status ('completed', 'failed', etc.)
   * @param {object} meta           - Optional { notes, reason } for the order note
   */
  async updateOrderStatus(storeId, wcOrderId, wcStatus, meta = {}) {
    const store = this.stores.get(storeId);
    if (!store) {
      console.warn(`WooCommerce sync-back skipped: store "${storeId}" not registered`);
      return { success: false, message: 'Store not registered' };
    }

    const url = `${store.baseUrl}/wp-json/wc/v3/orders/${wcOrderId}`;
    const note = [
      wcStatus === 'completed' ? 'Order delivered via xRuto.' : 'Delivery failed via xRuto.',
      meta.reason ? `Reason: ${meta.reason}` : '',
      meta.notes ? `Notes: ${meta.notes}` : '',
    ].filter(Boolean).join(' ');

    try {
      // Update order status
      await axios.put(
        url,
        { status: wcStatus },
        {
          auth: { username: store.consumerKey, password: store.consumerSecret },
          timeout: 10000,
        }
      );

      // Add order note
      if (note) {
        await axios.post(
          `${store.baseUrl}/wp-json/wc/v3/orders/${wcOrderId}/notes`,
          { note, customer_note: false },
          {
            auth: { username: store.consumerKey, password: store.consumerSecret },
            timeout: 10000,
          }
        ).catch(() => {}); // Note creation is best-effort
      }

      console.log(`✅ WooCommerce sync-back: order ${wcOrderId} -> ${wcStatus}`);
      return { success: true, wcOrderId, wcStatus };
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error(`WooCommerce sync-back failed for order ${wcOrderId}:`, msg);
      return { success: false, message: msg };
    }
  }

  /**
   * Handle WooCommerce webhook payload.
   * Called when WooCommerce sends a webhook for new/updated orders.
   */
  async handleWebhook(storeId, payload, signature = '') {
    if (!payload || !payload.id) {
      return { success: false, message: 'Invalid webhook payload' };
    }

    console.log(`📩 Webhook received from ${storeId}: Order #${payload.id} (${payload.status})`);

    // Only process orders that are ready for delivery
    if (!['processing', 'on-hold'].includes(payload.status)) {
      return { success: true, message: 'Order status not actionable', action: 'skipped' };
    }

    const transformed = this.transformOrders([payload], storeId);
    if (transformed.length === 0) {
      return { success: true, message: 'Order has no shipping address', action: 'skipped' };
    }

    const order = transformed[0];
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('wc_order_id', order.wc_order_id)
          .eq('store_id', order.store_id)
          .single();

        if (existing) {
          await supabase.from('orders').update({
            status: 'pending',
            wc_status: payload.status,
            order_value: order.order_value,
          }).eq('id', existing.id);
          return { success: true, action: 'updated', orderId: existing.id };
        }

        const { data, error } = await supabase.from('orders').insert(order).select().single();
        if (error) throw error;
        return { success: true, action: 'created', orderId: data.id };
      } catch (err) {
        console.error('Webhook DB error:', err.message);
        return { success: false, message: err.message };
      }
    }

    return { success: true, action: 'no_database', order };
  }
}

// Singleton instance
const wooCommerceService = new WooCommerceService();

module.exports = wooCommerceService;
