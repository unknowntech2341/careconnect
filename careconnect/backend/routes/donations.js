const express  = require('express');
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const db       = require('../config/db');
const router   = express.Router();
require('dotenv').config();

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /donations/create-order
// Body: { ngo_id, amount, donor_name, donor_email, donor_phone, requirement_id? }
router.post('/create-order', async (req, res) => {
  const { ngo_id, amount, donor_name, donor_email, donor_phone, requirement_id } = req.body;

  if (!ngo_id || !amount || !donor_name || !donor_email)
    return res.status(400).json({ error: 'ngo_id, amount, donor_name and donor_email are required' });

  try {
    // Ensure NGO is approved
    const [ngoRows] = await db.query(
      'SELECT id, name FROM ngos WHERE id = ? AND status = "approved"', [ngo_id]
    );
    if (!ngoRows.length)
      return res.status(404).json({ error: 'NGO not found or not approved' });

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount:   Math.round(parseFloat(amount) * 100),
      currency: 'INR',
      receipt:  `cc_${Date.now()}`,
      notes:    { ngo_id, donor_email, requirement_id: requirement_id || '' },
    });

    // Save pending donation
    const [result] = await db.query(
      `INSERT INTO donations (ngo_id, requirement_id, donor_name, donor_email, donor_phone, amount, razorpay_order_id, status)
       VALUES (?,?,?,?,?,?,'pending')`,
       // Note: wait for verify before marking completed
      [ngo_id, requirement_id || null, donor_name, donor_email, donor_phone || '', amount, order.id, 'pending']
    );

    res.json({
      orderId:    order.id,
      amount:     order.amount,
      currency:   order.currency,
      donationId: result.insertId,
      keyId:      process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create payment order' });
  }
});

// ── POST /donations/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, donation_id }
// router.post('/verify', async (req, res) => {
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature, donation_id } = req.body;

//   if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !donation_id)
//     return res.status(400).json({ error: 'All Razorpay fields and donation_id are required' });

//   try {
//     // Verify signature
//     const body      = razorpay_order_id + '|' + razorpay_payment_id;
//     const expected  = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(body)
//       .digest('hex');

//     if (expected !== razorpay_signature)
//       return res.status(400).json({ error: 'Payment verification failed — invalid signature' });

//     // Mark donation as completed
//     await db.query(
//       `UPDATE donations
//        SET status = 'completed', razorpay_payment_id = ?, razorpay_signature = ?
//        WHERE id = ?`,
//       [razorpay_payment_id, razorpay_signature, donation_id]
//     );

//     // DB trigger auto-updates ngo.totalDonations & requirements.current_amount
//     res.json({ success: true, message: 'Payment verified and donation recorded' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Verification error' });
//   }
// });
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, donation_id } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !donation_id)
    return res.status(400).json({ error: 'All Razorpay fields and donation_id are required' });

  const conn = await db.getConnection(); // for transaction

  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      conn.release();
      return res.status(400).json({ error: 'Invalid signature' });
    }

    await conn.beginTransaction();

    // Get donation details
    const [rows] = await conn.query(
      'SELECT ngo_id, requirement_id, amount FROM donations WHERE id = ?',
      [donation_id]
    );

    if (!rows.length) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Donation not found' });
    }

    const { ngo_id, requirement_id, amount } = rows[0];

    // 1. Update donation status
    await conn.query(
      `UPDATE donations 
       SET status = 'completed', razorpay_payment_id = ?, razorpay_signature = ?
       WHERE id = ?`,
      [razorpay_payment_id, razorpay_signature, donation_id]
    );

    // 2. Update NGO total
    await conn.query(
      `UPDATE ngos 
       SET totalDonations = totalDonations + ?
       WHERE id = ?`,
      [amount, ngo_id]
    );

    // 3. Update requirement (if exists)
    if (requirement_id) {
      await conn.query(
        `UPDATE requirements 
         SET current_amount = current_amount + ?
         WHERE id = ?`,
        [amount, requirement_id]
      );
    }

    await conn.commit();
    conn.release();

    res.json({ success: true, message: 'Payment verified & data updated' });

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'Verification error' });
  }
});

// ── GET /donations/history?email=...  — donor lookup by email
router.get('/history', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const [rows] = await db.query(`
      SELECT d.id, d.amount, d.created_at, d.razorpay_payment_id,
             n.name AS ngoName, r.title AS requirementTitle
      FROM donations d
      JOIN ngos n ON d.ngo_id = n.id
      LEFT JOIN requirements r ON d.requirement_id = r.id
      WHERE d.donor_email = ? AND d.status = 'completed'
      ORDER BY d.created_at DESC
    `, [email]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
