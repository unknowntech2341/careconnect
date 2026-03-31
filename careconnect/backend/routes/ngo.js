const express = require('express');
const db      = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ── GET /ngos  — public: list approved NGOs (for donor page)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, description, totalDonations FROM ngos WHERE status = ? ORDER BY name',
      ['approved']
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /ngo/:id/requirements  — public: view NGO requirements
router.get('/:id/requirements', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM requirements WHERE ngo_id = ? AND status = "active" ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /ngo/:id/requirements  — NGO posts a new requirement (auth required)
router.post('/:id/requirements', auth(['ngo']), async (req, res) => {
  if (req.user.id != req.params.id)
    return res.status(403).json({ error: 'You can only add requirements to your own NGO' });

  const { title, description, goal_amount } = req.body;
  if (!title || !goal_amount)
    return res.status(400).json({ error: 'Title and goal amount are required' });

  try {
    const [result] = await db.query(
      'INSERT INTO requirements (ngo_id, title, description, goal_amount) VALUES (?,?,?,?)',
      [req.params.id, title, description || '', goal_amount]
    );
    res.status(201).json({ message: 'Requirement added', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /ngo/:id/requirements/:rid  — NGO updates a requirement
router.patch('/:id/requirements/:rid', auth(['ngo']), async (req, res) => {
  if (req.user.id != req.params.id)
    return res.status(403).json({ error: 'Access denied' });

  const { title, description, goal_amount, status } = req.body;
  try {
    await db.query(
      'UPDATE requirements SET title=COALESCE(?,title), description=COALESCE(?,description), goal_amount=COALESCE(?,goal_amount), status=COALESCE(?,status) WHERE id=? AND ngo_id=?',
      [title, description, goal_amount, status, req.params.rid, req.params.id]
    );
    res.json({ message: 'Requirement updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /ngo/:id/donations  — NGO sees own donations (auth required)
router.get('/:id/donations', auth(['ngo', 'admin']), async (req, res) => {
  if (req.user.role === 'ngo' && req.user.id != req.params.id)
    return res.status(403).json({ error: 'Access denied' });

  try {
    const [rows] = await db.query(`
      SELECT d.*, r.title AS requirementTitle
      FROM donations d
      LEFT JOIN requirements r ON d.requirement_id = r.id
      WHERE d.ngo_id = ? AND d.status = 'completed'
      ORDER BY d.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /ngo/:id/summary  — NGO total stats
router.get('/:id/summary', auth(['ngo', 'admin']), async (req, res) => {
  try {
    const [ngoRows] = await db.query(
      'SELECT name, email, totalDonations FROM ngos WHERE id = ?', [req.params.id]
    );
    const [countRow] = await db.query(
      'SELECT COUNT(*) AS count FROM donations WHERE ngo_id = ? AND status = "completed"', [req.params.id]
    );
    res.json({ ...ngoRows[0], donationCount: countRow[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
