const CRISIS_PATTERN = /\b(kill myself|suicide|suicidal|hurt myself|self[- ]?harm|don['’]?t want to live|do not want to live|end my life)\b/i;
const ROLEPLAY_UNSAFE_PATTERN = /\b(hurt|kill|attack|bully|harass|threaten|poison)\b/i;

function isCrisisMessage(message) { return CRISIS_PATTERN.test(message); }

async function askCoach(message, history = [], image = '', bot = 'stress') {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), 12000) : null;
  let response;
  try {
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: history.slice(-8), image, bot })
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
const BOT_CONFIG = {
  math: {
    name: 'Math Helper', avatar: '∑', status: 'Explains the why, one step at a time',
    greeting: 'Bring me a math problem, graph, or screenshot. There is no timer—we can slow down and work through one step at a time.',
    placeholder: 'Ask math or attach a problem screenshot…',
    prompts: [
      ['Solve for x', 'Solve 7x + 10 = 8x + 10 and show every step.'],
      ['Graph an equation', 'Graph y = 2x + 1 and explain the points.'],
      ['Try geometry', 'Find the hypotenuse of a right triangle with legs 3 and 4.'],
      ['Try advanced math', 'Differentiate 3x^2 + 2x - 5 and show every step.']
    ]
  },
  stress: {
    name: 'Stress Helper', avatar: '☁', status: 'Helps lower the pressure',
    greeting: 'You do not have to solve everything at once. Tell me what feels heavy, and we’ll find one calm, doable next step together.',
    placeholder: 'What feels stressful right now?',
    prompts: [
      ['I feel overwhelmed', 'I feel overwhelmed by my schoolwork. Can you help me choose one small first step?'],
      ['Help me calm down', 'I feel tense right now. Guide me through a short calming exercise.'],
      ['A tough school moment', 'Something stressful happened at school. Can I talk it through?'],
      ['I need a break', 'Help me decide whether to take a short break and how to restart afterward.']
    ]
  },
  planner: {
    name: 'Study Planner', avatar: '✓', status: 'Turns schoolwork into doable pieces',
    greeting: 'Tell me what you need to finish and when it is due. I’ll help you make a realistic plan with breaks and free time included.',
    placeholder: 'What do you need to plan?',
    prompts: [
      ['Plan an assignment', 'Help me break a big assignment into small steps.'],
      ['Study for a test', 'Help me make a low-stress study plan for a test.'],
      ['Choose what comes first', 'I have several tasks. Help me decide what to do first.'],
      ['Make a short routine', 'Help me make a simple after-school routine with time to rest.']
    ]
  },
  chat: {
    name: 'Friendly Chat', avatar: '✦', status: 'Safe, kind everyday conversation',
    greeting: 'Hi! We can chat about your day, interests, ideas, or whatever is on your mind. I’ll be kind, honest, and safe.',
    placeholder: 'Say hello or tell me what’s on your mind…',
    prompts: [
      ['How was my day?', 'Can I tell you about my day?'],
      ['Give me a fun question', 'Ask me a fun, safe question to get a conversation started.'],
      ['Talk about interests', 'I want to talk about something I enjoy.'],
      ['Help me find words', 'Help me put what I am thinking into words.']
    ]
  }
};
const conversations = Object.fromEntries(Object.keys(BOT_CONFIG).map(bot => [bot, []]));
const fallbackNoticeShown = Object.fromEntries(Object.keys(BOT_CONFIG).map(bot => [bot, false]));
let activeBot = 'stress';
let messages = conversations[activeBot];
let sending = false;
let activeAttachment = null;
let ocrLoaderPromise = null;
const MATH_SOLUTION_PREFIX = '__MATH_SOLUTION__';

