// Logica della to-do list a kanban.
// Idea di base: abbiamo una lista di task in memoria (`tasks`).
// Ogni volta che cambia, la salviamo e ridisegniamo le colonne a schermo (render).
// La colonna in cui sta una task è decisa dal suo campo `status`.

import { load, save } from './storage.js';
import { playSound } from './sound.js';
import { rewardTask, effectDuration, TASK_POINTS, DEFAULT_TASK_POINTS } from './rewards.js';
import { initTags,getTags, getTag, getActiveFilter, createTagChip } from './tags.js';

const kanban = document.querySelector('.kanban');

// Le colonne fisse: stato → elemento <ul> della colonna
const STATUSES = ['todo', 'doing', 'done'];
const lists = {};
for (const status of STATUSES) {
  lists[status] = kanban.querySelector(`[data-status="${status}"] .todo-list`);
}

// Ogni task è un oggetto: { id, text, status, tags, createdAt, points, rewarded, repeat }
// `points` = punti che dà al completamento (scelti dal menu della task);
// `rewarded` = quei punti sono già stati assegnati;
// `repeat` = task ripetibile: una volta completata torna da sola in To-do.
// `tags` è una lista di id di tag (vedi tags.js).
let tasks = migrate(load('tasks', []));
let editingId = null;   // id della task di cui si sta modificando il testo
let taggingId = null;   // id della task di cui si stanno scegliendo i tag
let menuId = null;      // id della task con il menu a tre puntini aperto
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
      points: task.points ?? DEFAULT_TASK_POINTS,
      repeat: task.repeat ?? false,
      // Le task già completate prima dei premi non devono darne retroattivamente
      rewarded: task.rewarded ?? (task.status ?? (done ? 'done' : 'todo')) === 'done',
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
      String(columnTasks.length);
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
    // Trascinabile, tranne a menu aperto: altrimenti trascinare lo slider dei punti sposterebbe la task
    li.draggable = task.id !== menuId;

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = task.text;   // textContent è sicuro: non interpreta HTML

    const points = document.createElement('span');
    points.className = 'points-badge';
    points.textContent = badgeText(task);
    points.title = task.repeat ? 'Punti al completamento (task ripetibile)' : 'Punti al completamento';
    // Punti già incassati e task fuori da Completate: non valgono più nulla, etichetta oscurata
    points.classList.toggle('spent', isSpent(task));
    if (isSpent(task)) points.title = 'Punti già incassati: cambia il valore per poterli riottenere';

    const remove = createActionButton('delete', '✕', 'Elimina task');
    remove.classList.add('danger');
    main.append(text, points, createActionButton('menu', '⋯', 'Azioni sulla task'), remove);
  }
  li.append(main);

  // Menu a tre puntini (aperto con il pulsante ⋯)
  if (task.id === menuId) {
    li.append(createTaskMenu(task));
  }

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

function isSpent(task) {
  // Boolean(): le task nuove non hanno `rewarded`, e toggle(classe, undefined) invertirebbe la classe invece di toglierla
  return Boolean(task.rewarded) && task.status !== 'done';
}

// Testo dell'etichetta dei punti: ↻ davanti se la task è ripetibile
function badgeText(task) {
  return `${task.repeat ? '↻ ' : ''}+${task.points}`;
}

const STATUS_LABELS ={ todo: 'To-do', doing: 'In corso', done: 'Completate' };

// Il menu include "Sposta in…": un'alternativa al drag & drop, utile da tastiera e su touchscreen.
function createTaskMenu(task) {
  const menu = document.createElement('div');
  menu.className = 'task-menu';
  menu.setAttribute('role', 'menu');

  const moves = STATUSES.filter((status) => status !== task.status)
    .map((status) => [`move-${status}`, `Sposta in ${STATUS_LABELS[status]}`]);
  const groups = [
    [['edit', 'Modifica'], ['tag', 'Tag']],
    moves,
  ];

  // Slider dei punti: sceglie uno dei valori di TASK_POINTS (l'indice dello slider, non il valore)
  const pointsRow = document.createElement('label');
  pointsRow.className = 'points-row';
  const pointsLabel = document.createElement('span');
  pointsLabel.textContent = 'Punti: ';
  const pointsValue = document.createElement('strong');
  pointsValue.textContent = `+${task.points}`;
  pointsLabel.append(pointsValue);
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'points-slider';
  slider.dataset.role = 'points';
  slider.min = 0;
  slider.max = TASK_POINTS.length - 1;
  slider.step = 1;
  slider.value = Math.max(0, TASK_POINTS.indexOf(task.points));
  slider.setAttribute('aria-label', 'Punti al completamento');
  slider.setAttribute('aria-valuetext', `+${task.points} punti`);
  pointsRow.append(pointsLabel, slider);

  groups.forEach((group, index) => {
    if (index > 0) {
      const divider = document.createElement('div');
      divider.className = 'menu-divider';
      divider.setAttribute('role', 'separator');
      menu.append(divider);
    }
    for (const [action, label] of group) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'menu-item';
      item.dataset.action = action;
      item.setAttribute('role', 'menuitem');
      item.textContent = label;
      menu.append(item);
    }
  });

  const divider = document.createElement('div');
  divider.className = 'menu-divider';
  divider.setAttribute('role', 'separator');
  // Interruttore "Ripetibile"
  const repeat = document.createElement('button');
  repeat.type = 'button';
  repeat.className = 'menu-item switch-item';
  repeat.dataset.action = 'toggle-repeat';
  repeat.setAttribute('role', 'menuitemcheckbox');
  repeat.setAttribute('aria-checked', String(task.repeat));
  repeat.title = 'Una volta completata, torna in To-do e può dare di nuovo i punti';
  const repeatLabel = document.createElement('span');
  repeatLabel.textContent = 'Ripetibile';
  const track = document.createElement('span');
  track.className = 'switch';
  track.setAttribute('aria-hidden', 'true');
  repeat.append(repeatLabel, track);

  menu.append(divider, repeat, pointsRow);
  return menu;
}

