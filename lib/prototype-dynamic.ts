function bindingsForServices() {
  return String.raw`<script>
  (function () {
    const money = (cents) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const list = document.getElementById('servicesList');
    let activeCategory = 'all';
    let editingServiceId = null;
    let serviceImageUrl = '';
    const imageInput = document.getElementById('service-image');
    const imagePreview = document.getElementById('service-image-preview');
    const showServiceImage = (value) => {
      serviceImageUrl = value || '';
      if (!imagePreview) return;
      imagePreview.src = serviceImageUrl;
      imagePreview.classList.toggle('hidden', !serviceImageUrl);
    };

    async function loadServiceProfessionals() {
      const container = document.getElementById('service-professionals');
      if (!container) return;
      const response = await fetch('/api/professionals');
      if (!response.ok) return;
      const { data } = await response.json();
      container.innerHTML = data.map((professional) => '<label class="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low cursor-pointer"><input class="rounded text-primary focus:ring-primary h-4 w-4" type="checkbox" value="' + professional.id + '"><span class="font-label-sm text-label-sm text-on-surface">' + professional.name + '</span></label>').join('') || '<p class="col-span-2 text-on-surface-variant font-body-sm">Cadastre uma profissional para vinculá-la a este serviço.</p>';
    }

    async function loadServices() {
      const response = await fetch('/api/services');
      if (!response.ok || !list) return;
      const { data: allServices } = await response.json();
      const data = allServices.filter((service) => Number(service.active) === 1);
      const cards = Array.from(list.querySelectorAll('.service-card'));
      const prototype = cards[0];
      if (!prototype) return;
      const duration = (minutes) => {
        const hours = Math.floor(Number(minutes || 0) / 60);
        const rest = Number(minutes || 0) % 60;
        return (hours ? hours + 'h' : '') + (hours && rest ? ' ' : '') + (rest ? rest + 'min' : '');
      };
      const categoryName = (value) => ({
        alongamentos: 'Alongamentos', nailart: 'Nail Art', pes: 'Cuidados & Pés', manicure: 'Manicure',
      }[value] || String(value || 'Serviço'));
      if (!data.length) {
        list.replaceChildren();
        const empty = document.createElement('p');
        empty.className = 'rounded-xl bg-surface-container-low p-5 text-center font-body-md text-on-surface-variant';
        empty.textContent = 'Nenhum serviço cadastrado.';
        list.appendChild(empty);
      } else {
        const rendered = data.map((service, index) => {
          const card = (cards[index] || prototype).cloneNode(false);
          card.className = 'service-card relative bg-surface-container-lowest rounded-xl p-space-md shadow-[0_4px_20px_-2px_rgba(190,24,93,0.05)]';
          card.dataset.category = service.category;
          card.dataset.realService = 'true';
          card.dataset.serviceId = service.id;
          card.innerHTML = '<div class="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full"></div><div class="flex flex-col space-y-space-sm pl-2"><div class="flex items-start justify-between gap-space-sm"><div class="flex items-center gap-3 flex-1 min-w-0"><img alt="" class="hidden w-12 h-12 rounded-lg object-cover shrink-0" data-service-image><h2 class="font-title-lg text-title-lg text-on-surface break-words" data-service-name></h2></div><div class="flex flex-col items-end shrink-0"><span class="font-headline-md text-headline-md text-primary" data-service-price></span><span class="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5"><span class="material-symbols-outlined text-[14px]">schedule</span><span data-service-duration></span></span></div></div><div class="flex items-center justify-between pt-space-xs"><span class="font-label-sm text-label-sm text-on-surface-variant" data-service-status></span><div class="flex gap-2"><button type="button" class="w-9 h-9 rounded-full bg-surface-container-low text-primary flex items-center justify-center" aria-label="Editar serviço" data-edit-service><span class="material-symbols-outlined text-[18px]">edit</span></button><button type="button" class="w-9 h-9 rounded-full bg-error-container text-on-error-container flex items-center justify-center" aria-label="Excluir serviço" data-delete-service><span class="material-symbols-outlined text-[18px]">delete</span></button></div></div></div>';
          card.querySelector('[data-service-name]').textContent = service.name;
          card.querySelector('[data-service-price]').textContent = 'R$ ' + money(service.price_cents);
          card.querySelector('[data-service-duration]').textContent = duration(service.duration_minutes);
          card.querySelector('[data-service-status]').textContent = service.active ? 'Ativo' : 'Inativo';
          const cardImage = card.querySelector('[data-service-image]');
          if (service.image_url) { cardImage.src = service.image_url; cardImage.classList.remove('hidden'); }
          card.querySelector('[data-edit-service]').onclick = () => {
            editingServiceId = service.id;
            document.getElementById('openNewServiceBtn')?.click();
            document.getElementById('drawerTitle').textContent = 'Editar Serviço';
            document.getElementById('inputServiceName').value = service.name;
            document.getElementById('inputServicePrice').value = money(service.price_cents);
            document.getElementById('inputServiceTime').value = duration(service.duration_minutes);
            if (imageInput) imageInput.value = '';
            showServiceImage(service.image_url);
          };
          card.querySelector('[data-delete-service]').onclick = async () => {
            if (!confirm('Excluir o serviço “' + service.name + '”?')) return;
            const result = await fetch('/api/services/' + service.id, { method: 'DELETE' });
            if (result.ok) loadServices(); else alert((await result.json()).error || 'Não foi possível excluir o serviço.');
          };
          return card;
        });
        list.replaceChildren(...rendered);
      }
      const active = data.filter((service) => service.active).length;
      const average = active ? data.filter((service) => service.active).reduce((sum, service) => sum + Number(service.price_cents || 0), 0) / active : 0;
      const stats = Array.from(document.querySelectorAll('.font-label-sm')).find((node) => node.textContent.trim() === 'Ativos');
      if (stats) stats.parentElement.querySelector('.font-title-md').textContent = active + (active === 1 ? ' item' : ' itens');
      const ticket = Array.from(document.querySelectorAll('.font-label-sm')).find((node) => node.textContent.trim() === 'Ticket Médio');
      if (ticket) ticket.parentElement.querySelector('.font-title-md').textContent = 'R$ ' + money(average);
      const occupancy = Array.from(document.querySelectorAll('.font-label-sm')).find((node) => node.textContent.trim() === 'Ocupação');
      occupancy?.parentElement?.remove();

      const search = document.getElementById('serviceSearchInput');
      const applyFilter = () => {
        const term = String(search?.value || '').trim().toLocaleLowerCase('pt-BR');
        list.querySelectorAll('.service-card').forEach((card) => {
          const matchesTerm = !term || card.textContent.toLocaleLowerCase('pt-BR').includes(term);
          card.hidden = !matchesTerm;
        });
      };
      if (search) search.oninput = applyFilter;
      applyFilter();
    }

    const save = document.getElementById('saveServiceBtn');
    save?.addEventListener('click', async () => {
      const name = document.getElementById('inputServiceName')?.value.trim();
      const price = document.getElementById('inputServicePrice')?.value || '0';
      const time = document.getElementById('inputServiceTime')?.value || '1h';
      const priceCents = Math.round(Number(price.replace(/[^0-9,]/g, '').replace(',', '.')) * 100);
      const hours = time.match(/(\d+)\s*h/)?.[1] || '0';
      const minutes = time.match(/(\d+)\s*m/)?.[1] || '0';
      const durationMinutes = Number(hours) * 60 + Number(minutes) || 60;
      if (!name || !Number.isFinite(priceCents)) return;
      const response = await fetch(editingServiceId ? '/api/services/' + editingServiceId : '/api/services', {
        method: editingServiceId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: 'alongamentos', priceCents, durationMinutes, imageUrl: serviceImageUrl }),
      });
      if (response.ok) {
        editingServiceId = null;
        document.getElementById('closeDrawerBtn')?.click();
        window.setTimeout(loadServices, 200);
      }
    }, true);

    imageInput?.addEventListener('change', () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 1_500_000) { imageInput.value = ''; alert('Envie uma imagem PNG, JPG ou WEBP de até 1,5 MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => showServiceImage(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
    document.getElementById('openNewServiceBtn')?.addEventListener('click', () => { editingServiceId = null; if (imageInput) imageInput.value = ''; showServiceImage(''); });
    document.getElementById('serviceForm')?.querySelector('textarea')?.closest('.flex.flex-col')?.remove();
    document.getElementById('service-professionals')?.parentElement?.remove();
    loadServices().catch(() => {});
    loadServiceProfessionals().catch(() => {});
  })();
</script>`;
}

