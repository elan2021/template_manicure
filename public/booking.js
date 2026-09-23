(function () {
  "use strict";

  // Kept as a standalone file so syntax can be checked before serving templates.
  const slug = document.currentScript?.dataset.bookingSlug;
  if (!slug || window.__studioBookingInstalled) return;
  window.__studioBookingInstalled = true;
  const endpoint = "/api/public/" + encodeURIComponent(slug) + "/booking";
  let activeDialog = null;

  function today() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const part = (type) => parts.find((item) => item.type === type).value;
    return part("year") + "-" + part("month") + "-" + part("day");
  }

  async function request(params, options) {
    const response = await fetch(endpoint + (params ? "?" + new URLSearchParams(params) : ""), {
      cache: "no-store", ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Não foi possível carregar o agendamento. Tente novamente.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function openBooking(trigger) {
    if (activeDialog) return;
    const dialog = document.createElement("dialog");
    dialog.id = "studio-booking";
    dialog.setAttribute("aria-labelledby", "sb-title");
    dialog.innerHTML = `
      <header class="sb-header"><div><h2 id="sb-title">Agendar agora</h2>
      <p>Escolha seu atendimento, passo a passo.</p></div>
      <button type="button" class="sb-close" aria-label="Fechar agendamento">×</button></header>
      <form class="sb-form">
        <div class="sb-field"><label for="sb-service">Escolha o serviço</label>
          <select id="sb-service" required disabled><option value="">Carregando serviços…</option></select></div>
        <div class="sb-field" id="sb-professional-field" hidden><label for="sb-professional">Escolha a profissional</label>
          <select id="sb-professional" required><option value="">Selecione uma profissional</option></select></div>
        <div class="sb-field" id="sb-date-field" hidden><label for="sb-date">Escolha a data</label>
          <input id="sb-date" type="date" required><small>Horários do estúdio (Brasília).</small></div>
        <div class="sb-field" id="sb-period-field" hidden><label for="sb-period">Escolha o período</label>
          <select id="sb-period" required><option value="">Selecione um período</option>
          <option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></div>
        <section id="sb-slots" aria-label="Horários disponíveis" hidden>
          <p id="sb-slots-prompt"></p><div class="sb-slot-buttons"></div></section>
        <div id="sb-customer" hidden>
          <p class="sb-summary"></p>
          <div class="sb-field"><label for="sb-name">Seu nome</label>
            <input id="sb-name" name="name" autocomplete="name" minlength="2" maxlength="100" required></div>
          <div class="sb-field"><label for="sb-phone">Seu WhatsApp</label>
            <input id="sb-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="DDD + número" maxlength="22" required></div>
          <button type="submit" class="sb-confirm">Finalizar e enviar no WhatsApp</button>
        </div>
      </form>
      <p class="sb-status" role="status" aria-live="polite"></p>
      <button type="button" class="sb-retry" hidden>Tentar novamente</button>
      <section class="sb-success" hidden><p>Agendamento realizado!</p>
        <p class="sb-success-summary"></p><button type="button" class="sb-done">Concluir</button></section>`;
    document.body.appendChild(dialog);
    activeDialog = dialog;
    const find = (selector) => dialog.querySelector(selector);
    const form = find("form");
    const service = find("#sb-service");
    const professional = find("#sb-professional");
    const date = find("#sb-date");
    const period = find("#sb-period");
    const slots = find("#sb-slots");
    const customer = find("#sb-customer");
    const status = find(".sb-status");
    const retry = find(".sb-retry");
    let selected = null;
    let studio = null;
    let controller = null;
    let saving = false;
    date.min = today();

    // A fixed body also prevents background scrolling on mobile Safari.
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const bodyStyle = document.body.getAttribute("style");
    Object.assign(document.body.style, { position: "fixed", top: -scrollY + "px", width: "100%", overflow: "hidden" });
    dialog.addEventListener("close", () => {
      controller?.abort();
      if (bodyStyle === null) document.body.removeAttribute("style");
      else document.body.setAttribute("style", bodyStyle);
      window.scrollTo(scrollX, scrollY);
      activeDialog = null;
      dialog.remove();
      trigger.focus({ preventScroll: true });
    }, { once: true });
    dialog.addEventListener("cancel", (event) => { if (saving) event.preventDefault(); });
    find(".sb-close").onclick = find(".sb-done").onclick = () => { if (!saving) dialog.close(); };
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && !saving && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.showModal();

    function notice(message, error, retryAction) {
      status.textContent = message || "";
      status.classList.toggle("sb-error", !!error);
      retry.hidden = !retryAction;
      retry.onclick = retryAction || null;
    }
    function cancelRequest() {
      controller?.abort();
      controller = new AbortController();
      notice("");
      return controller.signal;
    }
    function clearSlots() {
      selected = null;
      slots.hidden = customer.hidden = true;
      find(".sb-slot-buttons").replaceChildren();
    }
    function options(select, items, placeholder) {
      select.replaceChildren(new Option(placeholder, ""));
      items.forEach((item) => select.add(new Option(item.name, item.id)));
      select.disabled = items.length === 0;
    }
    function displayError(error, action) {
      if (error.name !== "AbortError" && dialog.isConnected) notice(error.message, true, action);
    }
    function dateLabel(value) { return value.split("-").reverse().join("/"); }
    function summary() {
      return service.selectedOptions[0].textContent + " com " + professional.selectedOptions[0].textContent +
        " — " + dateLabel(selected.date) + " às " + selected.time;
    }
    function businessNumber() {
      const whatsapp = String(studio?.whatsapp || "").replace(/\D/g, "");
      if (!/^(?:55)?\d{10,11}$/.test(whatsapp)) return "";
      return whatsapp.startsWith("55") ? whatsapp : "55" + whatsapp;
    }
    function whatsappUrl() {
      const message = "Olá " + String(studio?.name || "") + ", me chamo " + find("#sb-name").value.trim() +
        " e agendei o serviço " + service.selectedOptions[0].textContent +
        " para o dia " + dateLabel(selected.date) + " às " + selected.time + ".";
      return "https://wa.me/" + businessNumber() + "?text=" + encodeURIComponent(message);
    }

    async function loadServices() {
      const signal = cancelRequest();
      service.disabled = true;
      notice("Carregando serviços…");
      try {
        const data = await request(null, { signal });
        if (signal.aborted) return;
        studio = data.studio || null;
        if (!businessNumber()) find(".sb-confirm").textContent = "Confirmar agendamento";
        options(service, data.services || [], "Selecione um serviço");
        notice(service.disabled ? "Este estúdio ainda não tem serviços disponíveis para agendamento." : "");
        if (!service.disabled) service.focus();
      } catch (error) { displayError(error, loadServices); }
    }
    async function loadProfessionals() {
      const signal = cancelRequest();
      professional.value = date.value = period.value = "";
      find("#sb-professional-field").hidden = true;
      find("#sb-date-field").hidden = find("#sb-period-field").hidden = true;
      clearSlots();
      if (!service.value) return;
      notice("Carregando profissionais…");
      try {
        const data = await request({ serviceId: service.value }, { signal });
        if (signal.aborted) return;
        options(professional, data.professionals || [], "Selecione uma profissional");
        find("#sb-professional-field").hidden = false;
        notice(professional.disabled ? "Não há profissionais disponíveis para este serviço." : "");
      } catch (error) { displayError(error, loadProfessionals); }
    }
    async function loadSlots() {
      const signal = cancelRequest();
      clearSlots();
      if (!service.value || !professional.value || !date.value || !period.value) return;
      notice("Consultando horários disponíveis…");
      try {
        const data = await request({ serviceId: service.value, professionalId: professional.value, date: date.value, period: period.value }, { signal });
        if (signal.aborted) return;
        const suggestions = (data.slots || []).slice(0, 2).map((time) => ({ date: date.value, period: period.value, time }));
        const alternatives = !suggestions.length;
        if (alternatives) suggestions.push(...(data.alternatives || []).slice(0, 2));
        notice("");
        slots.hidden = false;
        find("#sb-slots-prompt").textContent = suggestions.length
          ? (alternatives ? "Não há horários nesse período. Pode ser um desses?" : "Pode ser um desses?")
          : "Não há horários disponíveis nessa data. Escolha outra data.";
        const buttons = find(".sb-slot-buttons");
        suggestions.forEach((slot) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "sb-slot";
          button.textContent = (slot.date === date.value ? "" : dateLabel(slot.date) + " · ") + slot.time;
          button.setAttribute("aria-pressed", "false");
          button.onclick = () => {
            selected = slot;
            date.value = slot.date;
            period.value = slot.period;
            buttons.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
            find(".sb-summary").textContent = summary();
            customer.hidden = false;
            find("#sb-name").focus();
          };
          buttons.appendChild(button);
        });
      } catch (error) { displayError(error, loadSlots); }
    }
    service.onchange = loadProfessionals;
    professional.onchange = () => {
      cancelRequest();
      date.value = period.value = "";
      find("#sb-date-field").hidden = !professional.value;
      find("#sb-period-field").hidden = true;
      clearSlots();
    };
    date.onchange = () => {
      cancelRequest();
      period.value = "";
      clearSlots();
      find("#sb-period-field").hidden = !date.value || !date.validity.valid;
      if (date.value && !date.validity.valid) notice("Escolha uma data a partir de hoje.", true);
    };
    period.onchange = loadSlots;
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (saving || !selected || !form.reportValidity()) return;
      const name = find("#sb-name").value.trim();
      const phone = find("#sb-phone").value.trim();
      if (name.length < 2 || !/^(?:55)?\d{10,11}$/.test(phone.replace(/\D/g, ""))) {
        notice("Preencha seu nome e um WhatsApp válido com DDD.", true);
        return;
      }
      saving = true;
      const controls = [...dialog.querySelectorAll("input, select, button")];
      controls.forEach((control) => { control.disabled = true; });
      notice("Confirmando seu agendamento…");
      try {
        await request(null, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId: service.value, professionalId: professional.value, date: selected.date, time: selected.time, name, phone }),
        });
        form.hidden = true;
        find(".sb-success-summary").textContent = summary();
        if (businessNumber()) {
          window.location.assign(whatsappUrl());
          return;
        }
        find(".sb-success").hidden = false;
        notice("");
      } catch (error) {
        if (error.status === 409) {
          clearSlots();
          displayError(error, loadSlots);
          retry.textContent = "Consultar outros horários";
        } else displayError(error);
      } finally {
        saving = false;
        controls.forEach((control) => { control.disabled = false; });
        if (!find(".sb-success").hidden) find(".sb-done").focus();
      }
    };
    loadServices();
  }

  // Capture every standard appointment CTA, including clicks on nested images/spans.
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest('[data-module="appointment"], a, button');
    if (!trigger || trigger.closest("#studio-booking")) return;
    if (trigger.dataset.module !== "appointment" && !/agendar\s+agora/i.test(trigger.textContent)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openBooking(trigger);
  }, true);
})();
