// Negozio (cassetto laterale come impostazioni e timer): voci con un prezzo, un clic le "compra"
// spendendo i punti. Le voci si creano, modificano ed eliminano da qui.

import { getRewards, spendPoints } from './rewards.js';
import { load, save } from './storage.js';

const toggle = document.getElementById('shop-toggle');
const panel = document.getElementById('shop-panel');
const closeButton = document.getElementById('shop-close');
const balanceEl = document.getElementById('shop-balance');
const shopList = document.getElementById('shop-list');
const shopForm = document.getElementById('shop-form');
const shopName = document.getElementById('shop-name');
const shopAddButton = document.getElementById('shop-add-button');
const SHOP_PRICES = [50, 100, 150, 200, 250, 500, 750, 1000, 1500, 2000];   // valori selezionabili col cursore
const DEFAULT_SHOP_PRICE = 100;
let shopItems = load('shopItems', []);
let editingShopId = null;
let shopDraftPrice = 0;      // prezzo scelto con lo slider durante la modifica   // id della voce di cui si stanno modificando nome e prezzo

function createShopButton(action, icon, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button small';
  button.dataset.action = action;
  button.textContent = icon;
  button.setAttribute('aria-label', label);
  return button;
}

// Slider del prezzo: sceglie uno dei valori di SHOP_PRICES (l'indice dello slider, non il valore).
// Se il prezzo attuale non è tra i valori, il cursore parte dal più vicino ma il prezzo resta invariato finché non lo si sposta.
function createPriceRow() {
  const row = document.createElement('label');
  row.className = 'points-row';
  const label = document.createElement('span');
  label.append('Prezzo: ');
  const value = document.createElement('strong');
  value.textContent = `${shopDraftPrice} ★`;
  label.append(value);
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'points-slider';
  slider.dataset.role = 'shop-price';
  slider.min = 0;
  slider.max = SHOP_PRICES.length - 1;
  slider.step = 1;
  slider.value = SHOP_PRICES.reduce((best, p, i) =>
    Math.abs(p - shopDraftPrice) < Math.abs(SHOP_PRICES[best] - shopDraftPrice) ? i : best, 0);
  slider.setAttribute('aria-label', 'Prezzo in punti');
  row.append(label, slider);
  return row;
}

function renderBalance() {
  balanceEl.textContent = `${getRewards().points} punti disponibili`;
}

function renderShop() {
  const { points } = getRewards();
  renderBalance();
  shopList.replaceChildren();
  if (shopItems.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'hint';
    empty.textContent = 'Nessuna voce: creane una qui sopra.';
    shopList.append(empty);
  }
  for (const item of shopItems) {
    const li = document.createElement('li');
    li.className = 'todo-item shop-item';
    li.dataset.id = item.id;
    const main = document.createElement('div');
    main.className = 'todo-main';

    if (item.id === editingShopId) {
      // Modalità modifica: nome e prezzo diventano campi; ✓ conferma, ✕ annulla
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'edit-input';
      nameInput.dataset.field = 'name';
      nameInput.value = item.name;
      nameInput.maxLength = 40;
      nameInput.setAttribute('aria-label', 'Nome della voce');
      main.append(nameInput,
        createShopButton('save', '✓', 'Conferma modifica'),
        createShopButton('cancel', '✕', 'Annulla modifica'));
      setTimeout(() => nameInput.focus(), 0);
    } else {
      // Tutta la riga è il pulsante di acquisto
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'shop-buy';
      buy.dataset.action = 'buy';
      buy.disabled = item.price > points;
      buy.title = buy.disabled ? 'Punti insufficienti' : `Spendi ${item.price} punti`;
      const text = document.createElement('span');
      text.className = 'todo-text';
      text.textContent = item.name;
      const price = document.createElement('span');
      price.className = 'points-badge';
      price.textContent = `−${item.price} ★`;
      buy.append(text, price);

      const remove = createShopButton('delete', '✕', `Elimina voce ${item.name}`);
      remove.classList.add('danger');
      main.append(buy, createShopButton('edit', '✎', `Modifica voce ${item.name}`), remove);
    }
    li.append(main);
    if (item.id === editingShopId) li.append(createPriceRow());
    shopList.append(li);
  }
}