function switchView(view) {
  $$('.tab').forEach(tab => { const active = tab.dataset.view === view; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
  $$('[data-view-panel]').forEach(panel => { const active = panel.dataset.viewPanel === view; panel.classList.toggle('active', active); panel.hidden = !active; });
  if (view === 'calm') { showGameHub(); $('#calmView').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

function switchBot(bot, initial = false) {
  if (!BOT_CONFIG[bot] || (sending && bot !== activeBot)) return;
  activeBot = bot;
  messages = conversations[bot];
  const config = BOT_CONFIG[bot];
  $$('.bot-choice').forEach(button => {
    const active = button.dataset.bot === bot;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#coach').dataset.bot = bot;
  $('#coachName').textContent = config.name;
  $('#coachStatus').textContent = config.status;
  $('#coachAvatarText').textContent = config.avatar;
  $('#messages').setAttribute('aria-label', `Conversation with ${config.name}`);
  $('#coachInput').placeholder = config.placeholder;
  clearAttachment();
  renderPromptChips();
  renderConversation();
  if (!initial) toast(`Switched to ${config.name}.`);
}

function renderPromptChips() {
  const row = $('#promptRow');
  row.innerHTML = '';
  BOT_CONFIG[activeBot].prompts.forEach(([label, prompt]) => {
    const button = document.createElement('button');
    button.className = 'prompt-chip'; button.type = 'button'; button.textContent = label; button.dataset.prompt = prompt;
    button.addEventListener('click', () => sendMessage(prompt));
    row.append(button);
  });
}

function renderConversation() {
  const host = $('#messages');
  host.innerHTML = '';
  addMessage('assistant', BOT_CONFIG[activeBot].greeting);
  messages.forEach(item => addMessage(item.role, item.display || item.content, false, '', item.image || ''));
  host.scrollTop = host.scrollHeight;
}

function addMessage(role, text, pending = false, notice = '', image = '') {
  const mathSolution = role === 'assistant' ? readMathSolution(text) : null;
  const article = document.createElement('article');
  article.className = `message ${role === 'assistant' ? 'coach-message' : 'user-message'}${pending ? ' pending' : ''}${mathSolution ? ' math-message' : ''}`;
  const avatar = document.createElement('div');
  avatar.className = `mini-avatar ${role === 'user' ? 'user-avatar' : ''}`;
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = role === 'assistant' ? BOT_CONFIG[activeBot].avatar : 'You';
  if (role === 'assistant') article.append(avatar);
  const content = document.createElement('div');
  const label = document.createElement('div');
  label.className = 'message-label';
  const name = document.createElement('strong');
  name.textContent = role === 'assistant' ? BOT_CONFIG[activeBot].name : 'You';
  const time = document.createElement('time');
  time.textContent = 'Now';
  label.append(name, time);
  content.append(label);
  if (image) {
    const preview = document.createElement('img');
    preview.className = 'message-attachment';
    preview.src = image;
    preview.alt = role === 'user' ? 'Attached math problem' : 'Math problem image';
    content.append(preview);
  }
  if (mathSolution) renderMathSolution(content, mathSolution, notice);
  else { const paragraph = document.createElement('p'); paragraph.textContent = `${notice}${text}`; content.append(paragraph); }
  article.append(content);
  if (role === 'user') article.append(avatar);
  const messageHost = $('#messages');
  messageHost.append(article);
  if (mathSolution) setTimeout(() => { messageHost.scrollTop = Math.max(0, article.offsetTop - messageHost.offsetTop - 12); }, 0);
  else messageHost.scrollTop = messageHost.scrollHeight;
  return article;
}

async function sendMessage(text) {
  const image = activeAttachment?.dataUrl || '';
  const message = text.trim() || (image ? 'Please help me understand this math problem step by step.' : '');
  if (!message || sending) return;
  const botAtSend = activeBot;
  if (isCrisisMessage(message)) { addMessage('user', message, false, '', image); clearAttachment(); $('#safetyDialog').showModal(); return; }
  sending = true; $('#coachInput').value = ''; resizeInput(); addMessage('user', message, false, '', image); clearAttachment();
  const pending = addMessage('assistant', 'Thinking with you…', true);
  $$('.prompt-chip, .bot-choice').forEach(button => button.disabled = true); $('.send-button').disabled = true; $('#attachButton').disabled = true; $('#imageInput').disabled = true;
  try {
    const answer = await askCoach(message, messages, image, botAtSend);
    pending.remove(); addMessage('assistant', answer);
    messages.push({ role: 'user', content: message, image }, { role: 'assistant', content: mathSolutionToText(answer), display: answer });
  } catch (error) {
    let answer;
    let imageNotice = '';
    if (image) {
      const pendingText = pending.querySelector('p');
      if (pendingText) pendingText.textContent = 'Reading the problem gently…';
      const extracted = await readMathFromImage(image, progress => {
        if (pendingText && progress > 0.08) pendingText.textContent = `Reading the problem… ${Math.round(progress * 100)}%`;
      });
      answer = extracted ? getBuiltInReply(extracted, messages, 'math') : '';
      if (answer && (readMathSolution(answer) || answerKnownConcept(extracted))) imageNotice = `I read the problem as “${extracted}.” Please check that I copied it correctly. `;
      else answer = 'I could not read the math clearly enough to solve it without guessing. You did nothing wrong—screenshots can be tricky. Try cropping closer to the problem, use brighter lighting, or type the equation you can see. We’ll take it one step at a time.';
    } else answer = getBuiltInReply(message, messages, botAtSend);
    pending.remove();
    const notice = `${fallbackNoticeShown[botAtSend] ? '' : 'I’m using built-in support mode because the live AI is not connected. '}${imageNotice}`;
    addMessage('assistant', answer, false, notice);
    fallbackNoticeShown[botAtSend] = true;
    messages.push({ role: 'user', content: message, image }, { role: 'assistant', content: mathSolutionToText(answer), display: answer });
  } finally {
    sending = false; $$('.prompt-chip, .bot-choice').forEach(button => button.disabled = false); $('.send-button').disabled = false; $('#attachButton').disabled = false; $('#imageInput').disabled = false; $('#coachInput').focus();
  }
}

async function selectAttachment(file) {
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { toast('Choose a PNG, JPG, WEBP, or GIF image.'); return; }
  if (file.size > 8 * 1024 * 1024) { toast('That image is too large. Please choose one under 8 MB.'); return; }
  try {
    const dataUrl = await resizeImage(file, 1600, 1600);
    activeAttachment = { dataUrl, name: file.name || 'Math screenshot' };
    $('#attachmentImage').src = dataUrl;
    $('#attachmentName').textContent = activeAttachment.name;
    $('#attachmentPreview').hidden = false;
    $('#coachInput').focus();
    toast('Image ready. Add a question or press Send.');
  } catch {
    toast('I could not open that image. Please try another one.');
  }
}

function resizeImage(file, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function clearAttachment() {
  activeAttachment = null;
  $('#imageInput').value = '';
  $('#attachmentImage').removeAttribute('src');
  $('#attachmentPreview').hidden = true;
}

async function readMathFromImage(image, onProgress = () => {}) {
  let worker;
  try {
    await loadOcrLibrary();
    worker = await window.Tesseract.createWorker('eng', undefined, {
      logger: status => { if (status.status === 'recognizing text' && Number.isFinite(status.progress)) onProgress(status.progress); }
    });
    await worker.setParameters({
      tessedit_pageseg_mode: '11',
      tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-=*/().^√π% '
    });
    const preparedImage = await prepareImageForOcr(image);
    const result = await worker.recognize(preparedImage);
    const recognizedText = result?.data?.text || '';
    if (new URLSearchParams(window.location.search).has('debug-ocr')) {
      document.documentElement.setAttribute('data-ocr-text', recognizedText.slice(0, 2000));
      document.documentElement.setAttribute('data-ocr-confidence', String(result?.data?.confidence ?? ''));
    }
    return findMathInRecognizedText(recognizedText);
  } catch (error) {
    console.warn('On-device math reading was unavailable:', error?.message || 'unknown OCR error');
    return '';
  } finally {
    if (worker) await worker.terminate().catch(() => {});
  }
}

function prepareImageForOcr(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = reject;
    image.onload = () => {
      const scale = Math.min(2, 2400 / image.width, 1600 / image.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) { reject(new Error('Image processing is unavailable')); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < pixels.data.length; index += 4) {
        const gray = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114;
        const value = gray < 205 ? 0 : 255;
        pixels.data[index] = value; pixels.data[index + 1] = value; pixels.data[index + 2] = value; pixels.data[index + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.src = source;
  });
}

function loadOcrLibrary() {
  if (window.Tesseract) return Promise.resolve();
  if (ocrLoaderPromise) return ocrLoaderPromise;
  ocrLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => window.Tesseract ? resolve() : reject(new Error('OCR did not load'));
    script.onerror = reject;
    document.head.append(script);
  });
  return ocrLoaderPromise;
}

function findMathInRecognizedText(text) {
  let normalizedText = text
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/(\d)\s*[kK]\b/g, '$1x');
  const namedVariable = normalizedText.match(/solve\s+for\s+([a-z])\b/i)?.[1];
  const repeatedVariable = normalizedText.match(/\d\s*([a-z])\s*[+\-=][^\n=]*=\s*[^\n]*\d\s*\1\b/i)?.[1];
  const variable = namedVariable || repeatedVariable;
  if (variable && variable.toLowerCase() !== 'x') {
    normalizedText = normalizedText
      .replace(new RegExp(`(\\d)\\s*${variable}\\b`, 'gi'), '$1x')
      .replace(new RegExp(`\\b${variable}\\b`, 'gi'), 'x');
  }
  const lines = normalizedText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const candidates = [];
  lines.forEach(line => {
    const pieces = line.match(/[0-9xXyYf()+\-*/^.=\s]+/g) || [];
    pieces.forEach(piece => {
      const compact = piece.replace(/\s+/g, ' ').trim().replace(/^\d+[.)]\s*/, '').replace(/^=\s*/, '');
      const usefulCharacters = (compact.match(/[0-9xXyY=+\-*/^]/g) || []).length;
      if (usefulCharacters >= 3 && /\d/.test(compact) && (/[=]/.test(compact) || /[+\-*/^]/.test(compact))) candidates.push(compact);
    });
  });
  const equation = candidates.find(candidate => /=/.test(candidate) && /[xXyY]/.test(candidate));
  return (equation || candidates.sort((a, b) => b.length - a.length)[0] || '').slice(0, 120);
}

function renderMathSolution(content, solution, notice) {
  const card = document.createElement('section');
  card.className = 'math-solution';
  card.setAttribute('aria-label', 'Worked math solution');
  if (notice) { const mode = document.createElement('p'); mode.className = 'mode-note'; mode.textContent = notice.trim(); card.append(mode); }
  const intro = document.createElement('p'); intro.className = 'math-intro'; intro.textContent = solution.intro; card.append(intro);
  if (solution.visual) card.append(createMathVisual(solution.visual));
  const list = document.createElement('ol'); list.className = 'math-steps';
  solution.steps.forEach(step => {
    const item = document.createElement('li');
    const title = document.createElement('strong'); title.textContent = step.title; item.append(title);
    step.equations.forEach(equation => { const line = document.createElement('div'); line.className = 'equation-line'; line.textContent = equation; item.append(line); });
    if (step.note) { const note = document.createElement('p'); note.textContent = step.note; item.append(note); }
    list.append(item);
  });
  card.append(list);
  const answer = document.createElement('div'); answer.className = 'math-answer';
  const answerLabel = document.createElement('span'); answerLabel.textContent = 'Answer';
  const answerValue = document.createElement('strong'); answerValue.textContent = solution.answer;
  answer.append(answerLabel, answerValue); card.append(answer);
  if (solution.check) { const check = document.createElement('p'); check.className = 'math-check'; check.textContent = solution.check; card.append(check); }
  content.append(card);
}

function createMathVisual(visual) {
  const wrap = document.createElement('figure');
  wrap.className = 'math-visual-wrap';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 520 300');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', visual.description || 'Math diagram');
  svg.classList.add('math-visual');
  const title = svgNode('title', {}, visual.description || 'Math diagram'); svg.append(title);
  if (visual.type === 'graph') drawGraph(svg, visual);
  else if (visual.type === 'rightTriangle') drawRightTriangle(svg, visual);
  else if (visual.type === 'triangle') drawTriangle(svg, visual);
  else if (visual.type === 'circle') drawCircle(svg, visual);
  else if (visual.type === 'rectangle') drawRectangle(svg, visual);
  else if (visual.type === 'coordinate') drawCoordinateGeometry(svg, visual);
  wrap.append(svg);
  if (visual.caption) { const caption = document.createElement('figcaption'); caption.textContent = visual.caption; wrap.append(caption); }
  return wrap;
}

function svgNode(name, attributes = {}, text = '') {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  if (text) node.textContent = text;
  return node;
}

function drawGraph(svg, visual) {
  const width = 520, height = 300, pad = 34;
  const xMin = visual.xMin ?? -5, xMax = visual.xMax ?? 5, yMin = visual.yMin ?? -5, yMax = visual.yMax ?? 5;
  const mapX = x => pad + (x - xMin) / (xMax - xMin) * (width - pad * 2);
  const mapY = y => height - pad - (y - yMin) / (yMax - yMin) * (height - pad * 2);
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
    svg.append(svgNode('line', { x1: mapX(x), y1: pad, x2: mapX(x), y2: height - pad, class: x === 0 ? 'axis' : 'grid-line' }));
    if (x !== 0) svg.append(svgNode('text', { x: mapX(x), y: mapY(0) + 17, class: 'axis-label', 'text-anchor': 'middle' }, String(x)));
  }
  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
    svg.append(svgNode('line', { x1: pad, y1: mapY(y), x2: width - pad, y2: mapY(y), class: y === 0 ? 'axis' : 'grid-line' }));
    if (y !== 0) svg.append(svgNode('text', { x: mapX(0) - 9, y: mapY(y) + 4, class: 'axis-label', 'text-anchor': 'end' }, String(y)));
  }
  const visible = visual.points.filter(point => point[0] >= xMin && point[0] <= xMax && point[1] >= yMin && point[1] <= yMax);
  if (visible.length > 1) svg.append(svgNode('polyline', { points: visible.map(point => `${mapX(point[0])},${mapY(point[1])}`).join(' '), class: 'graph-curve' }));
  (visual.keyPoints || []).forEach(point => {
    svg.append(svgNode('circle', { cx: mapX(point[0]), cy: mapY(point[1]), r: 5, class: 'graph-point' }));
    svg.append(svgNode('text', { x: mapX(point[0]) + 8, y: mapY(point[1]) - 9, class: 'point-label' }, `(${formatNumber(point[0])}, ${formatNumber(point[1])})`));
  });
  svg.append(svgNode('text', { x: width - pad, y: 22, class: 'graph-title', 'text-anchor': 'end' }, visual.label));
}

function drawRightTriangle(svg, visual) {
  svg.append(svgNode('polygon', { points: '95,245 95,65 410,245', class: 'shape-fill' }));
  svg.append(svgNode('polyline', { points: '95,245 95,65 410,245 95,245', class: 'shape-line' }));
  svg.append(svgNode('polyline', { points: '95,222 118,222 118,245', class: 'right-angle' }));
  svg.append(svgNode('text', { x: 65, y: 158, class: 'shape-label', 'text-anchor': 'middle' }, visual.aLabel));
  svg.append(svgNode('text', { x: 255, y: 274, class: 'shape-label', 'text-anchor': 'middle' }, visual.bLabel));
  svg.append(svgNode('text', { x: 270, y: 135, class: 'shape-label', transform: 'rotate(30 270 135)', 'text-anchor': 'middle' }, visual.cLabel));
}

function drawTriangle(svg, visual) {
  svg.append(svgNode('polygon', { points: '70,245 450,245 285,55', class: 'shape-fill' }));
  svg.append(svgNode('polyline', { points: '70,245 450,245 285,55 70,245', class: 'shape-line' }));
  svg.append(svgNode('line', { x1: 285, y1: 55, x2: 285, y2: 245, class: 'measure-line' }));
  svg.append(svgNode('text', { x: 260, y: 155, class: 'shape-label', 'text-anchor': 'end' }, `h = ${visual.height}`));
  svg.append(svgNode('text', { x: 260, y: 276, class: 'shape-label', 'text-anchor': 'middle' }, `b = ${visual.base}`));
}

function drawCircle(svg, visual) {
  svg.append(svgNode('circle', { cx: 260, cy: 150, r: 105, class: 'shape-fill' }));
  svg.append(svgNode('circle', { cx: 260, cy: 150, r: 105, class: 'shape-line' }));
  svg.append(svgNode('line', { x1: 260, y1: 150, x2: 365, y2: 150, class: 'measure-line' }));
  svg.append(svgNode('circle', { cx: 260, cy: 150, r: 4, class: 'graph-point' }));
  svg.append(svgNode('text', { x: 315, y: 138, class: 'shape-label', 'text-anchor': 'middle' }, `r = ${visual.radius}`));
}

function drawRectangle(svg, visual) {
  svg.append(svgNode('rect', { x: 90, y: 65, width: 340, height: 180, rx: 3, class: 'shape-fill' }));
  svg.append(svgNode('rect', { x: 90, y: 65, width: 340, height: 180, rx: 3, class: 'shape-line' }));
  svg.append(svgNode('text', { x: 260, y: 274, class: 'shape-label', 'text-anchor': 'middle' }, `length = ${visual.length}`));
  svg.append(svgNode('text', { x: 55, y: 160, class: 'shape-label', 'text-anchor': 'middle', transform: 'rotate(-90 55 160)' }, `width = ${visual.width}`));
}

function drawCoordinateGeometry(svg, visual) {
  drawGraph(svg, { type: 'graph', label: visual.label, points: [visual.a, visual.b], keyPoints: [visual.a, visual.b], xMin: visual.xMin, xMax: visual.xMax, yMin: visual.yMin, yMax: visual.yMax });
}

function createMathSolution(solution) { return `${MATH_SOLUTION_PREFIX}${JSON.stringify(solution)}`; }
function readMathSolution(value) {
  if (typeof value !== 'string' || !value.startsWith(MATH_SOLUTION_PREFIX)) return null;
  try { return JSON.parse(value.slice(MATH_SOLUTION_PREFIX.length)); } catch { return null; }
}
function mathSolutionToText(value) {
  const solution = readMathSolution(value);
  if (!solution) return value;
  const steps = solution.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.equations.join(' → ')}`).join(' ');
  return `${solution.intro} ${steps} Answer: ${solution.answer}. ${solution.check || ''}`.trim();
}

function getBuiltInReply(message, history = [], bot = 'stress') {
  const recentUserMessages = history.filter(item => item.role === 'user').slice(-3);
  const recentUserText = recentUserMessages.map(item => item.content).join(' ');
  const hasPriorUserContext = recentUserMessages.length > 0;
  const currentText = message.toLowerCase();
  const text = redactPrivateDetails(`${recentUserText} ${message}`).toLowerCase();
  if (/\b(how (?:do|can) i|help me|tell me how to|i (?:want|plan|need) to)\b.{0,50}\b(hurt|kill|attack|bully|harass|poison|threaten)\b/.test(message.toLowerCase())) {
    return 'I can’t help hurt, threaten, or target someone. Step away from the situation and tell a trusted adult what is happening. If there is immediate danger, call emergency services.';
  }
  const visualMathAnswer = solveGraphQuestion(message) || solveGeometryQuestion(message);
  if (visualMathAnswer) return visualMathAnswer;
  const extendedMathAnswer = solveExtendedMathQuestion(message);
  if (extendedMathAnswer) return extendedMathAnswer;
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

  if (isGreeting) {
    if (bot === 'math') return 'Hi! Send me a math problem or attach a clear screenshot. I’ll explain each step and why it works—no rush.';
    if (bot === 'planner') return 'Hi! Tell me what you need to finish, when it is due, and roughly how much time you have. We’ll make a realistic plan with breaks.';
    if (bot === 'chat') return 'Hi! I’m glad you stopped by. What would you enjoy talking about today?';
    return 'Hi! I’m here with you. Tell me what is happening and whether you want me to listen, help you calm down, or find one next step.';
  }

  const reflection = buildReflection({ feeling, subject, task, concept, deadline, isSocial });
  if (bot === 'math') {
    return 'I’m ready to work through the math with you. Please type the full equation or question, include the given measurements, or attach a clear screenshot. If there is a diagram, tell me which values and angles are labeled.';
  }
  if (bot === 'planner') return buildPlannerBotResponse({ message, subject, task, deadline, feeling });
  if (bot === 'chat') return buildFriendlyChatResponse(message, feeling, hasPriorUserContext);
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

function buildPlannerBotResponse({ message, subject, task, deadline, feeling }) {
  const text = message.toLowerCase();
  if (!task && !subject && !deadline && !/\b(plan|study|finish|due|schedule|routine|first)\b/.test(text)) {
    return 'Let’s make this manageable. What do you need to finish, when is it due, and about how much time do you have today?';
  }
  const topic = [subject, task].filter(Boolean).join(' ') || 'schoolwork';
  const timing = deadline ? ` due ${deadline}` : '';
  const opening = feeling ? `Since you’re feeling ${feeling}, we’ll keep the plan light.` : 'Let’s make a plan that leaves room to breathe.';
  return `${opening}\n\n1. Write the exact finish line for your ${topic}${timing}.\n2. Work for 15 minutes on the smallest visible piece.\n3. Take a 5-minute water or stretch break.\n4. Decide whether to do one more 15-minute round.\n\nWhat is the very first piece you can finish in one short round?`;
}

function buildFriendlyChatResponse(message, feeling, hasPriorContext) {
  const text = message.toLowerCase();
  if (/\b(fun|question|conversation starter)\b/.test(text)) return 'Here’s a fun one: if you could instantly become great at one safe skill—drawing, cooking, a sport, music, coding, or something else—which would you choose, and why?';
  if (/\b(day|today)\b/.test(text)) return 'Of course—you can tell me about your day. What moment stands out most: something good, something difficult, or something surprising?';
  if (/\b(enjoy|interest|hobby|favorite|like)\b/.test(text)) return 'I’d like to hear about it. What do you enjoy, and what makes it interesting to you?';
  if (feeling && !hasPriorContext) return `I hear that you’re feeling ${feeling}. I won’t assume why. Do you want to tell me what happened, or would you rather talk about something lighter for a little while?`;
  return `I’m listening. You said, “${shortQuote(message)}.” What part of that would you like to talk about more?`;
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

function solveGraphQuestion(message) {
  const match = message.match(/(?:y|f\s*\(\s*x\s*\))\s*=\s*(.+)/i);
  if (!match || !/\b(graph|plot|draw|sketch)|(?:y|f\s*\(\s*x\s*\))\s*=/i.test(message)) return '';
  const prefix = match[1].match(/^((?:(?:sin|cos|sqrt|abs)|[0-9x+\-*/^().\s])+)/i);
  const expression = prefix ? prefix[1].trim() : '';
  const evaluator = compileGraphExpression(expression);
  if (!evaluator) return '';
  const points = [];
  for (let x = -5; x <= 5.0001; x += 0.1) {
    const y = evaluator(x);
    if (Number.isFinite(y) && Math.abs(y) <= 20) points.push([Number(x.toFixed(3)), Number(y.toFixed(5))]);
  }
  if (points.length < 2) return '';
  const compact = expression.replace(/\s+/g, '').replace(/\*/g, '');
  const linear = !/[\^()]|sin|cos|sqrt|abs/i.test(compact) ? parseLinearExpression(compact) : null;
  const keyPoints = [];
  const steps = [];
  if (linear) {
    const y0 = linear.constant;
    const y1 = linear.x + linear.constant;
    keyPoints.push([0, y0], [1, y1]);
    steps.push({ title: 'Identify the slope and y-intercept', equations: [`slope = ${formatNumber(linear.x)}`, `y-intercept = (0, ${formatNumber(y0)})`] });
    steps.push({ title: 'Plot two points', equations: [`(0, ${formatNumber(y0)})`, `(1, ${formatNumber(y1)})`] });
    steps.push({ title: 'Draw the line through the points', equations: [`y = ${prettyExpression(expression)}`] });
  } else {
    const tableXs = [-2, -1, 0, 1, 2];
    const table = tableXs.map(x => [x, evaluator(x)]).filter(point => Number.isFinite(point[1]));
    keyPoints.push(...table.filter(point => Math.abs(point[1]) <= 5));
    steps.push({ title: 'Make a small table of values', equations: table.map(point => `x = ${point[0]}  →  y = ${formatNumber(point[1])}`) });
    steps.push({ title: 'Plot the points and connect the pattern', equations: [`y = ${prettyExpression(expression)}`] });
  }
  return createMathSolution({
    intro: `Let’s graph y = ${prettyExpression(expression)}.`,
    visual: { type: 'graph', label: `y = ${prettyExpression(expression)}`, points, keyPoints, xMin: -5, xMax: 5, yMin: -5, yMax: 5, description: `Coordinate graph of y equals ${expression}`, caption: 'Use the labeled points to connect the equation to the graph.' },
    steps,
    answer: `Graph of y = ${prettyExpression(expression)}`,
    check: 'Pick another x-value, calculate y, and check that the point lands on the curve.'
  });
}

function compileGraphExpression(expression) {
  if (!expression || expression.length > 100) return null;
  const compact = expression.toLowerCase().replace(/\s+/g, '');
  const residue = compact.replace(/sin|cos|sqrt|abs/g, '');
  if (!/^[0-9x+\-*/^().]+$/.test(residue)) return null;
  let javascript = compact
    .replace(/(\d)(x)/g, '$1*$2')
    .replace(/(\d|x|\))(?=(?:sin|cos|sqrt|abs)\()/g, '$1*')
    .replace(/(\d|x|\))(?=\()/g, '$1*')
    .replace(/\)(?=\d|x)/g, ')*')
    .replace(/\^/g, '**')
    .replace(/sin\(/g, 'Math.sin(').replace(/cos\(/g, 'Math.cos(').replace(/sqrt\(/g, 'Math.sqrt(').replace(/abs\(/g, 'Math.abs(');
  try {
    const fn = Function('x', `"use strict"; return (${javascript});`);
    const test = fn(0);
    if (typeof test !== 'number') return null;
    return x => { try { return Number(fn(x)); } catch { return NaN; } };
  } catch { return null; }
}

function solveGeometryQuestion(message) {
  const text = message.toLowerCase().replace(/×/g, 'x');
  const coordinate = solveCoordinateQuestion(text);
  if (coordinate) return coordinate;

  if (/\b(sphere|cylinder|cone|cube|rectangular prism)\b/.test(text) && /\b(volume|surface area)\b/.test(text)) {
    const radius = namedNumber(text, 'radius|r');
    const height = namedNumber(text, 'height|h');
    const side = namedNumber(text, 'side|s');
    const length = namedNumber(text, 'length|l');
    const width = namedNumber(text, 'width|w');
    let shape = '', formula = '', substitution = '', value = null, units = '';
    const surface = /surface area/.test(text);
    if (/\bsphere\b/.test(text) && radius !== null && radius > 0) {
      shape = 'sphere'; formula = surface ? 'SA = 4πr²' : 'V = ⁴⁄₃πr³';
      value = surface ? 4 * Math.PI * radius ** 2 : 4 / 3 * Math.PI * radius ** 3;
      substitution = surface ? `SA = 4π(${formatNumber(radius)})²` : `V = ⁴⁄₃π(${formatNumber(radius)})³`;
      units = surface ? 'square units' : 'cubic units';
    } else if (/\bcylinder\b/.test(text) && radius !== null && height !== null && radius > 0 && height > 0) {
      shape = 'cylinder'; formula = surface ? 'SA = 2πr² + 2πrh' : 'V = πr²h';
      value = surface ? 2 * Math.PI * radius ** 2 + 2 * Math.PI * radius * height : Math.PI * radius ** 2 * height;
      substitution = surface ? `SA = 2π(${formatNumber(radius)})² + 2π(${formatNumber(radius)})(${formatNumber(height)})` : `V = π(${formatNumber(radius)})²(${formatNumber(height)})`;
      units = surface ? 'square units' : 'cubic units';
    } else if (/\bcone\b/.test(text) && !surface && radius !== null && height !== null && radius > 0 && height > 0) {
      shape = 'cone'; formula = 'V = ⅓πr²h'; value = Math.PI * radius ** 2 * height / 3;
      substitution = `V = ⅓π(${formatNumber(radius)})²(${formatNumber(height)})`; units = 'cubic units';
    } else if (/\bcube\b/.test(text) && side !== null && side > 0) {
      shape = 'cube'; formula = surface ? 'SA = 6s²' : 'V = s³'; value = surface ? 6 * side ** 2 : side ** 3;
      substitution = surface ? `SA = 6(${formatNumber(side)})²` : `V = (${formatNumber(side)})³`; units = surface ? 'square units' : 'cubic units';
    } else if (/\brectangular prism\b/.test(text) && length !== null && width !== null && height !== null && length > 0 && width > 0 && height > 0) {
      shape = 'rectangular prism'; formula = surface ? 'SA = 2(lw + lh + wh)' : 'V = lwh';
      value = surface ? 2 * (length * width + length * height + width * height) : length * width * height;
      substitution = surface ? `SA = 2((${length})(${width}) + (${length})(${height}) + (${width})(${height}))` : `V = (${length})(${width})(${height})`;
      units = surface ? 'square units' : 'cubic units';
    }
    if (value !== null) return createMathSolution({ intro: `Let’s find the ${surface ? 'surface area' : 'volume'} of the ${shape}.`, steps: [{ title: 'Write the formula', equations: [formula] }, { title: 'Substitute the measurements', equations: [substitution] }, { title: 'Calculate', equations: [`${surface ? 'SA' : 'V'} ≈ ${formatNumber(value)}`] }], answer: `${formatNumber(value)} ${units}`, check: `A ${surface ? 'surface-area' : 'volume'} answer uses ${units}.` });
  }

  if (/\b(circle|circumference|radius|diameter)\b/.test(text)) {
    let radius = namedNumber(text, 'radius|r');
    const diameter = namedNumber(text, 'diameter|d');
    if (radius === null && diameter !== null) radius = diameter / 2;
    if (radius !== null && radius > 0) {
      const wantsCircumference = /circumference|perimeter/.test(text);
      const value = wantsCircumference ? 2 * Math.PI * radius : Math.PI * radius * radius;
      const formula = wantsCircumference ? 'C = 2πr' : 'A = πr²';
      return createMathSolution({
        intro: `Let’s find the ${wantsCircumference ? 'circumference' : 'area'} of a circle with radius ${formatNumber(radius)}.`,
        visual: { type: 'circle', radius: formatNumber(radius), description: `Circle with radius ${formatNumber(radius)}`, caption: 'The radius goes from the center to the edge.' },
        steps: [
          { title: 'Write the formula', equations: [formula] },
          { title: 'Substitute the radius', equations: [wantsCircumference ? `C = 2π(${formatNumber(radius)})` : `A = π(${formatNumber(radius)})²`] },
          { title: 'Calculate', equations: [`${wantsCircumference ? 'C' : 'A'} ≈ ${formatNumber(value)}`] }
        ],
        answer: `${formatNumber(value)} ${wantsCircumference ? 'units' : 'square units'}`,
        check: wantsCircumference ? 'The circumference should be a little more than six times the radius.' : 'Area uses square units because it measures the space inside the circle.'
      });
    }
  }

  if (/\b(rectangle|rectangular)\b/.test(text)) {
    const length = namedNumber(text, 'length|long');
    const width = namedNumber(text, 'width|wide');
    if (length !== null && width !== null && length > 0 && width > 0) {
      const wantsPerimeter = /perimeter/.test(text);
      const value = wantsPerimeter ? 2 * (length + width) : length * width;
      return createMathSolution({
        intro: `Let’s find the ${wantsPerimeter ? 'perimeter' : 'area'} of a rectangle that is ${formatNumber(length)} by ${formatNumber(width)}.`,
        visual: { type: 'rectangle', length: formatNumber(length), width: formatNumber(width), description: `Rectangle with length ${length} and width ${width}` },
        steps: [
          { title: 'Write the formula', equations: [wantsPerimeter ? 'P = 2(l + w)' : 'A = l × w'] },
          { title: 'Substitute the measurements', equations: [wantsPerimeter ? `P = 2(${formatNumber(length)} + ${formatNumber(width)})` : `A = ${formatNumber(length)} × ${formatNumber(width)}`] },
          { title: 'Calculate', equations: [`${wantsPerimeter ? 'P' : 'A'} = ${formatNumber(value)}`] }
        ],
        answer: `${formatNumber(value)} ${wantsPerimeter ? 'units' : 'square units'}`,
        check: wantsPerimeter ? 'Add all four sides to verify the perimeter.' : 'Area uses square units.'
      });
    }
  }

  if (/\b(right triangle|hypotenuse|pythagorean)\b/.test(text)) {
    const numbers = extractNumbers(text);
    const hypotenuse = namedNumber(text, 'hypotenuse|c');
    if (numbers.length >= 2) {
      let a = numbers[0], b = numbers[1], c, finding = 'hypotenuse';
      if (hypotenuse !== null && /(?:other|missing) (?:leg|side)|find (?:a|b|leg)/.test(text)) {
        c = hypotenuse;
        a = numbers.find(number => !nearlyEqual(number, c));
        if (a === undefined || c <= a) return '';
        b = Math.sqrt(c * c - a * a);
        finding = 'leg';
      } else c = Math.sqrt(a * a + b * b);
      const equations = finding === 'hypotenuse' ? [`c² = ${formatNumber(a)}² + ${formatNumber(b)}²`, `c² = ${formatNumber(a * a + b * b)}`, `c = √${formatNumber(a * a + b * b)} = ${formatNumber(c)}`] : [`b² = ${formatNumber(c)}² − ${formatNumber(a)}²`, `b² = ${formatNumber(c * c - a * a)}`, `b = √${formatNumber(c * c - a * a)} = ${formatNumber(b)}`];
      return createMathSolution({
        intro: `Let’s use the Pythagorean theorem to find the missing ${finding}.`,
        visual: { type: 'rightTriangle', aLabel: formatNumber(a), bLabel: finding === 'leg' ? '?' : formatNumber(b), cLabel: finding === 'hypotenuse' ? '?' : formatNumber(c), description: 'Right triangle with labeled sides', caption: 'The side opposite the right angle is the hypotenuse.' },
        steps: [
          { title: 'Write the Pythagorean theorem', equations: ['a² + b² = c²'] },
          { title: 'Substitute and solve', equations }
        ],
        answer: `${finding === 'hypotenuse' ? 'c' : 'b'} = ${formatNumber(finding === 'hypotenuse' ? c : b)}`,
        check: finding === 'hypotenuse' ? 'The hypotenuse should be longer than either leg.' : 'Square all three sides and confirm that a² + b² = c².'
      });
    }
  }

  if (/\btriangle\b/.test(text) && /\barea\b/.test(text)) {
    const base = namedNumber(text, 'base|b');
    const height = namedNumber(text, 'height|h');
    if (base !== null && height !== null && base > 0 && height > 0) {
      const area = base * height / 2;
      return createMathSolution({
        intro: `Let’s find the area of a triangle with base ${formatNumber(base)} and height ${formatNumber(height)}.`,
        visual: { type: 'triangle', base: formatNumber(base), height: formatNumber(height), description: `Triangle with base ${base} and perpendicular height ${height}` },
        steps: [
          { title: 'Write the formula', equations: ['A = ½bh'] },
          { title: 'Substitute the measurements', equations: [`A = ½(${formatNumber(base)})(${formatNumber(height)})`] },
          { title: 'Calculate', equations: [`A = ${formatNumber(area)}`] }
        ],
        answer: `${formatNumber(area)} square units`,
        check: 'A triangle with the same base and height has half the area of a rectangle.'
      });
    }
  }
  return '';
}

function solveCoordinateQuestion(text) {
  const pointMatches = [...text.matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)];
  if (pointMatches.length < 2 || !/\b(slope|distance|midpoint|coordinate)\b/.test(text)) return '';
  const a = [Number(pointMatches[0][1]), Number(pointMatches[0][2])];
  const b = [Number(pointMatches[1][1]), Number(pointMatches[1][2])];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const centerX = (a[0] + b[0]) / 2, centerY = (a[1] + b[1]) / 2;
  const span = Math.max(5, Math.abs(dx), Math.abs(dy)) + 2;
  const visual = { type: 'coordinate', a, b, label: 'Line through the two points', xMin: Math.floor(centerX - span / 2), xMax: Math.ceil(centerX + span / 2), yMin: Math.floor(centerY - span / 2), yMax: Math.ceil(centerY + span / 2), description: `Coordinate plane showing points (${a.join(', ')}) and (${b.join(', ')})` };
  if (/\bmidpoint\b/.test(text)) {
    return createMathSolution({ intro: `Let’s find the midpoint of (${a.join(', ')}) and (${b.join(', ')}).`, visual, steps: [{ title: 'Average the x-coordinates and y-coordinates', equations: [`M = ((${a[0]} + ${b[0]}) ÷ 2, (${a[1]} + ${b[1]}) ÷ 2)`, `M = (${formatNumber(centerX)}, ${formatNumber(centerY)})`] }], answer: `(${formatNumber(centerX)}, ${formatNumber(centerY)})`, check: 'The midpoint should sit halfway between the two plotted points.' });
  }
  if (/\bdistance\b/.test(text)) {
    const distance = Math.sqrt(dx * dx + dy * dy);
    return createMathSolution({ intro: `Let’s find the distance between (${a.join(', ')}) and (${b.join(', ')}).`, visual, steps: [{ title: 'Use the distance formula', equations: ['d = √((x₂ − x₁)² + (y₂ − y₁)²)', `d = √((${formatNumber(dx)})² + (${formatNumber(dy)})²)`, `d = ${formatNumber(distance)}`] }], answer: `${formatNumber(distance)} units`, check: 'The distance is the hypotenuse of the horizontal and vertical changes.' });
  }
  const slope = nearlyEqual(dx, 0) ? null : dy / dx;
  return createMathSolution({ intro: `Let’s find the slope through (${a.join(', ')}) and (${b.join(', ')}).`, visual, steps: [{ title: 'Use rise over run', equations: ['m = (y₂ − y₁) ÷ (x₂ − x₁)', `m = (${b[1]} − ${a[1]}) ÷ (${b[0]} − ${a[0]})`, slope === null ? 'The run is 0, so the slope is undefined.' : `m = ${formatNumber(slope)}`] }], answer: slope === null ? 'Undefined slope' : `m = ${formatNumber(slope)}`, check: slope === null ? 'A vertical line has an undefined slope.' : 'Count the rise and run between the plotted points.' });
}

function namedNumber(text, names) {
  const match = text.match(new RegExp(`\\b(?:${names})\\b\\s*(?:=|is|of|measures?|:)?\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'));
  return match ? Number(match[1]) : null;
}

