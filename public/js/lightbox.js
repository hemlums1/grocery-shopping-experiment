(function () {
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  var lightboxImg = lightbox.querySelector('img');

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.zoom-trigger');
    if (trigger) {
      var img = trigger.querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.hidden = false;
      return;
    }
    if (!lightbox.hidden && e.target.closest('#lightbox')) {
      lightbox.hidden = true;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lightbox.hidden) {
      lightbox.hidden = true;
    }
  });
})();
