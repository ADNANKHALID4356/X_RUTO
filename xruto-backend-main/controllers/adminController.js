const { getSupabase } = require('../config/supabase');

const adminController = {
  // GET /api/admin/settings
  async getSettings(req, res) {
    try {
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: settings, error } = await supabase
            .from('settings')
            .select('*')
            .single();

          if (error && error.code !== 'PGRST116') throw error;

          return res.json({
            success: true,
            settings: settings || adminController._defaultSettings()
          });
        } catch (dbError) {
          console.error('Supabase settings error, using defaults:', dbError.message);
        }
      }

      res.json({ success: true, settings: adminController._defaultSettings() });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
    }
  },

  // PUT /api/admin/settings
  async updateSettings(req, res) {
    try {
      console.log('Updating settings:', req.body);
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: existing } = await supabase.from('settings').select('id').single();

          let result;
          if (existing) {
            result = await supabase
              .from('settings')
              .update({ ...req.body, updated_at: new Date().toISOString() })
              .eq('id', existing.id)
              .select()
              .single();
          } else {
            result = await supabase.from('settings').insert(req.body).select().single();
          }

          if (result.error) throw result.error;

          return res.json({ success: true, message: 'Settings updated successfully', settings: result.data });
        } catch (dbError) {
          console.error('Supabase update settings error:', dbError.message);
        }
      }

      res.json({ success: true, message: 'Settings updated (no database configured)', settings: req.body });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
    }
  },

  // GET /api/admin/depots
  async getDepots(req, res) {
    try {
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: depots, error } = await supabase
            .from('depots')
            .select('*, drivers!depot_id(id, is_active, is_available_today)')
            .eq('is_active', true)
            .order('name');

          if (error) throw error;

          const formattedDepots = (depots || []).map(depot => {
            const allDrivers = depot.drivers || [];
            const activeDrivers = allDrivers.filter(d => d.is_active);
            const availableDrivers = activeDrivers.filter(d => d.is_available_today);

            return {
              id: depot.id,
              name: depot.name,
              address: depot.address,
              city: depot.city || '',
              postcode: depot.postcode || '',
              latitude: depot.latitude,
              longitude: depot.longitude,
              capacity: depot.capacity || 500,
              is_primary: depot.is_primary || false,
              is_active: depot.is_active,
              driver_count: activeDrivers.length,
              available_drivers: availableDrivers.length,
              contact_phone: depot.contact_phone || '',
              contact_email: depot.contact_email || ''
            };
          });

          return res.json({ success: true, depots: formattedDepots });
        } catch (dbError) {
          console.error('Supabase depots error, using mock data:', dbError.message);
        }
      }

      res.json({
        success: true,
        depots: [{
          id: '1', name: 'Warrington Distribution Center',
          address: 'Milton Grove, Latchford, Warrington', city: 'Warrington',
          postcode: 'WA4 1EG', latitude: 53.3808256, longitude: -2.575416,
          capacity: 1000, is_primary: true, is_active: true,
          driver_count: 3, available_drivers: 2
        }]
      });
    } catch (error) {
      console.error('Get depots error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch depots', error: error.message });
    }
  },

  // POST /api/admin/depots
  async addDepot(req, res) {
    try {
      console.log('Adding depot:', req.body);
      const { name, address, city, postcode, capacity, contactPhone, contactEmail, latitude, longitude } = req.body;

      if (!name || !address) {
        return res.status(400).json({ success: false, message: 'Name and address are required' });
      }

      const supabase = getSupabase();

      if (supabase) {
        try {
          const depotData = {
            name: name.trim(),
            address: address.trim(),
            city: city ? city.trim() : null,
            postcode: postcode ? postcode.trim() : null,
            latitude: parseFloat(latitude || 53.3808256),
            longitude: parseFloat(longitude || -2.575416),
            capacity: capacity ? parseInt(capacity) : 500,
            contact_phone: contactPhone ? contactPhone.trim() : null,
            contact_email: contactEmail ? contactEmail.trim() : null,
            is_primary: false,
            is_active: true
          };

          const { data: depot, error } = await supabase.from('depots').insert(depotData).select().single();
          if (error) throw error;

          return res.status(201).json({
            success: true, message: 'Depot added successfully',
            depot: { ...depot, driver_count: 0, available_drivers: 0 }
          });
        } catch (dbError) {
          console.error('Supabase add depot error, using mock response:', dbError.message);
        }
      }

      res.status(201).json({
        success: true, message: 'Depot added (no database configured)',
        depot: { id: Date.now().toString(), ...req.body, driver_count: 0, available_drivers: 0 }
      });
    } catch (error) {
      console.error('Add depot error:', error);
      res.status(500).json({ success: false, message: 'Failed to add depot', error: error.message });
    }
  },

  // GET /api/admin/drivers
  async getDrivers(req, res) {
    try {
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: drivers, error } = await supabase
            .from('drivers')
            .select('*, depots(name, city)')
            .eq('is_active', true)
            .order('first_name');

          if (error) throw error;

          const formattedDrivers = (drivers || []).map(driver => ({
            id: driver.id,
            name: (driver.first_name || '') + ' ' + (driver.last_name || '').trim(),
            email: driver.email,
            phone: driver.phone,
            first_name: driver.first_name,
            last_name: driver.last_name,
            depot_id: driver.depot_id,
            mpg: driver.mpg,
            vehicle_type: driver.vehicle_type,
            vehicle_capacity: driver.vehicle_capacity,
            license_plate: driver.license_plate,
            is_active: driver.is_active,
            is_available_today: driver.is_available_today,
            details: (driver.depots?.name || 'No Depot') + ', ' + (driver.mpg || 30) + ' MPG'
          }));

          return res.json({ success: true, drivers: formattedDrivers });
        } catch (dbError) {
          console.error('Supabase drivers error, using mock data:', dbError.message);
        }
      }

      res.json({
        success: true,
        drivers: [{
          id: '1', name: 'John Driver', email: 'john.driver@xruto.com',
          phone: '07123456789', first_name: 'John', last_name: 'Driver',
          depot_id: '1', mpg: 35.5, vehicle_type: 'van',
          is_active: true, is_available_today: true,
          details: 'Warrington Distribution Center, 35.5 MPG'
        }]
      });
    } catch (error) {
      console.error('Get drivers error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch drivers', error: error.message });
    }
  },

  // POST /api/admin/drivers
  async addDriver(req, res) {
    try {
      console.log('Adding driver:', req.body);
      const { firstName, lastName, email, phone, depotId, mpg, vehicleType, vehicleCapacity, licensePlate } = req.body;

      if (!firstName || !lastName || !email) {
        return res.status(400).json({ success: false, message: 'First name, last name, and email are required' });
      }

      const supabase = getSupabase();

      if (supabase) {
        try {
          const driverData = {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            phone: phone ? phone.trim() : null,
            depot_id: depotId || null,
            mpg: mpg ? parseFloat(mpg) : 30.0,
            vehicle_type: vehicleType || 'van',
            vehicle_capacity: vehicleCapacity ? parseInt(vehicleCapacity) : 50,
            license_plate: licensePlate ? licensePlate.trim() : null,
            is_active: true,
            is_available_today: true
          };

          const { data: driver, error } = await supabase
            .from('drivers')
            .insert(driverData)
            .select('*, depots(name)')
            .single();

          if (error) throw error;

          return res.status(201).json({
            success: true, message: 'Driver added successfully',
            driver: {
              id: driver.id,
              name: driver.first_name + ' ' + driver.last_name,
              details: (driver.depots?.name || 'No Depot') + ', ' + (driver.mpg || 30) + ' MPG',
              ...driver
            }
          });
        } catch (dbError) {
          console.error('Supabase add driver error, using mock response:', dbError.message);
        }
      }

      res.status(201).json({
        success: true, message: 'Driver added (no database configured)',
        driver: { id: Date.now().toString(), name: firstName + ' ' + lastName, details: 'Test Depot, 30 MPG', ...req.body }
      });
    } catch (error) {
      console.error('Add driver error:', error);
      res.status(500).json({ success: false, message: 'Failed to add driver', error: error.message });
    }
  },

  // PUT /api/admin/depots/:id
  async updateDepot(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      console.log('Updating depot:', id, updates);

      const supabase = getSupabase();

      if (supabase) {
        const updateData = {};
        if (updates.name) updateData.name = updates.name.trim();
        if (updates.address) updateData.address = updates.address.trim();
        if (updates.city !== undefined) updateData.city = updates.city ? updates.city.trim() : null;
        if (updates.postcode !== undefined) updateData.postcode = updates.postcode ? updates.postcode.trim() : null;
        if (updates.latitude !== undefined) updateData.latitude = parseFloat(updates.latitude);
        if (updates.longitude !== undefined) updateData.longitude = parseFloat(updates.longitude);
        if (updates.capacity !== undefined) updateData.capacity = parseInt(updates.capacity);
        if (updates.contactPhone !== undefined) updateData.contact_phone = updates.contactPhone ? updates.contactPhone.trim() : null;
        if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail ? updates.contactEmail.trim() : null;
        if (updates.is_primary !== undefined) updateData.is_primary = updates.is_primary;
        updateData.updated_at = new Date().toISOString();

        const { data: depot, error } = await supabase
          .from('depots')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        if (!depot) return res.status(404).json({ success: false, message: 'Depot not found' });

        return res.json({ success: true, message: 'Depot updated successfully', depot });
      }

      res.json({ success: true, message: 'Depot updated (no database configured)', depot: { id, ...updates } });
    } catch (error) {
      console.error('Update depot error:', error);
      res.status(500).json({ success: false, message: 'Failed to update depot', error: error.message });
    }
  },

  // DELETE /api/admin/depots/:id
  async removeDepot(req, res) {
    try {
      const { id } = req.params;
      console.log('Removing depot:', id);

      const supabase = getSupabase();

      if (supabase) {
        const { error } = await supabase
          .from('depots')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;

        return res.json({ success: true, message: 'Depot removed successfully' });
      }

      res.json({ success: true, message: 'Depot removed (no database configured)' });
    } catch (error) {
      console.error('Remove depot error:', error);
      res.status(500).json({ success: false, message: 'Failed to remove depot', error: error.message });
    }
  },

  // PUT /api/admin/drivers/:id
  async updateDriver(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      console.log('Updating driver:', id, updates);

      const supabase = getSupabase();

      if (supabase) {
        const updateData = {};
        if (updates.firstName) updateData.first_name = updates.firstName.trim();
        if (updates.lastName) updateData.last_name = updates.lastName.trim();
        if (updates.email) updateData.email = updates.email.trim();
        if (updates.phone !== undefined) updateData.phone = updates.phone ? updates.phone.trim() : null;
        if (updates.depotId !== undefined) updateData.depot_id = updates.depotId || null;
        if (updates.mpg !== undefined) updateData.mpg = parseFloat(updates.mpg);
        if (updates.vehicleType !== undefined) updateData.vehicle_type = updates.vehicleType;
        if (updates.vehicleCapacity !== undefined) updateData.vehicle_capacity = parseInt(updates.vehicleCapacity);
        if (updates.licensePlate !== undefined) updateData.license_plate = updates.licensePlate ? updates.licensePlate.trim() : null;
        if (updates.is_available_today !== undefined) updateData.is_available_today = updates.is_available_today;
        updateData.updated_at = new Date().toISOString();

        const { data: driver, error } = await supabase
          .from('drivers')
          .update(updateData)
          .eq('id', id)
          .select('*, depots(name)')
          .single();

        if (error) throw error;
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

        return res.json({
          success: true,
          message: 'Driver updated successfully',
          driver: {
            id: driver.id,
            name: driver.first_name + ' ' + driver.last_name,
            details: (driver.depots?.name || 'No Depot') + ', ' + (driver.mpg || 30) + ' MPG',
            ...driver
          }
        });
      }

      res.json({ success: true, message: 'Driver updated (no database configured)', driver: { id, ...updates } });
    } catch (error) {
      console.error('Update driver error:', error);
      res.status(500).json({ success: false, message: 'Failed to update driver', error: error.message });
    }
  },

  // DELETE /api/admin/drivers/:id
  async removeDriver(req, res) {
    try {
      const { id } = req.params;
      console.log('Removing driver:', id);

      const supabase = getSupabase();

      if (supabase) {
        const { error } = await supabase
          .from('drivers')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;

        return res.json({ success: true, message: 'Driver removed successfully' });
      }

      res.json({ success: true, message: 'Driver removed (no database configured)' });
    } catch (error) {
      console.error('Remove driver error:', error);
      res.status(500).json({ success: false, message: 'Failed to remove driver', error: error.message });
    }
  },

  _defaultSettings() {
    return {
      drivers_today_count: 5,
      include_admin_as_driver: false,
      navigation_app_preference: 'here',
      enable_stock_refill: false,
      max_deliveries_per_route: 25,
      max_routes_per_day: 10,
      default_fuel_price: 1.45,
      enable_help_tooltips: true,
      auto_assign_routes: true,
      route_optimization_method: 'distance',
      customer_notifications: true,
      driver_app_enabled: true,
      woocommerce_integration_enabled: false,
      sync_frequency_minutes: 15,
      enable_real_time_tracking: false
    };
  }
};

module.exports = adminController;