function commitShopEdit(id) {
  const li = shopList.querySelector(`[data-id="${id}"]`);
  const item = shopItems.find((i) => i.id === id);
  const name = li.querySelector('[data-field="name"]').value.trim();
  if (name) item.name = name;
  item.price = shopDraftPrice;
  editingShopId = null;
  save('shopItems', shopItems);
  renderShop();
}


function setOpen(open) {
  panel.classList.toggle('open', open);
  panel.inert = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open) {
    renderShop();
    closeButton.focus();
  }
}

export function initShop() {
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  closeButton.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('open')) setOpen(false);
  });

  // Clic fuori dal pannello (e fuori dal suo pulsante) lo chiude
  document.addEventListener('pointerdown', (event) => {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  });

  // Se i punti cambiano a pannello aperto (es. fine di un pomodoro) le voci si aggiornano
  new MutationObserver(() => {
    if (panel.classList.contains('open') && editingShopId === null) renderShop();
  }).observe(document.getElementById('reward-points'), { childList: true, characterData: true, subtree: true });

  // Clic su una voce: spende i punti. ✎ la modifica, ✕ la elimina.
  shopList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.closest('.shop-item').dataset.id;
    switch (button.dataset.action) {
      case 'buy': {
        const item = shopItems.find((i) => i.id === id);
        if (!item || !spendPoints(item.price)) return;
        renderBalance();
        break;
      }
      case 'edit':
        editingShopId = id;
        shopDraftPrice = shopItems.find((i) => i.id === id).price;
        break;
      case 'cancel':
        editingShopId = null;
        break;
      case 'save':
        commitShopEdit(id);
        return;
      case 'delete':
        shopItems = shopItems.filter((i) => i.id !== id);
        save('shopItems', shopItems);
        break;
    }
    renderShop();
  });

  // Slider del prezzo: aggiorna la scritta senza ridisegnare (si perderebbe la presa sul cursore)
  shopList.addEventListener('input', (event) => {
    if (event.target.dataset.role !== 'shop-price') return;
    shopDraftPrice = SHOP_PRICES[Number(event.target.value)];
    event.target.closest('.points-row').querySelector('strong').textContent = `${shopDraftPrice} ★`;
  });

  // Nei campi di modifica: Invio conferma, Esc annulla (senza chiudere il pannello)
  shopList.addEventListener('keydown', (event) => {
    if (!event.target.dataset.field) return;
    if (event.key === 'Enter') commitShopEdit(event.target.closest('.shop-item').dataset.id);
    if (event.key === 'Escape') {
      event.stopPropagation();
      editingShopId = null;
      renderShop();
    }
  });

  // Aggiunta come nelle colonne del kanban: il pulsante tratteggiato apre il campo, Invio crea la voce
  // (prezzo base 100, modificabile dopo con ✎), Esc o uscire dal campo vuoto lo richiude.
  function closeShopForm() {
    shopForm.hidden = true;
    shopAddButton.hidden = false;
    shopName.value = '';
  }

  shopAddButton.addEventListener('click', () => {
    shopForm.hidden = false;
    shopAddButton.hidden = true;
    shopName.focus();
  });

  shopForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = shopName.value.trim();
    if (!name) return;
    shopItems.push({ id: crypto.randomUUID(), name, price: DEFAULT_SHOP_PRICE });
    save('shopItems', shopItems);
    shopName.value = '';
    renderShop();
  });

  shopName.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();   // chiude solo il campo, non il pannello
      closeShopForm();
    }
  });
  shopName.addEventListener('focusout', () => {
    if (!shopName.value.trim()) closeShopForm();
  });
}