function bindingsForProfessionals() {
  return String.raw`<script>
  (function () {
    let editingId = null;
    async function loadProfessionals() {
      const response = await fetch('/api/professionals');
      if (!response.ok) return;
      const { data } = await response.json();
      const cards = Array.from(document.querySelectorAll('article'));
      const prototype = cards[0];
      if (!prototype) return;
      const parent = prototype.parentElement;
      data.forEach((professional, index) => {
        const card = cards[index] || prototype.cloneNode(true);
        if (!cards[index]) parent?.appendChild(card);
        const name = card.querySelector('h3');
        if (name) name.textContent = professional.name;
        const specialty = card.querySelector('p');
        if (specialty && professional.specialty) specialty.textContent = professional.specialty;
        card.querySelectorAll('span').forEach((span) => {
          if (span.textContent.trim().startsWith('Comissão:')) span.textContent = 'Comissão: ' + professional.commission_rate + '%';
        });
        const whatsapp = card.querySelector('a[href*="wa.me"]');
        if (whatsapp && professional.whatsapp) whatsapp.href = 'https://wa.me/' + professional.whatsapp;
        Array.from(card.querySelectorAll('.material-symbols-outlined')).find((icon) => icon.textContent.trim() === 'phone_iphone')?.closest('.flex.items-center.gap-1')?.remove();
        Array.from(card.querySelectorAll('span')).filter((span) => span.textContent.trim().startsWith('Comissão:')).forEach((span) => span.closest('div')?.remove());
        Array.from(card.querySelectorAll('span')).filter((span) => span.textContent.trim().toUpperCase() === 'ESPECIALIDADES').forEach((span) => span.closest('.pt-2')?.remove());
        card.dataset.professionalId = professional.id;
        let actions = card.querySelector('.professional-actions');
        if (!actions) {
          actions = document.createElement('div');
          actions.className = 'professional-actions flex justify-end gap-2 pt-1';
          actions.innerHTML = '<button type="button" class="edit-professional h-9 px-3 rounded-full bg-surface-container-low text-primary font-label-sm flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">edit</span>Editar</button><button type="button" class="delete-professional h-9 px-3 rounded-full bg-error-container text-on-error-container font-label-sm flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">delete</span>Excluir</button>';
          card.appendChild(actions);
        }
        actions.querySelector('.edit-professional').onclick = () => {
          editingId = professional.id;
          document.getElementById('pro-name').value = professional.name || '';
          document.getElementById('pro-whatsapp').value = String(professional.whatsapp || '').replace(/^55/, '');
          document.getElementById('open-modal-btn')?.click();
        };
        actions.querySelector('.delete-professional').onclick = async () => {
          if (!confirm('Excluir ' + professional.name + '? Esta ação não pode ser desfeita.')) return;
          const result = await fetch('/api/professionals/' + professional.id, { method: 'DELETE' });
          if (result.ok) loadProfessionals(); else alert((await result.json()).error || 'Não foi possível excluir.');
        };
      });
      cards.slice(data.length).forEach((card) => card.remove());
    }

    Array.from(document.querySelectorAll('p')).filter((node) => node.textContent.trim() === 'Média Comiss.').forEach((node) => node.closest('.bg-surface-container-lowest')?.remove());

    const form = document.getElementById('pro-form');
    form?.addEventListener('submit', async () => {
      const name = document.getElementById('pro-name')?.value.trim();
      const whatsapp = document.getElementById('pro-whatsapp')?.value.replace(/\D/g, '');
      if (!name || !whatsapp) return;
      const response = await fetch(editingId ? '/api/professionals/' + editingId : '/api/professionals', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, whatsapp: '55' + whatsapp, specialty: 'Profissional do estúdio', commissionRate: 0 }),
      });
      if (response.ok) { editingId = null; window.setTimeout(loadProfessionals, 500); }
    }, true);

    loadProfessionals().catch(() => {});
  })();
</script>`;
}

