// Use environment variable instead of hardcoded URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// --- Token Management ---
const TOKEN_KEY = 'xruto_token';
const USER_KEY = 'xruto_user';

export const tokenManager = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
  getUser: () => {
    try {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(USER_KEY),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
};

// Generic API request handler with auth
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = tokenManager.getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  // Handle 401 - token expired or invalid
  if (response.status === 401) {
    tokenManager.clear();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Admin API
export const adminAPI = {
  async getSettings() {
    return apiRequest('/admin/settings');
  },

  async updateSettings(settings) {
    return apiRequest('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async getDepots() {
    return apiRequest('/admin/depots');
  },

  async addDepot(depot) {
    return apiRequest('/admin/depots', {
      method: 'POST',
      body: JSON.stringify(depot),
    });
  },

  async updateDepot(id, depot) {
    return apiRequest(`/admin/depots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(depot),
    });
  },

  async removeDepot(id) {
    return apiRequest(`/admin/depots/${id}`, {
      method: 'DELETE',
    });
  },

  async getDrivers() {
    return apiRequest('/admin/drivers');
  },

  async getDriver(id) {
    return apiRequest(`/admin/drivers/${id}`);
  },

  async addDriver(driver) {
    return apiRequest('/admin/drivers', {
      method: 'POST',
      body: JSON.stringify(driver),
    });
  },

  async updateDriver(id, driver) {
    return apiRequest(`/admin/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(driver),
    });
  },

  async removeDriver(id) {
    return apiRequest(`/admin/drivers/${id}`, {
      method: 'DELETE',
    });
  },

  async toggleDriverStatus(id, isActive) {
    return apiRequest(`/admin/drivers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  async getSystemHealth() {
    return apiRequest('/admin/health');
  },

  async testConnection() {
    return apiRequest('/admin/test');
  },
};

// Auth API
export const authAPI = {
  async login(credentials) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data.success && data.token) {
      tokenManager.setToken(data.token);
      tokenManager.setUser(data.user);
    }
    return data;
  },

  async register(userData) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      tokenManager.clear();
    }
  },

  async getCurrentUser() {
    return apiRequest('/auth/me');
  },

  async changePassword(currentPassword, newPassword) {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// Orders API
export const ordersAPI = {
  async getOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/orders${queryString ? `?${queryString}` : ''}`);
  },

  async createOrder(order) {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },

  async updateOrder(id, order) {
    return apiRequest(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(order),
    });
  },

  async deleteOrder(id) {
    return apiRequest(`/orders/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkUpload(orders) {
    return apiRequest('/orders/bulk', {
      method: 'POST',
      body: JSON.stringify({ orders }),
    });
  },
};

// Routes API
export const routesAPI = {
  async getRoutes(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/routes${queryString ? `?${queryString}` : ''}`);
  },

  async createRoute(route) {
    return apiRequest('/routes', {
      method: 'POST',
      body: JSON.stringify(route),
    });
  },

  async updateRoute(id, route) {
    return apiRequest(`/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(route),
    });
  },

  async deleteRoute(id) {
    return apiRequest(`/routes/${id}`, {
      method: 'DELETE',
    });
  },

  async optimizeRoutes(params) {
    return apiRequest('/routes/optimize', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async assignDriver(routeId, driverId) {
    return apiRequest(`/routes/${routeId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ driverId }),
    });
  },

  async updateRouteStatus(routeId, status) {
    return apiRequest(`/routes/${routeId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// Export default combined API
const api = {
  admin: adminAPI,
  auth: authAPI,
  orders: ordersAPI,
  routes: routesAPI,
};

export default api;
