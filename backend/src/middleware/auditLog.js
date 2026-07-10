import { getDb } from '../database.js';

export function auditLog(action, tableName, recordId, oldValues, newValues, ip) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_log (action, table_name, record_id, old_values, new_values, ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      action,
      tableName,
      recordId || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ip || null
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// Express middleware to capture request IP and add audit capability to req
export function auditMiddleware(req, res, next) {
  req.audit = (action, tableName, recordId, oldValues, newValues) => {
    const ip = req.ip || req.connection?.remoteAddress || null;
    auditLog(action, tableName, recordId, oldValues, newValues, ip);
  };
  next();
}
