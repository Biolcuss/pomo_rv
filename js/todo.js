// Logica della to-do list a kanban.
// Idea di base: abbiamo una lista di task in memoria (`tasks`).
// Ogni volta che cambia, la salviamo e ridisegniamo le colonne a schermo (render).
// La colonna in cui sta una task è decisa dal suo campo `status`.

import { load, save } from './storage.js';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const kanban = document.querySelector('.kanban');

// Le colonne fisse: stato → elemento <ul> della colonna
const STATUSES = ['todo', 'doing', 'done'];
const lists = {};
for (const status of STATUSES) {
  lists[status] = kanban.querySelector(`[data-status="${status}"] .todo-list`);
}

// Ogni task è un oggetto: { id, text, status, createdAt }
let tasks = migrate(load('tasks', []));
let editingId = null;   // id della task in modifica (null = nessuna)
let draggedId = null;   // id della task che si sta trascinando

// Le task salvate nella Tappa 4 avevano `done: true/false` invece di `status`.
// Le convertiamo così non si perde nulla.
function migrate(savedTasks) {
  return savedTasks.map((task) => {
    if (task.status) return task;
    const { done, ...rest } = task;
    return { ...rest, status: done ? 'done' : 'todo' };
  });
}

function saveAndRender() {
  save('tasks', tasks);
  render();
}

// ---------- Disegno delle colonne ----------

function render() {
  for (const status of STATUSES) {
    const columnTasks = tasks.filter((task) => task.status === status);
    lists[status].replaceChildren(...columnTasks.map(createTaskElement));
    // Il numero di task accanto al titolo della colonna
    lists[status].parentElement.querySelector('.column-count').textContent =
      `(${columnTasks.length})`;
  }
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (task.status === 'done' ? ' done' : '');
  li.dataset.id = task.id;   // ci serve per sapere su quale task si è cliccato

  if (task.id === editingId) {
    // Modalità modifica: al posto del testo c'è un campo editabile
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = task.text;
    li.append(editInput);
    setTimeout(() => editInput.focus(), 0);   // dopo che è stato inserito nella pagina
  } else {
    li.draggable = true;   // rende la task trascinabile

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
    status: 'todo',
    createdAt: Date.now(),
  });
  saveAndRender();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveAndRender();
}

// Sposta una task in una colonna, prima della task `beforeId`
// (se beforeId è null va in fondo alla colonna).
function moveTask(id, status, beforeId) {
  const task = tasks.find((t) => t.id === id);
  tasks = tasks.filter((t) => t.id !== id);
  task.status = status;
  const index = beforeId ? tasks.findIndex((t) => t.id === beforeId) : -1;
  if (index === -1) {
    tasks.push(task);
  } else {
    tasks.splice(index, 0, task);
  }
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

// ---------- Drag & drop ----------

// Trova la task davanti a cui inserire quella trascinata, in base alla
// posizione verticale del mouse: la prima task il cui centro sta sotto il mouse.
function getDropTargetId(list, mouseY) {
  const items = [...list.querySelectorAll('.todo-item:not(.dragging)')];
  const target = items.find((item) => {
    const box = item.getBoundingClientRect();
    return mouseY < box.top + box.height / 2;
  });
  return target ? target.dataset.id : null;   // null = in fondo
}

function clearDragHighlights() {
  for (const column of kanban.querySelectorAll('.drag-over')) {
    column.classList.remove('drag-over');
  }
}

function setupDragAndDrop() {
  kanban.addEventListener('dragstart', (event) => {
    const item = event.target.closest('.todo-item');
    if (!item) return;
    draggedId = item.dataset.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedId);   // richiesto da Firefox
    item.classList.add('dragging');
  });

  // dragover scatta di continuo mentre ci si muove sopra una colonna.
  // preventDefault() dice al browser "qui si può rilasciare".
  kanban.addEventListener('dragover', (event) => {
    const column = event.target.closest('.kanban-column');
    if (!column || !draggedId) return;
    event.preventDefault();
    clearDragHighlights();
    column.classList.add('drag-over');
  });

  kanban.addEventListener('dragleave', (event) => {
    const column = event.target.closest('.kanban-column');
    if (column && !column.contains(event.relatedTarget)) {
      column.classList.remove('drag-over');
    }
  });

  kanban.addEventListener('drop', (event) => {
    const column = event.target.closest('.kanban-column');
    if (!column || !draggedId) return;
    event.preventDefault();
    const status = column.dataset.status;
    const beforeId = getDropTargetId(lists[status], event.clientY);
    const id = draggedId;
    draggedId = null;
    clearDragHighlights();
    moveTask(id, status, beforeId);
  });

  // dragend scatta sempre alla fine del trascinamento (anche se rilasciato fuori)
  kanban.addEventListener('dragend', () => {
    draggedId = null;
    clearDragHighlights();
    for (const item of kanban.querySelectorAll('.dragging')) {
      item.classList.remove('dragging');
    }
  });
}

// ---------- Eventi ----------

export function initTodo() {
  render();
  setupDragAndDrop();

  // Invio del form: aggiunge una task
  form.addEventListener('submit', (event) => {
    event.preventDefault();   // impedisce il ricaricamento della pagina
    const text = input.value.trim();
    if (!text) return;
    addTask(text);
    input.value = '';
    input.focus();
  });

  // Un solo "ascoltatore" sul kanban gestisce tutte le task (event delegation):
  // le task cambiano di continuo, il kanban invece resta sempre lo stesso.
  kanban.addEventListener('click', (event) => {
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
  kanban.addEventListener('keydown', (event) => {
    if (!event.target.classList.contains('edit-input')) return;
    const id = event.target.closest('.todo-item').dataset.id;
    if (event.key === 'Enter') commitEdit(id, event.target.value);
    if (event.key === 'Escape') cancelEdit();
  });

  kanban.addEventListener('focusout', (event) => {
    if (!event.target.classList.contains('edit-input')) return;
    const id = event.target.closest('.todo-item').dataset.id;
    commitEdit(id, event.target.value);
  });
}