function extractNumbers(text) { return [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0])); }

function solveExtendedMathQuestion(message) {
  const text = message.toLowerCase().replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
  return solveFractionQuestion(text)
    || solvePercentQuestion(text)
    || solveStatisticsQuestion(text)
    || solveProbabilityQuestion(text)
    || solveDiscreteQuestion(text)
    || solveCalculusQuestion(text)
    || solveQuadraticQuestion(text)
    || solveTrigonometryQuestion(text)
    || solveSequenceQuestion(text)
    || solveLinearAlgebraQuestion(text);
}

function solveFractionQuestion(text) {
  const match = text.match(/(-?\d+)\s*\/\s*(-?\d+)\s*([+\-*/])\s*(-?\d+)\s*\/\s*(-?\d+)/);
  if (!match) return '';
  const a = Number(match[1]), b = Number(match[2]), operation = match[3], c = Number(match[4]), d = Number(match[5]);
  if (b === 0 || d === 0 || (operation === '/' && c === 0)) return '';
  let numerator, denominator, setup, method;
  if (operation === '+' || operation === '-') {
    numerator = operation === '+' ? a * d + c * b : a * d - c * b;
    denominator = b * d;
    setup = `${a}/${b} ${operation} ${c}/${d} = (${a} × ${d} ${operation} ${c} × ${b}) / (${b} × ${d})`;
    method = 'Use a common denominator';
  } else if (operation === '*') {
    numerator = a * c; denominator = b * d;
    setup = `${a}/${b} × ${c}/${d} = (${a} × ${c}) / (${b} × ${d})`;
    method = 'Multiply the numerators and denominators';
  } else {
    numerator = a * d; denominator = b * c;
    setup = `${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c}`;
    method = 'Multiply by the reciprocal';
  }
  if (denominator < 0) { numerator *= -1; denominator *= -1; }
  const divisor = greatestCommonDivisor(Math.abs(numerator), Math.abs(denominator));
  const simpleNumerator = numerator / divisor, simpleDenominator = denominator / divisor;
  const answer = simpleDenominator === 1 ? String(simpleNumerator) : `${simpleNumerator}/${simpleDenominator}`;
  return createMathSolution({
    intro: `Let’s work with the fractions in ${match[0]}.`,
    steps: [
      { title: method, equations: [setup, `${numerator}/${denominator}`] },
      { title: `Simplify by dividing by ${divisor}`, equations: [`${numerator} ÷ ${divisor}  /  ${denominator} ÷ ${divisor}`, answer] }
    ],
    answer,
    check: `The decimal value is ${formatNumber(simpleNumerator / simpleDenominator)}.`
  });
}