function bindingsForAgenda() {
  return String.raw`<script>
  (function () {
    const money = (cents) => 'R$ ' + (Number(cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const timeline = document.querySelector('.mt-space-xl.flex.flex-col.gap-5');
    let selectedDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    document.querySelectorAll('.day-selector, .filter-artist, .filter-status').forEach((node) => node.remove());

    function formatTime(value) {
      return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
    }
    function formatDate(value) {
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
    }
    function whatsappNumber(value) {
      const digits = String(value || '').replace(/\D/g, '');
      if (!/^(?:55)?\d{10,11}$/.test(digits)) return '';
      return digits.startsWith('55') ? digits : '55' + digits;
    }

    async function loadAppointments() {
      const [response, studioResponse] = await Promise.all([fetch('/api/appointments?date=' + selectedDate), fetch('/api/studio')]);
      if (!response.ok || !timeline) return;
      const { data } = await response.json();
      const studio = studioResponse.ok ? (await studioResponse.json()).data : null;
      const studioName = studio?.settings?.brandName || studio?.name || 'o estúdio';
      const cards = Array.from(timeline.querySelectorAll(':scope > .relative.flex.gap-3'));
      const prototype = cards[0];
      if (!prototype) return;
      data.forEach((appointment, index) => {
        const card = cards[index] || prototype.cloneNode(true);
        if (!cards[index]) timeline.appendChild(card);
        card.dataset.appointmentId = appointment.id;
        const time = card.children[0]?.querySelector('span');
        if (time) time.textContent = formatTime(appointment.starts_at);
        const mainCard = card.children[1];
        const client = mainCard?.querySelector('span.font-title-md');
        if (client) client.textContent = appointment.client_name;
        const professional = mainCard?.querySelector('p');
        if (professional) professional.textContent = (appointment.professional_name || 'Sem profissional') + ' • ' + (appointment.status === 'pending_deposit' ? 'Sinal Pendente' : 'Confirmada');
        const labels = card.querySelectorAll('.flex-1 .font-label-md');
        if (labels[0]) labels[0].textContent = appointment.service_name || 'Serviço';
        const price = card.querySelector('.flex-1 .font-label-lg');
        if (price) price.textContent = money(appointment.price_cents);
        // Descrição, sinal e cliente VIP pertenciam apenas ao layout de demonstração.
        mainCard?.querySelector('.mt-3\\.5 p')?.remove();
        mainCard?.querySelector('.mt-3.flex.items-center.flex-wrap.gap-2')?.remove();
        const phone = card.querySelector('a[href^="tel:"]');
        if (phone && appointment.client_phone) phone.href = 'tel:+' + appointment.client_phone;
        const whatsapp = card.querySelector('a[href*="wa.me"]');
        if (whatsapp && appointment.client_phone) whatsapp.href = 'https://wa.me/' + appointment.client_phone;
        const buttons = Array.from(card.querySelectorAll('button')).filter((button) => button.dataset.reminder !== 'true');
        const primaryAction = buttons[0];
        const secondaryAction = buttons[1];
        const action = appointment.status === 'pending_deposit'
          ? { label: 'Confirmar Sinal', update: { status: 'confirmed', paymentStatus: 'deposit_paid', depositCents: appointment.deposit_cents || 4000 } }
          : appointment.status === 'completed'
            ? { label: 'Atendimento Finalizado', update: null }
            : { label: 'Finalizar & Cobrar', update: { status: 'completed', paymentStatus: 'paid' } };
        if (primaryAction) {
          primaryAction.textContent = action.label;
          primaryAction.onclick = async () => {
            if (!action.update) return;
            const result = await fetch('/api/appointments/' + appointment.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action.update) });
            if (result.ok) loadAppointments();
          };
        }
        if (secondaryAction) {
          secondaryAction.textContent = 'Reagendar / Cancelar';
          secondaryAction.onclick = async () => {
            const next = window.prompt('Novo horário (AAAA-MM-DDTHH:MM) ou digite CANCELAR', new Date(appointment.starts_at).toISOString().slice(0, 16));
            if (!next) return;
            const update = next.trim().toUpperCase() === 'CANCELAR' ? { status: 'cancelled' } : { startsAt: new Date(next).toISOString() };
            const result = await fetch('/api/appointments/' + appointment.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) });
            if (result.ok) loadAppointments();
          };
        }
        const reminderPhone = whatsappNumber(appointment.client_phone);
        let reminder = card.querySelector('button[data-reminder="true"]');
        if (reminderPhone && primaryAction?.parentElement) {
          if (!reminder) {
            reminder = document.createElement('button');
            reminder.type = 'button';
            reminder.dataset.reminder = 'true';
            reminder.className = 'px-3 py-2.5 rounded-xl bg-surface-container text-primary font-label-md text-label-md font-medium hover:text-on-surface transition-colors flex items-center justify-center gap-1';
            reminder.innerHTML = '<span class="material-symbols-outlined text-[18px]">send</span>Enviar lembrete';
            primaryAction.parentElement.appendChild(reminder);
          }
          const actionRow = primaryAction.parentElement;
          actionRow.classList.add('flex-wrap');
          primaryAction.classList.remove('flex-1');
          primaryAction.classList.add('w-full');
          secondaryAction?.classList.add('flex-1');
          reminder.classList.add('flex-1');
          reminder.onclick = () => {
            const message = 'Olá ' + (appointment.client_name || 'cliente') + ', aqui é do ' + studioName + '. Lembramos do seu agendamento de ' + (appointment.service_name || 'serviço') + ' no dia ' + formatDate(appointment.starts_at) + ' às ' + formatTime(appointment.starts_at) + '. Estamos te esperando!';
            window.open('https://wa.me/' + reminderPhone + '?text=' + encodeURIComponent(message), '_blank', 'noopener');
          };
        } else if (reminder) {
          reminder.remove();
        }
      });
      cards.slice(data.length).forEach((card) => card.remove());
      document.querySelectorAll('.filter-artist, .filter-status').forEach((node) => node.remove());
      Array.from(document.querySelectorAll('span')).filter((node) => /agendamentos|Faturamento Previsto|Taxa de Ocupação/.test(node.textContent)).forEach((node) => {
        if (node.textContent.includes('agendamentos')) node.textContent = data.length + (data.length === 1 ? ' agendamento' : ' agendamentos');
      });
    }

    async function openNewAppointment() {
      const [professionalsResponse, servicesResponse] = await Promise.all([fetch('/api/professionals'), fetch('/api/services?active=true')]);
      if (!professionalsResponse.ok || !servicesResponse.ok) return;
      const professionals = (await professionalsResponse.json()).data;
      const services = (await servicesResponse.json()).data;
      document.body.insertAdjacentHTML('beforeend', '<div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-on-background/40 backdrop-blur-sm" id="appointment-modal"><div class="w-full max-w-lg bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 flex flex-col gap-4"><div class="flex items-center justify-between"><div><h2 class="font-headline-md text-headline-md text-on-surface">Novo Agendamento</h2><p class="font-body-sm text-body-sm text-on-surface-variant">Inclua uma cliente na agenda.</p></div><button class="w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant" id="close-appointment-modal"><span class="material-symbols-outlined">close</span></button></div><form class="flex flex-col gap-3" id="appointment-form"><input required id="appointment-client" class="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md" placeholder="Nome da cliente"/><input id="appointment-phone" class="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md" placeholder="WhatsApp (DDD + número)"/><input required id="appointment-start" type="datetime-local" class="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md"/><select required id="appointment-professional" class="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md"><option value="">Profissional</option>' + professionals.map((item) => '<option value="' + item.id + '">' + item.name + '</option>').join('') + '</select><select required id="appointment-service" class="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md"><option value="">Serviço</option>' + services.map((item) => '<option value="' + item.id + '">' + item.name + '</option>').join('') + '</select><select id="appointment-status" class="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-body-md"><option value="scheduled">Agendado</option><option value="confirmed">Confirmado</option><option value="pending_deposit">Aguardando sinal</option></select><button class="h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg shadow-md" type="submit">Salvar Agendamento</button></form></div></div>');
      document.getElementById('close-appointment-modal')?.addEventListener('click', () => document.getElementById('appointment-modal')?.remove());
      document.getElementById('appointment-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const clientName = document.getElementById('appointment-client').value.trim();
        const clientPhone = document.getElementById('appointment-phone').value.replace(/\D/g, '');
        const startsAt = new Date(document.getElementById('appointment-start').value).toISOString();
        const professionalId = Number(document.getElementById('appointment-professional').value);
        const serviceId = Number(document.getElementById('appointment-service').value);
        const status = document.getElementById('appointment-status').value;
        const response = await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientName, clientPhone, startsAt, professionalId, serviceId, status }) });
        if (response.ok) { document.getElementById('appointment-modal')?.remove(); loadAppointments(); }
      });
    }

    const datePicker = document.createElement('input');
    datePicker.type = 'date'; datePicker.value = selectedDate; datePicker.className = 'sr-only';
    document.body.appendChild(datePicker);
    document.getElementById('open-calendar-modal')?.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); datePicker.showPicker?.(); datePicker.click(); }, true);
    datePicker.addEventListener('change', () => { selectedDate = datePicker.value; loadAppointments(); });
    document.getElementById('btn-novo-agendamento')?.addEventListener('click', openNewAppointment);
    loadAppointments().catch(() => {});
  })();
</script>`;
}

