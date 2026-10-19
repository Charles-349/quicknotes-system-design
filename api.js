const API_URL = "https://jsonplaceholder.typicode.com/posts";

async function request(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

const loadButton = document.querySelector("#load-btn");
const statusMessage = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = type;
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
    const item = document.createElement("li");
    const title = document.createElement("h2");
    const body = document.createElement("p");

    title.textContent = note.title;
    body.textContent = note.body;
    item.append(title, body);
    notesList.append(item);
  }
}

async function loadNotes() {
  loadButton.disabled = true;
  setStatus("Loading notes...");
  notesList.replaceChildren();

  try {
    const notes = await request(`${API_URL}?_limit=10`);
    renderNotes(notes);
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch {
    setStatus("Sorry, we couldn't load notes. Please try again.", "error");
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadNotes);