function solvePercentQuestion(text) {
  let match = text.match(/(?:what\s+is\s+|find\s+)?(-?\d+(?:\.\d+)?)\s*%\s+of\s+(-?\d+(?:\.\d+)?)/);
  if (match) {
    const percent = Number(match[1]), whole = Number(match[2]), value = percent / 100 * whole;
    return createMathSolution({ intro: `Let’s find ${formatNumber(percent)}% of ${formatNumber(whole)}.`, steps: [{ title: 'Change the percent to a decimal', equations: [`${formatNumber(percent)}% = ${formatNumber(percent / 100)}`] }, { title: 'Multiply by the whole', equations: [`${formatNumber(percent / 100)} × ${formatNumber(whole)} = ${formatNumber(value)}`] }], answer: formatNumber(value), check: percent >= 0 && percent <= 100 ? 'The answer should be between 0 and the whole amount.' : 'A percent above 100% can be larger than the whole amount.' });
  }
  match = text.match(/(increase|decrease)\s+(-?\d+(?:\.\d+)?)\s+by\s+(-?\d+(?:\.\d+)?)\s*%/);
  if (!match) return '';
  const direction = match[1], original = Number(match[2]), percent = Number(match[3]);
  const change = original * percent / 100;
  const result = direction === 'increase' ? original + change : original - change;
  return createMathSolution({ intro: `Let’s ${direction} ${formatNumber(original)} by ${formatNumber(percent)}%.`, steps: [{ title: 'Find the amount of change', equations: [`${formatNumber(original)} × ${formatNumber(percent / 100)} = ${formatNumber(change)}`] }, { title: `${direction === 'increase' ? 'Add' : 'Subtract'} the change`, equations: [`${formatNumber(original)} ${direction === 'increase' ? '+' : '−'} ${formatNumber(change)} = ${formatNumber(result)}`] }], answer: formatNumber(result), check: `The result should be ${direction === 'increase' ? 'greater' : 'less'} than ${formatNumber(original)}.` });
}