function bindingsForDashboard() {
  return String.raw`<script>
  (function () {
    const currency = (cents) => 'R$ ' + (Number(cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const setMetric = (label, value) => {
      const labelNode = Array.from(document.querySelectorAll('span')).find((node) => node.textContent.trim().toUpperCase() === label.toUpperCase());
      const valueNode = labelNode?.parentElement?.parentElement?.querySelector('.font-headline-md');
      if (valueNode) valueNode.textContent = value;
    };

    async function loadDashboard() {
      const [response, studioResponse, sessionResponse] = await Promise.all([fetch('/api/dashboard'), fetch('/api/studio'), fetch('/api/auth/session')]);
      if (!response.ok) return;
      const { data } = await response.json();
      const studio = studioResponse.ok ? (await studioResponse.json()).data : null;
      const session = sessionResponse.ok ? (await sessionResponse.json()).data : null;
      const studioName = studio?.settings?.brandName || studio?.name;
      if (studioName) Array.from(document.querySelectorAll('span')).filter((node) => node.textContent.trim() === "L'Émail Studio").forEach((node) => node.textContent = studioName);
      if (studio?.settings?.ownerAvatar) document.querySelector('img[alt="Profile"]')?.setAttribute('src', studio.settings.ownerAvatar);
      const greeting = Array.from(document.querySelectorAll('h1')).find((node) => node.textContent.includes('Olá,'));
      if (greeting) greeting.innerHTML = 'Olá, ' + (session?.name || 'Proprietária') + ' <span class="inline-block hover:rotate-12 transition-transform duration-300">✨</span>';
      const metrics = data.metrics;
      setMetric('Faturamento', currency(metrics.received_revenue_cents));
      setMetric('Atendimentos', String(metrics.appointments_count));
      setMetric('Ticket Médio', currency(metrics.average_ticket_cents));
      setMetric('Sinais (Pix)', currency(metrics.deposits_cents));

      const upcomingTitle = Array.from(document.querySelectorAll('h2')).find((node) => node.textContent.trim() === 'Próximas Clientes');
      const upcomingSection = upcomingTitle?.closest('section');
      const upcomingList = upcomingSection?.querySelector(':scope > .flex.flex-col.gap-3');
      const upcomingSubtitle = upcomingTitle?.parentElement?.querySelector('.font-body-sm');
      const agendaButton = upcomingSection?.querySelector('button');
      if (agendaButton) agendaButton.onclick = () => { window.top.location.href = '/agenda'; };
      const formatTime = (value) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
      const initials = (value) => String(value || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
      const statusFor = (appointment) => {
        if (appointment.status === 'pending_deposit') return 'Sinal pendente';
        if (appointment.payment_status === 'deposit_paid') return 'Sinal pago';
        if (appointment.status === 'confirmed') return 'Confirmada';
        return 'Agendada';
      };
      if (upcomingSubtitle) upcomingSubtitle.textContent = data.upcoming.length
        ? 'Próximos ' + data.upcoming.length + (data.upcoming.length === 1 ? ' atendimento' : ' atendimentos')
        : 'Nenhum agendamento futuro';
      if (upcomingList) {
        const templates = Array.from(upcomingList.children);
        if (!data.upcoming.length) {
          upcomingList.replaceChildren();
          const empty = document.createElement('p');
          empty.className = 'rounded-xl bg-surface-container-low p-4 text-center font-body-sm text-on-surface-variant';
          empty.textContent = 'Nenhum agendamento futuro.';
          upcomingList.appendChild(empty);
        } else {
          const cards = data.upcoming.map((appointment, index) => {
            const card = (templates[index] || templates[0]).cloneNode(false);
            card.className = 'bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_20px_-2px_rgba(190,24,93,0.06)] relative overflow-hidden flex flex-col gap-3';
            card.dataset.appointmentId = appointment.id;
            card.innerHTML = '<div class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div><div class="flex items-start justify-between gap-3"><div class="flex items-center gap-3 min-w-0"><div class="w-12 h-12 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center font-title-md text-on-surface-variant font-semibold" data-upcoming-avatar></div><div class="flex flex-col min-w-0"><div class="flex items-center gap-2"><span class="font-title-md text-title-md text-on-surface truncate" data-upcoming-client></span><span class="bg-primary/10 text-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold" data-upcoming-time></span></div><span class="font-body-sm text-body-sm text-on-surface-variant mt-0.5" data-upcoming-service></span></div></div><span class="bg-surface-container text-on-surface font-label-sm text-label-sm px-2.5 py-1 rounded-full font-semibold shrink-0" data-upcoming-status></span></div><div class="flex items-center justify-between gap-2 pt-2 bg-surface-container-low px-3 py-2 rounded-lg"><span class="font-label-md text-label-md text-on-surface-variant" data-upcoming-professional></span><button type="button" class="hidden text-primary font-label-sm text-label-sm font-semibold" data-upcoming-reminder>Lembrete</button></div>';
            card.querySelector('[data-upcoming-avatar]').textContent = initials(appointment.client_name);
            card.querySelector('[data-upcoming-client]').textContent = appointment.client_name || 'Cliente';
            card.querySelector('[data-upcoming-time]').textContent = formatTime(appointment.starts_at);
            card.querySelector('[data-upcoming-service]').textContent = appointment.service_name || 'Serviço';
            card.querySelector('[data-upcoming-status]').textContent = statusFor(appointment);
            card.querySelector('[data-upcoming-professional]').textContent = 'Profissional: ' + (appointment.professional_name || 'Sem profissional');
            const reminder = card.querySelector('[data-upcoming-reminder]');
            if (appointment.client_phone) {
              reminder.classList.remove('hidden');
              reminder.onclick = () => { window.open('https://wa.me/' + String(appointment.client_phone).replace(/\D/g, ''), '_blank', 'noopener'); };
            }
            return card;
          });
          upcomingList.replaceChildren(...cards);
        }
      }

      const commissionValues = Array.from(document.querySelectorAll('span.font-title-md')).filter((node) => node.textContent.includes('R$'));
      data.commissions.forEach((commission, index) => {
        const commissionValue = commissionValues.slice(-2)[index];
        if (commissionValue) commissionValue.textContent = currency(commission.commission_cents);
      });
    }

    const tourStyle = document.createElement('style');
    tourStyle.textContent = '.dashboard-tour-trigger{position:fixed;right:16px;bottom:88px;z-index:70;border:0;border-radius:999px;padding:11px 15px;background:#970046;color:#fff;font:600 13px Arial;box-shadow:0 5px 18px #97004655}.dashboard-tour-shade{position:fixed;inset:0;z-index:80;background:#21101599}.dashboard-tour-card{position:fixed;z-index:82;width:min(330px,calc(100vw - 28px));padding:18px;border-radius:16px;background:#fffaf9;color:#381716;box-shadow:0 14px 45px #0005;font:14px/1.4 Arial}.dashboard-tour-card h3{margin:0 0 6px;color:#970046;font-size:19px}.dashboard-tour-card p{margin:0 0 14px}.dashboard-tour-actions{display:flex;align-items:center;justify-content:space-between;gap:8px}.dashboard-tour-actions button{border:0;border-radius:9px;padding:9px 12px;background:#970046;color:#fff;font-weight:bold}.dashboard-tour-actions button:first-child{background:#f3e5e8;color:#7f2530}.dashboard-tour-target{position:relative!important;z-index:81!important;outline:3px solid #ffd6e3;outline-offset:4px;border-radius:10px}'; document.head.appendChild(tourStyle);
    const tourButton = document.createElement('button'); tourButton.type = 'button'; tourButton.className = 'dashboard-tour-trigger'; tourButton.innerHTML = '✦ Como usar'; document.body.appendChild(tourButton);
    function startDashboardTour() {
      const steps = [
        ['header .flex.items-center.gap-space-sm:first-child', 'Cabeçalho do estúdio', 'Aqui você identifica o estúdio e a página atual. O nome acompanha o que foi salvo em Ajustes.'],
        ['button[aria-label="Notificações"]', 'Notificações', 'Este ícone concentra os avisos importantes do estúdio.'],
        ['img[alt="Profile"]', 'Perfil da proprietária', 'Exibe a foto cadastrada em Ajustes e identifica quem está usando o painel.'],
        ['h1', 'Boas-vindas e situação do estúdio', 'Mostra a proprietária conectada e o estado atual de funcionamento do ateliê.'],
        ['section.px-margin.mt-space-md .grid > div:nth-child(1)', 'Faturamento', 'Total recebido nos atendimentos registrados no período exibido.'],
        ['section.px-margin.mt-space-md .grid > div:nth-child(2)', 'Atendimentos', 'Quantidade de atendimentos do dia registrados na agenda.'],
        ['section.px-margin.mt-space-md .grid > div:nth-child(3)', 'Ticket médio', 'Valor médio por atendimento, calculado a partir dos serviços concluídos.'],
        ['section.px-margin.mt-space-md .grid > div:nth-child(4)', 'Sinais via Pix', 'Soma dos sinais pagos nos agendamentos.'],
        ['h2', 'Próximas clientes', 'Lista os próximos agendamentos reais, com horário, serviço, profissional e situação.'],
        ['section.px-margin.mt-space-lg button', 'Ver agenda', 'Abre a agenda completa para consultar, criar e administrar os horários.'],
        ['[data-appointment-id]', 'Card de agendamento', 'Cada card mostra cliente, horário, serviço, status e profissional. Quando houver telefone, use Lembrete para abrir uma mensagem no WhatsApp da cliente.']
      ].filter((step) => step[0] && document.querySelector(step[0]));
      let index = 0; const shade = document.createElement('div'), card = document.createElement('div'); shade.className = 'dashboard-tour-shade'; card.className = 'dashboard-tour-card'; document.body.append(shade, card);
      function show() { const step = steps[index], target = document.querySelector(step[0]); target?.scrollIntoView({ behavior: 'smooth', block: 'center' }); document.querySelectorAll('.dashboard-tour-target').forEach((node) => node.classList.remove('dashboard-tour-target')); target?.classList.add('dashboard-tour-target'); const last = index === steps.length - 1; card.innerHTML = '<h3>' + step[1] + '</h3><p>' + step[2] + '</p><div class="dashboard-tour-actions"><button type="button" data-tour-close>Encerrar</button><span>' + (index + 1) + ' de ' + steps.length + '</span><button type="button" data-tour-next>' + (last ? 'Conhecer Agenda' : 'Próximo') + '</button></div>'; card.style.left = '14px'; card.style.bottom = '86px'; card.querySelector('[data-tour-close]').onclick = close; card.querySelector('[data-tour-next]').onclick = () => { if (++index >= steps.length) { close(); window.top.sessionStorage.setItem('studio-product-tour', 'agenda'); window.top.location.href = '/agenda'; } else show(); }; }
      function close() { document.querySelectorAll('.dashboard-tour-target').forEach((node) => node.classList.remove('dashboard-tour-target')); shade.remove(); card.remove(); }
      show();
    }
    tourButton.addEventListener('click', startDashboardTour);
    loadDashboard().then(() => { if (!localStorage.getItem('dashboard-tour-seen')) { localStorage.setItem('dashboard-tour-seen', '1'); startDashboardTour(); } }).catch(() => {});
  })();
</script>`;
}

