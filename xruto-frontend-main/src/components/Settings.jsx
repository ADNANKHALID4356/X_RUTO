import React, { useState, useEffect } from 'react';
import { authAPI, tokenManager } from '../services/api';

const Settings = () => {
  const [user, setUser] = useState(tokenManager.getUser());
  const [activeSection, setActiveSection] = useState('profile');

  // Profile state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      // Update local storage with new name
      const updatedUser = { ...user, ...profileForm };
      tokenManager.setUser(updatedUser);
      setUser(updatedUser);
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.message });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      await authAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message });
    } finally {
      setPasswordSaving(false);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'password', label: 'Security', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  return (
    <div className="bg-[#0D0B1F] min-h-screen text-white pb-24">
      {/* Header */}
      <div className="border-b border-gray-800 sticky top-0 z-20 bg-[#0D0B1F]">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-gray-400 text-sm">Manage your profile and preferences</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === s.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 p-6">
            <h2 className="text-white font-bold mb-4">Profile Details</h2>

            {profileMessage && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                profileMessage.type === 'success' ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                  : 'bg-red-500/20 border border-red-500/40 text-red-300'
              }`}>{profileMessage.text}</div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(p => ({...p, name: e.target.value}))}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(p => ({...p, email: e.target.value}))}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(p => ({...p, phone: e.target.value}))}
                  placeholder="Enter phone number"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <div className="text-sm text-gray-500 mb-3">
                  <span className="capitalize font-medium text-gray-400">Role:</span> {user?.role || 'admin'}
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security / Password Section */}
        {activeSection === 'password' && (
          <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 p-6">
            <h2 className="text-white font-bold mb-4">Change Password</h2>

            {passwordMessage && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                passwordMessage.type === 'success' ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                  : 'bg-red-500/20 border border-red-500/40 text-red-300'
              }`}>{passwordMessage.text}</div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(p => ({...p, currentPassword: e.target.value}))}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(p => ({...p, newPassword: e.target.value}))}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(p => ({...p, confirmPassword: e.target.value}))}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {passwordSaving ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* Preferences Section */}
        {activeSection === 'preferences' && (
          <div className="space-y-4">
            <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 p-6">
              <h2 className="text-white font-bold mb-4">Navigation Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white text-sm font-medium">Default Navigation App</span>
                    <p className="text-gray-500 text-xs">Choose navigation for route links</p>
                  </div>
                  <select className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none">
                    <option value="here">HERE WeGo</option>
                    <option value="google">Google Maps</option>
                    <option value="waze">Waze</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white text-sm font-medium">Dark Mode</span>
                    <p className="text-gray-500 text-xs">Application theme</p>
                  </div>
                  <div className="bg-orange-500 rounded-full w-10 h-6 flex items-center px-1 cursor-pointer">
                    <div className="bg-white rounded-full w-4 h-4 transform translate-x-4 transition-transform" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white text-sm font-medium">Push Notifications</span>
                    <p className="text-gray-500 text-xs">Delivery and route updates</p>
                  </div>
                  <div className="bg-gray-700 rounded-full w-10 h-6 flex items-center px-1 cursor-pointer">
                    <div className="bg-white rounded-full w-4 h-4 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 p-6">
              <h2 className="text-white font-bold mb-4">Data & Storage</h2>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <span className="text-gray-300 text-sm">Clear Cached Data</span>
                  <span className="text-gray-500 text-xs">Free up storage</span>
                </button>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <span className="text-gray-300 text-sm">Export Data</span>
                  <span className="text-gray-500 text-xs">Download CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* About Section */}
        {activeSection === 'about' && (
          <div className="bg-gray-900/60 backdrop-blur rounded-xl border border-gray-800 p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">xRuto</h2>
              <p className="text-gray-400 text-sm mb-4">Delivery Route Optimization Platform</p>
              <div className="inline-block bg-gray-800 rounded-lg px-4 py-2 text-sm text-gray-400 mb-6">
                Version 1.0.0
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Platform</span>
                <span className="text-gray-300">PWA (Progressive Web App)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Frontend</span>
                <span className="text-gray-300">React + Vite + Tailwind</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Backend</span>
                <span className="text-gray-300">Node.js + Express + Supabase</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Maps & Routing</span>
                <span className="text-gray-300">HERE Maps API</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Clustering</span>
                <span className="text-gray-300">K-Means with workload balancing</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