function solveStatisticsQuestion(text) {
  const requested = ['mean', 'median', 'mode', 'range'].filter(word => new RegExp(`\\b${word}\\b`).test(text));
  if (!requested.length || !/\d/.test(text)) return '';
  const listText = text.includes(':') ? text.slice(text.indexOf(':') + 1) : text.replace(/.*?\b(?:mean|median|mode|range)\b(?:\s+of)?/i, '');
  const values = extractNumbers(listText);
  if (values.length < 2) return '';
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((total, value) => total + value, 0);
  const mean = sum / values.length;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const counts = new Map(); values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  const maxCount = Math.max(...counts.values());
  const modes = maxCount === 1 ? [] : [...counts].filter(([, count]) => count === maxCount).map(([value]) => value);
  const results = { mean: formatNumber(mean), median: formatNumber(median), mode: modes.length ? modes.join(', ') : 'no mode', range: formatNumber(sorted.at(-1) - sorted[0]) };
  const targets = requested.length === 1 ? requested : ['mean', 'median', 'mode', 'range'];
  const steps = [];
  if (targets.includes('mean')) steps.push({ title: 'Mean: add, then divide by how many values', equations: [`(${values.join(' + ')}) ÷ ${values.length} = ${formatNumber(sum)} ÷ ${values.length}`, `mean = ${results.mean}`] });
  if (targets.includes('median')) steps.push({ title: 'Median: order the values and find the middle', equations: [sorted.join(', '), `median = ${results.median}`] });
  if (targets.includes('mode')) steps.push({ title: 'Mode: find the value that appears most', equations: [`mode = ${results.mode}`] });
  if (targets.includes('range')) steps.push({ title: 'Range: subtract the smallest from the largest', equations: [`${formatNumber(sorted.at(-1))} − ${formatNumber(sorted[0])} = ${results.range}`] });
  return createMathSolution({ intro: `Let’s analyze the data: ${values.join(', ')}.`, steps, answer: targets.map(target => `${target} = ${results[target]}`).join('; '), check: 'Recount the data values and make sure they are in order before checking the median and range.' });
}

function solveProbabilityQuestion(text) {
  if (!/\b(probability|chance|likelihood)\b/.test(text)) return '';
  const pairs = [...text.matchAll(/(\d+)\s+([a-z]+)(?:\s+(?:items?|balls?|marbles?|cards?))?/g)].map(match => ({ count: Number(match[1]), label: match[2] }));
  if (pairs.length < 2) return '';
  const wantedMatch = text.match(/(?:probability|chance|likelihood)(?:\s+of)?(?:\s+(?:choosing|picking|drawing|getting))?\s+(?:a\s+)?([a-z]+)/);
  const wanted = wantedMatch ? wantedMatch[1] : pairs[0].label;
  const favorable = pairs.find(pair => pair.label === wanted) || pairs[0];
  const total = pairs.reduce((sum, pair) => sum + pair.count, 0);
  const divisor = greatestCommonDivisor(favorable.count, total);
  const fraction = `${favorable.count / divisor}/${total / divisor}`;
  return createMathSolution({ intro: `Let’s find the probability of choosing ${favorable.label}.`, steps: [{ title: 'Count favorable outcomes and total outcomes', equations: [`favorable = ${favorable.count}`, `total = ${pairs.map(pair => pair.count).join(' + ')} = ${total}`] }, { title: 'Divide favorable outcomes by total outcomes', equations: [`P(${favorable.label}) = ${favorable.count}/${total}`, `P(${favorable.label}) = ${fraction} = ${formatNumber(favorable.count / total * 100)}%`] }], answer: `${fraction} or ${formatNumber(favorable.count / total * 100)}%`, check: 'A probability must be between 0% and 100%.' });
}

function solveDiscreteQuestion(text) {
  let match = text.match(/(?:factorial\s+(?:of\s+)?|\b)(\d+)\s*!/);
  if (match) {
    const n = Number(match[1]); if (n > 170) return '';
    const value = factorial(n);
    return createMathSolution({ intro: `Let’s calculate ${n} factorial.`, steps: [{ title: 'Multiply every positive integer down to 1', equations: [`${n}! = ${Array.from({ length: Math.min(n, 10) }, (_, index) => n - index).join(' × ')}${n > 10 ? ' × … × 1' : ''}`, `${n}! = ${formatLargeNumber(value)}`] }], answer: formatLargeNumber(value), check: `${n}! = ${n} × ${Math.max(0, n - 1)}!` });
  }
  match = text.match(/(\d+)\s*(?:choose|c)\s*(\d+)|combination\w*\D+(\d+)\D+(\d+)/);
  if (match) {
    const n = Number(match[1] || match[3]), r = Number(match[2] || match[4]);
    if (r > n || n > 170) return '';
    const value = factorial(n) / (factorial(r) * factorial(n - r));
    return createMathSolution({ intro: `Let’s find how many groups of ${r} can be chosen from ${n} when order does not matter.`, steps: [{ title: 'Use the combinations formula', equations: ['nCr = n! / (r!(n − r)!)', `${n}C${r} = ${n}! / (${r}!(${n - r})!)`, `${n}C${r} = ${formatLargeNumber(value)}`] }], answer: formatLargeNumber(value), check: `${n}C${r} should equal ${n}C${n - r}.` });
  }
  match = text.match(/(\d+)\s*p\s*(\d+)|permutation\w*\D+(\d+)\D+(\d+)/);
  if (match) {
    const n = Number(match[1] || match[3]), r = Number(match[2] || match[4]);
    if (r > n || n > 170) return '';
    const value = factorial(n) / factorial(n - r);
    return createMathSolution({ intro: `Let’s arrange ${r} choices from ${n} when order matters.`, steps: [{ title: 'Use the permutations formula', equations: ['nPr = n! / (n − r)!', `${n}P${r} = ${n}! / ${n - r}!`, `${n}P${r} = ${formatLargeNumber(value)}`] }], answer: formatLargeNumber(value), check: 'Permutations are at least as large as combinations because order creates more outcomes.' });
  }
  match = text.match(/\b(gcd|greatest common (?:factor|divisor)|lcm|least common multiple)\b[^\d]*(\d+)[^\d]+(\d+)/);
  if (!match) return '';
  const a = Number(match[2]), b = Number(match[3]);
  const isLcm = /lcm|least/.test(match[1]);
  const gcd = greatestCommonDivisor(a, b), value = isLcm ? Math.abs(a * b) / gcd : gcd;
  return createMathSolution({ intro: `Let’s find the ${isLcm ? 'least common multiple' : 'greatest common divisor'} of ${a} and ${b}.`, steps: [{ title: isLcm ? 'Use the GCD to find the LCM' : 'Use repeated division', equations: isLcm ? [`GCD(${a}, ${b}) = ${gcd}`, `LCM = |${a} × ${b}| ÷ ${gcd} = ${value}`] : [`GCD(${a}, ${b}) = ${value}`] }], answer: String(value), check: isLcm ? `The answer is divisible by both ${a} and ${b}.` : `The answer divides both ${a} and ${b} evenly.` });
}

function solveCalculusQuestion(text) {
  const derivativeMatch = text.match(/(?:derivative|differentiate|d\/dx)(?:\s+of)?\s*[:=]?\s*([^?]+)/);
  const integralMatch = text.match(/(?:integral|integrate)(?:\s+of)?\s*[:=]?\s*([^?]+)/);
  const match = derivativeMatch || integralMatch;
  if (!match) return '';
  const expression = match[1]
    .replace(/\s+with respect to x.*/i, '')
    .replace(/\s+(?:and\s+)?(?:show|explain|give|walk)\b.*$/i, '')
    .replace(/[.!]+$/, '')
    .trim();
  const polynomial = parsePolynomial(expression);
  if (!polynomial) return '';
  const isDerivative = Boolean(derivativeMatch);
  const transformed = new Map();
  polynomial.forEach((coefficient, power) => {
    if (isDerivative) { if (power > 0) transformed.set(power - 1, coefficient * power); }
    else transformed.set(power + 1, coefficient / (power + 1));
  });
  const result = formatPolynomial(transformed) + (isDerivative ? '' : ' + C');
  const rule = isDerivative ? 'd/dx(axⁿ) = anxⁿ⁻¹' : '∫axⁿ dx = a/(n + 1)xⁿ⁺¹';
  const action = isDerivative ? 'Multiply each coefficient by its exponent, then lower the exponent by 1.' : 'Raise each exponent by 1, then divide by the new exponent.';
  return createMathSolution({ intro: `Let’s ${isDerivative ? 'differentiate' : 'integrate'} ${formatPolynomial(polynomial)}.`, steps: [{ title: 'Use the power rule', equations: [rule], note: action }, { title: 'Apply the rule to each term', equations: [`${isDerivative ? 'd/dx' : '∫'}(${formatPolynomial(polynomial)}) = ${result}`] }], answer: result, check: isDerivative ? 'Differentiate each original term separately to verify the powers and coefficients.' : 'Differentiate the answer; it should return the original expression.' });
}

