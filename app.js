import { askCoach, isCrisisMessage } from './ai-client.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const messages = [];
let sending = false;

function switchView(view) {
  $$('.tab').forEach(tab => { const active = tab.dataset.view === view; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
  $$('[data-view-panel]').forEach(panel => { const active = panel.dataset.viewPanel === view; panel.classList.toggle('active', active); panel.hidden = !active; });
  if (view === 'calm') $('#calmView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addMessage(role, text, pending = false) {
  const article = document.createElement('article');
  article.className = `message ${role === 'assistant' ? 'coach-message' : 'user-message'}${pending ? ' pending' : ''}`;
  if (role === 'assistant') { const avatar = document.createElement('div'); avatar.className = 'mini-avatar'; avatar.setAttribute('aria-hidden', 'true'); avatar.textContent = 'AI'; article.append(avatar); }
  const content = document.createElement('div');
  if (role === 'assistant') { const name = document.createElement('strong'); name.textContent = 'Helper Coach'; content.append(name); }
  const paragraph = document.createElement('p'); paragraph.textContent = text; content.append(paragraph); article.append(content);
  $('#messages').append(article); $('#messages').scrollTop = $('#messages').scrollHeight;
  return article;
}

async function sendMessage(text) {
  const message = text.trim();
  if (!message || sending) return;
  if (isCrisisMessage(message)) { addMessage('user', message); $('#safetyDialog').showModal(); return; }
  sending = true; $('#coachInput').value = ''; resizeInput(); addMessage('user', message);
  const pending = addMessage('assistant', 'Thinking with you…', true);
  $$('.prompt-chip').forEach(button => button.disabled = true); $('.send-button').disabled = true;
  try {
    const answer = await askCoach(message, messages);
    pending.remove(); addMessage('assistant', answer);
    messages.push({ role: 'user', content: message }, { role: 'assistant', content: answer });
  } catch (error) {
    pending.remove(); addMessage('assistant', `${error.message} You can still take a calm break, or try asking again.`);
  } finally {
    sending = false; $$('.prompt-chip').forEach(button => button.disabled = false); $('.send-button').disabled = false; $('#coachInput').focus();
  }
}

function resizeInput() { const input = $('#coachInput'); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 120)}px`; }
function newChat() { messages.length = 0; $('#messages').innerHTML = ''; addMessage('assistant', 'Fresh start. What would feel helpful to talk through?'); toast('Started a new private chat.'); }

const symbols = ['leaf', 'moon', 'wave', 'sun', 'cloud', 'star'];
const symbolArt = { leaf: '❧', moon: '☾', wave: '≈', sun: '☼', cloud: '☁', star: '✦' };
let firstCard = null; let lockBoard = false; let matches = 0;

function startCalmGame() {
  firstCard = null; lockBoard = false; matches = 0; $('#matchCount').textContent = '0 of 6 pairs'; $('#calmFinish').hidden = true;
  const cards = [...symbols, ...symbols].map((symbol, index) => ({ symbol, id: `${symbol}-${index}`, order: Math.random() })).sort((a, b) => a.order - b.order);
  $('#memoryGrid').innerHTML = cards.map(card => `<button class="memory-card" type="button" data-symbol="${card.symbol}" aria-label="Hidden card"><span class="card-back">♡</span><span class="card-front" aria-hidden="true">${symbolArt[card.symbol]}</span></button>`).join('');
  $$('.memory-card').forEach(card => card.addEventListener('click', () => flipCard(card)));
}

function flipCard(card) {
  if (lockBoard || card === firstCard || card.classList.contains('matched')) return;
  card.classList.add('flipped'); card.setAttribute('aria-label', `${card.dataset.symbol} card`);
  if (!firstCard) { firstCard = card; return; }
  if (firstCard.dataset.symbol === card.dataset.symbol) {
    firstCard.classList.add('matched'); card.classList.add('matched'); firstCard = null; matches += 1; $('#matchCount').textContent = `${matches} of 6 pairs`;
    if (matches === symbols.length) $('#calmFinish').hidden = false;
    return;
  }
  lockBoard = true; const previous = firstCard; firstCard = null;
  setTimeout(() => { previous.classList.remove('flipped'); card.classList.remove('flipped'); previous.setAttribute('aria-label', 'Hidden card'); card.setAttribute('aria-label', 'Hidden card'); lockBoard = false; }, 750);
}

function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); setTimeout(() => $('#toast').classList.remove('show'), 1800); }

$$('.tab').forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view)));
$$('.prompt-chip').forEach(chip => chip.addEventListener('click', () => sendMessage(chip.dataset.prompt)));
$('#coachForm').addEventListener('submit', event => { event.preventDefault(); sendMessage($('#coachInput').value); });
$('#coachInput').addEventListener('input', resizeInput);
$('#coachInput').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(event.currentTarget.value); } });
$('#newChatButton').addEventListener('click', newChat);
$('#calmShortcut').addEventListener('click', () => switchView('calm'));
$('#resetGame').addEventListener('click', startCalmGame);
$('#closeSafety').addEventListener('click', () => $('#safetyDialog').close());
startCalmGame();
