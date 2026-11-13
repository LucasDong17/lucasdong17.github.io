import { askCoach, isCrisisMessage } from './ai-client.js';

// Easy tuning controls: change these values to adjust the whole one-minute level.
const CONFIG = {
  levelSeconds: 75,       // Total seconds on the mission clock.
  startingLives: 3,      // Mistakes allowed before Game Over.
  correctPoints: 100,    // Points for each correct game choice.
  aiBonus: 75,           // Points for using the AI coach.
  finishBonus: 250,      // Extra points for completing all three stations.
  stressStart: 88,       // Starting stress meter percentage.
  stressDropPerStage: 28 // Stress removed after each completed station.
};

const $ = (selector) => document.querySelector(selector);
const screens = [...document.querySelectorAll('.screen')];
const state = { score: 0, lives: CONFIG.startingLives, time: CONFIG.levelSeconds, stage: 0, timer: null, paused: false, finished: false, aiAnswer: '' };
let audioContext;

function showScreen(id) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
}

function resetGame() {
  clearInterval(state.timer);
  Object.assign(state, { score: 0, lives: CONFIG.startingLives, time: CONFIG.levelSeconds, stage: 0, paused: false, finished: false, aiAnswer: '' });
  updateHud();
  renderStage();
}

function startGame() {
  resetGame();
  showScreen('gameScreen');
  state.timer = setInterval(() => {
    if (state.paused || state.finished) return;
    state.time -= 1;
    updateHud();
    if (state.time <= 0) endGame(false, 'Time slipped away.', 'Try again: choose the smallest useful next step first.');
  }, 1000);
}

function updateHud() {
  $('#scoreValue').textContent = String(state.score).padStart(3, '0');
  $('#livesValue').textContent = Array.from({ length: CONFIG.startingLives }, (_, i) => i < state.lives ? '●' : '○').join(' ');
  $('#livesValue').setAttribute('aria-label', `${state.lives} lives left`);
  $('#timerValue').textContent = `${Math.floor(state.time / 60)}:${String(state.time % 60).padStart(2, '0')}`;
  $('#stressFill').style.width = `${Math.max(4, CONFIG.stressStart - state.stage * CONFIG.stressDropPerStage)}%`;
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    step.classList.toggle('current', index === state.stage);
    step.classList.toggle('done', index < state.stage);
  });
  document.querySelectorAll('.progress-line').forEach((line, index) => line.classList.toggle('done', index < state.stage));
}

function renderStage() {
  const host = $('#stageContent');
  if (state.stage === 0) {
    host.innerHTML = `
      <section class="stage">
        <span class="stage-number">STATION 01 · PLAN IT</span>
        <h3>The project feels huge. What comes first?</h3>
        <p class="stage-intro">Alex has a science model due Friday and is frozen. Pick the smallest action that creates clarity.</p>
        <div class="assignment-alert"><b>!</b><span><b>Due Friday:</b> Build a water-cycle model and explain it with your group.</span></div>
        <div class="choices">
          ${choice('1', 'Build the entire model tonight', 'Big, vague, and exhausting', false)}
          ${choice('2', 'Read the directions and circle 3 requirements', 'Small, specific, and useful', true)}
          ${choice('3', 'Avoid it until inspiration appears', 'The stress will keep growing', false)}
        </div>
      </section>`;
  } else if (state.stage === 1 && !state.aiAnswer) {
    host.innerHTML = `
      <section class="stage">
        <span class="stage-number">STATION 02 · LEARN IT</span>
        <h3>Meet the AI learning coach.</h3>
        <p class="stage-intro">Alex is stuck on evaporation. Ask for a short explanation that helps Alex think—not an answer to copy.</p>
        <div class="coach-panel"><div class="coach-icon">AI</div><div><strong>Helper Coach</strong><p>I can connect a missing idea to something familiar, then give you one tiny check.</p></div></div>
        <div class="prompt-chips">
          <button class="prompt-chip" data-prompt="Explain evaporation using a puddle on a sunny day, then ask me one quick check question.">☀ Puddle example</button>
          <button class="prompt-chip" data-prompt="Explain evaporation using cooking, then ask me one quick check question.">♨ Cooking example</button>
        </div>
        <form class="question-box" id="coachForm">
          <input id="coachInput" maxlength="240" aria-label="Ask the learning coach" placeholder="Or ask in your own words…" autocomplete="off">
          <button type="submit">Ask coach</button>
        </form>
        <p class="fine-print">Don't include names, school names, addresses, or private details.</p>
      </section>`;
    bindCoachControls();
  } else if (state.stage === 1) {
    host.innerHTML = `
      <section class="stage">
        <span class="stage-number">STATION 02 · ACTIVE RECALL</span>
        <h3>Use the idea right away.</h3>
        <div class="ai-answer ${state.aiAnswer.startsWith('AI unavailable') ? 'error-answer' : ''}"><strong>Helper Coach</strong><p>${escapeHtml(state.aiAnswer)}</p></div>
        <p class="stage-intro">Which change is evaporation?</p>
        <div class="choices">
          ${choice('1', 'Water vapor cools into cloud droplets', 'That is condensation', false)}
          ${choice('2', 'Liquid water warms and becomes vapor', 'Energy helps molecules enter the air', true)}
          ${choice('3', 'Rain falls from a cloud', 'That is precipitation', false)}
        </div>
      </section>`;
  } else {
    host.innerHTML = `
      <section class="stage">
        <span class="stage-number">STATION 03 · SAY IT</span>
        <h3>Practice the group-project moment.</h3>
        <p class="stage-intro">A teammate has not replied. Which message is clear, respectful, and gives one next step?</p>
        <div class="choices">
          ${choice('1', 'You never help. I will tell the teacher.', 'Blame can shut the conversation down', false)}
          ${choice('2', 'Hey! Could you make the cloud labels by tomorrow? I can share the notes.', 'Specific, calm, and collaborative', true)}
          ${choice('3', 'Never mind. I will do everything.', 'That adds stress and removes teamwork', false)}
        </div>
      </section>`;
  }
  bindChoices();
  updateHud();
}

