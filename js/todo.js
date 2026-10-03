// Logica della to-do list a kanban.
// Idea di base: abbiamo una lista di task in memoria (`tasks`).
// Ogni volta che cambia, la salviamo e ridisegniamo le colonne a schermo (render).
// La colonna in cui sta una task è decisa dal suo campo `status`.

import { load, save } from './storage.js';
import { initTags, getTags, getTag, getActiveFilter, createTagChip } from './tags.js';

const kanban = document.querySelector('.kanban');

// Le colonne fisse: stato → elemento <ul> della colonna
const STATUSES = ['todo', 'doing', 'done'];
const lists = {};
for (const status of STATUSES) {
  lists[status] = kanban.querySelector(`[data-status="${status}"] .todo-list`);
}

// Ogni task è un oggetto: { id, text, status, tags, createdAt }
// `tags` è una lista di id di tag (vedi tags.js).
let tasks = migrate(load('tasks', []));
let editingId = null;   // id della task di cui si sta modificando il testo
let taggingId = null;   // id della task di cui si stanno scegliendo i tag
let draggedId = null;   // id della task che si sta trascinando

// Adegua le task salvate con versioni precedenti dell'app, così non si perde nulla:
// - Tappa 4: `done: true/false` → `status`
// - Tappa 5b: aggiunta del campo `tags`
function migrate(savedTasks) {
  return savedTasks.map((task) => {
    const { done, ...rest } = task;
    return {
      ...rest,
      status: task.status ?? (done ? 'done' : 'todo'),
      tags: task.tags ?? [],
    };
  });
}

function saveAndRender() {
  save('tasks', tasks);
  render();
}

// ---------- Disegno delle colonne ----------

// Una task è visibile se ha tutti i tag selezionati nel filtro (nessun filtro = tutte)
function isVisible(task) {
  return getActiveFilter().every((tagId) => task.tags.includes(tagId));
}

function render() {
  for (const status of STATUSES) {
    const columnTasks = tasks.filter((task) => task.status === status && isVisible(task));
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

  // Riga principale: testo (o campo di modifica) e pulsanti
  const main = document.createElement('div');
  main.className = 'todo-main';

  if (task.id === editingId) {
    // Modalità modifica: al posto del testo c'è un campo editabile
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = task.text;
    main.append(editInput);
    setTimeout(() => editInput.focus(), 0);   // dopo che è stato inserito nella pagina
  } else {
    li.draggable = true;   // rende la task trascinabile

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = task.text;   // textContent è sicuro: non interpreta HTML
    main.append(
      text,
      createActionButton('tag', '🏷️', 'Tag'),
      createActionButton('edit', '✏️', 'Modifica'),
      createActionButton('delete', '🗑️', 'Elimina'),
    );
  }
  li.append(main);

  // Tag assegnati alla task
  const assigned = task.tags.map(getTag).filter(Boolean);
  if (assigned.length > 0) {
    const tagRow = document.createElement('div');
    tagRow.className = 'todo-tags';
    tagRow.append(...assigned.map((tag) => createTagChip(tag)));
    li.append(tagRow);
  }

  // Selettore dei tag (aperto con il pulsante 🏷️)
  if (task.id === taggingId) {
    li.append(createTagPicker(task));
  }

  return li;
}

function createTagPicker(task) {
  const picker = document.createElement('div');
  picker.className = 'tag-picker';

  if (getTags().length === 0) {
    picker.textContent = 'Nessun tag: creane uno da "Tag e filtri".';
    return picker;
  }

  for (const tag of getTags()) {
    const chip = createTagChip(tag, 'button', task.tags.includes(tag.id));
    chip.dataset.action = 'toggle-tag';
    chip.dataset.tagId = tag.id;
    picker.append(chip);
  }
  return picker;
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

function addTask(text, status) {
  tasks.push({
    id: crypto.randomUUID(),
    text,
    status,
    // Se un filtro è attivo, la nuova task prende quei tag: altrimenti sparirebbe subito
    tags: getActiveFilter(),
    createdAt: Date.now(),
  });
  saveAndRender();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  if (taggingId === id) taggingId = null;
  saveAndRender();
}

function toggleTaskTag(taskId, tagId) {
  const task = tasks.find((t) => t.id === taskId);
  task.tags = task.tags.includes(tagId)
    ? task.tags.filter((id) => id !== tagId)
    : [...task.tags, tagId];
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

// ---------- Aggiunta di task dentro le colonne ----------

function openAddForm(column) {
  column.querySelector('.add-form').hidden = false;
  column.querySelector('.add-button').hidden = true;
  column.querySelector('.add-input').focus();
}

function closeAddForm(column) {
  column.querySelector('.add-form').hidden = true;
  column.querySelector('.add-button').hidden = false;
  column.querySelector('.add-input').value = '';
}

function setupAddForms() {
  // Invio nel campo di testo: aggiunge la task in quella colonna.
  // Il campo resta aperto per inserire più task di fila.
  kanban.addEventListener('submit', (event) => {
    event.preventDefault();   // impedisce il ricaricamento della pagina
    const column = event.target.closest('.kanban-column');
    const field = column.querySelector('.add-input');
    const text = field.value.trim();
    if (!text) return;
    addTask(text, column.dataset.status);
    field.value = '';
    field.focus();
  });

  kanban.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && event.target.classList.contains('add-input')) {
      closeAddForm(event.target.closest('.kanban-column'));
    }
  });

  // Se si esce dal campo senza aver scritto nulla, si richiude
  kanban.addEventListener('focusout', (event) => {
    if (event.target.classList.contains('add-input') && !event.target.value.trim()) {
      closeAddForm(event.target.closest('.kanban-column'));
    }
  });
}

// ---------- Eventi ----------

export function initTodo() {
  initTags({
    onChange: render,
    countUsage: (tagId) => tasks.filter((t) => t.tags.includes(tagId)).length,
    onTagDeleted: (tagId) => {
      for (const task of tasks) {
        task.tags = task.tags.filter((id) => id !== tagId);
      }
      save('tasks', tasks);
    },
  });

  render();
  setupDragAndDrop();
  setupAddForms();

  // Un solo "ascoltatore" sul kanban gestisce tutti i pulsanti (event delegation):
  // le task cambiano di continuo, il kanban invece resta sempre lo stesso.
  kanban.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    if (button.dataset.action === 'open-add') {
      openAddForm(button.closest('.kanban-column'));
      return;
    }

    const id = button.closest('.todo-item').dataset.id;
    switch (button.dataset.action) {
      case 'delete':
        deleteTask(id);
        break;
      case 'edit':
        editingId = id;
        render();
        break;
      case 'tag':
        taggingId = taggingId === id ? null : id;   // apre/chiude il selettore
        render();
        break;
      case 'toggle-tag':
        toggleTaskTag(id, button.dataset.tagId);
        break;
    }
  });

  // Modifica del testo: Invio conferma, Esc annulla, uscire dal campo conferma
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
