// Conditions vary the budget a participant is given. Placeholder amounts —
// not yet recalibrated against the expanded ~100-item catalog in catalog.js.
// Worth revisiting with Gavin: these amounts only allow a handful of items
// per session, which may or may not be the intended scarcity for the study.
const CONDITIONS = [
  { label: 'low', budgetCents: 2000 },
  { label: 'medium', budgetCents: 4000 },
  { label: 'high', budgetCents: 7000 },
];

function pickRandomCondition() {
  return CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
}

module.exports = { CONDITIONS, pickRandomCondition };
