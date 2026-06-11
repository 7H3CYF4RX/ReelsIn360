const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get } = require('../config/database');
const env = require('../config/env');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  const user = get('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
  res.json({ success: true, user });
}

module.exports = { login, me };
