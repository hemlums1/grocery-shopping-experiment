(function () {
  var input = document.getElementById('item-search');
  var catalog = document.getElementById('catalog');
  var noResults = document.getElementById('no-results');
  if (!input || !catalog) return;

  input.addEventListener('input', function () {
    var query = input.value.trim().toLowerCase();
    var anyVisible = false;

    catalog.querySelectorAll('.category').forEach(function (section) {
      var sectionHasMatch = false;

      section.querySelectorAll('.item').forEach(function (item) {
        var matches = !query || item.dataset.search.indexOf(query) !== -1;
        item.hidden = !matches;
        if (matches) {
          sectionHasMatch = true;
          anyVisible = true;
        }
      });

      section.hidden = !sectionHasMatch;
    });

    noResults.hidden = anyVisible;
  });
})();
