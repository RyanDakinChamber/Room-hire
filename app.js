const form = document.querySelector('#booking-form');
const calendarGrid = document.querySelector('[data-calendar-grid]');
const detailsContainer = document.querySelector('#booking-details-content');
const template = document.querySelector('#booking-template');
const feedback = document.querySelector('.form-feedback');
const modal = document.querySelector('[data-modal]');
const openModalButton = document.querySelector('[data-modal-open]');
const closeModalButton = document.querySelector('[data-modal-close]');
const modalOverlay = modal?.querySelector('[data-modal-overlay]');
const refreshmentsToggle = form?.querySelector("input[name='refreshments']");
const lunchToggle = form?.querySelector("input[name='lunch']");
const refreshmentsDetails = form?.querySelector("[data-extra='refreshments']");
const lunchDetails = form?.querySelector("[data-extra='lunch']");
const viewDateInput = document.querySelector('[data-view-date]');
const goTodayButton = document.querySelector('[data-go-today]');
const summaryList = document.querySelector('[data-summary]');
const summaryEmpty = document.querySelector('[data-summary-empty]');

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

const ROOMS = ['Boardroom', 'Conference Suite', 'Studio', 'Training Room'];
const START_TIME_MINUTES = 8 * 60;
const END_TIME_MINUTES = 20 * 60;
const SLOT_MINUTES = 30;

const bookings = [];

const state = {
  viewDate: formatDateInput(new Date()),
};

let lastFocusedElement = null;

function formatDateInput(date) {
  const tzOffset = date.getTimezoneOffset();
  const safeDate = new Date(date.getTime() - tzOffset * 60_000);
  return safeDate.toISOString().slice(0, 10);
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
      return true;
    }

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function isModalOpen() {
  return Boolean(modal && !modal.hasAttribute('hidden'));
}

