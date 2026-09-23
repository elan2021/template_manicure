(function () {
  var script = document.currentScript;
  var slug = script && script.dataset.studioSlug;
  var section = document.querySelector('[data-slot="gallery"]');
  if (!slug || !section) return;

  function hide() { section.style.display = 'none'; }
  fetch('/api/public/' + encodeURIComponent(slug) + '/booking', { cache: 'no-store' })
    .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
    .then(function (payload) {
      var images = payload && payload.studio && Array.isArray(payload.studio.gallery) ? payload.studio.gallery : [];
      if (!images.length) return hide();
      var grid = section.querySelector('.result-grid');
      if (!grid) return hide();
      grid.classList.add('public-carousel', 'public-results-carousel');
      grid.innerHTML = '';
      images.forEach(function (src, index) {
        var figure = document.createElement('figure');
        var image = document.createElement('img');
        image.src = src;
        image.alt = 'Resultado de atendimento ' + (index + 1);
        image.loading = 'lazy';
        figure.appendChild(image);
        grid.appendChild(figure);
      });
      var more = section.querySelector('.more');
      if (more) more.style.display = 'none';
      section.style.opacity = '1';
    })
    .catch(hide);
})();