function solveQuadraticQuestion(text) {
  const equationMatch = text.match(/([0-9x^+\-*.\s]+)=\s*([0-9x^+\-*.\s]+)/);
  if (!equationMatch || !/x\s*\^\s*2/.test(equationMatch[0])) return '';
  const left = parsePolynomial(equationMatch[1]), right = parsePolynomial(equationMatch[2]);
  if (!left || !right || [...left.keys(), ...right.keys()].some(power => power > 2)) return '';
  const combined = new Map();
  for (let power = 0; power <= 2; power++) combined.set(power, (left.get(power) || 0) - (right.get(power) || 0));
  const a = combined.get(2), b = combined.get(1), c = combined.get(0);
  if (nearlyEqual(a, 0)) return '';
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    const real = -b / (2 * a), imaginary = Math.sqrt(-discriminant) / Math.abs(2 * a);
    return createMathSolution({ intro: `Let’s solve ${formatPolynomial(combined)} = 0 with the quadratic formula.`, steps: [{ title: 'Identify a, b, and c', equations: [`a = ${formatNumber(a)}, b = ${formatNumber(b)}, c = ${formatNumber(c)}`] }, { title: 'Calculate the discriminant', equations: [`b² − 4ac = ${formatNumber(discriminant)}`, 'A negative discriminant gives two complex solutions.'] }, { title: 'Use the quadratic formula', equations: [`x = ${formatNumber(real)} ± ${formatNumber(imaginary)}i`] }], answer: `x = ${formatNumber(real)} ± ${formatNumber(imaginary)}i`, check: 'Substitute each complex solution into the original equation.' });
  }
  const root = Math.sqrt(discriminant);
  const x1 = (-b + root) / (2 * a), x2 = (-b - root) / (2 * a);
  const answer = nearlyEqual(x1, x2) ? `x = ${formatNumber(x1)}` : `x = ${formatNumber(x1)} or x = ${formatNumber(x2)}`;
  return createMathSolution({ intro: `Let’s solve ${formatPolynomial(combined)} = 0 with the quadratic formula.`, steps: [{ title: 'Identify a, b, and c', equations: [`a = ${formatNumber(a)}, b = ${formatNumber(b)}, c = ${formatNumber(c)}`] }, { title: 'Calculate the discriminant', equations: [`b² − 4ac = (${formatNumber(b)})² − 4(${formatNumber(a)})(${formatNumber(c)})`, `b² − 4ac = ${formatNumber(discriminant)}`] }, { title: 'Use x = (−b ± √(b² − 4ac)) / 2a', equations: [`x = (${-b} ± √${formatNumber(discriminant)}) / ${formatNumber(2 * a)}`, answer] }], answer, check: 'Substitute each answer into the original equation; both sides should match.' });
}

function solveTrigonometryQuestion(text) {
  const match = text.match(/\b(sin|cos|tan)\s*\(?\s*(-?\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*\)?/);
  if (!match) return '';
  const operation = match[1], degrees = Number(match[2]), radians = degrees * Math.PI / 180;
  const value = operation === 'sin' ? Math.sin(radians) : operation === 'cos' ? Math.cos(radians) : Math.tan(radians);
  if (!Number.isFinite(value) || (operation === 'tan' && Math.abs(Math.cos(radians)) < 1e-10)) return createMathSolution({ intro: `Let’s evaluate ${operation}(${formatNumber(degrees)}°).`, steps: [{ title: 'Check the unit circle', equations: [`${operation}(${formatNumber(degrees)}°) is undefined`] }], answer: 'Undefined', check: 'Tangent is undefined where cosine equals 0.' });
  return createMathSolution({ intro: `Let’s evaluate ${operation}(${formatNumber(degrees)}°).`, steps: [{ title: 'Convert degrees to radians', equations: [`${formatNumber(degrees)}° × π/180 = ${formatNumber(radians)} radians`] }, { title: `Use the ${operation} ratio`, equations: [`${operation}(${formatNumber(degrees)}°) ≈ ${formatNumber(value)}`] }], answer: formatNumber(value), check: `${operation} values should agree with the unit circle and the angle’s quadrant.` });
}

function solveSequenceQuestion(text) {
  const match = text.match(/(?:find\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)\s+term[^\d-]*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return '';
  const n = Number(match[1]), first = Number(match[2]), second = Number(match[3]), third = Number(match[4]);
  const difference = second - first;
  if (!nearlyEqual(third - second, difference) || n < 1) return '';
  const value = first + (n - 1) * difference;
  return createMathSolution({ intro: `Let’s find term ${n} of the arithmetic sequence ${first}, ${second}, ${third}, …`, steps: [{ title: 'Find the common difference', equations: [`${formatNumber(second)} − ${formatNumber(first)} = ${formatNumber(difference)}`] }, { title: 'Use the arithmetic-sequence formula', equations: ['aₙ = a₁ + (n − 1)d', `a_${n} = ${formatNumber(first)} + (${n} − 1)(${formatNumber(difference)})`, `a_${n} = ${formatNumber(value)}`] }], answer: formatNumber(value), check: `Starting at ${formatNumber(first)}, add ${formatNumber(difference)} exactly ${n - 1} times.` });
}

function solveLinearAlgebraQuestion(text) {
  if (!/\b(determinant|det)\b/.test(text)) return '';
  const match = text.match(/\[\s*\[?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]?\s*,\s*\[?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]?\s*\]/);
  if (!match) return '';
  const a = Number(match[1]), b = Number(match[2]), c = Number(match[3]), d = Number(match[4]);
  const value = a * d - b * c;
  return createMathSolution({ intro: 'Let’s find the determinant of this 2 × 2 matrix.', steps: [{ title: 'Use det(A) = ad − bc', equations: [`det(A) = (${formatNumber(a)})(${formatNumber(d)}) − (${formatNumber(b)})(${formatNumber(c)})`, `det(A) = ${formatNumber(a * d)} − ${formatNumber(b * c)}`, `det(A) = ${formatNumber(value)}`] }], answer: formatNumber(value), check: 'Multiply along each diagonal, then subtract the second product from the first.' });
}

function parsePolynomial(expression) {
  const compact = expression.toLowerCase().replace(/\s+/g, '').replace(/−/g, '-');
  if (!compact || !/^[0-9x+\-.*^]+$/.test(compact)) return null;
  const normalized = /^[+-]/.test(compact) ? compact : `+${compact}`;
  const terms = normalized.match(/[+-][^+-]+/g);
  if (!terms || terms.join('') !== normalized) return null;
  const polynomial = new Map();
  for (const term of terms) {
    const variable = term.match(/^([+-])(?:(\d+(?:\.\d+)?)\*?)?x(?:\^(\d+))?$/);
    const constant = term.match(/^([+-])(\d+(?:\.\d+)?)$/);
    if (!variable && !constant) return null;
    const sign = (variable || constant)[1] === '-' ? -1 : 1;
    const coefficient = variable ? sign * Number(variable[2] || 1) : sign * Number(constant[2]);
    const power = variable ? Number(variable[3] || 1) : 0;
    polynomial.set(power, (polynomial.get(power) || 0) + coefficient);
  }
  return polynomial;
}

function formatPolynomial(polynomial) {
  const terms = [...polynomial.entries()].filter(([, coefficient]) => !nearlyEqual(coefficient, 0)).sort((a, b) => b[0] - a[0]);
  if (!terms.length) return '0';
  return terms.map(([power, coefficient], index) => {
    const sign = coefficient < 0 ? '−' : index ? '+' : '';
    const absolute = Math.abs(coefficient);
    const coefficientText = power > 0 && nearlyEqual(absolute, 1) ? '' : formatNumber(absolute);
    const variable = power === 0 ? '' : power === 1 ? 'x' : `x^${power}`;
    return `${sign}${index && coefficient >= 0 ? ' ' : ''}${coefficientText}${variable}`;
  }).join(' ');
}

function greatestCommonDivisor(a, b) {
  a = Math.abs(Math.trunc(a)); b = Math.abs(Math.trunc(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) return NaN;
  let value = 1;
  for (let number = 2; number <= n; number++) value *= number;
  return value;
}

function formatLargeNumber(value) { return Number.isSafeInteger(value) ? value.toLocaleString('en-US') : value.toExponential(6); }

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
      return createMathSolution({
        intro: `Let’s check whether ${prettyExpression(sides[0])} = ${prettyExpression(sides[1])}.`,
        steps: [
          { title: 'Simplify the left side', equations: [`${prettyExpression(sides[0])} = ${formatNumber(leftValue)}`] },
          { title: 'Simplify the right side', equations: [`${prettyExpression(sides[1])} = ${formatNumber(rightValue)}`] },
          { title: 'Compare both values', equations: [`${formatNumber(leftValue)} ${nearlyEqual(leftValue, rightValue) ? '=' : '≠'} ${formatNumber(rightValue)}`] }
        ],
        answer: `The statement is ${trueOrFalse}`,
        check: 'Check each side separately using the order of operations.'
      });
    }
    const left = parseLinearExpression(sides[0]);
    const right = parseLinearExpression(sides[1]);
    if (!left || !right) return 'I can see this is an equation, but built-in mode only handles basic one-variable linear equations right now. Check the symbols, or connect the live AI for more advanced algebra. I can still help you identify the first step.';
    return buildLinearEquationSolution(left, right);
  }

  if (!problem.includes('x') && /[+\-*/]/.test(problem)) {
    const value = evaluateArithmetic(problem);
    if (value === null) return '';
    return createMathSolution({
      intro: `Let’s evaluate ${prettyExpression(problem)}.`,
      steps: [
        { title: 'Use the order of operations', equations: [`${prettyExpression(problem)} = ${formatNumber(value)}`], note: 'Do parentheses first, then multiplication or division, then addition or subtraction.' }
      ],
      answer: formatNumber(value),
      check: 'Estimate the size of the answer to make sure the result is reasonable.'
    });
  }
  return '';
}

function buildLinearEquationSolution(left, right) {
  const originalLeft = formatLinearExpression(left.x, left.constant);
  const originalRight = formatLinearExpression(right.x, right.constant);
  const steps = [];
  let currentLeft = { ...left };
  let currentRight = { ...right };

  if (!nearlyEqual(currentLeft.constant, 0)) {
    const amount = Math.abs(currentLeft.constant);
    const operation = currentLeft.constant > 0 ? 'Subtract' : 'Add';
    const symbol = currentLeft.constant > 0 ? '-' : '+';
    steps.push({
      title: `${operation} ${formatNumber(amount)} from both sides`,
      equations: [
        `${formatLinearExpression(currentLeft.x, currentLeft.constant)} ${symbol} ${formatNumber(amount)} = ${formatLinearExpression(currentRight.x, currentRight.constant)} ${symbol} ${formatNumber(amount)}`,
        `${formatLinearExpression(currentLeft.x, 0)} = ${formatLinearExpression(currentRight.x, currentRight.constant - currentLeft.constant)}`
      ]
    });
    currentRight.constant -= currentLeft.constant;
    currentLeft.constant = 0;
  }

  if (!nearlyEqual(currentRight.x, 0)) {
    let moveCoefficient = currentRight.x;
    if (nearlyEqual(currentRight.constant, 0) && currentLeft.x * currentRight.x > 0 && Math.abs(currentLeft.x) < Math.abs(currentRight.x)) moveCoefficient = currentLeft.x;
    const amount = Math.abs(moveCoefficient);
    const operation = moveCoefficient > 0 ? 'Subtract' : 'Add';
    const symbol = moveCoefficient > 0 ? '-' : '+';
    const term = `${formatCoefficient(amount)}x`;
    const nextLeft = { x: currentLeft.x - moveCoefficient, constant: currentLeft.constant };
    const nextRight = { x: currentRight.x - moveCoefficient, constant: currentRight.constant };
    steps.push({
      title: `${operation} ${term} from both sides`,
      equations: [
        `${formatLinearExpression(currentLeft.x, currentLeft.constant)} ${symbol} ${term} = ${formatLinearExpression(currentRight.x, currentRight.constant)} ${symbol} ${term}`,
        `${formatLinearExpression(nextLeft.x, nextLeft.constant)} = ${formatLinearExpression(nextRight.x, nextRight.constant)}`
      ]
    });
    currentLeft = nextLeft;
    currentRight = nextRight;
  }

  const xCoefficient = left.x - right.x;
  const constant = right.constant - left.constant;
  if (nearlyEqual(xCoefficient, 0)) {
    const infinite = nearlyEqual(constant, 0);
    if (steps.length === 0) steps.push({ title: 'Subtract the same expression from both sides', equations: [`(${originalLeft}) - (${originalLeft}) = (${originalRight}) - (${originalLeft})`, '0 = 0'] });
    return createMathSolution({
      intro: `Let’s solve for x in ${originalLeft} = ${originalRight}.`,
      steps,
      answer: infinite ? 'Every value of x is a solution' : 'No solution',
      check: infinite ? `Try x = 2: both sides equal ${formatNumber(left.x * 2 + left.constant)}.` : 'The variables cancel and leave a false statement, so no value of x can work.'
    });
  }

  const solution = constant / xCoefficient;
  const activeCoefficient = !nearlyEqual(currentLeft.x, 0) ? currentLeft.x : currentRight.x;
  if (!nearlyEqual(Math.abs(activeCoefficient), 1)) {
    const activeConstant = !nearlyEqual(currentLeft.x, 0) ? currentRight.constant : currentLeft.constant;
    steps.push({
      title: `Divide both sides by ${formatNumber(activeCoefficient)}`,
      equations: [`${formatNumber(activeCoefficient)}x ÷ ${formatNumber(activeCoefficient)} = ${formatNumber(activeConstant)} ÷ ${formatNumber(activeCoefficient)}`, `x = ${formatNumber(solution)}`]
    });
  } else if (!steps.some(step => step.equations.some(equation => equation === `x = ${formatNumber(solution)}` || equation === `${formatNumber(solution)} = x`))) {
    steps.push({ title: 'Read the isolated variable', equations: [`x = ${formatNumber(solution)}`] });
  }
  const leftCheck = left.x * solution + left.constant;
  const rightCheck = right.x * solution + right.constant;
  return createMathSolution({
    intro: `Let’s solve for x in ${originalLeft} = ${originalRight}.`,
    steps,
    answer: `x = ${formatNumber(solution)}`,
    check: `Check: substitute x = ${formatNumber(solution)}. The left side is ${formatNumber(leftCheck)} and the right side is ${formatNumber(rightCheck)}.`
  });
}