function openModal() {
  if (!modal || isModalOpen()) return;
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('has-open-modal');

  if (feedback) {
    feedback.textContent = '';
    feedback.style.color = '';
  }

  requestAnimationFrame(() => {
    const firstField = form?.querySelector("input[name='company']");
    firstField?.focus({ preventScroll: true });
  });
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('has-open-modal');

  if (form) {
    form.reset();
  }

  if (feedback) {
    feedback.textContent = '';
    feedback.style.color = '';
  }

  toggleExtraField(refreshmentsToggle, refreshmentsDetails);
  toggleExtraField(lunchToggle, lunchDetails);

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

openModalButton?.addEventListener('click', openModal);
closeModalButton?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', closeModal);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isModalOpen()) {
    event.preventDefault();
    closeModal();
  }

  if (event.key === 'Tab' && isModalOpen()) {
    const focusableElements = getFocusableElements(modal);
    if (!focusableElements.length) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const isShiftTab = event.shiftKey;
    const activeElement = document.activeElement;

    if (isShiftTab) {
      if (!modal.contains(activeElement) || activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      return;
    }

    if (activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function parseTime(value) {
  if (!value) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function minutesToLabel(minutes) {
  if (minutes == null) return '';
  const base = new Date('1970-01-01T00:00:00');
  base.setMinutes(minutes);
  return timeFormatter.format(base);
}

function formatTimeRange(start, end) {
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  if (startMinutes == null || endMinutes == null) return '';
  const startLabel = minutesToLabel(startMinutes);
  const endLabel = minutesToLabel(endMinutes);
  return `${startLabel} – ${endLabel}`;
}

function createTimeSlots() {
  const slots = [];
  for (let time = START_TIME_MINUTES; time < END_TIME_MINUTES; time += SLOT_MINUTES) {
    slots.push({
      minutes: time,
      label: minutesToLabel(time),
    });
  }
  return slots;
}

const TIME_SLOTS = createTimeSlots();

function minutesToIndex(minutes, { roundUp = false } = {}) {
  if (minutes == null) return null;
  if (minutes < START_TIME_MINUTES || minutes > END_TIME_MINUTES) return null;
  const offset = minutes - START_TIME_MINUTES;
  const value = offset / SLOT_MINUTES;
  return roundUp ? Math.ceil(value) : Math.floor(value);
}

function toggleExtraField(checkbox, field) {
  if (!field) return;
  const isVisible = checkbox?.checked;
  field.hidden = !isVisible;
  if (!isVisible) {
    const textarea = field.querySelector('textarea');
    if (textarea) textarea.value = '';
  }
}

refreshmentsToggle?.addEventListener('change', () => {
  toggleExtraField(refreshmentsToggle, refreshmentsDetails);
});

lunchToggle?.addEventListener('change', () => {
  toggleExtraField(lunchToggle, lunchDetails);
});

function buildCalendarGrid() {
  if (!calendarGrid) return;
  calendarGrid.innerHTML = '';
  calendarGrid.style.setProperty('--room-count', ROOMS.length.toString());
  calendarGrid.style.setProperty('--slot-count', TIME_SLOTS.length.toString());
  calendarGrid.setAttribute('aria-rowcount', (TIME_SLOTS.length + 1).toString());
  calendarGrid.setAttribute('aria-colcount', (ROOMS.length + 1).toString());

  const corner = document.createElement('div');
  corner.className = 'calendar-grid__corner';
  corner.textContent = 'Time';
  corner.setAttribute('role', 'columnheader');
  calendarGrid.append(corner);

  ROOMS.forEach((room, index) => {
    const header = document.createElement('div');
    header.className = 'calendar-grid__room';
    header.textContent = room;
    header.style.gridColumn = (index + 2).toString();
    header.style.gridRow = '1';
    header.setAttribute('role', 'columnheader');
    calendarGrid.append(header);
  });

  TIME_SLOTS.forEach((slot, rowIndex) => {
    const timeCell = document.createElement('div');
    timeCell.className = 'calendar-grid__time';
    timeCell.textContent = slot.label;
    timeCell.style.gridColumn = '1';
    timeCell.style.gridRow = (rowIndex + 2).toString();
    timeCell.setAttribute('role', 'rowheader');
    calendarGrid.append(timeCell);

    ROOMS.forEach((_, columnIndex) => {
      const cell = document.createElement('div');
      cell.className = 'calendar-grid__cell';
      cell.style.gridColumn = (columnIndex + 2).toString();
      cell.style.gridRow = (rowIndex + 2).toString();
      cell.setAttribute('role', 'gridcell');
      calendarGrid.append(cell);
    });
  });
}

function formatDetailDate(date, start, end) {
  const base = new Date(`${date}T00:00`);
  return `${dateFormatter.format(base)} • ${formatTimeRange(start, end)}`;
}

function createDetailCard(booking) {
  const card = template.content.firstElementChild.cloneNode(true);
  const titleEl = card.querySelector('.booking__title');
  const timeEl = card.querySelector('.booking__time');
  const notesEl = card.querySelector('.booking__notes');
  const roomEl = card.querySelector('[data-meta="room"]');
  const contactEl = card.querySelector('[data-meta="contact"]');
  const setupEl = card.querySelector('[data-meta="setup"]');
  const refreshmentsEl = card.querySelector('[data-meta="refreshments"]');
  const lunchEl = card.querySelector('[data-meta="lunch"]');

  titleEl.textContent = booking.company;
  timeEl.textContent = formatDetailDate(booking.date, booking.start, booking.end);
  roomEl.textContent = booking.room;

  if (contactEl) {
    if (booking.contact || booking.email) {
      const contactDetails = [booking.contact, booking.email].filter(Boolean).join(' • ');
      contactEl.hidden = false;
      contactEl.querySelector('dd').textContent = contactDetails;
    } else {
      contactEl.hidden = true;
      contactEl.querySelector('dd').textContent = '';
    }
  }
  setupEl.textContent = booking.setup;

  if (booking.refreshments) {
    const valueEl = refreshmentsEl.querySelector('dd');
    valueEl.textContent = booking.refreshmentsDetails || 'Requested';
    refreshmentsEl.hidden = false;
  } else {
    refreshmentsEl.hidden = true;
  }

  if (booking.lunch) {
    const valueEl = lunchEl.querySelector('dd');
    valueEl.textContent = booking.lunchDetails || 'Requested';
    lunchEl.hidden = false;
  } else {
    lunchEl.hidden = true;
  }

  notesEl.textContent = booking.notes || 'No additional notes';
  return card;
}

function renderDetails() {
  if (!detailsContainer) return;
  if (!bookings.length) {
    detailsContainer.innerHTML = '<p class="empty-state">No bookings yet. Add a reservation to see the details here.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  bookings
    .slice()
    .sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      return parseTime(a.start) - parseTime(b.start);
    })
    .forEach((booking) => {
      fragment.append(createDetailCard(booking));
    });

  detailsContainer.replaceChildren(fragment);
}

function renderSummary(dayBookings) {
  if (!summaryList) return;
  summaryList.innerHTML = '';

  if (!dayBookings.length) {
    if (summaryEmpty) {
      summaryEmpty.hidden = false;
    }
    summaryList.hidden = true;
    return;
  }

  if (summaryEmpty) {
    summaryEmpty.hidden = true;
  }
  summaryList.hidden = false;

  const totalMinutes = dayBookings.reduce((minutes, booking) => {
    return minutes + (parseTime(booking.end) - parseTime(booking.start));
  }, 0);

  const roomsUsed = new Set(dayBookings.map((booking) => booking.room));

  const entries = [
    ['Bookings', `${dayBookings.length}`],
    ['Rooms in use', `${roomsUsed.size} / ${ROOMS.length}`],
    ['Total hours', `${(totalMinutes / 60).toFixed(1)} hrs`],
  ];

  entries.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    summaryList.append(dt, dd);
  });
}

function renderCalendar() {
  if (!calendarGrid) return;
  calendarGrid.querySelectorAll('.calendar-booking').forEach((element) => element.remove());

  const dayBookings = bookings
    .filter((booking) => booking.date === state.viewDate)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));

  dayBookings.forEach((booking) => {
    const startMinutes = parseTime(booking.start);
    const endMinutes = parseTime(booking.end);
    const columnIndex = ROOMS.indexOf(booking.room);

    const startIndex = minutesToIndex(startMinutes);
    const endIndex = minutesToIndex(endMinutes, { roundUp: true });

    if (columnIndex === -1 || startIndex == null || endIndex == null || endIndex <= startIndex) {
      return;
    }

    const bookingEl = document.createElement('div');
    bookingEl.className = 'calendar-booking';
    bookingEl.style.gridColumn = (columnIndex + 2).toString();
    bookingEl.style.gridRow = `${startIndex + 2} / ${endIndex + 2}`;
    bookingEl.innerHTML = `
      <span class="calendar-booking__time">${formatTimeRange(booking.start, booking.end)}</span>
      <span class="calendar-booking__company">${booking.company}</span>
    `;
    bookingEl.setAttribute('role', 'note');
    bookingEl.setAttribute(
      'aria-label',
      `${booking.company} in the ${booking.room} from ${formatTimeRange(booking.start, booking.end)}`,
    );
    calendarGrid.append(bookingEl);
  });

  renderSummary(dayBookings);
}

