
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

// Enhanced SVG Icons
const InfoIcon = ({ className, onClick }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={`${className} ${onClick ? 'cursor-help hover:text-orange-400' : ''}`} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
    onClick={onClick}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const ArrowLeftIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
  </svg>
);

const SaveIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const CancelIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MailIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const BuildingIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const LocationIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const HelpIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Enhanced Admin Component
const MyAdmin = ({ onNavigateToDashboard }) => {
  const [settings, setSettings] = useState({});
  const [depots, setDepots] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Help system state
  const [helpEnabled, setHelpEnabled] = useState(true);
  const [showTooltip, setShowTooltip] = useState(null);

  // Enhanced form states
  const [newDepot, setNewDepot] = useState({ 
    name: '', 
    address: '', 
    city: '', 
    postcode: '', 
    capacity: '',
    contactPhone: '',
    contactEmail: ''
  });
  
  const [newDriver, setNewDriver] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '',
    depotId: '', 
    mpg: '',
    vehicleType: 'van',
    vehicleCapacity: '50',
    licensePlate: '',
    workingHours: '{"start": "08:00", "end": "18:00"}',
    maxRoutesPerDay: '3',
    notes: ''
  });

  // Edit states
  const [editingDriver, setEditingDriver] = useState(null);
  const [editDriverData, setEditDriverData] = useState({});
  const [editingDepot, setEditingDepot] = useState(null);
  const [editDepotData, setEditDepotData] = useState({});

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [settingsData, depotsData, driversData] = await Promise.all([
        adminAPI.getSettings(),
        adminAPI.getDepots(),
        adminAPI.getDrivers()
      ]);
      
      setSettings(settingsData.settings);
      setDepots(depotsData.depots);
      setDrivers(driversData.drivers);
      setHelpEnabled(settingsData.settings.enable_help_tooltips !== false);
    } catch (error) {
      setError('Failed to load admin data: ' + error.message);
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (key, value) => {
    try {
      setSaving(true);
      await adminAPI.updateSettings({ [key]: value });
      setSettings(prev => ({ ...prev, [key]: value }));
      
      if (key === 'enable_help_tooltips') {
        setHelpEnabled(value);
      }
      
      setSuccess('Settings updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update setting: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Depot handlers
  const handleAddDepot = async () => {
    if (!newDepot.name || !newDepot.address) {
      setError('Please fill in depot name and address');
      return;
    }

    try {
      setSaving(true);
      await adminAPI.addDepot(newDepot);
      setNewDepot({ 
        name: '', 
        address: '', 
        city: '', 
        postcode: '', 
        capacity: '',
        contactPhone: '',
        contactEmail: ''
      });
      await loadAdminData();
      setSuccess('Depot added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to add depot: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditDepot = (depot) => {
    setEditingDepot(depot.id);
    setEditDepotData({
      name: depot.name || '',
      address: depot.address || '',
      city: depot.city || '',
      postcode: depot.postcode || '',
      capacity: depot.capacity || '',
      contactPhone: depot.contact_phone || '',
      contactEmail: depot.contact_email || ''
    });
  };

  const handleSaveDepotEdit = async () => {
    try {
      setSaving(true);
      await adminAPI.updateDepot(editingDepot, editDepotData);
      setEditingDepot(null);
      setEditDepotData({});
      await loadAdminData();
      setSuccess('Depot updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update depot: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDepotEdit = () => {
    setEditingDepot(null);
    setEditDepotData({});
  };

  const handleRemoveDepot = async (depotId) => {
    if (!confirm('Are you sure you want to remove this depot? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      await adminAPI.removeDepot(depotId);
      await loadAdminData();
      setSuccess('Depot removed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to remove depot: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Driver handlers
  const handleAddDriver = async () => {
    if (!newDriver.firstName || !newDriver.lastName || !newDriver.email) {
      setError('Please fill in driver name and email');
      return;
    }

    try {
      setSaving(true);
      await adminAPI.addDriver({
        firstName: newDriver.firstName,
        lastName: newDriver.lastName,
        email: newDriver.email,
        phone: newDriver.phone,
        depotId: newDriver.depotId || null,
        mpg: newDriver.mpg ? parseFloat(newDriver.mpg) : null,
        vehicleType: newDriver.vehicleType,
        vehicleCapacity: newDriver.vehicleCapacity ? parseInt(newDriver.vehicleCapacity) : null,
        licensePlate: newDriver.licensePlate,
        workingHours: newDriver.workingHours,
        maxRoutesPerDay: newDriver.maxRoutesPerDay ? parseInt(newDriver.maxRoutesPerDay) : null,
        notes: newDriver.notes
      });
      
      setNewDriver({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        phone: '',
        depotId: '', 
        mpg: '',
        vehicleType: 'van',
        vehicleCapacity: '50',
        licensePlate: '',
        workingHours: '{"start": "08:00", "end": "18:00"}',
        maxRoutesPerDay: '3',
        notes: ''
      });
      
      await loadAdminData();
      setSuccess('Driver added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to add driver: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditDriver = (driver) => {
    setEditingDriver(driver.id);
    setEditDriverData({
      firstName: driver.first_name || driver.name?.split(' ')[0] || '',
      lastName: driver.last_name || driver.name?.split(' ').slice(1).join(' ') || '',
      email: driver.email || '',
      phone: driver.phone || '',
      depotId: driver.depot_id || '',
      mpg: driver.mpg || '',
      vehicleType: driver.vehicle_type || 'van',
      vehicleCapacity: driver.vehicle_capacity || '',
      licensePlate: driver.license_plate || '',
      notes: driver.notes || ''
    });
  };

  const handleSaveDriverEdit = async () => {
    try {
      setSaving(true);
      await adminAPI.updateDriver(editingDriver, editDriverData);
      setEditingDriver(null);
      setEditDriverData({});
      await loadAdminData();
      setSuccess('Driver updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update driver: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDriverEdit = () => {
    setEditingDriver(null);
    setEditDriverData({});
  };

  const handleRemoveDriver = async (driverId) => {
    if (!confirm('Are you sure you want to remove this driver? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      await adminAPI.removeDriver(driverId);
      await loadAdminData();
      setSuccess('Driver removed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to remove driver: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const showHelp = (helpText) => {
    if (helpEnabled) {
      setShowTooltip(helpText);
      setTimeout(() => setShowTooltip(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0D0B1F] min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p>Loading enhanced admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0D0B1F] min-h-screen text-white">
      <header className="p-4 flex justify-between items-center">
        <button 
          onClick={onNavigateToDashboard}
          className="text-sm text-orange-400 flex items-center hover:text-orange-300 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Dashboard
        </button>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setHelpEnabled(!helpEnabled)}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
              helpEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            <HelpIcon className="w-4 h-4" />
            <span>Help {helpEnabled ? 'On' : 'Off'}</span>
          </button>
          
          <div className="text-sm text-blue-400">
            {saving ? 'Saving...' : success ? 'Settings Synced' : 'Ready'}
          </div>
        </div>
      </header>

      {/* Tooltip Display */}
      {showTooltip && (
        <div className="mx-4 mb-4 bg-blue-500/20 border border-blue-500 rounded-xl p-3 text-blue-300 text-sm">
          {showTooltip}
          <button 
            onClick={() => setShowTooltip(null)}
            className="float-right text-blue-400 hover:text-blue-300"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="mx-4 mb-4 bg-red-500/20 border border-red-500 rounded-xl p-3 text-red-300 text-sm">
          {error}
          <button 
            onClick={() => setError('')}
            className="float-right text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="mx-4 mb-4 bg-green-500/20 border border-green-500 rounded-xl p-3 text-green-300 text-sm">
          {success}
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Enhanced General Settings */}
        <Section title="General Settings">
          <SettingRow label="Include Admin in Delivery Team?" helpText="Allow admin to be assigned as a driver for deliveries">
            <ToggleSwitch 
              isOn={settings.include_admin_as_driver || false}
              onChange={(value) => handleSettingChange('include_admin_as_driver', value)}
              disabled={saving}
            />
          </SettingRow>
          
          <SettingRow label="How Many Drivers Today?" helpText="Set the number of drivers available for today's deliveries">
            <DriverCountSelector 
              value={settings.drivers_today_count || 3}
              onChange={(value) => handleSettingChange('drivers_today_count', value)}
              disabled={saving}
            />
          </SettingRow>

          <div className="bg-black/20 p-4 rounded-xl space-y-4">
            <label className="text-gray-300 flex items-center">
              Preferred Navigation App 
              <InfoIcon 
                className="w-4 h-4 ml-1 text-gray-500"
                onClick={() => showHelp('Choose between Google Maps (25 stops max) or HERE Maps (50 stops max) for driver navigation')}
              />
            </label>
            <RadioOption 
              id="google" 
              name="navApp" 
              label="Google Maps" 
              sublabel="25 Stops Per Route" 
              checked={settings.navigation_app_preference === 'google'} 
              onChange={() => handleSettingChange('navigation_app_preference', 'google')}
              disabled={saving}
            />
            <RadioOption 
              id="here" 
              name="navApp" 
              label="HERE Maps" 
              sublabel="50 Stops Per Route" 
              checked={settings.navigation_app_preference === 'here'} 
              onChange={() => handleSettingChange('navigation_app_preference', 'here')}
              disabled={saving}
            />
          </div>

          <SettingRow label="Enable Stock Refill Logic?" helpText="Drivers will return to depot when they run out of meals/stock">
            <ToggleSwitch 
              isOn={settings.enable_stock_refill || false}
              onChange={(value) => handleSettingChange('enable_stock_refill', value)}
              disabled={saving}
            />
          </SettingRow>

          <NumericStepper 
            label="Deliveries in One Trip" 
            helpText="Maximum number of deliveries a driver can handle in one route"
            value={settings.max_deliveries_per_route || 25}
            onChange={(value) => handleSettingChange('max_deliveries_per_route', value)}
            disabled={saving}
            showHelp={showHelp}
          />
          
          <NumericStepper 
            label="Trips per Day" 
            helpText="Maximum number of routes that can be created per day"
            value={settings.max_routes_per_day || 10}
            onChange={(value) => handleSettingChange('max_routes_per_day', value)}
            disabled={saving}
            showHelp={showHelp}
          />

          <SettingRow label="Auto-Assign Routes?" helpText="Automatically assign routes to available drivers using load balancing">
            <ToggleSwitch 
              isOn={settings.auto_assign_routes || false}
              onChange={(value) => handleSettingChange('auto_assign_routes', value)}
              disabled={saving}
            />
          </SettingRow>
        </Section>
        
        {/* Enhanced Depot Management */}
        <Section title="Depot Management">
          {depots.map(depot => (
            <EnhancedDepotCard 
              key={depot.id}
              depot={depot}
              isEditing={editingDepot === depot.id}
              editData={editDepotData}
              onEditDataChange={setEditDepotData}
              onEdit={() => handleEditDepot(depot)}
              onSave={handleSaveDepotEdit}
              onCancel={handleCancelDepotEdit}
              onRemove={() => handleRemoveDepot(depot.id)}
              disabled={saving}
            />
          ))}
          
          <div className="w-full p-6 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl space-y-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">Add New Depot</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center bg-black/20 rounded-lg p-3">
                <BuildingIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Depot Name"
                  value={newDepot.name}
                  onChange={(e) => setNewDepot(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-transparent w-full ml-3 text-white placeholder-gray-500 focus:outline-none"
                  disabled={saving}
                />
              </div>
              
              <div className="flex items-center bg-black/20 rounded-lg p-3">
                <LocationIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="City"
                  value={newDepot.city}
                  onChange={(e) => setNewDepot(prev => ({ ...prev, city: e.target.value }))}
                  className="bg-transparent w-full ml-3 text-white placeholder-gray-500 focus:outline-none"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex items-center bg-black/20 rounded-lg p-3">
              <LocationIcon className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Full Address"
                value={newDepot.address}
                onChange={(e) => setNewDepot(prev => ({ ...prev, address: e.target.value }))}
                className="bg-transparent w-full ml-3 text-white placeholder-gray-500 focus:outline-none"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Postcode"
                value={newDepot.postcode}
                onChange={(e) => setNewDepot(prev => ({ ...prev, postcode: e.target.value }))}
                className="bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
                disabled={saving}
              />
              <input
                type="number"
                placeholder="Daily Capacity"
                value={newDepot.capacity}
                onChange={(e) => setNewDepot(prev => ({ ...prev, capacity: e.target.value }))}
                className="bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
                disabled={saving}
              />
              <input
                type="tel"
                placeholder="Contact Phone"
                value={newDepot.contactPhone}
                onChange={(e) => setNewDepot(prev => ({ ...prev, contactPhone: e.target.value }))}
                className="bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
                disabled={saving}
              />
            </div>

            <input
              type="email"
              placeholder="Contact Email"
              value={newDepot.contactEmail}
              onChange={(e) => setNewDepot(prev => ({ ...prev, contactEmail: e.target.value }))}
              className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
              disabled={saving}
            />

            <SlideButton 
              text={saving ? "Adding..." : "Slide To Add Depot"} 
              onClick={handleAddDepot}
              disabled={saving || !newDepot.name || !newDepot.address}
            />
          </div>
        </Section>

        {/* Enhanced Driver Management */}
        <Section title="Driver Management">
          {drivers.map(driver => (
            <EnhancedDriverCard 
              key={driver.id}
              driver={driver}
              isEditing={editingDriver === driver.id}
              editData={editDriverData}
              onEditDataChange={setEditDriverData}
              onEdit={() => handleEditDriver(driver)}
              onSave={handleSaveDriverEdit}
              onCancel={handleCancelDriverEdit}
              onRemove={() => handleRemoveDriver(driver.id)}
              depots={depots}
              disabled={saving}
            />
          ))}
          
          <div className="w-full p-6 bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl space-y-4 mt-4">
            <h3 className="text-lg font-semibold mb-4">Add New Driver</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center bg-black/20 rounded-lg p-3">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="First Name"
                  value={newDriver.firstName}
                  onChange={(e) => setNewDriver(prev => ({ ...prev, firstName: e.target.value }))}
                  className="bg-transparent w-full ml-3 text-white placeholder-gray-500 focus:outline-none"
                  disabled={saving}
                />
              </div>
              
              <div className="flex items-center bg-black/20 rounded-lg p-3">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={newDriver.lastName}
                  onChange={(e) => setNewDriver(prev => ({ ...prev, lastName: e.target.value }))}
                  className="bg-transparent w-full ml-3 text-white placeholder-gray-500 focus:outline-none"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center bg-black/20 rounded-lg p-3">
                <MailIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newDriver.email}
                  onChange={(e) => setNewDriver(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-transparent w-full ml-3 text-white placeholder-gray-500 focus:outline-none"
                  disabled={saving}
                />
              </div>
              
              <input
                type="tel"
                placeholder="Phone Number"
                value={newDriver.phone}
                onChange={(e) => setNewDriver(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DepotSelector 
                value={newDriver.depotId}
                onChange={(value) => setNewDriver(prev => ({ ...prev, depotId: value }))}
                depots={depots}
                disabled={saving}
                placeholder="Select Depot"
              />
              
              <VehicleTypeSelector
                value={newDriver.vehicleType}
                onChange={(value) => setNewDriver(prev => ({ ...prev, vehicleType: value }))}
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="number"
                placeholder="MPG"
                value={newDriver.mpg}
                onChange={(e) => setNewDriver(prev => ({ ...prev, mpg: e.target.value }))}
                className="bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
                disabled={saving}
              />
              <input
                type="number"
                placeholder="Vehicle Capacity"
                value={newDriver.vehicleCapacity}
                onChange={(e) => setNewDriver(prev => ({ ...prev, vehicleCapacity: e.target.value }))}
                className="bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
                disabled={saving}
              />
              <input
                type="text"
                placeholder="License Plate"
                value={newDriver.licensePlate}
                onChange={(e) => setNewDriver(prev => ({ ...prev, licensePlate: e.target.value }))}
                className="bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
                disabled={saving}
              />
            </div>

            <textarea
              placeholder="Additional Notes"
              value={newDriver.notes}
              onChange={(e) => setNewDriver(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none resize-none"
              rows="3"
              disabled={saving}
            />

            <SlideButton 
              text={saving ? "Adding..." : "Slide To Add Driver"} 
              onClick={handleAddDriver}
              disabled={saving || !newDriver.firstName || !newDriver.lastName || !newDriver.email}
            />
          </div>
        </Section>

        <Section title="Fuel & Cost Settings">
          <FuelPriceInput 
            value={settings.default_fuel_price || '1.45'}
            onChange={(value) => handleSettingChange('default_fuel_price', value)}
            disabled={saving}
            helpText="Set the default fuel price per litre for cost calculations"
            showHelp={showHelp}
          />
          
          <SettingRow label="Route Optimization Method" helpText="Choose how routes should be optimized">
            <OptimizationMethodSelector
              value={settings.route_optimization_method || 'distance'}
              onChange={(value) => handleSettingChange('route_optimization_method', value)}
              disabled={saving}
            />
          </SettingRow>

          <div className="mt-4">
            <SlideButton 
              text={saving ? "Saving..." : "Slide To Save Configuration"}
              onClick={() => setSuccess('Configuration saved successfully!')}
              disabled={saving}
            />
          </div>
        </Section>

        {/* Integration Settings Section */}
        <Section title="Integration Settings">
          <SettingRow label="WooCommerce Integration" helpText="Enable integration with WooCommerce for order sync">
            <ToggleSwitch 
              isOn={settings.woocommerce_integration_enabled || false}
              onChange={(value) => handleSettingChange('woocommerce_integration_enabled', value)}
              disabled={saving}
            />
          </SettingRow>

          {settings.woocommerce_integration_enabled && (
            <div className="space-y-4 mt-4 p-4 bg-black/20 rounded-xl">
              <input
                type="url"
                placeholder="Webhook URL"
                value={settings.webhook_url || ''}
                onChange={(e) => handleSettingChange('webhook_url', e.target.value)}
                className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
                disabled={saving}
              />
              
              <NumericStepper 
                label="Sync Frequency (minutes)" 
                helpText="How often to sync with WooCommerce (in minutes)"
                value={settings.sync_frequency_minutes || 15}
                onChange={(value) => handleSettingChange('sync_frequency_minutes', value)}
                disabled={saving}
                min={5}
                max={120}
                showHelp={showHelp}
              />
            </div>
          )}

          <SettingRow label="Real-time Tracking" helpText="Enable real-time GPS tracking for drivers">
            <ToggleSwitch 
              isOn={settings.enable_real_time_tracking || false}
              onChange={(value) => handleSettingChange('enable_real_time_tracking', value)}
              disabled={saving}
            />
          </SettingRow>

          <SettingRow label="Customer Notifications" helpText="Send automatic notifications to customers">
            <ToggleSwitch 
              isOn={settings.customer_notifications !== false}
              onChange={(value) => handleSettingChange('customer_notifications', value)}
              disabled={saving}
            />
          </SettingRow>

          <SettingRow label="Driver Mobile App" helpText="Enable the mobile app for drivers">
            <ToggleSwitch 
              isOn={settings.driver_app_enabled !== false}
              onChange={(value) => handleSettingChange('driver_app_enabled', value)}
              disabled={saving}
            />
          </SettingRow>
        </Section>
      </div>
    </div>
  );
};

// Enhanced Interactive Components
const Section = ({ title, children }) => (
  <div className="bg-white/5 p-4 rounded-2xl">
    <h2 className="text-xl font-semibold mb-4">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const SettingRow = ({ label, children, helpText }) => (
  <div className="bg-black/20 p-4 rounded-xl flex justify-between items-center">
    <label className="text-gray-300 flex items-center">
      {label} 
      {helpText && (
        <InfoIcon 
          className="w-4 h-4 ml-1 text-gray-500 cursor-help hover:text-orange-400"
          onClick={() => showHelp && showHelp(helpText)}
        />
      )}
    </label>
    {children}
  </div>
);

const ToggleSwitch = ({ isOn, onChange, disabled }) => (
  <div 
    onClick={() => !disabled && onChange(!isOn)} 
    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
      isOn ? 'bg-orange-500' : 'bg-gray-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isOn ? 'translate-x-6' : ''}`}></div>
  </div>
);

const DriverCountSelector = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const options = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];

  return (
    <div className="relative">
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="bg-black/20 rounded-lg p-3 flex justify-between items-center w-full cursor-pointer"
      >
        <span className="text-gray-400">{value} driver{value !== 1 ? 's' : ''}</span>
        <ChevronDownIcon className="w-5 h-5 text-gray-400"/>
      </div>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
          {options.map(option => (
            <div
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="p-3 hover:bg-gray-700 cursor-pointer text-white"
            >
              {option} driver{option !== 1 ? 's' : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DepotSelector = ({ value, onChange, depots, disabled, placeholder = "Select Depot" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="bg-black/20 rounded-lg p-3 flex justify-between items-center w-full cursor-pointer"
      >
        <span className="text-gray-400">
          {value ? depots.find(d => d.id === value)?.name || placeholder : placeholder}
        </span>
        <ChevronDownIcon className="w-5 h-5 text-gray-400"/>
      </div>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          <div
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="p-3 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-600"
          >
            No Depot
          </div>
          {depots.map(depot => (
            <div
              key={depot.id}
              onClick={() => {
                onChange(depot.id);
                setIsOpen(false);
              }}
              className="p-3 hover:bg-gray-700 cursor-pointer text-white"
            >
              <div className="font-medium">{depot.name}</div>
              <div className="text-sm text-gray-400">{depot.city}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VehicleTypeSelector = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const options = [
    { value: 'van', label: 'Van', capacity: '50-80 deliveries' },
    { value: 'car', label: 'Car', capacity: '20-35 deliveries' },
    { value: 'motorcycle', label: 'Motorcycle', capacity: '15-25 deliveries' },
    { value: 'truck', label: 'Truck', capacity: '100+ deliveries' }
  ];

  return (
    <div className="relative">
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="bg-black/20 rounded-lg p-3 flex justify-between items-center w-full cursor-pointer"
      >
        <span className="text-gray-400">
          {options.find(o => o.value === value)?.label || 'Select Vehicle Type'}
        </span>
        <ChevronDownIcon className="w-5 h-5 text-gray-400"/>
      </div>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-lg z-10">
          {options.map(option => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="p-3 hover:bg-gray-700 cursor-pointer text-white"
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-gray-400">{option.capacity}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const OptimizationMethodSelector = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const options = [
    { value: 'distance', label: 'Distance', description: 'Minimize total distance' },
    { value: 'time', label: 'Time', description: 'Minimize total time' },
    { value: 'fuel_cost', label: 'Fuel Cost', description: 'Minimize fuel expenses' }
  ];

  return (
    <div className="relative">
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="bg-black/20 rounded-lg p-3 flex justify-between items-center w-full cursor-pointer"
      >
        <span className="text-gray-400">
          {options.find(o => o.value === value)?.label || 'Select Method'}
        </span>
        <ChevronDownIcon className="w-5 h-5 text-gray-400"/>
      </div>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-lg z-10">
          {options.map(option => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="p-3 hover:bg-gray-700 cursor-pointer text-white"
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-gray-400">{option.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RadioOption = ({ id, name, label, sublabel, checked, onChange, disabled }) => (
  <div 
    className={`flex items-center ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    onClick={() => !disabled && onChange()}
  >
    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked ? 'border-orange-500' : 'border-gray-600'}`}>
      {checked && <span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span>}
    </span>
    <div className="ml-3">
      <p className="font-semibold">{label}</p>
      <p className="text-xs text-gray-400">{sublabel}</p>
    </div>
  </div>
);

const NumericStepper = ({ label, value, onChange, disabled, helpText, showHelp, min = 1, max = 100 }) => (
  <div className="bg-black/20 p-4 rounded-xl">
    <div className="flex justify-between items-center">
      <label className="text-gray-300 flex items-center">
        {label} 
        {helpText && showHelp && (
          <InfoIcon 
            className="w-4 h-4 ml-1 text-gray-500 cursor-help hover:text-orange-400"
            onClick={() => showHelp(helpText)}
          />
        )}
      </label>
      <div className="flex items-center space-x-4 bg-gray-700/50 rounded-lg p-1">
        <button 
          onClick={() => !disabled && onChange(Math.max(min, value - 1))} 
          disabled={disabled || value <= min}
          className="w-8 h-8 rounded-md bg-gray-600 text-white text-xl disabled:opacity-50 hover:bg-gray-500"
        >
          -
        </button>
        <span className="text-lg font-semibold w-10 text-center">{value}</span>
        <button 
          onClick={() => !disabled && onChange(Math.min(max, value + 1))} 
          disabled={disabled || value >= max}
          className="w-8 h-8 rounded-md bg-gray-600 text-white text-xl disabled:opacity-50 hover:bg-gray-500"
        >
          +
        </button>
      </div>
    </div>
    {helpText && (
      <p className="text-xs text-gray-500 mt-2">{helpText}</p>
    )}
  </div>
);

const EnhancedDepotCard = ({ depot, isEditing, editData, onEditDataChange, onEdit, onSave, onCancel, onRemove, disabled }) => {
  if (isEditing) {
    return (
      <div className="bg-black/20 p-4 rounded-lg space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-lg">Editing Depot</h4>
          <div className="flex space-x-2">
            <SaveIcon 
              className="w-5 h-5 text-green-400 cursor-pointer hover:text-green-300"
              onClick={onSave}
            />
            <CancelIcon 
              className="w-5 h-5 text-red-400 cursor-pointer hover:text-red-300"
              onClick={onCancel}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Depot Name"
            value={editData.name || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, name: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="City"
            value={editData.city || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, city: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
        
        <input
          type="text"
          placeholder="Address"
          value={editData.address || ''}
          onChange={(e) => onEditDataChange(prev => ({ ...prev, address: e.target.value }))}
          className="w-full bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Postcode"
            value={editData.postcode || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, postcode: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
          <input
            type="number"
            placeholder="Capacity"
            value={editData.capacity || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, capacity: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
          <input
            type="tel"
            placeholder="Contact Phone"
            value={editData.contactPhone || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, contactPhone: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
        
        <input
          type="email"
          placeholder="Contact Email"
          value={editData.contactEmail || ''}
          onChange={(e) => onEditDataChange(prev => ({ ...prev, contactEmail: e.target.value }))}
          className="w-full bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className="bg-black/20 p-4 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-semibold text-lg">{depot.name}</h4>
            {depot.is_primary && (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                Primary
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">{depot.address}</p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span>{depot.driver_count || 0} drivers</span>
            <span>{depot.available_drivers || 0} available</span>
            <span>Capacity: {depot.capacity || 'N/A'}</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <EditIcon 
            className={`w-5 h-5 text-blue-400 cursor-pointer hover:text-blue-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onEdit()}
          />
          <TrashIcon 
            className={`w-5 h-5 text-red-400 cursor-pointer hover:text-red-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onRemove()}
          />
        </div>
      </div>
    </div>
  );
};

const EnhancedDriverCard = ({ 
  driver, 
  isEditing, 
  editData, 
  onEditDataChange, 
  onEdit, 
  onSave, 
  onCancel, 
  onRemove, 
  depots, 
  disabled 
}) => {
  if (isEditing) {
    return (
      <div className="bg-black/20 p-4 rounded-lg space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-lg">Editing Driver</h4>
          <div className="flex space-x-2">
            <SaveIcon 
              className="w-5 h-5 text-green-400 cursor-pointer hover:text-green-300"
              onClick={onSave}
            />
            <CancelIcon 
              className="w-5 h-5 text-red-400 cursor-pointer hover:text-red-300"
              onClick={onCancel}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="First Name"
            value={editData.firstName || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, firstName: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={editData.lastName || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, lastName: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="email"
            placeholder="Email"
            value={editData.email || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, email: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={editData.phone || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, phone: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DepotSelector 
            value={editData.depotId || ''}
            onChange={(value) => onEditDataChange(prev => ({ ...prev, depotId: value }))}
            depots={depots}
            placeholder="Select Depot"
          />
          <input
            type="number"
            placeholder="MPG"
            value={editData.mpg || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, mpg: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="License Plate"
            value={editData.licensePlate || ''}
            onChange={(e) => onEditDataChange(prev => ({ ...prev, licensePlate: e.target.value }))}
            className="bg-black/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 p-4 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-semibold text-lg">{driver.name}</h4>
            {driver.is_available_today === false && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                Unavailable
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-2">{driver.email}</p>
          <p className="text-xs text-gray-500">{driver.details}</p>
          {driver.phone && (
            <p className="text-xs text-gray-500 mt-1">📞 {driver.phone}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <EditIcon 
            className={`w-5 h-5 text-blue-400 cursor-pointer hover:text-blue-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onEdit()}
          />
          <TrashIcon 
            className={`w-5 h-5 text-red-400 cursor-pointer hover:text-red-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !disabled && onRemove()}
          />
        </div>
      </div>
    </div>
  );
};

const FuelPriceInput = ({ value, onChange, disabled, helpText, showHelp }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div>
      <label className="text-sm text-gray-400 mb-1 block flex items-center">
        Fuel Price per Litre 
        {helpText && showHelp && (
          <InfoIcon 
            className="w-4 h-4 ml-1 text-gray-500 cursor-help hover:text-orange-400"
            onClick={() => showHelp(helpText)}
          />
        )}
      </label>
      <div className="bg-black/20 rounded-lg p-3 flex items-center">
        <span className="text-gray-400 font-bold text-lg">£</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={localValue}
          onChange={handleChange}
          placeholder="Enter Cost"
          disabled={disabled}
          className="bg-transparent w-full ml-3 text-white placeholder-gray-500 focus:outline-none disabled:opacity-50"
        />
      </div>
    </div>
  );
};

const SlideButton = ({ text, onClick, disabled }) => (
  <button 
    onClick={() => !disabled && onClick()}
    disabled={disabled}
    className={`w-full bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-1 flex items-center shadow-lg hover:scale-105 transition-transform duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <div className="w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
      <ArrowRightIcon />
    </div>
    <span className="flex-grow text-center text-lg font-semibold">{text}</span>
  </button>
);

export default MyAdmin;