function formatLinearExpression(xCoefficient, constant) {
  const parts = [];
  if (!nearlyEqual(xCoefficient, 0)) {
    if (nearlyEqual(xCoefficient, 1)) parts.push('x');
    else if (nearlyEqual(xCoefficient, -1)) parts.push('-x');
    else parts.push(`${formatNumber(xCoefficient)}x`);
  }
  if (!nearlyEqual(constant, 0)) {
    if (parts.length) parts.push(`${constant > 0 ? '+' : '-'} ${formatNumber(Math.abs(constant))}`);
    else parts.push(formatNumber(constant));
  }
  return parts.join(' ') || '0';
}

function formatCoefficient(value) { return nearlyEqual(value, 1) ? '' : formatNumber(value); }
function prettyExpression(expression) { return expression.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/-/g, ' − ').replace(/\s+/g, ' ').trim(); }

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
function newChat() { messages.length = 0; fallbackNoticeShown[activeBot] = false; clearAttachment(); renderConversation(); toast(`Started a new ${BOT_CONFIG[activeBot].name} chat.`); }

const GAME_DETAILS = {
  memory: { title: 'Soft Matches', instructions: 'Turn over two cards and find the calming pairs.' },
  water: { title: 'Water Sort', instructions: 'Choose a tube, then choose another tube to pour matching colors together.' },
  slider: { title: 'Cozy Slider', instructions: 'Move a tile beside the empty space until the numbers are in order.' }
};
let activeGame = '';

function showGameHub() {
  activeGame = '';
  activeQuest = null;
  roleplayRequest += 1;
  $('#puzzleHub').hidden = false;
  $('#questStage').hidden = true;
  $('#projectStage').hidden = true;
  $('#roleplayStage').hidden = true;
  $('#gameStage').hidden = true;
}

