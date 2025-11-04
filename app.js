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
  editingId: null
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
  bookingDate: document.getElementById('booking-date'),
  roomOptions: document.getElementById('room-options'),
  layoutOptions: document.getElementById('layout-options'),
  serviceOptions: document.getElementById('service-options'),
  form: document.getElementById('booking-form'),
  bookerName: document.getElementById('booker-name'),
  attendees: document.getElementById('attendees'),
  startTime: document.getElementById('start-time'),
  endTime: document.getElementById('end-time'),
  notes: document.getElementById('notes'),
  bookingId: document.getElementById('booking-id'),
  formTitle: document.getElementById('form-title'),
  editActions: document.getElementById('edit-actions'),
  deleteBooking: document.getElementById('delete-booking'),
  cancelEdit: document.getElementById('cancel-edit'),
  resetForm: document.getElementById('reset-form'),
  saveBooking: document.getElementById('save-booking'),
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
  return date.toISOString().split('T')[0];
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

function loadBookings() {
  try {
    const saved = localStorage.getItem('staffs-room-bookings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map(normaliseBooking);
      }
    }
  } catch (error) {
    console.warn('Unable to load saved bookings', error);
  }
  return [];
}

function normaliseBooking(raw) {
  return {
    id: raw.id ?? generateId(),
    date: raw.date,
    rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
    start: raw.start,
    end: raw.end,
    name: raw.name ?? 'Booking',
    attendees: Number.parseInt(raw.attendees, 10) || 0,
    layouts: Array.isArray(raw.layouts) ? raw.layouts : [],
    services: Array.isArray(raw.services) ? raw.services : [],
    notes: raw.notes ?? ''
  };
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `booking-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function persistBookings() {
  try {
    localStorage.setItem('staffs-room-bookings', JSON.stringify(state.bookings));
  } catch (error) {
    console.warn('Unable to persist bookings', error);
  }
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
      selectors.bookingDate.value = iso;
      renderSelectedDate();
      renderTimeline();
      renderMiniCalendar();
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

  ROOMS.forEach((room) => {
    const label = document.createElement('div');
    label.className = 'room-label';
    const bookingsForRoom = dayBookings.filter((booking) => booking.rooms.includes(room));
    const count = bookingsForRoom.length;
    label.innerHTML = `<span>${room}</span><small>${count ? `${count} booking${count > 1 ? 's' : ''}` : 'No bookings'}</small>`;
    selectors.calendarGrid.appendChild(label);

    const timeline = document.createElement('div');
    timeline.className = 'room-timeline';
    const halfHourSlots = ((DAY_END_MINUTES - DAY_START_MINUTES) / HALF_HOUR);
    timeline.style.backgroundSize = `calc(100% / ${halfHourSlots}) 100%`;

    if (!bookingsForRoom.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'room-empty';
      placeholder.textContent = 'Available';
      timeline.appendChild(placeholder);
    } else {
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

        block.innerHTML = `
          <div class="time">${formatDisplayTime(booking.start)} – ${formatDisplayTime(booking.end)}</div>
          <div class="title">${booking.name}</div>
          <div class="meta">${booking.attendees} attendee${booking.attendees === 1 ? '' : 's'}${booking.layouts.length ? ` • ${booking.layouts.map(capitaliseLabel).join(', ')}` : ''}</div>
        `;

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

      if (!timeline.children.length) {
        const placeholder = document.createElement('div');
        placeholder.className = 'room-empty';
        placeholder.textContent = 'Available';
        timeline.appendChild(placeholder);
      }

      const lanesUsed = Math.max(1, laneHeights.length);
      timeline.style.minHeight = `${lanesUsed * laneSpacingRem + 1.2}rem`;
    }

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

function handleFormSubmit(event) {
  event.preventDefault();

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

  const booking = {
    id: state.editingId ?? generateId(),
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

  const conflict = findConflict(booking);
  if (conflict) {
    showToast(`Conflict with ${conflict.name} in ${conflict.room} (${formatDisplayTime(conflict.booking.start)} – ${formatDisplayTime(conflict.booking.end)})`);
    return;
  }

  if (state.editingId) {
    state.bookings = state.bookings.map((existing) => (existing.id === state.editingId ? booking : existing));
    showToast('Booking updated');
  } else {
    state.bookings.push(booking);
    showToast('Booking added');
  }

  persistBookings();
  clearForm();
  renderTimeline();
}

function findConflict(booking) {
  const bookingStart = toMinutes(booking.start);
  const bookingEnd = toMinutes(booking.end);

  for (const existing of state.bookings) {
    if (existing.id === booking.id) continue;
    if (existing.date !== booking.date) continue;

    const sharedRooms = existing.rooms.filter((room) => booking.rooms.includes(room));
    if (!sharedRooms.length) continue;

    const existingStart = toMinutes(existing.start);
    const existingEnd = toMinutes(existing.end);
    const overlap = bookingStart < existingEnd && bookingEnd > existingStart;
    if (overlap) {
      return { booking: existing, room: sharedRooms[0], name: existing.name };
    }
  }
  return null;
}

function startEditing(bookingId) {
  const booking = state.bookings.find((entry) => entry.id === bookingId);
  if (!booking) return;

  state.editingId = bookingId;
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

  renderTimeline();
  selectors.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setCheckedValues(name, values) {
  const inputs = selectors.form.querySelectorAll(`input[name="${name}"]`);
  inputs.forEach((input) => {
    input.checked = values.includes(input.value);
  });
}

function clearForm() {
  selectors.form.reset();
  state.editingId = null;
  selectors.formTitle.textContent = 'Create a booking';
  selectors.saveBooking.textContent = 'Save booking';
  selectors.editActions.hidden = true;
  selectors.bookingId.value = '';
  selectors.bookingDate.value = toISODate(state.selectedDate);
  renderTimeline();
}

function deleteCurrentBooking() {
  if (!state.editingId) return;
  state.bookings = state.bookings.filter((booking) => booking.id !== state.editingId);
  persistBookings();
  showToast('Booking removed');
  clearForm();
  renderTimeline();
}

function changeDay(delta) {
  const date = new Date(state.selectedDate);
  date.setDate(date.getDate() + delta);
  state.selectedDate = startOfDay(date);
  selectors.bookingDate.value = toISODate(state.selectedDate);

  const currentMonth = state.miniMonth.getMonth();
  if (state.selectedDate.getMonth() !== currentMonth || state.selectedDate.getFullYear() !== state.miniMonth.getFullYear()) {
    state.miniMonth = startOfMonth(state.selectedDate);
  }

  renderSelectedDate();
  renderTimeline();
  renderMiniCalendar();
}

function init() {
  state.bookings = loadBookings();

  populateRooms();
  populateOptionGrid(selectors.layoutOptions, LAYOUT_OPTIONS, 'layouts');
  populateOptionGrid(selectors.serviceOptions, SERVICE_OPTIONS, 'services');

  selectors.bookingDate.value = toISODate(state.selectedDate);
  selectors.startTime.value = '09:00';
  selectors.endTime.value = '10:00';

  renderSelectedDate();
  renderMiniCalendar();
  renderTimeline();

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
    selectors.bookingDate.value = toISODate(state.selectedDate);
    state.miniMonth = startOfMonth(state.selectedDate);
    renderSelectedDate();
    renderTimeline();
    renderMiniCalendar();
  });

  selectors.form.addEventListener('submit', handleFormSubmit);
  selectors.resetForm.addEventListener('click', clearForm);
  selectors.cancelEdit.addEventListener('click', clearForm);
  selectors.deleteBooking.addEventListener('click', deleteCurrentBooking);
}

init();
