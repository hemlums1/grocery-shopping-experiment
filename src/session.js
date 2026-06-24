const crypto = require('crypto');
const { pool } = require('./db');
const { pickRandomCondition } = require('./conditions');

const COOKIE_NAME = 'sid';

// Loads the session tied to the request's cookie, creating a new one
// (with a randomly assigned condition) on first visit.
async function ensureSession(req, res, next) {
  try {
    const sid = req.signedCookies[COOKIE_NAME];
    if (sid) {
      const { rows } = await pool.query('SELECT * FROM sessions WHERE id = $1', [sid]);
      if (rows.length) {
        req.session = rows[0];
        return next();
      }
    }

    const condition = pickRandomCondition();
    const newId = crypto.randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO sessions (id, condition_label, budget_cents) VALUES ($1, $2, $3) RETURNING *`,
      [newId, condition.label, condition.budgetCents]
    );
    res.cookie(COOKIE_NAME, newId, { signed: true, httpOnly: true, sameSite: 'lax' });
    req.session = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { ensureSession, COOKIE_NAME };
