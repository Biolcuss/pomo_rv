// Logica della to-do list.
// Idea di base: abbiamo una lista di task in memoria (`tasks`).
// Ogni volta che cambia, la salviamo e ridisegniamo la lista a schermo (render).

import { load, save } from './storage.js';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');

// Ogni task è un oggetto: { id, text, done, createdAt }
let tasks = load('tasks', []);
let editingId = null;   // id della task in modifica (null = nessuna)

function saveAndRender() {
  save('tasks', tasks);
  render();
}

// ---------- Disegno della lista ----------

function render() {
  list.innerHTML = '';   // svuota la lista e la ricostruisce da zero

  if (tasks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-message';
    empty.textContent = 'Nessuna task: aggiungine una!';
    list.append(empty);
    return;
  }

  for (const task of tasks) {
    list.append(createTaskElement(task));
  }
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (task.done ? ' done' : '');
  li.dataset.id = task.id;   // ci serve per sapere su quale task si è cliccato

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', 'Completata');
  li.append(checkbox);

  if (task.id === editingId) {
    // Modalità modifica: al posto del testo c'è un campo editabile
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = task.text;
    li.append(editInput);
    setTimeout(() => editInput.focus(), 0);   // dopo che è stato inserito nella pagina
  } else {
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = task.text;   // textContent è sicuro: non interpreta HTML
    li.append(text);

    li.append(createActionButton('edit', '✏️', 'Modifica'));
    li.append(createActionButton('delete', '🗑️', 'Elimina'));
  }

  return li;
}

function createActionButton(action, icon, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button small';
  button.dataset.action = action;
  button.textContent = icon;
  button.setAttribute('aria-label', label);
  return button;
}

// ---------- Azioni sulle task ----------

function addTask(text) {
  tasks.push({
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: Date.now(),
  });
  saveAndRender();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  task.done = !task.done;
  saveAndRender();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveAndRender();
}

// Conferma la modifica. Se il testo è vuoto, mantiene quello vecchio.
function commitEdit(id, newText) {
  if (editingId !== id) return;   // già gestita (evita doppie chiamate)
  editingId = null;
  const text = newText.trim();
  if (text) {
    tasks.find((t) => t.id === id).text = text;
  }
  saveAndRender();
}

function cancelEdit() {
  editingId = null;
  render();
}

// ---------- Eventi ----------

export function initTodo() {
  render();

  // Invio del form: aggiunge una task
  form.addEventListener('submit', (event) => {
    event.preventDefault();   // impedisce il ricaricamento della pagina
    const text = input.value.trim();
    if (!text) return;
    addTask(text);
    input.value = '';
    input.focus();
  });

  // Un solo "ascoltatore" sulla lista gestisce tutte le task (event delegation):
  // le task cambiano di continuo, la lista invece resta sempre la stessa.
  list.addEventListener('change', (event) => {
    if (event.target.type === 'checkbox') {
      toggleTask(event.target.closest('.todo-item').dataset.id);
    }
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.closest('.todo-item').dataset.id;
    if (button.dataset.action === 'delete') {
      deleteTask(id);
    } else if (button.dataset.action === 'edit') {
      editingId = id;
      render();
    }
  });

  // Modifica: Invio conferma, Esc annulla, uscire dal campo conferma
  list.addEventListener('keydown', (event) => {
    if (!event.target.classList.contains('edit-input')) return;
    const id = event.target.closest('.todo-item').dataset.id;
    if (event.key === 'Enter') commitEdit(id, event.target.value);
    if (event.key === 'Escape') cancelEdit();
  });

  list.addEventListener('focusout', (event) => {
    if (!event.target.classList.contains('edit-input')) return;
    const id = event.target.closest('.todo-item').dataset.id;
    commitEdit(id, event.target.value);
  });
}
