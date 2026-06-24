const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { CATALOG, NUTRI_COLORS, SORT_OPTIONS, sortCatalog, findItem } = require('../catalog');

const SORT_COOKIE = 'sortBy';

function basketTotalCents(basket) {
  return basket.reduce((sum, entry) => {
    const item = findItem(entry.itemId);
    return item ? sum + item.priceCents * entry.quantity : sum;
  }, 0);
}

function basketItemCount(basket) {
  return basket.reduce((sum, entry) => sum + entry.quantity, 0);
}

function resolveSortBy(req, res) {
  const requested = req.query.sort;
  const isValid = (value) => SORT_OPTIONS.some((opt) => opt.value === value);

  if (requested && isValid(requested)) {
    if (requested !== req.cookies[SORT_COOKIE]) {
      res.cookie(SORT_COOKIE, requested, { maxAge: 1000 * 60 * 60 * 24 * 30 });
    }
    return requested;
  }
  if (isValid(req.cookies[SORT_COOKIE])) {
    return req.cookies[SORT_COOKIE];
  }
  return 'default';
}

function resolveReturnTo(value) {
  return value === 'basket' ? '/basket' : '/';
}

router.get('/', (req, res) => {
  const session = req.session;
  if (session.status === 'submitted') {
    return res.redirect('/done');
  }

  const basket = session.basket || [];
  const total = basketTotalCents(basket);
  const basketMap = new Map(basket.map((entry) => [entry.itemId, entry.quantity]));
  const sortBy = resolveSortBy(req, res);
  const catalog = sortCatalog(CATALOG, sortBy);
  const categories = [...new Set(CATALOG.map((item) => item.category))];

  res.render('index', {
    catalog,
    categories,
    nutriColors: NUTRI_COLORS,
    sortOptions: SORT_OPTIONS,
    sortBy,
    basketMap,
    total,
    basketCount: basketItemCount(basket),
    budget: session.budget_cents,
  });
});

router.get('/basket', (req, res) => {
  const session = req.session;
  if (session.status === 'submitted') {
    return res.redirect('/done');
  }

  const basket = session.basket || [];
  const items = basket.map((entry) => ({ ...findItem(entry.itemId), quantity: entry.quantity }));
  const total = basketTotalCents(basket);

  res.render('basket', {
    items,
    total,
    budget: session.budget_cents,
    basketCount: basketItemCount(basket),
    nutriColors: NUTRI_COLORS,
  });
});

router.get('/review', (req, res) => {
  const session = req.session;
  if (session.status === 'submitted') {
    return res.redirect('/done');
  }

  const basket = session.basket || [];
  const items = basket.map((entry) => ({ ...findItem(entry.itemId), quantity: entry.quantity }));
  const total = basketTotalCents(basket);

  res.render('review', {
    items,
    total,
    budget: session.budget_cents,
    nutriColors: NUTRI_COLORS,
  });
});

router.post('/basket/update', async (req, res, next) => {
  try {
    const session = req.session;
    const wantsJson = req.accepts(['html', 'json']) === 'json';

    const respond = (basket, statusCode) => {
      if (!wantsJson) return res.redirect(resolveReturnTo(req.body.returnTo));
      const entry = (basket || []).find((e) => e.itemId === req.body.itemId);
      res.status(statusCode || 200).json({
        itemId: req.body.itemId,
        quantity: entry ? entry.quantity : 0,
        total: basketTotalCents(basket || []),
        budgetCents: session.budget_cents,
        basketCount: basketItemCount(basket || []),
      });
    };

    if (session.status === 'submitted') {
      return wantsJson ? respond(session.basket, 409) : res.redirect('/done');
    }

    const { itemId, action } = req.body;
    const item = findItem(itemId);
    if (!item) {
      return respond(session.basket, 400);
    }

    const basket = session.basket || [];
    const existing = basket.find((entry) => entry.itemId === itemId);
    const currentQty = existing ? existing.quantity : 0;
    const total = basketTotalCents(basket);

    let newQty = currentQty;
    if (action === 'increment') {
      // Hard cap: server-side source of truth. The UI also disables this
      // button once it would exceed budget, so reaching this branch means
      // the client-side check was bypassed — just ignore the request.
      if (total + item.priceCents > session.budget_cents) {
        return respond(basket, 200);
      }
      newQty = currentQty + 1;
    } else if (action === 'decrement') {
      newQty = Math.max(0, currentQty - 1);
    }

    let newBasket;
    if (newQty === 0) {
      newBasket = basket.filter((entry) => entry.itemId !== itemId);
    } else if (existing) {
      newBasket = basket.map((entry) => (entry.itemId === itemId ? { ...entry, quantity: newQty } : entry));
    } else {
      newBasket = [...basket, { itemId, quantity: newQty }];
    }

    await pool.query('UPDATE sessions SET basket = $1 WHERE id = $2', [JSON.stringify(newBasket), session.id]);
    respond(newBasket, 200);
  } catch (err) {
    next(err);
  }
});

router.post('/submit', async (req, res, next) => {
  try {
    const session = req.session;
    if (session.status !== 'submitted') {
      await pool.query(`UPDATE sessions SET status = 'submitted', submitted_at = now() WHERE id = $1`, [session.id]);
    }
    res.redirect('/done');
  } catch (err) {
    next(err);
  }
});

router.post('/reopen', async (req, res, next) => {
  try {
    const session = req.session;
    if (session.status === 'submitted') {
      // Re-finishing overwrites submitted_at with the new timestamp — there's
      // no history of earlier submissions, only the latest one is kept.
      await pool.query(`UPDATE sessions SET status = 'in_progress', submitted_at = NULL WHERE id = $1`, [session.id]);
    }
    res.redirect('/basket');
  } catch (err) {
    next(err);
  }
});

router.get('/done', (req, res) => {
  const session = req.session;
  if (session.status !== 'submitted') {
    return res.redirect('/');
  }

  const basket = session.basket || [];
  const items = basket.map((entry) => ({ ...findItem(entry.itemId), quantity: entry.quantity }));
  const total = basketTotalCents(basket);

  res.render('done', { items, total, budget: session.budget_cents });
});

module.exports = router;