function bindingsForCommissions() {
  return String.raw`<script>
  (function () {
    const currency = (cents) => 'R$ ' + (Number(cents || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const keyForProfessional = (name) => (name || '').split(' ')[0].toLowerCase();
    const keyForService = (category) => ({ nailart: 'manicure', pes: 'spa' }[category] || category);

    async function loadCommissions() {
      const response = await fetch('/api/commissions');
      if (!response.ok) return;
      const { data } = await response.json();
      const recordsContainer = document.getElementById('commission-records');
      if (!recordsContainer) return;
      const cards = Array.from(recordsContainer.querySelectorAll('.commission-item'));
      const prototype = cards[0];
      if (!prototype) return;

      data.records.forEach((record, index) => {
        const card = cards[index] || prototype.cloneNode(true);
        if (!cards[index]) recordsContainer.insertBefore(card, document.getElementById('empty-state'));
        card.dataset.artist = keyForProfessional(record.professional_name);
        card.dataset.service = keyForService(record.category);
        const title = card.querySelector('.font-title-md');
        if (title) title.textContent = record.professional_name;
        const service = card.querySelector('.font-body-md');
        if (service) service.textContent = record.service_name;
        const details = Array.from(card.querySelectorAll('.font-label-sm')).find((node) => node.textContent.includes('Valor:'));
        if (details) details.textContent = 'Valor: ' + currency(record.price_cents) + ' • Taxa: ' + record.commission_rate + '%';
        const values = card.querySelectorAll('.font-title-md');
        if (values[1]) values[1].textContent = currency(record.commission_cents);
        const status = record.status === 'completed' ? 'Repassada' : 'A Pagar';
        const badge = Array.from(card.querySelectorAll('span')).find((node) => node.textContent.includes('A Pagar') || node.textContent.includes('Repassada'));
        if (badge) badge.textContent = status;
      });
      cards.slice(data.records.length).forEach((card) => card.remove());
      const count = document.getElementById('count-indicator');
      if (count) count.textContent = data.records.length + (data.records.length === 1 ? ' registro' : ' registros');

      const updateSummary = (label, amount, countValue) => {
        const labelNode = Array.from(document.querySelectorAll('span')).find((node) => node.textContent.trim() === label);
        const panel = labelNode?.parentElement?.parentElement;
        const value = panel?.querySelector('.font-title-md');
        if (value) value.textContent = currency(amount);
        const caption = panel?.querySelectorAll('.font-label-sm')[1];
        if (caption) caption.innerHTML = '<span class="material-symbols-outlined text-[14px]">' + (label === 'A Pagar' ? 'schedule' : 'check_circle') + '</span> ' + countValue + ' repasses';
      };
      updateSummary('Já Repassadas', data.summary.repassed_cents, data.summary.repassed_count);
      updateSummary('A Pagar', data.summary.payable_cents, data.summary.payable_count);

      const total = Number(data.summary.repassed_cents) + Number(data.summary.payable_cents);
      const totalLabel = Array.from(document.querySelectorAll('span')).find((node) => node.textContent.trim().toUpperCase() === 'TOTAL DE COMISSÕES DEVIDAS');
      const totalValue = totalLabel?.parentElement?.querySelector('.font-headline-lg-mobile');
      if (totalValue) totalValue.textContent = currency(total);
      const paidPercent = total ? Math.round((Number(data.summary.repassed_cents) / total) * 100) : 0;
      const distribution = Array.from(document.querySelectorAll('span')).filter((node) => /% (Repassado|Pendente)/.test(node.textContent));
      if (distribution[0]) distribution[0].textContent = paidPercent + '% Repassado';
      if (distribution[1]) distribution[1].textContent = (100 - paidPercent) + '% Pendente';
    }

    loadCommissions().catch(() => {});
  })();
</script>`;
}

