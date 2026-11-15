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
  const recentUserMessages = history.filter(item => item.role === 'user').slice(-3);
  const recentUserText = recentUserMessages.map(item => item.content).join(' ');
  const hasPriorUserContext = recentUserMessages.length > 0;
  const currentText = message.toLowerCase();
  const text = redactPrivateDetails(`${recentUserText} ${message}`).toLowerCase();
  if (/\b(how (?:do|can) i|help me|tell me how to|i (?:want|plan|need) to)\b.{0,50}\b(hurt|kill|attack|bully|harass|poison|threaten)\b/.test(message.toLowerCase())) {
    return 'I can’t help hurt, threaten, or target someone. Step away from the situation and tell a trusted adult what is happening. If there is immediate danger, call emergency services.';
  }
  const mathAnswer = solveMathQuestion(message);
  if (mathAnswer) return mathAnswer;
  const conceptAnswer = answerKnownConcept(message);
  if (conceptAnswer) return conceptAnswer;

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
  const concept = findFirst(text, [
    ['fractions', /\b(fraction|fractions|denominator|numerator)\b/], ['equations', /\b(equation|equations|solve for x)\b/],
    ['geometry', /\b(geometry|angles|area|perimeter|volume)\b/], ['cells', /\b(cell|cells|mitosis|organelles)\b/],
    ['chemical reactions', /\b(chemical reaction|chemical reactions|balancing equations)\b/], ['the main idea', /\b(main idea|theme)\b/],
    ['the thesis', /\b(thesis|claim|argument)\b/], ['grammar', /\b(grammar|punctuation|sentence structure)\b/],
    ['vocabulary', /\b(vocabulary|definitions|terms)\b/], ['dates and events', /\b(dates|timeline|events)\b/]
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
  const asksForWords = /\b(what (?:do|should|can) i say|help me (?:reply|respond)|how (?:do|should) i (?:talk|respond))\b/.test(currentText);
  const givesSituationDetails = /\b(because|when|after|during|said|told|ignored|yelled|argued|happened|due)\b/.test(currentText) || message.trim().split(/\s+/).length >= 14;

  if (isGreeting) return 'Hi! I’m here with you. Tell me what is happening and what kind of help you want—understanding something, making a plan, calming down, or deciding what to say.';

  const reflection = buildReflection({ feeling, subject, task, concept, deadline, isSocial });
  if (feeling && !subject && !task && !isSocial && !hasPriorUserContext && !givesSituationDetails) {
    return `${reflection} I don’t want to guess what caused it. What happened, and would you like me to listen, help you calm down, or help you decide what to do next?`;
  }
  if (isSocial && !hasPriorUserContext && !givesSituationDetails && !asksForWords) {
    return `${reflection} Before I suggest anything, what happened between you and the other person, and what would you like to be different?`;
  }
  if (isSocial) {
    return buildSocialResponse(currentText, reflection);
  }
  if (task || subject) {
    const plan = buildSchoolPlan({ subject, task, concept, deadline, feeling });
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

function buildReflection({ feeling, subject, task, concept, deadline, isSocial }) {
  const topic = [subject, task].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(' ');
  const conceptVerb = ['fractions', 'equations', 'cells', 'chemical reactions', 'dates and events'].includes(concept) ? 'are' : 'is';
  if (isSocial && feeling) return `It makes sense that this situation feels ${feeling}.`;
  if (concept && topic && deadline) return `I hear that ${concept} ${conceptVerb} the hardest part of your ${topic} due ${deadline}.`;
  if (concept && topic) return `I hear that ${concept} ${conceptVerb} the part of your ${topic} that needs the most help.`;
  if (topic && deadline && feeling) return `It makes sense to feel ${feeling} with your ${topic} due ${deadline}.`;
  if (topic && deadline) return `Let’s make your ${topic} due ${deadline} feel more manageable.`;
  if (topic && feeling) return `I hear that the ${topic} is leaving you feeling ${feeling}.`;
  if (topic) return `Let’s work on your ${topic} one clear step at a time.`;
  return `I hear that you’re feeling ${feeling || 'under pressure'}.`;
}

function buildSchoolPlan({ subject, task, concept, deadline, feeling }) {
  const urgent = /today|tonight|tomorrow/.test(deadline);
  let action;
  if (concept === 'fractions') action = 'Try one fraction problem slowly: circle the operation, find a common denominator if you are adding or subtracting, then simplify at the end. Check the answer by estimating whether it should be smaller or larger than one.';
  else if (concept === 'equations') action = 'Write one equation and undo one operation at a time on both sides. After finding the variable, plug it back in to check it.';
  else if (concept === 'geometry') action = 'Draw and label the shape, write the formula beside it, then substitute the numbers with their units before calculating.';
  else if (['cells', 'chemical reactions'].includes(concept)) action = `Explain ${concept} in one sentence, draw a tiny labeled diagram, then check your notes for the first detail you missed.`;
  else if (concept === 'the thesis') action = 'Write one sentence that states your main claim and your strongest reason. Use it as a temporary thesis—you can improve the wording after the ideas are organized.';
  else if (concept === 'the main idea') action = 'After each paragraph, write three to five words about what it mostly says. The idea that connects most of those notes is likely the main idea.';
  else if (concept === 'grammar') action = 'Read one sentence aloud, find its subject and verb, then check only one issue at a time: punctuation, verb tense, or clarity.';
  else if (concept === 'vocabulary') action = 'Choose five terms, cover the definitions, and explain each in your own words with a quick example.';
  else if (concept === 'dates and events') action = 'Make a three-column timeline: date, event, and why it mattered. Practice the cause-and-effect links instead of memorizing isolated dates.';
  else if (task === 'essay') action = 'Open the directions, write a one-sentence main idea, then list three points you could use. Do not edit yet.';
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

function buildSocialResponse(currentText, reflection) {
  if (/\bignored|left out|didn['’]?t answer|did not answer\b/.test(currentText)) {
    return `${reflection} Since you said you felt ignored, try checking what happened without assuming the reason: “I noticed we didn’t talk earlier, and I felt left out. Is everything okay between us?” Choose a calm moment and give them space to explain.`;
  }
  if (/\byelled|shouted|raised (?:their|his|her) voice\b/.test(currentText)) {
    return `${reflection} You could say: “I felt uncomfortable when voices got loud. Can we talk about this more calmly?” If you feel unsafe or this keeps happening, step away and tell a trusted adult.`;
  }
  if (/\bargued|argument|fight|fought\b/.test(currentText)) {
    return `${reflection} Let things cool down first. Then try: “I don’t like how our argument went. I want to understand your side and explain mine without blaming each other. Can we start over?”`;
  }
  if (/\bgroup|partner|project\b.*\b(reply|respond|help|work)\b/.test(currentText)) {
    return `${reflection} Try one clear request: “Could you finish ___ by ___? I can share ___ to help.” A specific task and time are easier to answer than a general reminder.`;
  }
  return `${reflection} Try this three-part message: “I noticed ___.” “I feel ___.” “Could we ___?” Keep it about the situation, not the person. What outcome would feel fair to you?`;
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

function solveMathQuestion(message) {
  const pieces = message.match(/[0-9xX+\-*/().=×÷−\s]+/g) || [];
  const candidate = pieces.map(part => part.trim()).filter(part => /[0-9xX]/.test(part)).sort((a, b) => b.length - a.length)[0];
  if (!candidate) return '';
  const problem = candidate.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '').toLowerCase();
  if (!/^[0-9x+\-*/().=]+$/.test(problem) || problem.length > 100) return '';

  if (problem.includes('=')) {
    const sides = problem.split('=');
    if (sides.length !== 2 || !sides[0] || !sides[1]) return '';
    if (!problem.includes('x')) {
      const leftValue = evaluateArithmetic(sides[0]);
      const rightValue = evaluateArithmetic(sides[1]);
      if (leftValue === null || rightValue === null) return '';
      const trueOrFalse = nearlyEqual(leftValue, rightValue) ? 'true' : 'not true';
      return `The statement is ${trueOrFalse}. The left side equals ${formatNumber(leftValue)}, and the right side equals ${formatNumber(rightValue)}. Work each side separately using the order of operations, then compare them.`;
    }
    const left = parseLinearExpression(sides[0]);
    const right = parseLinearExpression(sides[1]);
    if (!left || !right) return 'I can see this is an equation, but built-in mode only handles basic one-variable linear equations right now. Check the symbols, or connect the live AI for more advanced algebra. I can still help you identify the first step.';
    const xCoefficient = left.x - right.x;
    const constant = right.constant - left.constant;
    if (nearlyEqual(xCoefficient, 0) && nearlyEqual(constant, 0)) {
      return `Both sides are the same expression. Subtract the entire expression from both sides and you get 0 = 0, which is always true. So this equation has infinitely many solutions—every value of x works. Quick check: try x = 2; both sides have the same value.`;
    }
    if (nearlyEqual(xCoefficient, 0)) {
      return `The x-terms cancel, but the constants leave a false statement. That means the equation has no solution—there is no value of x that can make both sides equal.`;
    }
    const solution = constant / xCoefficient;
    return `The solution is x = ${formatNumber(solution)}. Move the x-terms to one side and the constants to the other: ${formatNumber(xCoefficient)}x = ${formatNumber(constant)}. Then divide both sides by ${formatNumber(xCoefficient)}. Check it by replacing x with ${formatNumber(solution)} in the original equation.`;
  }

  if (!problem.includes('x') && /[+\-*/]/.test(problem)) {
    const value = evaluateArithmetic(problem);
    if (value === null) return '';
    return `The answer is ${formatNumber(value)}. Use the order of operations: parentheses first, then multiplication or division, then addition or subtraction. Try working one operation at a time and compare your result with ${formatNumber(value)}.`;
  }
  return '';
}

function parseLinearExpression(expression) {
  if (/[()]/.test(expression) || !expression) return null;
  const normalized = expression.replace(/-/g, '+-').replace(/^\+/, '');
  const terms = normalized.split('+').filter(Boolean);
  let x = 0;
  let constant = 0;
  for (const term of terms) {
    const xCount = (term.match(/x/g) || []).length;
    if (xCount > 1) return null;
    if (xCount === 1) {
      let coefficient = term.replace('x', '').replace(/\*/g, '');
      if (coefficient === '' || coefficient === '+') coefficient = '1';
      if (coefficient === '-') coefficient = '-1';
      if (coefficient.startsWith('/')) coefficient = `1${coefficient}`;
      if (coefficient.startsWith('-/')) coefficient = coefficient.replace('-/', '-1/');
      const value = evaluateArithmetic(coefficient);
      if (value === null) return null;
      x += value;
    } else {
      const value = evaluateArithmetic(term);
      if (value === null) return null;
      constant += value;
    }
  }
  return { x, constant };
}

function evaluateArithmetic(expression) {
  if (!expression || !/^[0-9+\-*/().]+$/.test(expression) || /\*\*|\/\//.test(expression)) return null;
  try {
    const value = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function nearlyEqual(a, b) { return Math.abs(a - b) < 1e-10; }
function formatNumber(value) { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6))); }

function answerKnownConcept(message) {
  const text = message.toLowerCase();
  if (/\b(what is|explain|how does)\b.*\bphotosynthesis\b/.test(text)) return 'Photosynthesis is how plants use light energy to make sugar from carbon dioxide and water. Oxygen is released as a byproduct. A simple model is: light + water + carbon dioxide → glucose + oxygen. Which part—the ingredients, the energy change, or the products—should we unpack?';
  if (/\b(what is|explain|how does)\b.*\bevaporation\b/.test(text)) return 'Evaporation happens when faster-moving molecules at the surface of a liquid escape into the air as gas. Heat usually speeds it up, which is why a puddle disappears faster on a warm day. How would you explain that using a wet shirt drying?';
  if (/\b(what is|explain|how does)\b.*\bgravity\b/.test(text)) return 'Gravity is the attraction between objects with mass. Earth’s large mass pulls objects toward its center, giving them weight and making dropped objects fall. More mass creates stronger gravity, while more distance weakens it.';
  if (/\b(what is|explain|define)\b.*\bmetaphor\b/.test(text)) return 'A metaphor describes one thing as if it were another to create a comparison, without using “like” or “as.” Example: “The classroom was a zoo.” It is not literally a zoo; the comparison suggests noise or chaos. Can you make one about a difficult test?';
  if (/\b(what is|explain|define)\b.*\bthesis\b/.test(text)) return 'A thesis is the main claim an essay will explain or defend. A useful thesis names the topic, states your position, and hints at the main reasons. Think: “I believe ___ because ___ and ___.”';
  return '';
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
