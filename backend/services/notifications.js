const db = require('../db/database');

const createNotification = (userId, title, message, type = 'info', link = null) => {
  try {
    db.prepare('INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)')
      .run(userId, title, message, type, link);
  } catch (err) {
    console.error('[Notification] Failed:', err.message);
  }
};

const notifyAdmins = (title, message, type = 'info', link = null) => {
  try {
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    admins.forEach(admin => createNotification(admin.id, title, message, type, link));
  } catch (err) {
    console.error('[Notification] Failed to notify admins:', err.message);
  }
};

module.exports = { createNotification, notifyAdmins };