function bindingsForSettings() {
  return String.raw`<script>
  (function () {
    let ownerAvatar = '';
    let publicResultImages = [];
    let selectedTemplateId = '';
    const byId = (id) => document.getElementById(id);
    const digits = (value) => (value || '').replace(/\D/g, '');
    const toCents = (value) => Math.round(Number((value || '0').replace(/[^0-9,]/g, '').replace(',', '.')) * 100);

    async function loadSettings() {
      const response = await fetch('/api/studio');
      if (!response.ok) return;
      const { data: studio } = await response.json();
      const settings = studio.settings || {};
      const templatesResponse = await fetch('/api/templates');
      if (templatesResponse.ok) { const templates = (await templatesResponse.json()).data; byId('studio-template').innerHTML = templates.map((template) => '<option value="' + template.id + '">' + template.name + '</option>').join(''); byId('studio-template').value = settings.templateId || templates[0]?.id || ''; selectedTemplateId = byId('studio-template').value; }
      const selected = (await fetch('/api/templates')).ok ? null : null;
      ownerAvatar = settings.ownerAvatar || '';
      publicResultImages = Array.isArray(settings.publicResultImages) ? settings.publicResultImages.filter((image) => typeof image === 'string' && image.startsWith('data:image/')).slice(0, 3) : [];
      byId('toggle-public-results').checked = settings.publicResultsEnabled === true;
      renderPublicResults();
      loadPublicTestimonials();
      if (ownerAvatar) byId('owner-avatar-preview').src = ownerAvatar;
      if (studio.whatsapp) byId('whatsapp-number').value = studio.whatsapp;
      const sessionResponse = await fetch('/api/auth/session');
      if (sessionResponse.ok) byId('owner-name').value = (await sessionResponse.json()).data.name || '';
      byId('brand-name').value = settings.brandName || studio.name;
      byId('studio-slug').value = studio.slug || '';
      byId('legal-name').value = settings.legalName || byId('legal-name').value;
      byId('street-address').value = settings.streetAddress || byId('street-address').value;
      byId('complement').value = settings.complement || byId('complement').value;
      byId('neighborhood').value = settings.neighborhood || byId('neighborhood').value;
      if (byId('reminder-template')) byId('reminder-template').value = settings.reminderTemplate || byId('reminder-template').value;
      if (byId('pix-key')) byId('pix-key').value = settings.pixKey || '';
      if (byId('toggle-reminders')) byId('toggle-reminders').checked = settings.remindersEnabled !== false;
      if (byId('toggle-deposit')) byId('toggle-deposit').checked = settings.depositEnabled !== false;
      if (byId('deposit-value')) byId('deposit-value').value = studio.deposit_type === 'percent' ? String(studio.deposit_value) : (Number(studio.deposit_value || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      if (studio.deposit_type === 'percent' && byId('btn-percent-deposit')) byId('btn-percent-deposit').click();
    }

    byId('owner-avatar')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (!file || file.size > 1_500_000) return;
      const reader = new FileReader();
      reader.onload = () => { ownerAvatar = String(reader.result || ''); byId('owner-avatar-preview').src = ownerAvatar; byId('owner-avatar-status').textContent = 'Foto selecionada'; };
      reader.readAsDataURL(file);
    });
    function renderPublicResults() {
      const preview = byId('public-results-preview');
      if (!preview) return;
      preview.innerHTML = publicResultImages.map((image, index) => '<div class="relative aspect-square rounded-xl overflow-hidden bg-surface-container-high"><img class="w-full h-full object-cover" src="' + image + '" alt="Resultado ' + (index + 1) + '"><button class="absolute top-1 right-1 w-6 h-6 rounded-full bg-surface-container-lowest text-error flex items-center justify-center" type="button" data-remove-result="' + index + '">×</button></div>').join('');
      preview.querySelectorAll('[data-remove-result]').forEach((button) => button.addEventListener('click', () => { publicResultImages.splice(Number(button.dataset.removeResult), 1); renderPublicResults(); savePublicResults().catch(() => { byId('public-results-status').textContent = 'Não foi possível salvar. Tente novamente.'; }); }));
    }
    async function savePublicResults() {
      const status = byId('public-results-status');
      status.textContent = 'Salvando resultados…';
      const response = await fetch('/api/studio', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { publicResultsEnabled: byId('toggle-public-results').checked, publicResultImages } })
      });
      if (!response.ok) { status.textContent = 'Não foi possível salvar. Tente novamente.'; return false; }
      status.textContent = publicResultImages.length ? publicResultImages.length + ' foto(s) publicada(s) na bio.' : (byId('toggle-public-results').checked ? 'Ativado. Escolha as fotos para exibir na bio.' : 'Bloco oculto na bio pública.');
      return true;
    }
    function compressPublicResult(file) {
      return new Promise((resolve, reject) => {
        const image = new Image(); const source = URL.createObjectURL(file);
        image.onload = () => {
          const maxSide = 1400; const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(source);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        image.onerror = () => { URL.revokeObjectURL(source); reject(new Error('image')); };
        image.src = source;
      });
    }
    function renderPublicTestimonials(items) {
      const list = byId('public-testimonials-list');
      if (!list) return;
      list.innerHTML = items.map((item) => '<div class="p-3 rounded-xl bg-surface-container-lowest flex items-start justify-between gap-2"><div><b class="font-label-md text-on-surface">' + item.name.replace(/[&<>"']/g, '') + '</b><p class="font-label-sm text-secondary">' + '★'.repeat(item.rating || 5) + '☆'.repeat(5 - (item.rating || 5)) + '</p><p class="font-body-sm text-on-surface-variant mt-1">' + item.text.replace(/[&<>"']/g, '') + '</p><small class="font-label-sm text-primary">' + (item.status === 'pending' ? 'Pendente de aprovação' : item.status === 'approved' ? 'Publicado' : 'Recusado') + '</small></div>' + (item.status === 'pending' ? '<div class="flex gap-2"><button class="text-primary font-label-md" type="button" data-review="approved" data-id="' + item.id + '">Aprovar</button><button class="text-error font-label-md" type="button" data-review="rejected" data-id="' + item.id + '">Recusar</button></div>' : '') + '</div>').join('') || '<p class="font-body-sm text-on-surface-variant">Nenhum comentário recebido ainda.</p>';
      list.querySelectorAll('[data-review]').forEach((button) => button.addEventListener('click', async () => { await fetch('/api/testimonials', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(button.dataset.id), status: button.dataset.review }) }); loadPublicTestimonials(); }));
    }
    async function loadPublicTestimonials() { const response = await fetch('/api/testimonials'); if (!response.ok) { byId('public-testimonials-status').textContent = 'Não foi possível carregar comentários.'; return; } const items = (await response.json()).data || []; byId('public-testimonials-status').textContent = items.filter((item) => item.status === 'pending').length + ' comentário(s) pendente(s).'; renderPublicTestimonials(items); }
    byId('toggle-public-results')?.addEventListener('change', () => { savePublicResults().catch(() => { byId('public-results-status').textContent = 'Não foi possível salvar. Tente novamente.'; }); });
    byId('public-result-images')?.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      const valid = files.filter((file) => /image\/(png|jpeg|webp)/.test(file.type) && file.size <= 12_000_000).slice(0, Math.max(0, 3 - publicResultImages.length));
      if (valid.length !== files.length) byId('public-results-status').textContent = 'Use imagens JPG, PNG ou WEBP de até 12 MB; elas serão otimizadas automaticamente.';
      const images = await Promise.all(valid.map((file) => compressPublicResult(file).catch(() => '')));
      publicResultImages.push(...images.filter(Boolean));
      event.target.value = '';
      byId('public-results-status').textContent = publicResultImages.length ? publicResultImages.length + ' foto(s) selecionada(s). Salvando…' : 'Escolha imagens JPG, PNG ou WEBP.';
      renderPublicResults();
      if (publicResultImages.length) await savePublicResults();
    });
    byId('studio-template')?.addEventListener('change', async () => { selectedTemplateId = byId('studio-template').value || selectedTemplateId; const templates = await (await fetch('/api/templates')).json(); const selected = templates.data.find((item) => item.id === selectedTemplateId); const preview = byId('template-preview'); if (selected?.previewUrl) { preview.href = selected.previewUrl; preview.classList.remove('hidden'); } else preview.classList.add('hidden'); });
    byId('upload-template')?.addEventListener('click', async () => { const manifest = byId('template-manifest').files[0], html = byId('template-html').files[0], css = byId('template-css').files[0]; if (!manifest || !html || !css) return; const form = new FormData(); form.append('manifest', manifest); form.append('html', html); form.append('css', css); Array.from(byId('template-assets').files || []).forEach((file) => form.append('assets', file)); const response = await fetch('/api/templates', { method: 'POST', body: form }); if (!response.ok) return; const item = (await response.json()).data; const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; byId('studio-template').append(option); byId('studio-template').value = item.id; selectedTemplateId = item.id; await fetch('/api/studio', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: { templateId: item.id } }) }); const preview = byId('template-preview'); preview.href = item.previewUrl; preview.classList.remove('hidden'); });
    byId('delete-template')?.addEventListener('click', async () => { const id = byId('studio-template').value; if (!confirm('Excluir este template e seus arquivos?')) return; const response = await fetch('/api/templates?id=' + encodeURIComponent(id), { method: 'DELETE' }); if (!response.ok) return; byId('studio-template').querySelector('option[value="' + id + '"]')?.remove(); byId('template-preview').classList.add('hidden'); });

    byId('settings-form')?.addEventListener('submit', async () => {
      const isPercent = byId('btn-percent-deposit')?.classList.contains('bg-primary') || false;
      const depositInput = byId('deposit-value');
      const depositValue = depositInput ? (isPercent ? Number(depositInput.value.replace(/\D/g, '')) : toCents(depositInput.value)) : undefined;
      const response = await fetch('/api/studio', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: byId('brand-name').value.trim(),
          slug: byId('studio-slug').value.trim(),
          ownerName: byId('owner-name').value.trim(),
          whatsapp: digits(byId('whatsapp-number').value),
          ...(depositInput ? { depositType: isPercent ? 'percent' : 'fixed', depositValue } : {}),
          settings: {
            brandName: byId('brand-name').value.trim(), legalName: byId('legal-name').value.trim(),
            streetAddress: byId('street-address').value.trim(), complement: byId('complement').value.trim(),
            neighborhood: byId('neighborhood').value.trim(), pixKey: byId('pix-key').value.trim(),
            ...(byId('reminder-template') ? { reminderTemplate: byId('reminder-template').value, remindersEnabled: byId('toggle-reminders').checked } : {}),
            ...(byId('toggle-deposit') ? { depositEnabled: byId('toggle-deposit').checked, depositTimeLimit: byId('deposit-timelimit').value } : {}),
            ownerAvatar, ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
            publicResultsEnabled: byId('toggle-public-results').checked, publicResultImages
          }
        })
      });
      if (!response.ok) return;
      byId('save-toast')?.classList.remove('hidden');
    }, true);

    loadSettings().catch(() => {});
  })();
</script>`;
}

