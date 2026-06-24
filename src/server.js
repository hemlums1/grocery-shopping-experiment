require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { runMigrations } = require('./db');
const { ensureSession } = require('./session');
const shopRouter = require('./routes/shop');
const adminRouter = require('./routes/admin');

function getCookieSecret() {
  if (process.env.COOKIE_SECRET) return process.env.COOKIE_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('COOKIE_SECRET environment variable is required in production');
  }
  return 'dev-only-secret-do-not-use-in-production';
}

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(getCookieSecret()));
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Mounted before ensureSession so admin/export requests don't create a
// participant session row — this is not part of the experiment flow.
app.use('/admin', adminRouter);

app.use(ensureSession);
app.use('/', shopRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong. Please try again.');
});

const PORT = process.env.PORT || 3000;

runMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to run migrations', err);
    process.exit(1);
  });
