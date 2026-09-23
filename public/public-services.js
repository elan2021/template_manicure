(function () {
  "use strict";
  const slug = document.currentScript?.dataset.studioSlug;
  const container = document.querySelector('[data-slot="services"] .services');
  if (!slug || !container) return;
  container.classList.add("public-carousel", "public-services-carousel");

  const money = (cents) => "R$ " + (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const duration = (minutes) => {
    const total = Number(minutes || 0);
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return (hours ? hours + "h" : "") + (hours && rest ? " " : "") + (rest ? rest + "min" : "");
  };

  fetch("/api/public/" + encodeURIComponent(slug) + "/booking", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then(({ services }) => {
      container.replaceChildren();
      if (!services?.length) {
        container.closest('[data-slot="services"]').hidden = true;
        return;
      }
      services.forEach((service) => {
        const card = document.createElement("article");
        card.style.minHeight = "0";
        if (service.image_url) {
          const image = document.createElement("img");
          image.src = service.image_url;
          image.alt = service.name;
          card.appendChild(image);
        }
        const name = document.createElement("b");
        name.textContent = service.name;
        const detail = document.createElement("p");
        detail.textContent = money(service.price_cents) + " • " + duration(service.duration_minutes);
        card.append(name, detail);
        container.appendChild(card);
      });
      container.style.opacity = "1";
    })
    .catch(() => {
      container.closest('[data-slot="services"]').hidden = true;
    });
})();
