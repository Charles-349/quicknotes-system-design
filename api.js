const API_URL = "https://jsonplaceholder.typicode.com/posts";

async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return { data: await response.json(), status: response.status };
}

const loadButton = document.querySelector("#load-btn");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");
const statusMessage = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = type;
}

function createNoteElement(note) {
  const item = document.createElement("li");
  const title = document.createElement("h2");
  const body = document.createElement("p");
  const deleteButton = document.createElement("button");

  title.textContent = note.title;
  body.textContent = note.body;
  deleteButton.textContent = "Delete";
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () =>
    deleteNote(note.id, item, deleteButton),
  );
  item.append(title, body, deleteButton);
  return item;
}

function renderNotes(notes) {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.textContent = "No notes found.";
    notesList.append(emptyMessage);
    return;
  }

  for (const note of notes) {
    notesList.append(createNoteElement(note));
  }
}

async function loadNotes() {
  loadButton.disabled = true;
  setStatus("Loading notes...");
  notesList.replaceChildren();

  try {
    const { data: notes } = await request(`${API_URL}?_limit=10`);
    renderNotes(notes);
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch {
    setStatus("Sorry, we couldn't load notes. Please try again.", "error");
  } finally {
    loadButton.disabled = false;
  }
}

async function deleteNote(noteId, item, deleteButton) {
  deleteButton.disabled = true;
  setStatus("Deleting note...");

  try {
    await request(`${API_URL}/${noteId}`, { method: "DELETE" });

    // JSONPlaceholder simulates DELETE; remove locally and let a later GET show the sample data again.
    item.remove();
    if (notesList.children.length === 0) {
      const emptyMessage = document.createElement("li");
      emptyMessage.textContent = "No notes found.";
      notesList.append(emptyMessage);
    }
    setStatus("Note deleted.", "success");
  } catch {
    setStatus("Sorry, we couldn't delete this note. Please try again.", "error");
  } finally {
    deleteButton.disabled = false;
  }
}

async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value;

  if (!title) {
    titleInput.setCustomValidity("Please enter a title.");
    titleInput.reportValidity();
    return;
  }

  titleInput.setCustomValidity("");
  if (title.length > 100) {
    titleInput.setCustomValidity("Title must be 100 characters or fewer.");
    titleInput.reportValidity();
    return;
  }

  submitButton.disabled = true;
  setStatus("Creating note...");

  try {
    const { data: note, status } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });

    const emptyMessage = notesList.querySelector("li");
    if (emptyMessage?.textContent === "No notes found.") {
      notesList.replaceChildren();
    }
    notesList.prepend(createNoteElement(note));
    noteForm.reset();
    setStatus(`Note created (status ${status}, id ${note.id}).`, "success");
  } catch {
    setStatus("Sorry, we couldn't create your note. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
