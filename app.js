const rooms = [
  "Room 1",
  "Room 2",
  "Room 3",
  "Room 4",
  "Boardroom",
  "Chamber Pod",
  "Members Lounge Room"
];

const SLOT_INTERVAL = 30; // minutes
const START_TIME = 8 * 60; // 08:00
const END_TIME = 20 * 60; // 20:00

const calendarEl = document.querySelector("[data-calendar]");
const activityEl = document.querySelector("[data-activity]");
const dateInput = document.querySelector("[data-view-date]");
const todayButton = document.querySelector("[data-go-today]");
const openFormButtons = document.querySelectorAll("[data-open-form]");
const modalEl = document.querySelector("[data-modal]");
const modalOverlay = document.querySelector("[data-modal-overlay]");
const closeModalButtons = document.querySelectorAll("[data-modal-close]");
const bookingForm = document.getElementById("booking-form");
const formErrorEl = bookingForm.querySelector("[data-form-error]");

let bookings = [];
let viewDate = formatDateInput(new Date());
let slots = generateSlots();
let lastFocusedElement = null;
let focusTrapHandler = null;

init();

function init() {
  setDateInput(viewDate);
  bindEvents();
  render();
}

function bindEvents() {
  dateInput.addEventListener("change", handleDateChange);
  todayButton.addEventListener("click", () => {
    viewDate = formatDateInput(new Date());
    setDateInput(viewDate);
    render();
  });

  openFormButtons.forEach((button) => button.addEventListener("click", openModal));
  closeModalButtons.forEach((button) => button.addEventListener("click", closeModal));
  modalOverlay.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalEl.hasAttribute("hidden")) {
      closeModal();
    }
  });

  bookingForm.addEventListener("submit", handleFormSubmit);
}

function normaliseSelectedRooms(selectedRooms) {
  const unique = new Set(selectedRooms);
  return rooms.filter((room) => unique.has(room));
}

function handleDateChange(event) {
  if (!event.target.value) return;
  viewDate = event.target.value;
  render();
}

function handleFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(bookingForm);
  const booking = buildBookingFromForm(formData);
  if (!booking) return;

  const clash = bookings.some((item) => {
    if (item.date !== booking.date) return false;
    const roomOverlap = item.rooms.some((room) => booking.rooms.includes(room));
    if (!roomOverlap) return false;
    return !(booking.endMinutes <= item.startMinutes || booking.startMinutes >= item.endMinutes);
  });

  if (clash) {
    displayFormError("One of the selected rooms is already booked during that time.");
    return;
  }

  bookings.push(booking);
  bookings.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    const aRoomIndex = rooms.indexOf(a.rooms[0]);
    const bRoomIndex = rooms.indexOf(b.rooms[0]);
    return aRoomIndex - bRoomIndex;
  });
  clearForm();
  closeModal();
  render();
}

function buildBookingFromForm(formData) {
  const company = formData.get("company").trim();
  const selectedRooms = normaliseSelectedRooms(formData.getAll("rooms"));
  const date = formData.get("date");
  const start = formData.get("start");
  const end = formData.get("end");

  if (!company || !selectedRooms.length || !date || !start || !end) {
    displayFormError("Please complete the required fields.");
    return null;
  }

  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  if (endMinutes <= startMinutes) {
    displayFormError("End time must be after the start time.");
    return null;
  }

  if (startMinutes < START_TIME || endMinutes > END_TIME) {
    displayFormError("Bookings must fall between 08:00 and 20:00.");
    return null;
  }

  formErrorEl.hidden = true;

  return {
    id: createId(),
    company,
    contact: formData.get("contact").trim(),
    email: formData.get("email").trim(),
    rooms: selectedRooms,
    date,
    start,
    end,
    startMinutes,
    endMinutes,
    setup: formData.get("setup") || "",
    refreshmentsNotes: formData.get("refreshmentsNotes").trim(),
    lunchNotes: formData.get("lunchNotes").trim(),
    notes: formData.get("notes").trim()
  };
}

function render() {
  renderCalendar();
  renderActivity();
}

