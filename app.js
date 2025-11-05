const API_BASE = '/api/bookings';

const ROOMS = [
  'Room 1',
  'Room 2',
  'Room 3',
  'Room 4',
  'Chamber Pod',
  'Boardroom',
  'Members Lounge Room'
];

const LAYOUT_OPTIONS = [
  { id: 'theatre', label: 'Theatre style' },
  { id: 'boardroom', label: 'Boardroom style' },
  { id: 'u-shape', label: 'U Shape' },
  { id: 'cabaret', label: 'Cabaret' },
  { id: 'training', label: 'Training style' }
];

const SERVICE_OPTIONS = [
  { id: 'laptop', label: 'Laptop' },
  { id: 'projector', label: 'Projector' },
  { id: 'flipchart', label: 'Flipchart' },
  { id: 'refreshments', label: 'Refreshments' },
  { id: 'lunch', label: 'Lunch' }
];

const DAY_START_MINUTES = 7 * 60;
const DAY_END_MINUTES = 21 * 60;
const HALF_HOUR = 30;

const state = {
  bookings: [],
  selectedDate: startOfDay(new Date()),
  miniMonth: startOfMonth(new Date()),
  editingId: null,
  selection: null,
  isSaving: false
};

const selectors = {
  miniMonth: document.getElementById('mini-month'),
  miniYear: document.getElementById('mini-year'),
  miniGrid: document.getElementById('mini-calendar-grid'),
  prevMonth: document.getElementById('mini-prev'),
  nextMonth: document.getElementById('mini-next'),
  selectedDateLabel: document.getElementById('selected-date-label'),
  prevDay: document.getElementById('prev-day'),
  nextDay: document.getElementById('next-day'),
  todayButton: document.getElementById('today-button'),
  bookingModal: document.getElementById('booking-modal'),
  modalCloseButtons: document.querySelectorAll('[data-modal-close]'),
  form: document.getElementById('booking-form'),
  bookingDate: document.getElementById('booking-date'),
  roomOptions: document.getElementById('room-options'),
  layoutOptions: document.getElementById('layout-options'),
  serviceOptions: document.getElementById('service-options'),
  startTime: document.getElementById('start-time'),
  endTime: document.getElementById('end-time'),
  bookerName: document.getElementById('booker-name'),
  attendees: document.getElementById('attendees'),
  notes: document.getElementById('notes'),
  bookingId: document.getElementById('booking-id'),
  formTitle: document.getElementById('form-title'),
  saveBooking: document.getElementById('save-booking'),
  cancelButton: document.getElementById('cancel-edit'),
  deleteBooking: document.getElementById('delete-booking'),
  editActions: document.getElementById('edit-actions'),
  timelineHours: document.getElementById('timeline-hours'),
  calendarGrid: document.getElementById('calendar-grid'),
  toast: document.getElementById('toast')
};

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatDisplayTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function showToast(message) {
  selectors.toast.textContent = message;
  selectors.toast.classList.add('visible');
  setTimeout(() => selectors.toast.classList.remove('visible'), 2400);
}

function populateOptionGrid(container, options, groupName) {
  container.innerHTML = '';
  options.forEach((option) => {
    const id = `${groupName}-${option.id}`;
    const wrapper = document.createElement('label');
    wrapper.setAttribute('for', id);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.name = groupName;
    input.value = option.id;

    const span = document.createElement('span');
    span.textContent = option.label;

    wrapper.append(input, span);
    container.appendChild(wrapper);
  });
}

function populateRooms() {
  selectors.roomOptions.innerHTML = '';
  ROOMS.forEach((room, index) => {
    const id = `room-${index}`;
    const wrapper = document.createElement('label');
    wrapper.setAttribute('for', id);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.name = 'rooms';
    input.value = room;

    const span = document.createElement('span');
    span.textContent = room;

    wrapper.append(input, span);
    selectors.roomOptions.appendChild(wrapper);
  });
}

function normaliseBooking(raw) {
  return {
    id: raw.id,
    date: raw.date,
    rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
    start: raw.start,
    end: raw.end,
    name: raw.name ?? 'Booking',
    attendees: Number.parseInt(raw.attendees ?? 0, 10) || 0,
    layouts: Array.isArray(raw.layouts) ? raw.layouts : [],
    services: Array.isArray(raw.services) ? raw.services : [],
    notes: raw.notes ?? ''
  };
}