function bindingsForLogin() {
  return String.raw`<script>
  (function () {
    const phone = document.getElementById('phone-input');
    const inputs = Array.from(document.querySelectorAll('.otp-input'));
    let codeRequested = false;
    const feedback = document.createElement('p');
    feedback.id = 'otp-feedback';
    feedback.className = 'mt-3 text-center font-label-md text-label-md text-primary';
    const otpSection = document.getElementById('otp-section');
    otpSection?.appendChild(feedback);
    const verify = async function () {
      const code = inputs.map((item) => item.value).join('');
      if (!codeRequested || code.length !== 6) return;
      feedback.textContent = 'Verificando código…';
      const response = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: (phone?.value || '').replace(/\D/g, ''), code }) });
      if (response.ok) { window.top.location.href = '/dashboard'; return; }
      feedback.textContent = 'Código inválido. Toque em “Receber código” e tente novamente.';
    };
    const originalRequest = window.triggerOtpState;
    window.triggerOtpState = async function () {
      const number = (phone?.value || '').replace(/\D/g, '');
      if (number.length < 11) { feedback.textContent = 'Informe seu WhatsApp com DDD.'; return; }
      const response = await fetch('/api/auth/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: number }) });
      if (!response.ok) { feedback.textContent = 'Não foi possível gerar o código. Tente novamente.'; return; }
      const { data } = await response.json();
      codeRequested = true;
      feedback.textContent = data.developmentCode ? 'Código de teste: ' + data.developmentCode : 'Código enviado pelo WhatsApp.';
      originalRequest?.();
    };
    inputs.forEach((input) => input.addEventListener('input', verify));
    inputs.forEach((input) => input.addEventListener('paste', () => setTimeout(verify, 0)));
  })();
</script>`;
}