function createTagPicker(task) {
  const picker = document.createElement('div');
  picker.className = 'tag-picker';

  if (getTags().length === 0) {
    picker.append('Nessun tag: creane uno da "Tag e filtri".');
  }

  for (const tag of getTags()) {
    const chip = createTagChip(tag, 'button', task.tags.includes(tag.id));
    chip.dataset.action = 'toggle-tag';
    chip.dataset.tagId = tag.id;
    picker.append(chip);
  }

  // Pulsante per richiudere il selettore
  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'picker-done';
  done.dataset.action = 'close-tag';
  done.textContent = 'Fatto';
  picker.append(done);

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
    points: DEFAULT_TASK_POINTS,
    createdAt: Date.now(),
  });
  saveAndRender();
  playSound('add');
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  if (taggingId === id) taggingId = null;
  saveAndRender();
  playSound('delete');
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
  const changedColumn = task.status !== status;
  task.status = status;
  // Premio una sola volta per task: riportarla indietro e rimetterla in Completate non dà altri punti
  const earns = status === 'done' && !task.rewarded;
  if (earns) task.rewarded = true;
  const index = beforeId ? tasks.findIndex((t) => t.id === beforeId) : -1;
  if (index === -1) {
    tasks.push(task);
  } else {
    tasks.splice(index, 0, task);
  }
  saveAndRender();
  // Cambio di colonna: suono di spostamento (se dà punti suona già il "ding" del premio)
  if (changedColumn && !earns) playSound('move');
  if (earns) {
    // La task è stata ridisegnata: l'animazione va sul nuovo elemento (null se un filtro la nasconde)
    const el = kanban.querySelector(`.todo-item[data-id="${id}"]`);
    rewardTask(task.points, el);
  }
  // Ripetibile: torna in To-do ogni volta che entra in Completate, anche se non dà punti
  // (senza premio non c'è animazione da aspettare, basta una breve pausa)
  if (changedColumn && status === 'done' && task.repeat) {
    scheduleRepeat(id, earns ? effectDuration(task.points) : 400);
  }
}

// Task ripetibile: finita l'animazione dei punti vibra, poi torna in fondo a To-do
// e può dare di nuovo i punti.
function scheduleRepeat(id, delay) {
  setTimeout(() => {
    kanban.querySelector(`.todo-item[data-id="${id}"]`)?.classList.add('shaking');
    playSound('shake');
    setTimeout(() => {
      const task = tasks.find((t) => t.id === id);
      // Se nel frattempo è stata eliminata, spostata o non è più ripetibile, non si tocca
      if (!task || task.status !== 'done' || !task.repeat) return;
      tasks = tasks.filter((t) => t !== task);
      task.status = 'todo';
      task.rewarded = false;
      tasks.push(task);
      saveAndRender();
      playSound('return');
    }, 500);
  }, delay);
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
    const action = button.dataset.action;

    // Scegliere una voce del menu lo richiude
    if (action === 'edit' || action === 'tag' || action === 'delete' || action.startsWith('move-')) {
      menuId = null;
    }

    switch (action) {
      case 'menu':
        menuId = menuId === id ? null : id;   // apre/chiude il menu
        render();
        break;
      case 'delete':
        deleteTask(id);
        break;
      case 'edit':
        editingId = id;
        render();
        break;
      case 'tag':
        taggingId = id;   // apre il selettore dei tag sotto la task
        render();
        break;
      case 'close-tag':
        taggingId = null;
        render();
        break;
      case 'toggle-tag':
        toggleTaskTag(id, button.dataset.tagId);
        break;
      case 'toggle-repeat': {   // il menu resta aperto, così si vede l'interruttore cambiare
        const task = tasks.find((t) => t.id === id);
        task.repeat = !task.repeat;
        saveAndRender();
        break;
      }
      default:
        // "Sposta in…": la task va in fondo alla colonna scelta
        if (action.startsWith('move-')) moveTask(id, action.slice(5), null);
        break;
    }
  });

  // Slider dei punti: aggiorna la task mentre lo si trascina. Non si ridisegna (si perderebbe la presa
  // sullo slider): si cambiano a mano solo le scritte e si salva.
  kanban.addEventListener('input', (event) => {
    if (event.target.dataset.role !== 'points') return;
    const item = event.target.closest('.todo-item');
    const task = tasks.find((t) => t.id === item.dataset.id);
    task.points = TASK_POINTS[Number(event.target.value)];
    task.rewarded = false;   // un nuovo valore dei punti li rende di nuovo ottenibili
    item.querySelector('.points-badge').classList.remove('spent');
    item.querySelector('.points-row strong').textContent = `+${task.points}`;
    item.querySelector('.points-badge').textContent = badgeText(task);
    event.target.setAttribute('aria-valuetext', `+${task.points} punti`);
    save('tasks', tasks);
  });

  // Clic fuori dal menu (o Esc) lo richiude
  document.addEventListener('click', (event) => {
    if (menuId && !event.target.closest('.task-menu, [data-action="menu"]')) {
      menuId = null;
      render();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuId) {
      menuId = null;
      render();
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