async function fetchBookings() {
  const date = toISODate(state.selectedDate);
  try {
    const response = await fetch(`${API_BASE}?date=${date}`);
    if (!response.ok) {
      throw new Error(`Failed to load bookings (${response.status})`);
    }
    const payload = await response.json();
    state.bookings = Array.isArray(payload) ? payload.map(normaliseBooking) : [];
  } catch (error) {
    console.error(error);
    state.bookings = [];
    showToast('Unable to load bookings right now.');
  }
  renderTimeline();
}

function renderMiniCalendar() {
  const monthDate = state.miniMonth;
  const selectedISO = toISODate(state.selectedDate);
  const todayISO = toISODate(new Date());

  selectors.miniMonth.textContent = monthDate.toLocaleString('en-GB', { month: 'long' });
  selectors.miniYear.textContent = monthDate.getFullYear();

  selectors.miniGrid.innerHTML = '';
  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  dayHeaders.forEach((day) => {
    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = day;
    selectors.miniGrid.appendChild(header);
  });

  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

  for (let i = 0; i < startOffset; i += 1) {
    selectors.miniGrid.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const iso = toISODate(date);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = day;
    if (iso === selectedISO) {
      button.classList.add('selected');
    }
    if (iso === todayISO) {
      button.classList.add('today');
    }
    button.addEventListener('click', () => {
      state.selectedDate = startOfDay(date);
      state.miniMonth = startOfMonth(date);
      selectors.bookingDate.value = iso;
      renderSelectedDate();
      renderMiniCalendar();
      fetchBookings();
    });
    selectors.miniGrid.appendChild(button);
  }
}