function bindingsForCrossPageTour(screen: string) {
  const next: Record<string, string | undefined> = { agenda: "profissionais", profissionais: "servicos", servicos: "configuracoes" };
  const paths: Record<string, string> = { agenda: "/agenda", profissionais: "/profissionais", servicos: "/servicos", configuracoes: "/configuracoes" };
  const steps: Record<string, [string, string, string, string?][]> = {
    agenda: [['h1', 'Agenda', 'Aqui você acompanha os atendimentos por data e horário.'], ['#open-calendar-modal', 'Calendário', 'Escolha a data para ver a programação daquele dia.'], ['#btn-novo-agendamento', 'Novo agendamento', 'Cria um horário informando cliente, serviço, profissional e data.'], ['[data-appointment-id]', 'Card de agendamento', 'Mostra os dados do atendimento e ações como lembrete, finalizar ou reagendar.']],
    profissionais: [['h1', 'Equipe', 'Esta página reúne os profissionais cadastrados no estúdio.'], ['#open-modal-btn', 'Cadastrar profissional', 'Abre o formulário para incluir uma profissional.'], ['#pro-name', 'Nome completo', 'Informe o nome que será exibido na equipe e nos agendamentos.', '#open-modal-btn'], ['#pro-whatsapp', 'WhatsApp da profissional', 'Use DDD e número para contatos e lembretes.', '#open-modal-btn'], ['#pro-form button[type="submit"]', 'Salvar profissional', 'Confirma o cadastro depois de preencher os campos obrigatórios.', '#open-modal-btn'], ['[data-professional-id]', 'Card da profissional', 'Cada card exibe os dados reais e oferece editar ou excluir.']],
    servicos: [['h1', 'Serviços', 'Aqui fica o catálogo que aparece no agendamento e na bio pública.'], ['#openNewServiceBtn', 'Novo serviço', 'Abre o formulário de cadastro do serviço.'], ['#inputServiceName', 'Nome do serviço', 'É o nome que a cliente verá ao agendar.', '#openNewServiceBtn'], ['#inputServicePrice', 'Preço cobrado', 'Define o valor exibido no catálogo e usado nos atendimentos.', '#openNewServiceBtn'], ['#service-image', 'Imagem do serviço', 'Envie uma foto real para enriquecer o catálogo público.', '#openNewServiceBtn'], ['#inputServiceTime', 'Tempo de cabine', 'Define a duração usada para calcular horários disponíveis.', '#openNewServiceBtn'], ['#saveServiceBtn', 'Salvar serviço', 'Confirma as alterações do serviço.', '#openNewServiceBtn'], ['#serviceSearchInput', 'Busca', 'Filtra rapidamente os serviços cadastrados.'], ['#servicesList', 'Lista de serviços', 'Mostra os serviços ativos e permite editar ou excluir cada um.']],
    configuracoes: [['h1', 'Ajustes', 'Centraliza os dados que personalizam o seu estúdio e a bio pública.'], ['#brand-name', 'Nome do estúdio', 'Este nome é mostrado no sistema e na página pública.'], ['#studio-slug', 'Link público', 'Define o endereço exclusivo usado na bio do Instagram.'], ['#studio-template', 'Template visual', 'Escolha o tema instalado que será publicado no seu link.'], ['#toggle-public-results', 'Resultados na bio', 'Ative e envie fotos reais para exibir o carrossel de resultados.'], ['#public-testimonials-list', 'Comentários recebidos', 'Aprove ou recuse os comentários enviados pelas clientes antes de publicar.'], ['#btn-save-settings', 'Salvar ajustes', 'Grava os demais dados editados nesta página.']]
  };
  const items = steps[screen] || [];
  if (!items.length) return '';
  const nextScreen = next[screen], nextPath = nextScreen ? paths[nextScreen] : '';
  return String.raw`<script>(function(){if(window.top.sessionStorage.getItem('studio-product-tour')!==${JSON.stringify(screen)})return;const steps=${JSON.stringify(items)}.filter(s=>document.querySelector(s[0])),nextScreen=${JSON.stringify(nextScreen || '')},nextPath=${JSON.stringify(nextPath)};if(!steps.length)return;let i=0;const css=document.createElement('style');css.textContent='.cross-tour-shade{position:fixed;inset:0;z-index:80;background:#21101599}.cross-tour-card{position:fixed;z-index:82;width:min(330px,calc(100vw - 28px));padding:18px;border-radius:16px;background:#fffaf9;color:#381716;box-shadow:0 14px 45px #0005;font:14px/1.4 Arial}.cross-tour-card h3{margin:0 0 6px;color:#970046;font-size:19px}.cross-tour-card p{margin:0 0 14px}.cross-tour-card div{display:flex;justify-content:space-between;align-items:center;gap:8px}.cross-tour-card button{border:0;border-radius:9px;padding:9px 12px;background:#970046;color:#fff;font-weight:bold}.cross-tour-card button:first-child{background:#f3e5e8;color:#7f2530}.cross-tour-target{position:relative!important;z-index:81!important;outline:3px solid #ffd6e3;outline-offset:4px;border-radius:10px}';document.head.appendChild(css);const shade=document.createElement('div'),card=document.createElement('div');shade.className='cross-tour-shade';card.className='cross-tour-card';document.body.append(shade,card);function end(){document.querySelectorAll('.cross-tour-target').forEach(n=>n.classList.remove('cross-tour-target'));shade.remove();card.remove();window.top.sessionStorage.removeItem('studio-product-tour')}function show(){const s=steps[i];if(s[3])document.querySelector(s[3])?.click();const target=document.querySelector(s[0]),last=i===steps.length-1;target?.scrollIntoView({behavior:'smooth',block:'center'});document.querySelectorAll('.cross-tour-target').forEach(n=>n.classList.remove('cross-tour-target'));target?.classList.add('cross-tour-target');const r=target?.getBoundingClientRect(),above=r&&r.bottom+185>innerHeight;card.style.left=Math.max(14,Math.min(innerWidth-344,(r?.left||14))).toFixed(0)+'px';card.style.top=above?Math.max(14,(r?.top||180)-175)+'px':Math.min(innerHeight-170,(r?.bottom||80)+14)+'px';card.innerHTML='<h3>'+s[1]+'</h3><p>'+s[2]+'</p><div><button data-close>Encerrar</button><span>'+(i+1)+' de '+steps.length+'</span><button data-next>'+(last?(nextScreen?'Próxima página':'Concluir'):'Próximo')+'</button></div>';card.querySelector('[data-close]').onclick=end;card.querySelector('[data-next]').onclick=()=>{if(++i<steps.length)return show();if(nextScreen){window.top.sessionStorage.setItem('studio-product-tour',nextScreen);window.top.location.href=nextPath}else end()}}show()})();</script>`;
}

export function dynamicBindings(screen: string) {
  const common = String.raw`<script>(function () {
    const nativeFetch = window.fetch.bind(window);
    let refreshTimer;
    window.fetch = async function (input, init) {
      const response = await nativeFetch(input, init);
      const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const url = typeof input === 'string' ? input : input.url;
      if (response.ok && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && url.startsWith('/api/')) {
        clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => window.location.reload(), 450);
      }
      return response;
    };
  })();</script><script>(async function () {
    const response = await fetch('/api/studio');
    if (!response.ok) return;
    const { data: studio } = await response.json();
    const name = studio?.settings?.brandName || studio?.name;
    if (name) Array.from(document.querySelectorAll('span')).filter((node) => node.textContent.trim() === "L'Émail Studio").forEach((node) => node.textContent = name);
    if (studio?.settings?.ownerAvatar) document.querySelector('img[alt="Profile"]')?.setAttribute('src', studio.settings.ownerAvatar);
  })().catch(() => {});</script>`;
  if (screen === "servicos") return common + bindingsForServices() + bindingsForCrossPageTour(screen);
  if (screen === "profissionais") return common + bindingsForProfessionals() + bindingsForCrossPageTour(screen);
  if (screen === "agenda") return common + bindingsForAgenda() + bindingsForCrossPageTour(screen);
  if (screen === "dashboard") return common + bindingsForDashboard();
  if (screen === "comissoes") return common + bindingsForCommissions();
  if (screen === "configuracoes") return common + bindingsForSettings() + bindingsForCrossPageTour(screen);
  if (screen === "login") return bindingsForLogin();
  return common;
}