function renderAll() {
  renderCalendar();
  renderDetails();
}

function validateTimes(start, end) {
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  if (startMinutes == null || endMinutes == null) {
    return { valid: false, message: 'Please provide a valid start and end time.' };
  }

  if (startMinutes < START_TIME_MINUTES || endMinutes > END_TIME_MINUTES) {
    return { valid: false, message: 'Bookings must be between 08:00 and 20:00.' };
  }

  if (endMinutes <= startMinutes) {
    return { valid: false, message: 'End time must be after the start time.' };
  }

  return { valid: true };
}

function hasClash(newBooking) {
  return bookings.some((existing) => {
    if (existing.date !== newBooking.date || existing.room !== newBooking.room) {
      return false;
    }
    const newStart = parseTime(newBooking.start);
    const newEnd = parseTime(newBooking.end);
    const existingStart = parseTime(existing.start);
    const existingEnd = parseTime(existing.end);
    return newStart < existingEnd && newEnd > existingStart;
  });
}

function showFeedback(message, tone = 'neutral') {
  if (!feedback) return;
  feedback.textContent = message;
  const toneColours = {
    neutral: '',
    success: '#059669',
    error: '#dc2626',
  };
  feedback.style.color = toneColours[tone] ?? '';
}

function handleSubmit(event) {
  event.preventDefault();
  if (!form) return;

  const formData = new FormData(form);
  const booking = {
    company: (formData.get('company') ?? '').toString().trim(),
    contact: (formData.get('contact') ?? '').toString().trim(),
    email: (formData.get('email') ?? '').toString().trim(),
    room: (formData.get('room') ?? '').toString().trim(),
    date: formData.get('date'),
    start: formData.get('start'),
    end: formData.get('end'),
    setup: (formData.get('setup') ?? '').toString().trim(),
    notes: (formData.get('notes') ?? '').toString().trim(),
    refreshments: formData.get('refreshments') === 'yes',
    lunch: formData.get('lunch') === 'yes',
    refreshmentsDetails: (formData.get('refreshmentsDetails') ?? '').toString().trim(),
    lunchDetails: (formData.get('lunchDetails') ?? '').toString().trim(),
  };

  const { valid, message } = validateTimes(booking.start, booking.end);
  if (!valid) {
    showFeedback(message ?? 'There was a problem with the times provided.', 'error');
    return;
  }

  if (hasClash(booking)) {
    showFeedback(`The ${booking.room} is already booked during that time.`, 'error');
    return;
  }

  bookings.push(booking);
  bookings.sort((a, b) => {
    const dateDiff = new Date(a.date) - new Date(b.date);
    if (dateDiff !== 0) return dateDiff;
    return parseTime(a.start) - parseTime(b.start);
  });

  if (state.viewDate !== booking.date) {
    state.viewDate = booking.date;
    if (viewDateInput) {
      viewDateInput.value = state.viewDate;
    }
  }

  renderAll();
  showFeedback(`Booked ${booking.company} in the ${booking.room} on ${booking.date}.`, 'success');

  form.reset();
  toggleExtraField(refreshmentsToggle, refreshmentsDetails);
  toggleExtraField(lunchToggle, lunchDetails);
  const companyField = form.querySelector("input[name='company']");
  companyField?.focus();
}

function handleViewDateChange(event) {
  const value = event.target.value;
  if (!value) return;
  state.viewDate = value;
  renderCalendar();
}

function goToToday() {
  state.viewDate = formatDateInput(new Date());
  if (viewDateInput) {
    viewDateInput.value = state.viewDate;
  }
  renderCalendar();
}

form?.addEventListener('submit', handleSubmit);
viewDateInput?.addEventListener('change', handleViewDateChange);
goTodayButton?.addEventListener('click', goToToday);

toggleExtraField(refreshmentsToggle, refreshmentsDetails);
toggleExtraField(lunchToggle, lunchDetails);

if (viewDateInput) {
  viewDateInput.value = state.viewDate;
}

buildCalendarGrid();
renderAll();
