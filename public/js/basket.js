(function () {
  function updateIncrementButtons(total, budgetCents) {
    document.querySelectorAll('.qty-form').forEach(function (form) {
      var price = Number(form.dataset.priceCents);
      var incBtn = form.querySelector('[name="action"][value="increment"]');
      if (incBtn) incBtn.disabled = total + price > budgetCents;
    });
  }

  function updateBudgetHeader(total, budgetCents) {
    var budgetEl = document.querySelector('.budget');
    if (!budgetEl) return;
    budgetEl.innerHTML =
      'Budget $' + (budgetCents / 100).toFixed(2) + ' &middot; ' +
      'Spent $' + (total / 100).toFixed(2) + ' &middot; ' +
      'Remaining $' + ((budgetCents - total) / 100).toFixed(2);
    budgetEl.dataset.over = total > budgetCents;
  }

  function updateBasketLink(basketCount) {
    var link = document.querySelector('.basket-link');
    if (link && /^Basket \(/.test(link.textContent.trim())) {
      link.textContent = 'Basket (' + basketCount + ')';
    }
  }

  function updateTotalFooter(total, budgetCents) {
    var totalEl = document.querySelector('.basket-page .total');
    if (!totalEl) return;
    totalEl.textContent = 'Total: $' + (total / 100).toFixed(2) + ' of $' + (budgetCents / 100).toFixed(2) + ' budget';
  }

  function showEmptyBasketIfNeeded() {
    var list = document.getElementById('basket-list');
    if (list && list.children.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'empty-basket';
      empty.innerHTML = 'Your basket is empty. <a href="/">Browse the shop</a> to add something.';
      list.replaceWith(empty);
    }
  }

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('.qty-form');
    if (!form) return;
    e.preventDefault();

    var formData = new FormData(form);
    if (e.submitter && e.submitter.name) {
      formData.set(e.submitter.name, e.submitter.value);
    }
    // express.urlencoded() only parses application/x-www-form-urlencoded, not
    // the multipart/form-data fetch would send for a raw FormData body.
    var params = new URLSearchParams(formData);

    var buttons = form.querySelectorAll('button');
    buttons.forEach(function (b) { b.disabled = true; });

    fetch(form.action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: params,
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var row = form.closest('.basket-row');

        if (row && data.quantity === 0) {
          row.remove();
          showEmptyBasketIfNeeded();
        } else {
          var qtySpan = form.querySelector('.qty');
          if (qtySpan) qtySpan.textContent = data.quantity;

          var decBtn = form.querySelector('[name="action"][value="decrement"]');
          if (decBtn) decBtn.disabled = data.quantity === 0;

          var priceLine = row && form.parentElement.querySelector('.price');
          if (priceLine) {
            var unit = Number(form.dataset.priceCents);
            priceLine.textContent =
              data.quantity + ' × $' + (unit / 100).toFixed(2) + ' = $' + ((unit * data.quantity) / 100).toFixed(2);
          }
        }

        updateIncrementButtons(data.total, data.budgetCents);
        updateBudgetHeader(data.total, data.budgetCents);
        updateBasketLink(data.basketCount);
        updateTotalFooter(data.total, data.budgetCents);
      })
      .catch(function () {
        // Fetch failed entirely (network/server error) — fall back to a real
        // submission rather than leaving the UI stuck silently.
        form.submit();
      });
  });
})();
