const form = document.querySelector("#booking-form");
const calendarGrid = document.querySelector("#calendar-grid");
const detailsContainer = document.querySelector("#booking-details-content");
const template = document.querySelector("#booking-template");
const feedback = document.querySelector(".form-feedback");
const modal = document.querySelector("[data-modal]");
const openModalButton = document.querySelector("[data-modal-open]");
const closeModalButton = document.querySelector("[data-modal-close]");
const modalOverlay = modal?.querySelector("[data-modal-overlay]");
const refreshmentsToggle = form?.querySelector("input[name='refreshments']");
const lunchToggle = form?.querySelector("input[name='lunch']");
const refreshmentsDetails = form?.querySelector("[data-extra='refreshments']");
const lunchDetails = form?.querySelector("[data-extra='lunch']");

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

let lastFocusedElement = null;

function getFocusableElements(container) {
  if (!container) return [];

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.hasAttribute("disabled") || element.getAttribute("aria-hidden") === "true") {
      return false;
    }

    if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
      return true;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function isModalOpen() {
  return Boolean(modal && !modal.hasAttribute("hidden"));
}

function openModal() {
  if (!modal || isModalOpen()) return;

  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-open-modal");

  if (feedback) {
    feedback.textContent = "";
    feedback.style.color = "";
  }

  window.requestAnimationFrame(() => {
    const firstField = form?.querySelector("input[name='company']");
    firstField?.focus({ preventScroll: true });
  });
}

function closeModal() {
  if (!modal) return;

  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-open-modal");

  if (form) {
    form.reset();
  }

  if (feedback) {
    feedback.textContent = "";
    feedback.style.color = "";
  }

  toggleExtraField(refreshmentsToggle, refreshmentsDetails);
  toggleExtraField(lunchToggle, lunchDetails);

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

openModalButton?.addEventListener("click", openModal);
closeModalButton?.addEventListener("click", closeModal);
modalOverlay?.addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isModalOpen()) {
    event.preventDefault();
    closeModal();
  }

  if (event.key === "Tab" && isModalOpen()) {
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

const ROOMS = ["Boardroom", "Conference Suite", "Studio"];
const START_HOUR = 8;
const END_HOUR = 20;
const TIME_SLOTS = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);

const bookings = [];

