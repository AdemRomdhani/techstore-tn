// =============================================================
// CONTACT ROUTES
// =============================================================
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '');
}

// POST /api/contact - submit contact message
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 chars'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('subject').trim().isLength({ min: 2 }).withMessage('Subject required'),
    body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 chars'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;

    try {
      db.prepare(
        'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)'
      ).run(stripHtml(name), stripHtml(email), stripHtml(subject), stripHtml(message));
      res.status(201).json({ message: 'Message sent successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

// GET /api/contact - admin get all messages
router.get('/', auth, adminOnly, (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/contact/unread-count - admin unread count
router.get('/unread-count', auth, adminOnly, (req, res) => {
  try {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE read = 0').get();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// PUT /api/contact/:id/read - mark as read
router.put('/:id/read', auth, adminOnly, (req, res) => {
  try {
    db.prepare('UPDATE contacts SET read = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// PUT /api/contact/:id/unread - mark as unread
router.put('/:id/unread', auth, adminOnly, (req, res) => {
  try {
    db.prepare('UPDATE contacts SET read = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Marked as unread' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/contact/:id - delete message
router.delete('/:id', auth, adminOnly, (req, res) => {
  try {
    db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
