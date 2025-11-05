const form = document.querySelector("#booking-form");
const calendarList = document.querySelector("#calendar-list");
const detailsContainer = document.querySelector("#booking-details-content");
const template = document.querySelector("#booking-template");
const feedback = document.querySelector(".form-feedback");

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

function createCalendarItem(booking) {
  const item = document.createElement("li");
  item.className = "calendar-list__item";

  const title = document.createElement("h3");
  title.textContent = booking.name;

  const time = document.createElement("time");
  time.dateTime = `${booking.date} ${booking.start}`;
  time.textContent = formatTimeRange(booking.date, booking.start, booking.end);

  item.append(title, time);
  return item;
}

function createDetailCard(booking) {
  const card = template.content.firstElementChild.cloneNode(true);
  const titleEl = card.querySelector(".booking__title");
  const timeEl = card.querySelector(".booking__time");
  const notesEl = card.querySelector(".booking__notes");

  titleEl.textContent = booking.name;
  timeEl.textContent = formatTimeRange(booking.date, booking.start, booking.end);
  notesEl.textContent = booking.notes || "No additional notes";

  return card;
}

function render() {
  calendarList.replaceChildren(...bookings.map(createCalendarItem));
  detailsContainer.replaceChildren(...bookings.map(createDetailCard));

  if (!bookings.length) {
    detailsContainer.innerHTML = "<p class=\"booking__notes\">No bookings yet. Add a room hire to see the details here.</p>";
  }
}

function validateTimes(start, end) {
  return start < end;
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  const booking = {
    name: formData.get("name").trim(),
    date: formData.get("date"),
    start: formData.get("start"),
    end: formData.get("end"),
    notes: formData.get("notes").trim(),
  };

  if (!validateTimes(booking.start, booking.end)) {
    feedback.textContent = "End time must be after the start time.";
    feedback.style.color = "#dc2626";
    return;
  }

  bookings.push(booking);
  render();

  feedback.textContent = `Booked ${booking.name} on ${booking.date}`;
  feedback.style.color = "#059669";

  form.reset();
  const nameField = form.querySelector("input[name='name']");
  nameField?.focus();
});

render();