function renderSelectedDate() {
  selectors.selectedDateLabel.textContent = state.selectedDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function renderTimeline() {
  const selectedISO = toISODate(state.selectedDate);
  const hours = [];
  for (let minutes = DAY_START_MINUTES; minutes <= DAY_END_MINUTES; minutes += 60) {
    hours.push(formatDisplayTime(formatMinutes(minutes)));
  }

  selectors.timelineHours.innerHTML = '';
  selectors.timelineHours.style.gridTemplateColumns = `160px repeat(${hours.length}, 1fr)`;
  selectors.timelineHours.appendChild(document.createElement('div'));
  hours.forEach((hourLabel) => {
    const hour = document.createElement('div');
    hour.className = 'hour';
    hour.textContent = hourLabel;
    selectors.timelineHours.appendChild(hour);
  });

  selectors.calendarGrid.innerHTML = '';
  const dayBookings = state.bookings.filter((booking) => booking.date === selectedISO);
  const tentative = state.selection && state.selection.date === selectedISO ? state.selection : null;

  ROOMS.forEach((room) => {
    const label = document.createElement('div');
    label.className = 'room-label';
    const bookingsForRoom = dayBookings.filter((booking) => booking.rooms.includes(room));
    const count = bookingsForRoom.length;
    label.innerHTML = `<span>${room}</span><small>${count ? `${count} booking${count > 1 ? 's' : ''}` : 'No bookings'}</small>`;
    selectors.calendarGrid.appendChild(label);

    const timeline = document.createElement('div');
    timeline.className = 'room-timeline';
    const halfHourSlots = (DAY_END_MINUTES - DAY_START_MINUTES) / HALF_HOUR;
    timeline.style.backgroundSize = `calc(100% / ${halfHourSlots}) 100%`;

    timeline.addEventListener('click', (event) => {
      if (event.target.closest('.booking-block')) {
        return;
      }
      openCreateModalFromTimeline(room, event);
    });

    const sorted = bookingsForRoom
      .slice()
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    const laneHeights = [];
    const laneSpacingRem = 3.2;

    sorted.forEach((booking) => {
      const bookingStart = toMinutes(booking.start);
      const bookingEnd = toMinutes(booking.end);
      const visibleStart = Math.max(bookingStart, DAY_START_MINUTES);
      const visibleEnd = Math.min(bookingEnd, DAY_END_MINUTES);
      if (visibleEnd <= DAY_START_MINUTES || visibleStart >= DAY_END_MINUTES) {
        return;
      }

      const block = document.createElement('div');
      block.className = 'booking-block';
      block.dataset.id = booking.id;
      if (booking.id === state.editingId) {
        block.classList.add('editing');
      }

      let laneIndex = laneHeights.findIndex((laneEnd) => bookingStart >= laneEnd);
      if (laneIndex === -1) {
        laneIndex = laneHeights.length;
        laneHeights.push(bookingEnd);
      } else {
        laneHeights[laneIndex] = bookingEnd;
      }

      const dayMinutes = DAY_END_MINUTES - DAY_START_MINUTES;
      const offset = ((visibleStart - DAY_START_MINUTES) / dayMinutes) * 100;
      const width = ((visibleEnd - visibleStart) / dayMinutes) * 100;
      if (width <= 0) {
        return;
      }
      block.style.left = `${Math.max(0, offset)}%`;
      block.style.width = `${Math.max(4, width)}%`;
      block.style.top = `${0.6 + laneIndex * laneSpacingRem}rem`;
      block.style.height = '2.6rem';

      const timeEl = document.createElement('div');
      timeEl.className = 'time';
      timeEl.textContent = `${formatDisplayTime(booking.start)} – ${formatDisplayTime(booking.end)}`;

      const titleEl = document.createElement('div');
      titleEl.className = 'title';
      titleEl.textContent = booking.name;

      const metaEl = document.createElement('div');
      metaEl.className = 'meta';
      const attendeeLabel = `${booking.attendees} attendee${booking.attendees === 1 ? '' : 's'}`;
      const layoutLabel = booking.layouts.length
        ? ` • ${booking.layouts.map(capitaliseLabel).join(', ')}`
        : '';
      metaEl.textContent = `${attendeeLabel}${layoutLabel}`;

      block.append(timeEl, titleEl, metaEl);

      const details = [
        `Rooms: ${booking.rooms.join(', ')}`,
        `Attendees: ${booking.attendees}`,
        `Layouts: ${booking.layouts.length ? booking.layouts.map(capitaliseLabel).join(', ') : 'None'}`,
        `Services: ${booking.services.length ? booking.services.map(capitaliseLabel).join(', ') : 'None'}`
      ];
      if (booking.notes) {
        details.push(`Notes: ${booking.notes}`);
      }
      block.title = details.join('\n');

      block.addEventListener('click', () => startEditing(booking.id));
      timeline.appendChild(block);
    });

    if (tentative && tentative.rooms.includes(room)) {
      const block = document.createElement('div');
      block.className = 'booking-block tentative';
      const startMinutes = toMinutes(tentative.start);
      const endMinutes = toMinutes(tentative.end);
      const dayMinutes = DAY_END_MINUTES - DAY_START_MINUTES;
      const offset = ((startMinutes - DAY_START_MINUTES) / dayMinutes) * 100;
      const width = ((endMinutes - startMinutes) / dayMinutes) * 100;
      block.style.left = `${Math.max(0, offset)}%`;
      block.style.width = `${Math.max(4, width)}%`;
      block.style.top = '0.6rem';
      block.style.height = '2.6rem';
      const title = tentative.name && tentative.name.trim() ? tentative.name : 'Draft booking';
      const attendees = Number.parseInt(tentative.attendees ?? 0, 10) || 0;
      const tentativeTime = document.createElement('div');
      tentativeTime.className = 'time';
      tentativeTime.textContent = `${formatDisplayTime(tentative.start)} – ${formatDisplayTime(tentative.end)}`;

      const tentativeTitle = document.createElement('div');
      tentativeTitle.className = 'title';
      tentativeTitle.textContent = title;

      const tentativeMeta = document.createElement('div');
      tentativeMeta.className = 'meta';
      tentativeMeta.textContent = attendees
        ? `${attendees} attendee${attendees === 1 ? '' : 's'}`
        : 'Select attendees';

      block.append(tentativeTime, tentativeTitle, tentativeMeta);
      timeline.appendChild(block);
      laneHeights[0] = Math.max(laneHeights[0] ?? 0, endMinutes);
    }

    if (!timeline.children.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'room-empty';
      placeholder.textContent = 'Click to book';
      timeline.appendChild(placeholder);
    }

    const lanesUsed = Math.max(1, laneHeights.length);
    timeline.style.minHeight = `${lanesUsed * laneSpacingRem + 1.2}rem`;

    selectors.calendarGrid.appendChild(timeline);
  });
}

function capitaliseLabel(label) {
  return label
    .split(/[-\s]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getSelectedValues(name) {
  return Array.from(selectors.form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

function openCreateModalFromTimeline(room, event) {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width) {
    return;
  }
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const rawMinutes = DAY_START_MINUTES + ratio * (DAY_END_MINUTES - DAY_START_MINUTES);
  let startMinutes = snapToHalfHour(rawMinutes);
  startMinutes = Math.min(startMinutes, DAY_END_MINUTES - HALF_HOUR);
  let endMinutes = startMinutes + 60;
  if (endMinutes > DAY_END_MINUTES) {
    endMinutes = Math.min(DAY_END_MINUTES, startMinutes + HALF_HOUR);
  }
  if (endMinutes <= startMinutes) {
    endMinutes = Math.min(DAY_END_MINUTES, startMinutes + HALF_HOUR);
  }
  openCreateModal({
    room,
    start: formatMinutes(startMinutes),
    end: formatMinutes(endMinutes)
  });
}

function snapToHalfHour(minutes) {
  return Math.round(minutes / HALF_HOUR) * HALF_HOUR;
}

function openCreateModal({ room = null, start = '09:00', end = '10:00' } = {}) {
  resetFormFields();
  const iso = toISODate(state.selectedDate);
  selectors.formTitle.textContent = 'Create a booking';
  selectors.saveBooking.textContent = 'Save booking';
  selectors.editActions.hidden = true;
  selectors.bookingDate.value = iso;
  selectors.startTime.value = start;
  selectors.endTime.value = end;
  if (room) {
    setCheckedValues('rooms', [room]);
  }
  state.selection = {
    date: iso,
    rooms: room ? [room] : [],
    start,
    end,
    name: selectors.bookerName.value.trim(),
    attendees: selectors.attendees.value
  };
  openModal();
  syncSelectionFromForm();
  selectors.bookerName.focus();
}

function openModal() {
  selectors.bookingModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeModal() {
  selectors.bookingModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  state.editingId = null;
  state.selection = null;
  resetFormFields();
  renderTimeline();
}

function resetFormFields() {
  selectors.form.reset();
  selectors.bookingId.value = '';
  selectors.editActions.hidden = true;
  selectors.formTitle.textContent = 'Create a booking';
  selectors.saveBooking.textContent = 'Save booking';
  setCheckedValues('rooms', []);
  setCheckedValues('layouts', []);
  setCheckedValues('services', []);
  selectors.bookingDate.value = toISODate(state.selectedDate);
  selectors.startTime.value = '09:00';
  selectors.endTime.value = '10:00';
  selectors.notes.value = '';
}

function setCheckedValues(name, values) {
  const inputs = selectors.form.querySelectorAll(`input[name="${name}"]`);
  inputs.forEach((input) => {
    input.checked = values.includes(input.value);
  });
}

function syncSelectionFromForm() {
  if (selectors.bookingModal.getAttribute('aria-hidden') === 'true') {
    return;
  }
  if (state.editingId) {
    return;
  }
  const date = selectors.bookingDate.value;
  const rooms = getSelectedValues('rooms');
  const start = selectors.startTime.value;
  const end = selectors.endTime.value;
  const name = selectors.bookerName.value.trim();
  const attendees = selectors.attendees.value;

  if (!date || !rooms.length || !start || !end) {
    state.selection = null;
    renderTimeline();
    return;
  }

  state.selection = { date, rooms, start, end, name, attendees };
  renderTimeline();
}

async function handleFormSubmit(event) {
  event.preventDefault();
  if (state.isSaving) {
    return;
  }

  const date = selectors.bookingDate.value;
  const rooms = getSelectedValues('rooms');
  const start = selectors.startTime.value;
  const end = selectors.endTime.value;
  const name = selectors.bookerName.value.trim();
  const attendees = Number.parseInt(selectors.attendees.value, 10) || 0;
  const layouts = getSelectedValues('layouts');
  const services = getSelectedValues('services');
  const notes = selectors.notes.value.trim();

  if (!date) {
    showToast('Please choose a booking date.');
    return;
  }

  if (!rooms.length) {
    showToast('Select at least one room to continue.');
    return;
  }

  if (!start || !end) {
    showToast('Please select both a start and end time.');
    return;
  }

  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  if (endMinutes <= startMinutes) {
    showToast('The end time must be after the start time.');
    return;
  }

  if (endMinutes - startMinutes < HALF_HOUR) {
    showToast('Bookings must be at least 30 minutes long.');
    return;
  }

  const payload = {
    date,
    rooms,
    start,
    end,
    name,
    attendees,
    layouts,
    services,
    notes
  };

  state.isSaving = true;
  selectors.saveBooking.disabled = true;
  selectors.saveBooking.textContent = state.editingId ? 'Saving…' : 'Saving…';

  try {
    const url = state.editingId ? `${API_BASE}/${state.editingId}` : API_BASE;
    const method = state.editingId ? 'PUT' : 'POST';
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.status === 409) {
      const body = await response.json().catch(() => ({}));
      showToast(body.message || 'This time overlaps with another booking.');
      return;
    }

    if (!response.ok) {
      throw new Error(`Unable to save booking (${response.status})`);
    }

    showToast(state.editingId ? 'Booking updated' : 'Booking added');
    closeModal();
    await fetchBookings();
  } catch (error) {
    console.error(error);
    showToast('Unable to save booking right now.');
  } finally {
    state.isSaving = false;
    selectors.saveBooking.disabled = false;
    selectors.saveBooking.textContent = state.editingId ? 'Update booking' : 'Save booking';
  }
}

async function deleteCurrentBooking() {
  if (!state.editingId) {
    return;
  }
  const confirmDelete = window.confirm('Delete this booking?');
  if (!confirmDelete) {
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/${state.editingId}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Failed to delete booking (${response.status})`);
    }
    showToast('Booking removed');
    closeModal();
    await fetchBookings();
  } catch (error) {
    console.error(error);
    showToast('Unable to delete booking right now.');
  }
}

function startEditing(bookingId) {
  const booking = state.bookings.find((entry) => entry.id === bookingId);
  if (!booking) {
    return;
  }

  resetFormFields();
  state.editingId = bookingId;
  state.selection = null;
  selectors.formTitle.textContent = 'Edit booking';
  selectors.saveBooking.textContent = 'Update booking';
  selectors.editActions.hidden = false;
  selectors.bookingId.value = bookingId;

  selectors.bookingDate.value = booking.date;
  selectors.bookerName.value = booking.name;
  selectors.attendees.value = booking.attendees;
  selectors.startTime.value = booking.start;
  selectors.endTime.value = booking.end;
  selectors.notes.value = booking.notes ?? '';
  setCheckedValues('rooms', booking.rooms);
  setCheckedValues('layouts', booking.layouts);
  setCheckedValues('services', booking.services);

  openModal();
  renderTimeline();
}

function changeDay(delta) {
  const date = new Date(state.selectedDate);
  date.setDate(date.getDate() + delta);
  state.selectedDate = startOfDay(date);
  selectors.bookingDate.value = toISODate(state.selectedDate);

  if (state.selectedDate.getMonth() !== state.miniMonth.getMonth() || state.selectedDate.getFullYear() !== state.miniMonth.getFullYear()) {
    state.miniMonth = startOfMonth(state.selectedDate);
    renderMiniCalendar();
  }

  renderSelectedDate();
  fetchBookings();
}

function handleKeydown(event) {
  if (event.key === 'Escape' && selectors.bookingModal.getAttribute('aria-hidden') === 'false') {
    closeModal();
  }
}

function attachModalCloseHandlers() {
  selectors.modalCloseButtons.forEach((button) => {
    button.addEventListener('click', closeModal);
  });
}

function attachSelectionListeners() {
  selectors.roomOptions.addEventListener('change', syncSelectionFromForm);
  ['change', 'input'].forEach((eventName) => {
    selectors.startTime.addEventListener(eventName, syncSelectionFromForm);
    selectors.endTime.addEventListener(eventName, syncSelectionFromForm);
    selectors.bookingDate.addEventListener(eventName, syncSelectionFromForm);
    selectors.bookerName.addEventListener(eventName, syncSelectionFromForm);
    selectors.attendees.addEventListener(eventName, syncSelectionFromForm);
  });
}

function init() {
  populateRooms();
  populateOptionGrid(selectors.layoutOptions, LAYOUT_OPTIONS, 'layouts');
  populateOptionGrid(selectors.serviceOptions, SERVICE_OPTIONS, 'services');

  selectors.bookingDate.value = toISODate(state.selectedDate);
  selectors.startTime.value = '09:00';
  selectors.endTime.value = '10:00';

  renderSelectedDate();
  renderMiniCalendar();
  fetchBookings();

  selectors.prevMonth.addEventListener('click', () => {
    const month = new Date(state.miniMonth);
    month.setMonth(month.getMonth() - 1);
    state.miniMonth = startOfMonth(month);
    renderMiniCalendar();
  });

  selectors.nextMonth.addEventListener('click', () => {
    const month = new Date(state.miniMonth);
    month.setMonth(month.getMonth() + 1);
    state.miniMonth = startOfMonth(month);
    renderMiniCalendar();
  });

  selectors.prevDay.addEventListener('click', () => changeDay(-1));
  selectors.nextDay.addEventListener('click', () => changeDay(1));
  selectors.todayButton.addEventListener('click', () => {
    state.selectedDate = startOfDay(new Date());
    state.miniMonth = startOfMonth(state.selectedDate);
    selectors.bookingDate.value = toISODate(state.selectedDate);
    renderSelectedDate();
    renderMiniCalendar();
    fetchBookings();
  });

  selectors.form.addEventListener('submit', handleFormSubmit);
  selectors.cancelButton.addEventListener('click', closeModal);
  selectors.deleteBooking.addEventListener('click', deleteCurrentBooking);

  attachModalCloseHandlers();
  attachSelectionListeners();
  document.addEventListener('keydown', handleKeydown);
}

init();
