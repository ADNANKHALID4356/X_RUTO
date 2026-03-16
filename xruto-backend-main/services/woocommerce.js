const axios = require('axios');
const { getSupabase } = require('../config/supabase');

class WooCommerceService {
  constructor(config = {}) {
    this.stores = new Map();
    this.syncInterval = config.syncInterval || 15 * 60 * 1000; // 15 minutes default
  }

  /**
   * Register a WooCommerce store for order syncing.
   * @param {string} storeId - Unique identifier for this store
   * @param {object} credentials - { url, consumerKey, consumerSecret }
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

    console.log(`✅ WooCommerce store registered: ${storeId} (${baseUrl})`);
    return { success: true, storeId };
  }

  /**
   * Remove a registered store.
   */
  removeStore(storeId) {
    const removed = this.stores.delete(storeId);
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
