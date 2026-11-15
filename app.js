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
const MATH_SOLUTION_PREFIX = '__MATH_SOLUTION__';

function switchView(view) {
  $$('.tab').forEach(tab => { const active = tab.dataset.view === view; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
  $$('[data-view-panel]').forEach(panel => { const active = panel.dataset.viewPanel === view; panel.classList.toggle('active', active); panel.hidden = !active; });
  if (view === 'calm') $('#calmView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addMessage(role, text, pending = false, notice = '') {
  const mathSolution = role === 'assistant' ? readMathSolution(text) : null;
  const article = document.createElement('article');
  article.className = `message ${role === 'assistant' ? 'coach-message' : 'user-message'}${pending ? ' pending' : ''}${mathSolution ? ' math-message' : ''}`;
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
    addMessage('assistant', answer, false, notice);
    fallbackNoticeShown = true;
    messages.push({ role: 'user', content: message }, { role: 'assistant', content: mathSolutionToText(answer) });
  } finally {
    sending = false; $$('.prompt-chip').forEach(button => button.disabled = false); $('.send-button').disabled = false; $('#coachInput').focus();
  }
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

function getBuiltInReply(message, history = []) {
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
