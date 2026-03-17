const { getSupabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Use shared Supabase singleton
const supabase = getSupabase();

if (!supabase) {
  console.warn('⚠️ Auth controller: Supabase not configured — auth will use hardcoded dev credentials only');
}

const authController = {
  // Enhanced login with database authentication
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      console.log(`🔐 Login attempt for email: ${email}`);

      // Try database authentication first (when Supabase is configured)
      if (supabase) {
        try {
          const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('id, name, email, role, password_hash, is_active')
            .eq('email', email.toLowerCase())
            .single();

          if (!dbError && dbUser && dbUser.is_active) {
            const passwordMatch = await bcrypt.compare(password, dbUser.password_hash);
            if (passwordMatch) {
              // Update last login timestamp
              supabase.from('users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', dbUser.id)
                .then(() => {});

              const token = jwt.sign(
                { id: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.name },
                jwtSecret,
                { expiresIn: '24h' }
              );

              console.log(`✅ Database login successful: ${email} (${dbUser.role})`);
              return res.json({
                success: true,
                message: 'Login successful',
                user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role },
                token,
              });
            }
            // Password mismatch — reject without falling through to dev credentials
            console.log('❌ Invalid password for database user');
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
          }
          // No DB user found — fall through to dev credentials below
        } catch (dbErr) {
          console.warn('Database login lookup failed, falling back to dev credentials:', dbErr.message);
        }
      }

      // Development / fallback hardcoded credentials
      // For development - simple hardcoded authentication
      // In production, you'd verify against a users table with hashed passwords
      if (email === 'admin@xruto.com' && password === 'admin123') {
        // Generate JWT token
        const token = jwt.sign(
          { 
            id: 'admin-1',
            email: 'admin@xruto.com',
            role: 'admin',
            name: 'Admin User'
          },
          jwtSecret,
          { expiresIn: '24h' }
        );

        console.log('✅ Admin login successful');

        res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: 'admin-1',
            email: 'admin@xruto.com',
            name: 'Admin User',
            role: 'admin'
          },
          token
        });
      } else if (email === 'driver@xruto.com' && password === 'driver123') {
        // Driver login
        const token = jwt.sign(
          { 
            id: 'driver-1',
            email: 'driver@xruto.com',
            role: 'driver',
            name: 'Driver User'
          },
          jwtSecret,
          { expiresIn: '24h' }
        );

        console.log('✅ Driver login successful');

        res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: 'driver-1',
            email: 'driver@xruto.com',
            name: 'Driver User',
            role: 'driver'
          },
          token
        });
      } else {
        console.log('❌ Invalid credentials provided');
        
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  },

  // Enhanced registration with password hashing
  async register(req, res) {
    try {
      const { name, email, password, role = 'user' } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      console.log(`📝 Registration attempt for email: ${email}`);

      // Hash password and persist to database when Supabase is available
      const hashedPassword = await bcrypt.hash(password, 10);

      const validRoles = ['admin', 'driver', 'staff'];
      const userRole = validRoles.includes(role) ? role : 'driver';

      if (supabase) {
        try {
          // Check for duplicate email
          const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();
          if (existing) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
          }

          const { data: dbUser, error: insertErr } = await supabase
            .from('users')
            .insert({
              name,
              email: email.toLowerCase(),
              password_hash: hashedPassword,
              role: userRole,
              is_active: true,
            })
            .select('id, name, email, role')
            .single();

          if (insertErr) throw insertErr;

          console.log(`✅ User registered in database: ${email} (${userRole})`);
          return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role },
          });
        } catch (dbErr) {
          console.warn('Database registration failed, returning dev mode response:', dbErr.message);
        }
      }

      // Fallback (no Supabase)
      const newUser = {
        id: `user-${Date.now()}`,
        name,
        email,
        role: userRole,
        created_at: new Date().toISOString()
      };

      console.log('✅ User registration successful (dev mode)');

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: newUser
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  },

  // Logout - invalidate token
  async logout(req, res) {
    try {
      // In a production app, you might maintain a blacklist of invalidated tokens
      // For now, we'll just return success as the client will delete the token
      
      console.log('👋 User logout');
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  },

  // Get current user from token
  async getCurrentUser(req, res) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      try {
        const decoded = jwt.verify(token, jwtSecret);
        
        console.log('✅ Token verified for user:', decoded.email);
        
        res.json({
          success: true,
          user: {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role
          }
        });
      } catch (jwtError) {
        console.log('❌ Invalid or expired token');
        
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get current user',
        error: error.message
      });
    }
  },

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      try {
        const decoded = jwt.verify(refreshToken, jwtSecret);
        
        // Generate new token
        const newToken = jwt.sign(
          { 
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name
          },
          jwtSecret,
          { expiresIn: '24h' }
        );

        console.log('🔄 Token refreshed for user:', decoded.email);

        res.json({
          success: true,
          message: 'Token refreshed successfully',
          token: newToken
        });
      } catch (jwtError) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: error.message
      });
    }
  },

  // Password reset request
  async resetPassword(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      console.log(`🔑 Password reset requested for: ${email}`);
      
      // In production, you'd generate a reset token and send an email
      // For development, just return success
      
      res.json({
        success: true,
        message: 'Password reset email sent (development mode)',
        dev_note: 'In production, this would send an actual email with reset link'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset',
        error: error.message
      });
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Get user from token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, jwtSecret);

      console.log(`🔐 Password change requested for user: ${decoded.email}`);
      
      // In production, you'd verify current password and hash the new one
      // For development, just return success
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  },

  // Verify token middleware
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  },

  // Check if user has required role
  requireRole: (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }
};

module.exports = authController;