function choice(key, title, detail, correct) {
  return `<button class="choice" type="button" data-correct="${correct}"><span class="key">${key}</span><span><strong>${title}</strong><small>${detail}</small></span><span class="arrow">→</span></button>`;
}

function bindChoices() {
  const buttons = [...document.querySelectorAll('.choice')];
  buttons.forEach(button => button.addEventListener('click', () => choose(button)));
}

function choose(button) {
  if (state.paused || state.finished || button.disabled) return;
  const correct = button.dataset.correct === 'true';
  if (!correct) {
    button.classList.add('wrong');
    state.lives -= 1;
    tone(135, .12);
    toast('Not quite—use the clue and try again.');
    setTimeout(() => button.classList.remove('wrong'), 350);
    updateHud();
    if (state.lives <= 0) endGame(false, 'Overwhelm won this round.', 'A small next step can change the whole mission. Try once more.');
    return;
  }
  document.querySelectorAll('.choice').forEach(item => item.disabled = true);
  button.classList.add('correct');
  state.score += CONFIG.correctPoints + Math.max(0, Math.floor(state.time / 10));
  tone(520, .09); setTimeout(() => tone(720, .11), 90);
  setTimeout(() => {
    if (state.stage === 2) {
      state.score += CONFIG.finishBonus + state.lives * 25;
      endGame(true, 'Overwhelm defeated.', 'Alex now has a plan, understands the key idea, and knows what to say.');
    } else {
      state.stage += 1;
      renderStage();
    }
  }, 520);
}

function bindCoachControls() {
  document.querySelectorAll('.prompt-chip').forEach(chip => chip.addEventListener('click', () => requestCoach(chip.dataset.prompt)));
  $('#coachForm').addEventListener('submit', event => {
    event.preventDefault();
    const message = $('#coachInput').value.trim();
    if (!message) return toast('Type a question or choose an example.');
    requestCoach(message);
  });
}

async function requestCoach(message) {
  if (isCrisisMessage(message)) {
    $('#safetyDialog').showModal();
    return;
  }
  state.paused = true;
  $('#thinkingOverlay').classList.add('active');
  $('#thinkingOverlay').setAttribute('aria-hidden', 'false');
  try {
    state.aiAnswer = await askCoach(message);
    state.score += CONFIG.aiBonus;
  } catch (error) {
    state.aiAnswer = `AI unavailable — ${error.message} You can still finish this practice round with the example below.`;
  } finally {
    state.paused = false;
    $('#thinkingOverlay').classList.remove('active');
    $('#thinkingOverlay').setAttribute('aria-hidden', 'true');
    renderStage();
  }
}

function endGame(won, title, message) {
  state.finished = true;
  clearInterval(state.timer);
  $('#resultEyebrow').textContent = won ? 'MISSION COMPLETE' : 'GAME OVER';
  $('#resultTitle').textContent = title;
  $('#resultMessage').textContent = message;
  $('#finalScore').textContent = String(state.score).padStart(3, '0');
  $('.result-burst').innerHTML = `<span>${won ? '✓' : '↺'}</span>`;
  $('.result-burst').style.background = won ? 'var(--lime)' : 'var(--coral)';
  showScreen('resultScreen');
  if (won) { tone(520, .12); setTimeout(() => tone(660, .12), 120); setTimeout(() => tone(880, .2), 240); }
}

function toast(message) {
  const element = $('#toast'); element.textContent = message; element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 1800);
}

function tone(frequency, duration) {
  if ($('#soundButton').getAttribute('aria-pressed') !== 'true') return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
    oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.035, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  } catch {}
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

$('#startButton').addEventListener('click', startGame);
$('#playAgainButton').addEventListener('click', startGame);
$('#closeSafety').addEventListener('click', () => $('#safetyDialog').close());
$('#soundButton').addEventListener('click', event => {
  const next = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', String(next)); event.currentTarget.textContent = next ? '♪' : '×';
});
document.addEventListener('keydown', event => {
  if (!['Enter', ' '].includes(event.key) || ['INPUT', 'BUTTON'].includes(document.activeElement.tagName)) return;
  event.preventDefault();
  if ($('#startScreen').classList.contains('active')) return startGame();
  if ($('#resultScreen').classList.contains('active')) return startGame();
  const first = document.querySelector('.choice:not(:disabled), .prompt-chip'); first?.click();
});

showScreen('startScreen');