function openPuzzle(game) {
  if (!GAME_DETAILS[game]) return;
  activeGame = game;
  $('#puzzleHub').hidden = true;
  $('#gameStage').hidden = false;
  $('#activeGameTitle').textContent = GAME_DETAILS[game].title;
  $('#activeGameInstructions').textContent = GAME_DETAILS[game].instructions;
  $$('[data-game-panel]').forEach(panel => { panel.hidden = panel.dataset.gamePanel !== game; });
  resetActiveGame();
  $('#gameStage').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetActiveGame() {
  if (activeGame === 'memory') startCalmGame();
  else if (activeGame === 'water') startWaterGame();
  else if (activeGame === 'slider') startSliderGame();
}

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

const WATER_START = [
  ['a', 'b', 'c', 'd'], ['b', 'c', 'd', 'a'], ['c', 'd', 'a', 'b'], ['d', 'a', 'b', 'c'], [], []
];
const WATER_NAMES = { a: 'coral stripes', b: 'blue dots', c: 'green diamonds', d: 'gold lines' };
const WATER_SYMBOLS = { a: '╱', b: '•', c: '◇', d: '—' };
let waterTubes = [];
let selectedTube = null;

function startWaterGame() {
  waterTubes = WATER_START.map(tube => [...tube]);
  selectedTube = null;
  $('#waterFinish').hidden = true;
  $('#waterStatus').textContent = 'Choose a tube, then choose where to pour.';
  renderWaterGame();
}

function renderWaterGame() {
  const board = $('#waterBoard');
  board.innerHTML = '';
  waterTubes.forEach((tube, index) => {
    const button = document.createElement('button');
    button.className = `water-tube${selectedTube === index ? ' selected' : ''}`;
    button.type = 'button';
    const contents = tube.length ? tube.map(color => WATER_NAMES[color]).join(', ') : 'empty';
    button.setAttribute('aria-label', `Tube ${index + 1}: ${contents}${selectedTube === index ? ', selected' : ''}`);
    const rim = document.createElement('span'); rim.className = 'tube-rim'; rim.setAttribute('aria-hidden', 'true');
    const glass = document.createElement('span'); glass.className = 'tube-glass'; glass.setAttribute('aria-hidden', 'true');
    tube.forEach(color => { const layer = document.createElement('span'); layer.className = `water-layer water-${color}`; layer.textContent = WATER_SYMBOLS[color]; glass.append(layer); });
    button.append(rim, glass);
    button.addEventListener('click', () => chooseWaterTube(index));
    board.append(button);
  });
}

function chooseWaterTube(index) {
  if ($('#waterFinish').hidden === false) return;
  if (selectedTube === null) {
    if (!waterTubes[index].length) { $('#waterStatus').textContent = 'That tube is empty. Choose one with color in it.'; return; }
    selectedTube = index;
    $('#waterStatus').textContent = `Tube ${index + 1} selected. Choose where to pour.`;
    renderWaterGame();
    return;
  }
  if (selectedTube === index) {
    selectedTube = null; $('#waterStatus').textContent = 'Selection cleared. Choose any tube.'; renderWaterGame(); return;
  }
  const moved = pourWater(selectedTube, index);
  selectedTube = null;
  $('#waterStatus').textContent = moved ? 'Nice. Choose another tube when you are ready.' : 'Those colors do not fit yet. Try a different tube.';
  renderWaterGame();
  if (waterTubes.every(tube => tube.length === 0 || (tube.length === 4 && tube.every(color => color === tube[0])))) {
    $('#waterFinish').hidden = false;
    $('#waterStatus').textContent = 'Every color is sorted.';
  }
}

function pourWater(fromIndex, toIndex) {
  const from = waterTubes[fromIndex], to = waterTubes[toIndex];
  if (!from.length || to.length >= 4) return false;
  const color = from.at(-1);
  if (to.length && to.at(-1) !== color) return false;
  let groupSize = 1;
  while (groupSize < from.length && from[from.length - 1 - groupSize] === color) groupSize += 1;
  const amount = Math.min(groupSize, 4 - to.length);
  for (let count = 0; count < amount; count++) to.push(from.pop());
  return amount > 0;
}

let sliderTiles = [];

function startSliderGame() {
  sliderTiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let previousBlank = -1;
  for (let move = 0; move < 120; move++) {
    const blank = sliderTiles.indexOf(0);
    let choices = sliderNeighbors(blank).filter(index => index !== previousBlank);
    if (!choices.length) choices = sliderNeighbors(blank);
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    previousBlank = blank;
    [sliderTiles[blank], sliderTiles[chosen]] = [sliderTiles[chosen], sliderTiles[blank]];
  }
  if (sliderSolved()) [sliderTiles[7], sliderTiles[8]] = [sliderTiles[8], sliderTiles[7]];
  $('#sliderFinish').hidden = true;
  $('#sliderStatus').textContent = 'Move a tile beside the empty space.';
  renderSliderGame();
}

function sliderNeighbors(index) {
  const row = Math.floor(index / 3), column = index % 3;
  return [index - 3, index + 3, index - 1, index + 1].filter(candidate => candidate >= 0 && candidate < 9 && Math.abs(Math.floor(candidate / 3) - row) + Math.abs(candidate % 3 - column) === 1);
}

function renderSliderGame() {
  const board = $('#sliderBoard');
  board.innerHTML = '';
  sliderTiles.forEach((value, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `slider-tile${value === 0 ? ' slider-empty' : ''}`;
    button.textContent = value || '';
    button.disabled = value === 0;
    button.setAttribute('aria-label', value === 0 ? 'Empty space' : `Tile ${value}`);
    if (value) button.addEventListener('click', () => moveSliderTile(index));
    board.append(button);
  });
}

function moveSliderTile(index) {
  const blank = sliderTiles.indexOf(0);
  if (!sliderNeighbors(blank).includes(index) || $('#sliderFinish').hidden === false) return;
  [sliderTiles[blank], sliderTiles[index]] = [sliderTiles[index], sliderTiles[blank]];
  renderSliderGame();
  if (sliderSolved()) { $('#sliderFinish').hidden = false; $('#sliderStatus').textContent = 'The tiles are in order.'; }
  else $('#sliderStatus').textContent = 'Good move. Keep going at your own pace.';
}

function sliderSolved() { return sliderTiles.every((value, index) => value === (index + 1) % 9); }

const TUTOR_QUESTS = [
  { subject: 'MATH QUEST', name: 'Fraction Forest', prompt: 'A trail is 3/4 mile long. You walk 1/2 mile. How many miles are left? Give your answer as a fraction.', answer: '1/4', hint: 'Put both fractions over the same denominator: 1/2 is the same as 2/4, then subtract.' },
  { subject: 'ALGEBRA QUEST', name: 'Equation Bridge', prompt: 'The bridge opens when you solve 3x + 4 = 19. What is x?', answer: '5', hint: 'Undo the +4 first by subtracting 4 from both sides. Then undo the multiplication by 3.' },
  { subject: 'DATA QUEST', name: 'Data Detective', prompt: 'A set of scores is 4, 6, 6, 8, and 11. What is the mean (average)?', answer: '7', hint: 'Add all five scores, then divide the total by the number of scores.' }
];
let activeQuest = null;
let questRequest = 0;
let projectQuest = null;
let roleplayTurns = 0;
let roleplayHistory = [];
let roleplayRequest = 0;

function addRoleplayMessage(speaker, message) {
  const item = document.createElement('div'); item.className = `roleplay-message ${speaker === 'You' ? 'student' : 'classmate'}`;
  const label = document.createElement('strong'); label.textContent = speaker;
  const body = document.createElement('p'); body.textContent = message;
  item.append(label, body); $('#roleplayMessages').append(item);
}

function startRoleplay() {
  roleplayRequest += 1; roleplayTurns = 0; roleplayHistory = [];
  $('#puzzleHub').hidden = true; $('#roleplayStage').hidden = false;
  $('#roleplayMessages').replaceChildren();
  addRoleplayMessage('Group member', 'Hey, I know my part of the project is late. I’ve been stuck and I’m not sure how to catch up.');
  $('#roleplayProgress').textContent = 'Turn 1 of 3 · No pressure—try saying what you need kindly.';
  $('#roleplayFinish').hidden = true; $('#roleplayForm').hidden = false;
  $('#roleplaySend').disabled = false; $('#roleplayInput').value = ''; $('#roleplayInput').focus();
  $('#roleplayStage').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function offlineRoleplayReply(message, turn) {
  const words = message.toLowerCase();
  if (ROLEPLAY_UNSAFE_PATTERN.test(words)) return 'I want us both to feel safe. Let’s pause and ask a teacher or trusted adult to help us talk this through.';
  if (/\b(sorry|apologiz|my fault)\b/.test(words)) return 'Thanks for saying that. We can start fresh and decide on one small piece each.';
  if (/\b(frustrat|upset|angry|stressed|worried|anxious)\b/.test(words)) return 'I hear that this has been stressful. I’m sorry my part is late. Could we agree on one clear next step?';
  const task = words.match(/\b(pictures?|captions?|slides?|research|sources?|writing|draft|poster|intro|conclusion|design|outline)\b/)?.[0];
  const timing = words.match(/\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|weekend)\b/)?.[0];
  if (task && timing) return `Yes, I can focus on the ${task} ${timing}. Could we check in afterward to make sure it fits the project?`;
  if (task) return `I can take the ${task}. When would you like me to show you a first version?`;
  if (timing) return `A check-in ${timing} works for me. What should I finish before then?`;
  if (/\b(help|together|team|share|split|divide)\b/.test(words)) return 'Thanks for offering to work together. Let’s each choose one small part and check in after that.';
  if (/\b(teacher|adult)\b/.test(words)) return 'That sounds okay. We can ask the teacher for help making a fair plan.';
  return [
    'Thanks for telling me. What is one small part you would like me to do first?',
    'I want to make this fair. Could we agree on a specific task and check-in time?',
    'I’m glad we talked. Let’s write down the next step so we both know the plan.'
  ][turn];
}

async function sendRoleplay(event) {
  event.preventDefault();
  if (roleplayTurns >= 3 || $('#roleplaySend').disabled) return;
  const message = $('#roleplayInput').value.trim(); if (!message) return;
  if (isCrisisMessage(message)) { $('#safetyDialog').showModal(); return; }
  if (ROLEPLAY_UNSAFE_PATTERN.test(message)) {
    addRoleplayMessage('You', message);
    addRoleplayMessage('Safety note', 'Let’s pause the practice. If this is about a real conflict, talk to a trusted adult or teacher. We can practice a safe request instead.');
    $('#roleplayInput').value = '';
    return;
  }
  const request = ++roleplayRequest;
  addRoleplayMessage('You', message); $('#roleplayInput').value = ''; $('#roleplaySend').disabled = true;
  const previous = roleplayHistory.slice(-6);
  roleplayHistory.push({ role: 'user', content: message });
  let answer; let speaker = 'Group member · AI role-play';
  try {
    answer = await askCoach(message, previous, '', 'roleplay');
  } catch {
    speaker = 'Group member · adaptive offline practice';
    answer = offlineRoleplayReply(message, roleplayTurns);
  }
  if (request !== roleplayRequest || $('#roleplayStage').hidden) return;
  addRoleplayMessage(speaker, answer);
  roleplayHistory.push({ role: 'assistant', content: answer });
  roleplayTurns += 1; $('#roleplaySend').disabled = false;
  if (roleplayTurns === 3) {
    $('#roleplayProgress').textContent = '3 of 3 turns complete · Nice practice.';
    $('#roleplayForm').hidden = true; $('#roleplayFinish').hidden = false;
  } else $('#roleplayProgress').textContent = `Turn ${roleplayTurns + 1} of 3 · You can ask for a clear next step.`;
}

const PROJECT_STATIONS = {
  research: ['Read the directions and write down what the report must include.', 'Choose one question to answer and find two useful sources.', 'Write three main points in your own words.', 'Draft one short section at a time, with a break between sections.', 'Check your facts, sources, spelling, and class instructions.'],
  presentation: ['Read the directions and list what the poster or slides need.', 'Pick three key ideas and find facts or examples for each.', 'Sketch a simple layout with a title and three sections.', 'Make one section at a time, then take a short break.', 'Practice explaining it aloud and check it against the directions.'],
  creative: ['Read the directions and choose one idea to make.', 'Sketch a small plan and gather what you need.', 'Make a rough first version; it does not need to be perfect.', 'Improve one part at a time, with a short break.', 'Review your work against the directions and add finishing touches.']
};

function startProjectQuest(event) {
  event.preventDefault();
  const name = $('#projectName').value.trim();
  if (!name) return;
  const kind = $('#projectKind').value;
  projectQuest = { name, steps: PROJECT_STATIONS[kind].map(text => ({ text, done: false })) };
  $('#puzzleHub').hidden = true;
  $('#projectStage').hidden = false;
  renderProjectQuest();
  $('#projectStage').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderProjectQuest() {
  if (!projectQuest) return;
  $('#projectStageTitle').textContent = projectQuest.name;
  const completed = projectQuest.steps.filter(step => step.done).length;
  const encouragement = ['Starting is a win. Choose any one small step.', 'Nice start. One step is enough for now.', 'You’re making room for this project, piece by piece.', 'Look how far you’ve come. A short break is okay.', 'Almost there. Finish when you feel ready.', 'You did it! Take a moment to notice your progress.'];
  $('#projectProgress').textContent = `${completed} of ${projectQuest.steps.length} stations complete. ${encouragement[completed]}`;
  const trail = $('#projectTrail'); trail.replaceChildren();
  projectQuest.steps.forEach((step, index) => {
    const dot = document.createElement('span');
    dot.className = `project-trail-dot${step.done ? ' done' : ''}`;
    dot.textContent = step.done ? '✓' : String(index + 1);
    trail.append(dot);
  });
  $('#projectFinish').hidden = completed !== projectQuest.steps.length;
  const host = $('#projectSteps');
  host.replaceChildren();
  projectQuest.steps.forEach((step, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `project-step${step.done ? ' done' : ''}`;
    button.setAttribute('aria-pressed', String(step.done));
    const badge = document.createElement('span'); badge.textContent = step.done ? '✓' : String(index + 1);
    const copy = document.createElement('span'); copy.textContent = step.text;
    button.append(badge, copy);
    button.addEventListener('click', () => { step.done = !step.done; renderProjectQuest(); });
    host.append(button);
  });
}

function renderQuestList() {
  $('#questList').innerHTML = TUTOR_QUESTS.map((quest, index) => `<button class="quest-card" type="button" data-quest="${index}"><span class="quest-number">${index + 1}</span><span><strong>${quest.name}</strong><small>${quest.prompt}</small></span><b>Play →</b></button>`).join('');
  $$('.quest-card').forEach(button => button.addEventListener('click', () => openQuest(Number(button.dataset.quest))));
}

function openQuest(index) {
  questRequest += 1;
  activeQuest = index;
  const quest = TUTOR_QUESTS[index];
  $('#puzzleHub').hidden = true; $('#questStage').hidden = false;
  $('#questSubject').textContent = quest.subject; $('#questName').textContent = quest.name; $('#questProgress').textContent = `Quest ${index + 1} of ${TUTOR_QUESTS.length}`;
  $('#questPrompt').textContent = quest.prompt; $('#questAnswer').value = ''; $('#questFeedback').textContent = ''; $('#questTutorAnswer').hidden = true;
  $('#questTutor').disabled = false;
  $('#questAnswer').focus(); $('#questStage').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeQuest() { questRequest += 1; activeQuest = null; $('#questTutor').disabled = false; $('#questStage').hidden = true; $('#puzzleHub').hidden = false; $('#puzzleHub').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function normalizeQuestAnswer(value) { return value.trim().toLowerCase().replace(/[\s]/g, '').replace(/\.0+$/, ''); }
function checkQuestAnswer(event) {
  event.preventDefault(); if (activeQuest === null) return;
  const quest = TUTOR_QUESTS[activeQuest]; const correct = normalizeQuestAnswer($('#questAnswer').value) === normalizeQuestAnswer(quest.answer);
  $('#questFeedback').className = `quest-feedback ${correct ? 'correct' : 'try-again'}`;
  $('#questFeedback').textContent = correct ? '✓ Nice work! You solved it. Choose another quest or try this one again.' : 'Not quite yet. Try a different step, or ask the AI tutor for a hint.';
}
async function askQuestTutor() {
  if (activeQuest === null) return;
  const request = ++questRequest;
  const quest = TUTOR_QUESTS[activeQuest]; const box = $('#questTutorAnswer'); const text = box.querySelector('p');
  box.hidden = false; text.textContent = 'Thinking through the first step…'; $('#questTutor').disabled = true;
  $('#questTutorSource').textContent = 'AI tutor';
  try {
    const answer = await askCoach(`I am playing the ${quest.name} quest. Give me one short hint for this problem, but do not give the final answer: ${quest.prompt}`, [], '', 'math');
    if (request === questRequest) text.textContent = answer;
  } catch {
    if (request === questRequest) { $('#questTutorSource').textContent = 'Built-in hint (AI unavailable)'; text.textContent = quest.hint; }
  } finally { if (request === questRequest) $('#questTutor').disabled = false; }
}

function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); setTimeout(() => $('#toast').classList.remove('show'), 1800); }

$$('.tab').forEach(tab => tab.addEventListener('click', () => switchView(tab.dataset.view)));
$$('[data-open-game]').forEach(button => button.addEventListener('click', () => switchView('calm')));
$$('.bot-choice').forEach(button => button.addEventListener('click', () => switchBot(button.dataset.bot)));
$('#coachForm').addEventListener('submit', event => { event.preventDefault(); sendMessage($('#coachInput').value); });
$('.send-button').addEventListener('click', () => sendMessage($('#coachInput').value));
$('#coachInput').addEventListener('input', resizeInput);
$('#coachInput').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(event.currentTarget.value); } });
$('#attachButton').addEventListener('click', () => $('#imageInput').click());
$('#imageInput').addEventListener('change', event => selectAttachment(event.currentTarget.files?.[0]));
$('#removeAttachment').addEventListener('click', clearAttachment);
$('#newChatButton').addEventListener('click', newChat);
$('#calmShortcut').addEventListener('click', () => switchView('calm'));
$('#questBack').addEventListener('click', closeQuest);
$('#questAnswerForm').addEventListener('submit', checkQuestAnswer);
$('#questReset').addEventListener('click', () => openQuest(activeQuest));
$('#questTutor').addEventListener('click', askQuestTutor);
$('#projectQuestForm').addEventListener('submit', startProjectQuest);
$('#projectBack').addEventListener('click', showGameHub);
$('#roleplayStart').addEventListener('click', startRoleplay);
$('#roleplayBack').addEventListener('click', showGameHub);
$('#roleplayReset').addEventListener('click', startRoleplay);
$('#roleplayForm').addEventListener('submit', sendRoleplay);
$$('.game-card').forEach(button => button.addEventListener('click', () => openPuzzle(button.dataset.game)));
$('#allGamesButton').addEventListener('click', showGameHub);
$('#resetGame').addEventListener('click', resetActiveGame);
$('#closeSafety').addEventListener('click', () => $('#safetyDialog').close());
switchBot('stress', true);
showGameHub();
renderQuestList();
if (location.hash === '#games' || new URLSearchParams(location.search).get('from') === 'hero-wars') switchView('calm');
