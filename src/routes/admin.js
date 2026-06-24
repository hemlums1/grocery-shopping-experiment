const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { findItem } = require('../catalog');

// Long/tidy format: one row per basket line item, with session context
// repeated on each row. Sessions with an empty basket still get exactly one
// row (item fields blank) so completion-rate analysis has a true denominator
// — a pure one-row-per-line-item export would silently drop empty baskets.
const COLUMNS = [
  'session_id', 'condition', 'budget_usd', 'status', 'created_at', 'submitted_at',
  'session_item_count', 'item_id', 'item_name', 'category', 'product_type',
  'brand', 'brand_tier', 'organic', 'sourcing_practice', 'country', 'nutri_score',
  'unit_price_usd', 'quantity', 'line_total_usd',
];

function isAuthorized(req) {
  const expected = process.env.EXPORT_KEY;
  if (!expected) return false;
  const provided = Buffer.from(String(req.query.key || ''));
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(provided, expectedBuf);
}

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function row(fields) {
  return COLUMNS.map((col) => csvEscape(fields[col])).join(',') + '\r\n';
}

router.get('/export.csv', async (req, res, next) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(404).send('Not found');
    }

    const { rows: sessions } = await pool.query('SELECT * FROM sessions ORDER BY created_at');

    let csv = row(Object.fromEntries(COLUMNS.map((c) => [c, c])));
    for (const session of sessions) {
      const basket = session.basket || [];
      const base = {
        session_id: session.id,
        condition: session.condition_label,
        budget_usd: (session.budget_cents / 100).toFixed(2),
        status: session.status,
        created_at: session.created_at ? session.created_at.toISOString() : '',
        submitted_at: session.submitted_at ? session.submitted_at.toISOString() : '',
        session_item_count: basket.reduce((sum, e) => sum + e.quantity, 0),
      };

      if (basket.length === 0) {
        csv += row(base);
        continue;
      }

      for (const entry of basket) {
        const item = findItem(entry.itemId);
        csv += row({
          ...base,
          item_id: entry.itemId,
          item_name: item ? item.name : '(item no longer in catalog)',
          category: item ? item.category : '',
          product_type: item ? item.productType : '',
          brand: item ? item.brand : '',
          brand_tier: item ? item.brandTier : '',
          organic: item ? (item.organic ? 'Yes' : 'No') : '',
          sourcing_practice: item ? item.sourcingPractice : '',
          country: item ? item.country : '',
          nutri_score: item ? item.nutriScore : '',
          unit_price_usd: item ? (item.priceCents / 100).toFixed(2) : '',
          quantity: entry.quantity,
          line_total_usd: item ? ((item.priceCents * entry.quantity) / 100).toFixed(2) : '',
        });
      }
    }

    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="grocery-experiment-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
