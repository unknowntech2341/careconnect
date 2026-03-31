const express = require('express');
const db      = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// All admin routes require admin JWT
router.use(auth(['admin']));

// ── GET /admin/ngos  — list all NGOs (optionally filter by status)
router.get('/ngos', async (req, res) => {
  const { status } = req.query; // ?status=pending|approved|rejected
  try {
    let query = 'SELECT id, name, email, description, phone, website, status, totalDonations, created_at FROM ngos';
    const params = [];
    if (status) { query += ' WHERE status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /admin/ngo/:id  — approve or reject an NGO
// Body: { status: 'approved' | 'rejected' }
router.patch('/ngo/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: 'Status must be approved or rejected' });

  try {
    const [result] = await db.query('UPDATE ngos SET status = ? WHERE id = ?', [status, id]);
    if (!result.affectedRows)
      return res.status(404).json({ error: 'NGO not found' });
    res.json({ message: `NGO ${status} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /admin/donations  — all donations with NGO name
router.get('/donations', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, n.name AS ngoName, r.title AS requirementTitle
      FROM donations d
      JOIN ngos n ON d.ngo_id = n.id
      LEFT JOIN requirements r ON d.requirement_id = r.id
      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /admin/requirements  — all NGO requirements
router.get('/requirements', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, n.name AS ngoName
      FROM requirements r
      JOIN ngos n ON r.ngo_id = n.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
