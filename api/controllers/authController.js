const { sql, poolPromise } = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'supersecret';

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('role', sql.NVarChar, role || 'viewer')
      .query('INSERT INTO users (name, email, password, role) VALUES (@name, @email, @password, @role); SELECT SCOPE_IDENTITY() as id;');
    
    // FIX: Use .id instead of .insertId
    const userId = result.recordset[0].id;
    
    res.status(201).json({ message: 'User registered', id: userId });
  } catch (err) {
    console.error('Registration Error:', err);
    
    // Handle duplicate email error
    if (err.number === 2627) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, name, email, password, role FROM users WHERE email = @email');
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { id: user.id, role: user.role },
      SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};
