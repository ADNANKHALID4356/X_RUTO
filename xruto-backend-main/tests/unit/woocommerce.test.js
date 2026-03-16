const wooCommerceService = require('../../services/woocommerce');

// Reset store state between tests
beforeEach(() => {
  // Clear all registered stores
  wooCommerceService.stores.clear();
});

describe('WooCommerce Service', () => {

  describe('registerStore', () => {
    it('should register a store with valid credentials', () => {
      const result = wooCommerceService.registerStore('store1', {
        url: 'https://shop.example.com',
        consumerKey: 'ck_test_key',
        consumerSecret: 'cs_test_secret',
      });

      expect(result.success).toBe(true);
      expect(result.storeId).toBe('store1');
    });

    it('should normalize URL by removing trailing slashes', () => {
      wooCommerceService.registerStore('store1', {
        url: 'https://shop.example.com///',
        consumerKey: 'ck_key',
        consumerSecret: 'cs_secret',
      });

      const stores = wooCommerceService.listStores();
      expect(stores[0].url).toBe('https://shop.example.com');
    });

    it('should throw on missing credentials', () => {
      expect(() => {
        wooCommerceService.registerStore('bad', { url: 'https://x.com' });
      }).toThrow('Missing required WooCommerce credentials');
    });

    it('should throw when consumerKey is missing', () => {
      expect(() => {
        wooCommerceService.registerStore('bad', {
          url: 'https://x.com',
          consumerSecret: 'cs_secret',
        });
      }).toThrow('Missing required WooCommerce credentials');
    });
  });

  describe('removeStore', () => {
    it('should remove a registered store', () => {
      wooCommerceService.registerStore('s1', {
        url: 'https://a.com',
        consumerKey: 'ck_a',
        consumerSecret: 'cs_a',
      });

      const result = wooCommerceService.removeStore('s1');
      expect(result.success).toBe(true);
      expect(wooCommerceService.listStores()).toHaveLength(0);
    });

    it('should return false for non-existent store', () => {
      const result = wooCommerceService.removeStore('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('listStores', () => {
    it('should return empty array when no stores registered', () => {
      expect(wooCommerceService.listStores()).toEqual([]);
    });

    it('should list all registered stores', () => {
      wooCommerceService.registerStore('s1', {
        url: 'https://a.com',
        consumerKey: 'ck_a',
        consumerSecret: 'cs_a',
      });
      wooCommerceService.registerStore('s2', {
        url: 'https://b.com',
        consumerKey: 'ck_b',
        consumerSecret: 'cs_b',
      });

      const stores = wooCommerceService.listStores();
      expect(stores).toHaveLength(2);
      expect(stores[0].storeId).toBe('s1');
      expect(stores[1].storeId).toBe('s2');
    });

    it('should expose url, lastSyncAt, and orderCount', () => {
      wooCommerceService.registerStore('s1', {
        url: 'https://shop.com',
        consumerKey: 'ck_k',
        consumerSecret: 'cs_s',
      });

      const store = wooCommerceService.listStores()[0];
      expect(store).toHaveProperty('url');
      expect(store).toHaveProperty('lastSyncAt');
      expect(store).toHaveProperty('orderCount');
      expect(store.lastSyncAt).toBeNull();
      expect(store.orderCount).toBe(0);
    });
  });

  describe('transformOrders', () => {
    const sampleWcOrders = [
      {
        id: 101,
        status: 'processing',
        total: '49.99',
        billing: { email: 'john@test.com', phone: '07123456789' },
        shipping: {
          first_name: 'John',
          last_name: 'Doe',
          address_1: '123 Main St',
          address_2: '',
          city: 'Warrington',
          state: 'Cheshire',
          postcode: 'WA4 1AB',
        },
        line_items: [
          { quantity: 2, weight: '1.5' },
          { quantity: 1, weight: '3.0' },
        ],
      },
    ];

    it('should transform WooCommerce orders to xRuto format', () => {
      const result = wooCommerceService.transformOrders(sampleWcOrders, 'mystore');

      expect(result).toHaveLength(1);
      const order = result[0];
      expect(order.wc_order_id).toBe(101);
      expect(order.store_id).toBe('mystore');
      expect(order.customer_name).toBe('John Doe');
      expect(order.customer_email).toBe('john@test.com');
      expect(order.postcode).toBe('WA4 1AB');
      expect(order.order_value).toBe(49.99);
      expect(order.status).toBe('pending');
      expect(order.source).toBe('woocommerce');
    });

    it('should filter out orders without shipping address', () => {
      const noShipping = [
        { id: 200, status: 'processing', total: '10', shipping: {}, billing: {} },
      ];
      const result = wooCommerceService.transformOrders(noShipping, 'store');
      expect(result).toHaveLength(0);
    });

    it('should calculate order weight from line items', () => {
      const result = wooCommerceService.transformOrders(sampleWcOrders, 'store');
      // 2 * 1.5 + 1 * 3.0 = 6.0
      expect(result[0].weight).toBe(6);
    });

    it('should handle missing billing data gracefully', () => {
      const noBilling = [{
        id: 300,
        status: 'processing',
        total: '25',
        shipping: { first_name: 'Jane', last_name: '', address_1: '1 High St', city: 'London', postcode: 'WA1 1AA' },
        line_items: [],
      }];
      const result = wooCommerceService.transformOrders(noBilling, 'store');
      expect(result).toHaveLength(1);
      expect(result[0].customer_name).toBe('Jane');
      expect(result[0].customer_email).toBe('');
    });
  });

  describe('calculateOrderWeight', () => {
    it('should return 1 for empty line items', () => {
      expect(wooCommerceService.calculateOrderWeight([])).toBe(1);
    });

    it('should return 1 for null/undefined', () => {
      expect(wooCommerceService.calculateOrderWeight(null)).toBe(1);
      expect(wooCommerceService.calculateOrderWeight(undefined)).toBe(1);
    });

    it('should sum weights * quantities', () => {
      const items = [
        { weight: '2', quantity: 3 },
        { weight: '0.5', quantity: 2 },
      ];
      // 2*3 + 0.5*2 = 7
      expect(wooCommerceService.calculateOrderWeight(items)).toBe(7);
    });
  });

  describe('handleWebhook', () => {
    it('should reject invalid payload', async () => {
      const result = await wooCommerceService.handleWebhook('store1', null);
      expect(result.success).toBe(false);
    });

    it('should reject payload without id', async () => {
      const result = await wooCommerceService.handleWebhook('store1', { status: 'processing' });
      expect(result.success).toBe(false);
    });

    it('should skip non-actionable statuses', async () => {
      const result = await wooCommerceService.handleWebhook('store1', {
        id: 999,
        status: 'completed',
        shipping: { address_1: '1 Main St', postcode: 'WA4 1AB' },
      });
      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
    });

    it('should process actionable order without database', async () => {
      const result = await wooCommerceService.handleWebhook('store1', {
        id: 888,
        status: 'processing',
        total: '50.00',
        shipping: {
          first_name: 'Test',
          last_name: 'User',
          address_1: '1 Test Road',
          city: 'Warrington',
          postcode: 'WA4 1AB',
        },
        billing: { email: 'test@test.com', phone: '07000000000' },
        line_items: [],
      });
      expect(result.success).toBe(true);
      expect(result.action).toBe('no_database');
      expect(result.order).toBeDefined();
      expect(result.order.customer_name).toBe('Test User');
    });
  });

  describe('fetchOrders', () => {
    it('should throw for non-existent store', async () => {
      await expect(
        wooCommerceService.fetchOrders('nonexistent')
      ).rejects.toThrow('Store not found');
    });
  });

  describe('syncStore', () => {
    it('should throw for non-existent store', async () => {
      await expect(
        wooCommerceService.syncStore('nonexistent')
      ).rejects.toThrow('Store not found');
    });
  });

  describe('syncAllStores', () => {
    it('should return empty array when no stores registered', async () => {
      const results = await wooCommerceService.syncAllStores();
      expect(results).toEqual([]);
    });
  });
});
