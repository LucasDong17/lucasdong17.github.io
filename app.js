const CRISIS_PATTERN = /\b(kill myself|suicide|suicidal|hurt myself|self[- ]?harm|don['’]?t want to live|do not want to live|end my life)\b/i;

function isCrisisMessage(message) { return CRISIS_PATTERN.test(message); }

async function askCoach(message, history = []) {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), 12000) : null;
  let response;
  try {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: history.slice(-8) })
    };
    if (controller) options.signal = controller.signal;
    response = await fetch(new URL('api/coach', document.baseURI), options);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The live coach took too long to answer.');
    throw new Error('The live coach is not connected right now.');
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'I could not connect right now.');
  if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('The live coach returned an empty answer.');
  return data.answer;
}

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const messages = [];
let sending = false;
let fallbackNoticeShown = false;

function switchView(view) {
  $$('.tab').forEach(tab => { const active = tab.dataset.view === view; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
  $$('[data-view-panel]').forEach(panel => { const active = panel.dataset.viewPanel === view; panel.classList.toggle('active', active); panel.hidden = !active; });
  if (view === 'calm') $('#calmView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addMessage(role, text, pending = false) {
  const article = document.createElement('article');
  article.className = `message ${role === 'assistant' ? 'coach-message' : 'user-message'}${pending ? ' pending' : ''}`;
  const avatar = document.createElement('div');
  avatar.className = `mini-avatar ${role === 'user' ? 'user-avatar' : ''}`;
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = role === 'assistant' ? 'AI' : 'You';
  if (role === 'assistant') article.append(avatar);
  const content = document.createElement('div');
  const label = document.createElement('div');
  label.className = 'message-label';
  const name = document.createElement('strong');
  name.textContent = role === 'assistant' ? 'Helper Coach' : 'You';
  const time = document.createElement('time');
  time.textContent = 'Now';
  label.append(name, time);
  content.append(label);
  const paragraph = document.createElement('p'); paragraph.textContent = text; content.append(paragraph); article.append(content);
  if (role === 'user') article.append(avatar);
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
    const answer = getBuiltInReply(message, messages);
    pending.remove();
    const notice = fallbackNoticeShown ? '' : 'I’m using built-in support mode because the live AI is not connected. ';
    addMessage('assistant', `${notice}${answer}`);
    fallbackNoticeShown = true;
    messages.push({ role: 'user', content: message }, { role: 'assistant', content: answer });
  } finally {
    sending = false; $$('.prompt-chip').forEach(button => button.disabled = false); $('.send-button').disabled = false; $('#coachInput').focus();
  }
}

function getBuiltInReply(message, history = []) {
  const recentUserText = history.filter(item => item.role === 'user').slice(-3).map(item => item.content).join(' ');
  const text = redactPrivateDetails(`${recentUserText} ${message}`).toLowerCase();
  if (/\b(how (?:do|can) i|help me|tell me how to|i (?:want|plan|need) to)\b.{0,50}\b(hurt|kill|attack|bully|harass|poison|threaten)\b/.test(message.toLowerCase())) {
    return 'I can’t help hurt, threaten, or target someone. Step away from the situation and tell a trusted adult what is happening. If there is immediate danger, call emergency services.';
  }

  const subject = findFirst(text, [
    ['math', /\b(math|algebra|geometry|fraction|equation|calculus)\b/],
    ['science', /\b(science|biology|chemistry|physics|experiment)\b/],
    ['English', /\b(english|essay|writing|reading|book report)\b/],
    ['history', /\b(history|social studies|civics)\b/],
    ['a presentation', /\b(presentation|speech|public speaking)\b/]
  ]);
  const task = findFirst(text, [
    ['test', /\b(test|quiz|exam)\b/], ['project', /\bproject\b/], ['homework', /\b(homework|worksheet|assignment)\b/],
    ['essay', /\b(essay|paper|book report)\b/], ['presentation', /\b(presentation|speech)\b/]
  ]);
  const feeling = findFirst(text, [
    ['overwhelmed', /\b(overwhelm|too much|swamped)\b/], ['anxious', /\b(anxious|nervous|panic|worried|scared)\b/],
    ['frustrated', /\b(frustrated|annoyed|angry|mad)\b/], ['confused', /\b(confused|don['’]?t understand|stuck|lost)\b/],
    ['tired', /\b(tired|exhausted|no energy|burned out)\b/], ['sad', /\b(sad|upset|lonely|bad day)\b/],
    ['stressed', /\b(stress|stressed)\b/]
  ]);
  const deadlineMatch = text.match(/\b(today|tonight|tomorrow|this (?:monday|tuesday|wednesday|thursday|friday|weekend|week)|next week|in \d+ days?)\b/);
  const deadline = deadlineMatch ? deadlineMatch[1] : '';
  const isSocial = /\b(friend|classmate|teacher|parent|group partner|conversation|argument|what (?:do|should) i say)\b/.test(text);
  const isGreeting = /^(?:\s*)(?:hello|hi|hey|yo)[!.?\s]*$/i.test(message);

  if (isGreeting) return 'Hi! I’m here with you. Tell me what is happening and what kind of help you want—understanding something, making a plan, calming down, or deciding what to say.';

  const reflection = buildReflection({ feeling, subject, task, deadline, isSocial });
  if (isSocial) {
    return `${reflection} Try this three-part message: “I noticed ___.” “I feel ___.” “Could we ___?” Keep it about the situation, not the person. Before sending it, read it once and remove any blame words. What happened, and what outcome would feel fair to you?`;
  }
  if (task || subject) {
    const plan = buildSchoolPlan({ subject, task, deadline, feeling });
    return `${reflection} ${plan}`;
  }
  if (feeling) {
    return `${reflection} First, lower the pressure for sixty seconds: unclench your hands, breathe out slowly, and get a sip of water. Then write one sentence naming the problem and circle the part you can influence today. What would make the next ten minutes feel even 10% easier?`;
  }
  return `I want to help with what you actually mean. I heard: “${shortQuote(message)}.” Tell me which kind of help would be most useful right now: a simple explanation, a step-by-step plan, ideas for what to say, or a quick way to calm down?`;
}

function findFirst(text, choices) {
  const match = choices.find(choice => choice[1].test(text));
  return match ? match[0] : '';
}

function buildReflection({ feeling, subject, task, deadline, isSocial }) {
  const topic = [subject, task].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(' ');
  if (isSocial && feeling) return `It makes sense that this situation feels ${feeling}.`;
  if (topic && deadline && feeling) return `It makes sense to feel ${feeling} with your ${topic} due ${deadline}.`;
  if (topic && deadline) return `Let’s make your ${topic} due ${deadline} feel more manageable.`;
  if (topic && feeling) return `I hear that the ${topic} is leaving you feeling ${feeling}.`;
  if (topic) return `Let’s work on your ${topic} one clear step at a time.`;
  return `I hear that you’re feeling ${feeling || 'under pressure'}.`;
}

function buildSchoolPlan({ subject, task, deadline, feeling }) {
  const urgent = /today|tonight|tomorrow/.test(deadline);
  let action;
  if (task === 'essay') action = 'Open the directions, write a one-sentence main idea, then list three points you could use. Do not edit yet.';
  else if (task === 'presentation') action = 'Write the one idea you want people to remember, then make just three slide or speaking-point titles.';
  else if (task === 'project') action = 'List the required parts, mark the smallest unfinished part, and work only on that part for ten minutes.';
  else if (task === 'test' && subject === 'math') action = 'Choose one problem type, work one example without notes, and mark the exact step where you get stuck.';
  else if (task === 'test') action = 'Close your notes and write five things you remember. Check them, then review only the gaps.';
  else if (subject === 'math') action = 'Pick one example problem and write what you know, what you need to find, and the first operation you might try.';
  else if (subject === 'science') action = 'Write the idea in your own words, draw a tiny diagram, and make one question about the part that is unclear.';
  else action = 'Open the directions, underline the action words, and write the smallest step you can finish in ten minutes.';
  const timing = urgent ? 'Since the deadline is close, use one focused 15-minute round, then ask a teacher, classmate, or trusted adult about the biggest blocker.' : 'Try one ten-minute round, pause, and decide the next small step.';
  const energy = feeling === 'tired' ? ' Because your energy is low, aim for a useful draft—not perfect work.' : '';
  return `${action} ${timing}${energy} Which exact part should we break down together?`;
}

function shortQuote(message) {
  const cleaned = redactPrivateDetails(message).replace(/\s+/g, ' ').trim();
  return cleaned.length > 90 ? `${cleaned.slice(0, 87)}…` : cleaned;
}

function redactPrivateDetails(text) {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[private email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[private number]');
}

function resizeInput() { const input = $('#coachInput'); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 120)}px`; }
function newChat() { messages.length = 0; fallbackNoticeShown = false; $('#messages').innerHTML = ''; addMessage('assistant', 'Fresh start. What would feel helpful to talk through?'); toast('Started a new private chat.'); }

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
$$('[data-open-game]').forEach(button => button.addEventListener('click', () => switchView('calm')));
$$('.prompt-chip').forEach(chip => chip.addEventListener('click', () => sendMessage(chip.dataset.prompt)));
$('#coachForm').addEventListener('submit', event => { event.preventDefault(); sendMessage($('#coachInput').value); });
$('.send-button').addEventListener('click', () => sendMessage($('#coachInput').value));
$('#coachInput').addEventListener('input', resizeInput);
$('#coachInput').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(event.currentTarget.value); } });
$('#newChatButton').addEventListener('click', newChat);
$('#calmShortcut').addEventListener('click', () => switchView('calm'));
$('#resetGame').addEventListener('click', startCalmGame);
$('#closeSafety').addEventListener('click', () => $('#safetyDialog').close());
startCalmGame();
