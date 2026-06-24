// Conditions vary the budget (in euro cents) a participant is given.
const CONDITIONS = [
  { label: 'low', budgetCents: 3000 },
  { label: 'medium', budgetCents: 5000 },
  { label: 'high', budgetCents: 7000 },
];

function pickRandomCondition() {
  return CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
}

module.exports = { CONDITIONS, pickRandomCondition };