function formatTimeRange(date, start, end) {
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const startDate = new Date(`${date}T${start}`);
  const endDate = new Date(`${date}T${end}`);

  return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function formatHourBlock(hour) {
  const startDate = new Date(`1970-01-01T${String(hour).padStart(2, "0")}:00`);
  const endDate = new Date(`1970-01-01T${String(hour + 1).padStart(2, "0")}:00`);
  return `${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
}

function formatTimeWindow(start, end) {
  const startDate = new Date(`1970-01-01T${start}`);
  const endDate = new Date(`1970-01-01T${end}`);
  return `${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
}

function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function bookingStartsInHour(booking, hour) {
  const bookingStart = timeToMinutes(booking.start);
  const startHour = Math.floor(bookingStart / 60);
  return startHour === hour;
}

function renderCalendar() {
  if (!calendarGrid) return;

  calendarGrid.innerHTML = "";
  calendarGrid.setAttribute("aria-rowcount", (TIME_SLOTS.length + 1).toString());
  calendarGrid.setAttribute("aria-colcount", (ROOMS.length + 1).toString());

  const headerRow = document.createElement("div");
  headerRow.className = "calendar-grid__row calendar-grid__row--header";
  headerRow.setAttribute("role", "row");

  const cornerCell = document.createElement("div");
  cornerCell.className = "calendar-grid__cell calendar-grid__cell--corner";
  cornerCell.setAttribute("role", "columnheader");
  cornerCell.textContent = "Time";
  headerRow.append(cornerCell);

  ROOMS.forEach((room) => {
    const cell = document.createElement("div");
    cell.className = "calendar-grid__cell calendar-grid__cell--header";
    cell.setAttribute("role", "columnheader");
    cell.textContent = room;
    headerRow.append(cell);
  });

  calendarGrid.append(headerRow);

  TIME_SLOTS.forEach((hour) => {
    const row = document.createElement("div");
    row.className = "calendar-grid__row";
    row.setAttribute("role", "row");

    const timeCell = document.createElement("div");
    timeCell.className = "calendar-grid__cell calendar-grid__cell--time";
    timeCell.setAttribute("role", "rowheader");
    timeCell.textContent = formatHourBlock(hour);
    row.append(timeCell);

    ROOMS.forEach((room) => {
      const slotCell = document.createElement("div");
      slotCell.className = "calendar-grid__cell calendar-grid__cell--slot";
      slotCell.setAttribute("role", "gridcell");

      const slotBookings = bookings.filter(
        (booking) => booking.room === room && bookingStartsInHour(booking, hour),
      );

      slotBookings
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
        .forEach((booking) => {
          const bookingEl = document.createElement("div");
          bookingEl.className = "calendar-grid__booking";
          bookingEl.title = `${booking.date} • ${formatTimeWindow(booking.start, booking.end)}`;

          const timeEl = document.createElement("span");
          timeEl.className = "calendar-grid__booking-time";
          timeEl.textContent = formatTimeWindow(booking.start, booking.end);

          const companyEl = document.createElement("span");
          companyEl.className = "calendar-grid__booking-company";
          companyEl.textContent = booking.company;

          bookingEl.append(timeEl, companyEl);
          slotCell.append(bookingEl);
        });

      row.append(slotCell);
    });

    calendarGrid.append(row);
  });
}

function createDetailCard(booking) {
  const card = template.content.firstElementChild.cloneNode(true);
  const titleEl = card.querySelector(".booking__title");
  const timeEl = card.querySelector(".booking__time");
  const notesEl = card.querySelector(".booking__notes");
  const roomEl = card.querySelector('[data-meta="room"]');
  const setupEl = card.querySelector('[data-meta="setup"]');
  const refreshmentsEl = card.querySelector('[data-meta="refreshments"]');
  const lunchEl = card.querySelector('[data-meta="lunch"]');

  titleEl.textContent = booking.company;
  timeEl.textContent = formatTimeRange(booking.date, booking.start, booking.end);
  roomEl.textContent = booking.room;
  setupEl.textContent = booking.setup;

  if (booking.refreshments) {
    const valueEl = refreshmentsEl.querySelector(".booking__meta-value");
    valueEl.textContent = booking.refreshmentsDetails || "Required";
    refreshmentsEl.hidden = false;
  } else {
    refreshmentsEl.hidden = true;
  }

  if (booking.lunch) {
    const valueEl = lunchEl.querySelector(".booking__meta-value");
    valueEl.textContent = booking.lunchDetails || "Required";
    lunchEl.hidden = false;
  } else {
    lunchEl.hidden = true;
  }

  notesEl.textContent = booking.notes || "No additional notes";

  return card;
}

function render() {
  renderCalendar();
  detailsContainer.replaceChildren(...bookings.map(createDetailCard));

  if (!bookings.length) {
    detailsContainer.innerHTML = "<p class=\"booking__notes\">No bookings yet. Add a room hire to see the details here.</p>";
  }
}

function validateTimes(start, end) {
  return timeToMinutes(start) < timeToMinutes(end);
}

function toggleExtraField(checkbox, field) {
  if (!field) return;
  const isVisible = checkbox?.checked;
  field.hidden = !isVisible;
  if (!isVisible) {
    const textarea = field.querySelector("textarea");
    if (textarea) textarea.value = "";
  }
}

refreshmentsToggle?.addEventListener("change", () => {
  toggleExtraField(refreshmentsToggle, refreshmentsDetails);
});

lunchToggle?.addEventListener("change", () => {
  toggleExtraField(lunchToggle, lunchDetails);
});

toggleExtraField(refreshmentsToggle, refreshmentsDetails);
toggleExtraField(lunchToggle, lunchDetails);

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  const booking = {
    company: (formData.get("company") ?? "").toString().trim(),
    room: (formData.get("room") ?? "").toString().trim(),
    date: formData.get("date"),
    start: formData.get("start"),
    end: formData.get("end"),
    notes: (formData.get("notes") ?? "").toString().trim(),
    setup: (formData.get("setup") ?? "").toString().trim(),
    refreshments: formData.get("refreshments") === "yes",
    lunch: formData.get("lunch") === "yes",
    refreshmentsDetails: (formData.get("refreshmentsDetails") ?? "").toString().trim(),
    lunchDetails: (formData.get("lunchDetails") ?? "").toString().trim(),
  };

  if (!validateTimes(booking.start, booking.end)) {
    feedback.textContent = "End time must be after the start time.";
    feedback.style.color = "#dc2626";
    return;
  }

  bookings.push(booking);
  bookings.sort((a, b) => {
    const dateCompare = new Date(a.date).setHours(0, 0, 0, 0) - new Date(b.date).setHours(0, 0, 0, 0);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });
  render();

  feedback.textContent = `Booked ${booking.company} in the ${booking.room} on ${booking.date}`;
  feedback.style.color = "#059669";

  form.reset();
  const companyField = form.querySelector("input[name='company']");
  companyField?.focus();
  toggleExtraField(refreshmentsToggle, refreshmentsDetails);
  toggleExtraField(lunchToggle, lunchDetails);
});

render();
