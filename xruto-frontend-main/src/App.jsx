
import React, { useState, useEffect } from 'react';
import MyAdmin from './components/MyAdmin';
import Orders from './components/Orders';
import DriverRoutes from './components/DriverRoutes_IMPROVED';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { authAPI, tokenManager } from './services/api';

// Navigation Icons matching your Figma design
const MyAdminIcon = ({ isActive }) => (
  <svg className={`w-6 h-6 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const OrdersIcon = ({ isActive }) => (
  <svg className={`w-6 h-6 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const AnalyticsIcon = ({ isActive }) => (
  <svg className={`w-6 h-6 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const RouteIcon = ({ isActive }) => (
  <svg className={`w-6 h-6 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const SettingsIcon = ({ isActive }) => (
  <svg className={`w-6 h-6 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const App = () => {
  const [currentView, setCurrentView] = useState('admin');
  const [isLoggedIn, setIsLoggedIn] = useState(tokenManager.isLoggedIn());
  const [user, setUser] = useState(tokenManager.getUser());
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Listen for auth:logout events (triggered by 401 responses)
  useEffect(() => {
    const handleAuthLogout = () => {
      setIsLoggedIn(false);
      setUser(null);
      setCurrentView('admin');
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  // Set default view based on role
  useEffect(() => {
    if (user?.role === 'driver') {
      setCurrentView('routes');
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Logout even if API fails
      tokenManager.clear();
    }
    setIsLoggedIn(false);
    setUser(null);
    setCurrentView('admin');
    setShowProfileMenu(false);
  };

  // Profile menu items
  const profileMenuItems = [
    {
      icon: (
        <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      label: 'Edit Profile Details',
      action: () => { setCurrentView('settings'); setShowProfileMenu(false); }
    },
    {
      icon: (
        <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      label: 'Contact Info',
      action: () => { setCurrentView('settings'); setShowProfileMenu(false); }
    },
    {
      icon: (
        <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      label: 'Change Password',
      action: () => { setCurrentView('settings'); setShowProfileMenu(false); }
    },
    {
      icon: <LogoutIcon />,
      label: 'Logout',
      action: handleLogout
    }
  ];

  // Navigation items - admin sees all, drivers only see routes
  const isAdmin = user?.role === 'admin';
  const navigationItems = isAdmin ? [
    { id: 'admin', label: 'My Admin', icon: MyAdminIcon, view: 'admin' },
    { id: 'orders', label: 'Orders', icon: OrdersIcon, view: 'orders' },
    { id: 'routes', label: 'Driver Routes', icon: RouteIcon, view: 'routes' },
    { id: 'analytics', label: 'Analytics', icon: AnalyticsIcon, view: 'analytics' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, view: 'settings' },
  ] : [
    { id: 'routes', label: 'My Routes', icon: RouteIcon, view: 'routes' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, view: 'settings' },
  ];

  const handleNavigation = (view) => {
    setCurrentView(view);
    setShowProfileMenu(false);
  };

  // --- Login Screen ---
  const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
      e.preventDefault();
      if (!email || !password) {
        setLoginError('Please enter email and password');
        return;
      }
      setLoading(true);
      setLoginError('');
      try {
        const data = await authAPI.login({ email, password });
        if (data.success) {
          setUser(data.user);
          setIsLoggedIn(true);
        } else {
          setLoginError(data.message || 'Login failed');
        }
      } catch (err) {
        setLoginError(err.message || 'Login failed. Check your connection.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="bg-[#0D0B1F] min-h-screen flex items-center justify-center text-white px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">xRuto</h1>
            <p className="text-gray-400">Delivery Route Optimization</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-6 text-center">Login to Continue</h2>

            {loginError && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
                {loginError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@xruto.com"
                  className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-3 font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>

            <div className="mt-4 text-center text-xs text-gray-500">
              <p>Admin: admin@xruto.com / admin123</p>
              <p>Driver: driver@xruto.com / driver123</p>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const DashboardHeader = () => (
    <div className="bg-[#0D0B1F] text-white">
      <div className="text-center py-8 border-b border-gray-800">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">xRuto</h1>
          <p className="text-gray-400 text-sm">Delivery Route Optimization</p>
        </div>

        {/* Profile Section */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex flex-col items-center space-y-2 mx-auto hover:bg-white/5 rounded-lg p-3 transition-colors"
          >
            <div className="w-16 h-16 rounded-full border-2 border-orange-500 flex items-center justify-center bg-orange-500/20">
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <span className="text-gray-300 block">{user?.name || 'User'}</span>
              <span className="text-xs text-orange-400 capitalize">{user?.role || 'admin'}</span>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
              {profileMenuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    <span className="text-gray-300">{item.label}</span>
                  </div>
                  <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const BottomNavigation = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0D0B1F] border-t border-gray-800">
      <div className="flex justify-around py-2">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.view)}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              currentView === item.view
                ? 'bg-orange-500/20'
                : 'hover:bg-white/5'
            }`}
          >
            <item.icon isActive={currentView === item.view} />
            <span className={`text-xs ${
              currentView === item.view ? 'text-orange-500' : 'text-gray-400'
            }`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const PlaceholderScreen = ({ title }) => (
    <div className="bg-[#0D0B1F] min-h-screen text-white flex items-center justify-center pb-20">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-400">Coming Soon</p>
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  const renderMainContent = () => {
    switch (currentView) {
      case 'admin':
        return isAdmin ? (
          <div className="min-h-screen pb-20">
            <DashboardHeader />
            <MyAdmin onNavigateToDashboard={() => setCurrentView('admin')} />
          </div>
        ) : (
          // Redirect non-admin to routes
          <div className="min-h-screen">
            <DriverRoutes />
          </div>
        );
      case 'orders':
        return isAdmin ? (
          <div className="min-h-screen pb-20">
            <Orders
              onNavigateBack={() => setCurrentView('admin')}
              onNavigateToRouteDetail={(routeId) => {
                setCurrentView('routes');
              }}
            />
          </div>
        ) : (
          <div className="min-h-screen">
            <DriverRoutes />
          </div>
        );
      case 'routes':
        return (
          <div className="min-h-screen">
            <DriverRoutes />
          </div>
        );
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="min-h-screen pb-20">
            <DashboardHeader />
            <MyAdmin onNavigateToDashboard={() => setCurrentView('admin')} />
          </div>
        );
    }
  };

  return (
    <div className="bg-[#0D0B1F] min-h-screen">
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfileMenu(false)}
        />
      )}

      {renderMainContent()}

      <BottomNavigation />

      <PWAInstallPrompt />
    </div>
  );
};

export default App;