function renderCalendar() {
  calendarEl.innerHTML = "";
  calendarEl.style.setProperty("--room-count", rooms.length);
  calendarEl.style.setProperty("--slot-count", slots.length);

  const timeHeader = document.createElement("div");
  timeHeader.className = "calendar__cell calendar__cell--corner";
  timeHeader.setAttribute("role", "columnheader");
  timeHeader.textContent = "Time";
  calendarEl.appendChild(timeHeader);

  rooms.forEach((room) => {
    const headerCell = document.createElement("div");
    headerCell.className = "calendar__cell calendar__cell--header";
    headerCell.setAttribute("role", "columnheader");
    headerCell.textContent = room;
    calendarEl.appendChild(headerCell);
  });

  slots.forEach((slot) => {
    const timeCell = document.createElement("div");
    timeCell.className = "calendar__cell calendar__cell--time";
    timeCell.setAttribute("role", "rowheader");
    timeCell.textContent = formatTimeLabel(slot.minutes);
    if (slot.minutes % 60 !== 0) {
      timeCell.classList.add("calendar__cell--time-minor");
    }
    calendarEl.appendChild(timeCell);

    rooms.forEach((room) => {
      const cell = document.createElement("div");
      cell.className = "calendar__cell calendar__cell--slot";
      cell.setAttribute("role", "gridcell");
      cell.dataset.room = room;
      cell.dataset.slot = slot.index;
      calendarEl.appendChild(cell);
    });
  });

  const dayBookings = bookings
    .filter((booking) => booking.date === viewDate)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  dayBookings.forEach((booking) => {
    booking.rooms.forEach((room) => {
      const bookingEl = document.createElement("div");
      bookingEl.className = "calendar-booking";

      const roomIndex = rooms.indexOf(room);
      if (roomIndex === -1) return;
      const startRow = 2 + Math.floor((booking.startMinutes - START_TIME) / SLOT_INTERVAL);
      const endRow = 2 + Math.ceil((booking.endMinutes - START_TIME) / SLOT_INTERVAL);
      const columnStart = 2 + roomIndex;

      bookingEl.style.gridRow = `${startRow} / ${endRow}`;
      bookingEl.style.gridColumn = `${columnStart} / ${columnStart + 1}`;

      bookingEl.innerHTML = `
        <span class="calendar-booking__time">${formatRange(booking.start, booking.end)}</span>
        <span class="calendar-booking__company">${booking.company}</span>
      `;

      bookingEl.setAttribute(
        "aria-label",
        `${booking.company} in ${room} from ${formatRange(booking.start, booking.end)}`
      );

      calendarEl.appendChild(bookingEl);
    });
  });
}

function renderActivity() {
  activityEl.innerHTML = "";
  const template = document.getElementById("activity-template");

  const dayBookings = bookings
    .filter((booking) => booking.date === viewDate)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (dayBookings.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No bookings yet for this day.";
    activityEl.appendChild(empty);
    return;
  }

  dayBookings.forEach((booking) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".activity-card__title").textContent = booking.company;
    card.querySelector(".activity-card__time").textContent = `${formatRange(booking.start, booking.end)} · ${
      booking.rooms.join(", ")
    }`;

    const metaList = card.querySelector(".activity-card__meta");
    metaList.innerHTML = "";
    appendMeta(metaList, "Setup", booking.setup || "Not specified");
    if (booking.contact) {
      appendMeta(metaList, "Contact", booking.contact);
    }
    if (booking.email) {
      appendMeta(metaList, "Email", booking.email);
    }
    if (booking.refreshmentsNotes) {
      appendMeta(metaList, "Refreshments", booking.refreshmentsNotes);
    }
    if (booking.lunchNotes) {
      appendMeta(metaList, "Lunch", booking.lunchNotes);
    }

    const notesEl = card.querySelector(".activity-card__notes");
    if (booking.notes) {
      notesEl.hidden = false;
      notesEl.textContent = booking.notes;
    } else {
      notesEl.hidden = true;
    }

    activityEl.appendChild(card);
  });
}

function appendMeta(list, label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const detail = document.createElement("dd");
  detail.textContent = value;
  list.append(term, detail);
}

function openModal() {
  lastFocusedElement = document.activeElement;
  modalEl.hidden = false;
  modalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");
  bookingForm.reset();
  formErrorEl.hidden = true;
  const dateField = bookingForm.querySelector("#date");
  if (dateField) {
    dateField.value = viewDate;
  }
  const focusTarget = bookingForm.querySelector("input, select, textarea, button");
  if (focusTarget) focusTarget.focus();
  trapFocus();
}

function closeModal() {
  if (modalEl.hasAttribute("hidden")) return;
  modalEl.hidden = true;
  modalEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-modal-open");
  releaseFocusTrap();
  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

function trapFocus() {
  const focusableSelectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ];

  const focusable = modalEl.querySelectorAll(focusableSelectors.join(","));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  focusTrapHandler = function (event) {
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  modalEl.addEventListener("keydown", focusTrapHandler);
}

function releaseFocusTrap() {
  if (focusTrapHandler) {
    modalEl.removeEventListener("keydown", focusTrapHandler);
    focusTrapHandler = null;
  }
}

function clearForm() {
  bookingForm.reset();
  formErrorEl.hidden = true;
}

function displayFormError(message) {
  formErrorEl.hidden = false;
  formErrorEl.textContent = message;
}

function setDateInput(value) {
  dateInput.value = value;
  const dateField = bookingForm.querySelector("#date");
  if (dateField) {
    dateField.value = value;
  }
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateSlots() {
  const result = [];
  let minutes = START_TIME;
  let index = 0;
  while (minutes < END_TIME) {
    result.push({ minutes, index });
    minutes += SLOT_INTERVAL;
    index += 1;
  }
  return result;
}

function toMinutes(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatRange(start, end) {
  return `${start} – ${end}`;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
