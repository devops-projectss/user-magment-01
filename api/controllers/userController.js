const { sql, poolPromise } = require('../models/db');
const bcrypt = require('bcryptjs');

// GET all users
exports.getAllUsers = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT id, name, email, role FROM users');
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Get All Users Error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// CREATE new user
exports.addUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
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
    
    const insertId = result.recordset[0].id;
    res.status(201).json({ 
      id: insertId, 
      name, 
      email,
      role: role || 'viewer'
    });
  } catch (err) {
    console.error('Add User Error:', err);
    
    // Handle duplicate email error
    if (err.number === 2627) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// UPDATE user
exports.updateUser = async (req, res) => {
  const { name, email, role } = req.body;
  const userId = req.params.id;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  try {
    const pool = await poolPromise;
    
    // Check if user exists first
    const checkResult = await pool.request()
      .input('checkId', sql.Int, userId)
      .query('SELECT id FROM users WHERE id = @checkId');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('role', sql.NVarChar, role)
      .input('id', sql.Int, userId)
      .query('UPDATE users SET name = @name, email = @email' + 
             (role ? ', role = @role' : '') + 
             ' WHERE id = @id');
    
    res.json({ 
      id: parseInt(userId), 
      name, 
      email,
      ...(role && { role })
    });
  } catch (err) {
    console.error('Update User Error:', err);
    
    // Handle duplicate email error
    if (err.number === 2627) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// DELETE user
exports.deleteUser = async (req, res) => {
  const userId = req.params.id;
  
  try {
    const pool = await poolPromise;
    
    // Check if user exists first
    const checkResult = await pool.request()
      .input('checkId', sql.Int, userId)
      .query('SELECT id FROM users WHERE id = @checkId');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user
    await pool.request()
      .input('id', sql.Int, userId)
      .query('DELETE FROM users WHERE id = @id');
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete User Error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
