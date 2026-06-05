const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const db = require('./db');
const { generateToken, requireAuth } = require('./auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if email already exists
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate UUID
    const userId = uuidv4();

    // Insert user
    await connection.query(
      'INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, firstName || null, lastName || null]
    );

    const token = generateToken(userId);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName
      },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const [users] = await connection.query(
      'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      },
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// ============ HEALTH ENTRIES ROUTES ============

// Get all entries for logged-in user
app.get('/api/health/entries', requireAuth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [entries] = await connection.query(
      'SELECT id, entry_date, weight, steps, water_ml, created_at FROM health_entries WHERE user_id = ? ORDER BY entry_date DESC',
      [req.userId]
    );

    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Create or update entry
app.post('/api/health/entries', requireAuth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { entryDate, weight, steps, waterMl } = req.body;

    if (!entryDate || weight === undefined || steps === undefined || waterMl === undefined) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if entry exists for this date
    const [existing] = await connection.query(
      'SELECT id FROM health_entries WHERE user_id = ? AND entry_date = ?',
      [req.userId, entryDate]
    );

    let entry;
    if (existing.length > 0) {
      // Update existing entry
      await connection.query(
        'UPDATE health_entries SET weight = ?, steps = ?, water_ml = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [weight, steps, waterMl, existing[0].id]
      );
      entry = {
        id: existing[0].id,
        user_id: req.userId,
        entry_date: entryDate,
        weight,
        steps,
        water_ml: waterMl
      };
    } else {
      // Create new entry
      const entryId = uuidv4();
      await connection.query(
        'INSERT INTO health_entries (id, user_id, entry_date, weight, steps, water_ml) VALUES (?, ?, ?, ?, ?, ?)',
        [entryId, req.userId, entryDate, weight, steps, waterMl]
      );
      entry = {
        id: entryId,
        user_id: req.userId,
        entry_date: entryDate,
        weight,
        steps,
        water_ml: waterMl
      };
    }

    res.status(201).json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Delete entry
app.delete('/api/health/entries/:id', requireAuth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;

    // Check if entry belongs to user
    const [entries] = await connection.query(
      'SELECT user_id FROM health_entries WHERE id = ?',
      [id]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entries[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await connection.query('DELETE FROM health_entries WHERE id = ?', [id]);

    res.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// ============ SERVER START ============

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});