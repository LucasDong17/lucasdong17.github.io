const subjects = ["math", "science", "reading", "art", "engineering", "history"];
const completed = new Set(JSON.parse(localStorage.getItem("orbitLabProgress") || "[]"));
const subjectNames = {
  math: "Math", science: "Science", reading: "Reading + Writing",
  art: "Art + Design", engineering: "Engineering + Tech", history: "History + Teamwork"
};
const subjectIcons = { math: "↗", science: "⌁", reading: "✎", art: "✦", engineering: "⚙", history: "⌛" };
const completionLabels = {
  math: "Lock in this world", science: "Approve planet", reading: "Save transmission",
  art: "Name this system", engineering: "Finish blueprint", history: "Complete rescue"
};

const tabs = [...document.querySelectorAll(".subject-tab")];
const panels = [...document.querySelectorAll(".lesson-panel")];

function selectSubject(subject, moveFocus = false) {
  tabs.forEach((tab) => {
    const selected = tab.dataset.subject === subject;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", selected);
    tab.tabIndex = selected ? 0 : -1;
    if (selected && moveFocus) tab.focus();
  });
  panels.forEach((panel) => {
    const selected = panel.dataset.panel === subject;
    panel.classList.toggle("active", selected);
    panel.hidden = !selected;
  });
  if (window.location.hash !== `#${subject}`) history.replaceState(null, "", `#${subject}`);
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectSubject(tab.dataset.subject));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    const next = (index + direction + tabs.length) % tabs.length;
    selectSubject(tabs[next].dataset.subject, true);
  });
});

function setupLessonSteps() {
  panels.forEach((panel) => {
    const subject = panel.dataset.panel;
    const steps = panel.querySelector(".mission-steps");
    const activity = panel.querySelector(".activity-card");
    const activityStep = document.createElement("div");
    activityStep.className = "activity-step-card";
    activityStep.innerHTML = `<b>★</b><p><strong>Hands-on time:</strong> Use the mission lab, finish the challenge, then collect your ${subjectNames[subject]} badge.</p>`;
    steps.appendChild(activityStep);
    steps.classList.add("steps-enabled");

    const journey = document.createElement("div");
    journey.className = "step-journey";
    journey.innerHTML = `<div class="step-status"><strong>STEP <span>1</span> OF 4</strong><em>QUICK IDEA 1</em></div><div class="step-track" aria-label="Lesson progress"><i></i><i></i><i></i><i></i></div><div class="step-nav"><button type="button" class="step-back">← Back</button><button type="button" class="step-next">Next idea →</button></div>`;
    steps.before(journey);

    let currentStep = 0;
    let unlocked = completed.has(subject);
    const cards = [...steps.children];
    const statusNumber = journey.querySelector(".step-status span");
    const statusLabel = journey.querySelector(".step-status em");
    const markers = [...journey.querySelectorAll(".step-track i")];
    const back = journey.querySelector(".step-back");
    const next = journey.querySelector(".step-next");

    function renderStep() {
      cards.forEach((card, index) => card.classList.toggle("active-step", index === currentStep));
      markers.forEach((marker, index) => {
        marker.classList.toggle("current", index === currentStep);
        marker.classList.toggle("passed", index < currentStep);
      });
      statusNumber.textContent = currentStep + 1;
      statusLabel.textContent = currentStep === 3 ? "HANDS-ON ACTIVITY" : `QUICK IDEA ${currentStep + 1}`;
      back.disabled = currentStep === 0;
      next.hidden = currentStep === 3;
      next.textContent = currentStep === 2 ? "Unlock activity ★" : "Next idea →";
      if (currentStep === 3) unlocked = true;
      activity.classList.toggle("activity-locked", !unlocked);
      activity.classList.toggle("activity-unlocked", unlocked);
      activity.setAttribute("aria-disabled", String(!unlocked));
      activity.inert = !unlocked;
    }

    back.addEventListener("click", () => { if (currentStep > 0) { currentStep -= 1; renderStep(); } });
    next.addEventListener("click", () => {
      if (currentStep < 3) currentStep += 1;
      renderStep();
      if (currentStep === 3 && window.innerWidth < 900) activity.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    panel.setLessonStep = (step) => { currentStep = Math.max(0, Math.min(3, step)); if (step === 3) unlocked = true; renderStep(); };
    if (completed.has(subject)) currentStep = 3;
    renderStep();
  });
}

setupLessonSteps();

function updateProgress() {
  localStorage.setItem("orbitLabProgress", JSON.stringify([...completed]));
  document.querySelector("#missionCount").textContent = `${completed.size} / 6 missions complete`;
  document.querySelector("#starCount").textContent = completed.size * 100;
  subjects.forEach((subject) => {
    const isDone = completed.has(subject);
    document.querySelector(`[data-subject="${subject}"]`).classList.toggle("complete", isDone);
    document.querySelector(`[data-badge="${subject}"]`).classList.toggle("earned", isDone);
    const button = document.querySelector(`[data-complete="${subject}"]`);
    button.classList.toggle("done", isDone);
    button.firstChild.textContent = isDone ? "Mission complete " : `${completionLabels[subject]} `;
    if (isDone) document.querySelector(`[data-panel="${subject}"]`).setLessonStep(3);
  });
  const finale = document.querySelector("#finaleText");
  const allDone = completed.size === 6;
  finale.textContent = allDone
    ? "Flight log complete! You explored space with the mind of a scientist, artist, writer, engineer, mathematician, and teammate."
    : `${completed.size} badge${completed.size === 1 ? "" : "s"} earned. Complete ${6 - completed.size} more to become an Orbit Lab commander.`;
  document.querySelector("#finale").classList.toggle("all-done", allDone);
  document.querySelector("#finalTitle").innerHTML = allDone ? "You did it!<br>Orbit Commander." : "Six missions.<br>One giant brain.";
  const commanderReward = document.querySelector("#commanderReward");
  commanderReward.classList.toggle("unlocked", allDone);
  commanderReward.querySelector("small").textContent = allDone ? "FINAL REWARD UNLOCKED" : "FINAL REWARD LOCKED";
}

const rewardDialog = document.querySelector("#rewardDialog");
function nextUnfinishedSubject(afterSubject) {
  const start = subjects.indexOf(afterSubject);
  for (let offset = 1; offset <= subjects.length; offset += 1) {
    const candidate = subjects[(start + offset) % subjects.length];
    if (!completed.has(candidate)) return candidate;
  }
  return null;
}

function showReward(subject) {
  const allDone = completed.size === 6;
  const next = nextUnfinishedSubject(subject);
  document.querySelector("#rewardKicker").textContent = allDone ? "ALL SIX MISSIONS COMPLETE" : `${subjectNames[subject].toUpperCase()} COMPLETE`;
  document.querySelector("#rewardMedal").textContent = allDone ? "♛" : subjectIcons[subject];
  document.querySelector("#rewardTitle").textContent = allDone ? "Orbit Commander unlocked!" : `${subjectNames[subject]} badge unlocked!`;
  document.querySelector("#rewardMessage").textContent = allDone
    ? "You connected all six school subjects to space. Your final commander reward is ready!"
    : `Great work! You finished the ${subjectNames[subject]} mission and earned 100 star points.`;
  document.querySelector("#rewardStars").textContent = `${completed.size * 100} ★`;
  const nextButton = document.querySelector("#nextMission");
  nextButton.dataset.next = next || "finale";
  nextButton.firstChild.textContent = allDone ? "See my final reward " : `Try ${subjectNames[next]} next `;
  if (typeof rewardDialog.showModal === "function") rewardDialog.showModal();
  else rewardDialog.setAttribute("open", "");
}

document.querySelectorAll(".complete-button").forEach((button) => {
  button.addEventListener("click", () => {
    const subject = button.dataset.complete;
    if (completed.has(subject)) return;
    completed.add(subject);
    updateProgress();
    showReward(subject);
  });
});

function closeReward() {
  if (typeof rewardDialog.close === "function") rewardDialog.close();
  else rewardDialog.removeAttribute("open");
}
document.querySelector("#closeReward").addEventListener("click", closeReward);
document.querySelector("#stayHere").addEventListener("click", closeReward);
document.querySelector("#nextMission").addEventListener("click", (event) => {
  const destination = event.currentTarget.dataset.next;
  closeReward();
  if (destination === "finale") {
    document.querySelector("#finale").scrollIntoView({ behavior: "smooth" });
    return;
  }
  selectSubject(destination);
  document.querySelector(".lesson-shell").scrollIntoView({ behavior: "smooth", block: "start" });
});

const sizeSlider = document.querySelector("#planetSize");
function updatePlanetSize() {
  const value = Number(sizeSlider.value);
  const scale = value / 100;
  document.querySelector("#mathPlanet").style.transform = `scale(${.55 + scale * .45})`;
  document.querySelector("#sizeLabel").textContent = `${scale.toFixed(1)}× EARTH`;
  document.querySelector("#weightResult").textContent = `${Math.round(40 * Math.pow(scale, 1.15))} kg`;
  document.querySelector("#gravityResult").textContent = scale < .8 ? "Bouncy" : scale > 1.35 ? "Super strong" : "Earth-like";
}
sizeSlider.addEventListener("input", updatePlanetSize);

const materialFacts = {
  rock: { density: "High", result: "Safe orbit!", badge: "STABLE" },
  gas: { density: "Low", result: "Needs more room", badge: "WIDE ORBIT" },
  ice: { density: "Medium", result: "Keep it cold", badge: "CHILLY" }
};
document.querySelectorAll(".material").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".material").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  const material = button.dataset.material;
  document.querySelector("#sciencePlanet").className = `science-planet ${material}`;
  document.querySelector("#densityResult").textContent = materialFacts[material].density;
  document.querySelector("#scienceResult").textContent = materialFacts[material].result;
  document.querySelector("#safetyBadge").textContent = materialFacts[material].badge;
}));

const storyFields = ["heroType", "storyPlace", "storySidekick", "storyProblem"];
const toneDetails = {
  funny: {
    signal: "GIGGLE SIGNAL",
    arrival: "The landing was perfect—except for the part where the snack box exploded everywhere.",
    reaction: "This was definitely not in the instruction manual"
  },
  mysterious: {
    signal: "SECRET SIGNAL",
    arrival: "A silver trail of footprints appeared outside, but nobody was there.",
    reaction: "Something on this world knows my name"
  },
  epic: {
    signal: "HERO SIGNAL",
    arrival: "Lightning flashed across the stars as the ship touched down.",
    reaction: "Whatever happens next, we face it together"
  }
};
const endings = {
  brave: "With one deep breath, the crew charged straight toward the danger. The risky move worked—and a brand-new constellation flashed above them like a victory sign.",
  clever: "Instead of rushing in, the crew built a decoder from a spoon, a boot lace, and the ship’s last working calculator. The strange problem suddenly made perfect sense.",
  kind: "The crew sent a friendly message into the darkness. A shy alien answered, and together they repaired the problem before sharing a bag of floating space snacks."
};
let currentStory = "";

function makeStory() {
  const name = document.querySelector("#heroName").value.trim() || "Nova";
  const type = document.querySelector("#heroType").value;
  const place = document.querySelector("#storyPlace").value;
  const sidekick = document.querySelector("#storySidekick").value;
  const problem = document.querySelector("#storyProblem").value;
  const tone = document.querySelector('input[name="storyTone"]:checked').value;
  const details = toneDetails[tone];
  currentStory = `MISSION LOG: ${name.toUpperCase()} AND THE IMPOSSIBLE SIGNAL\n\nAt 02:17 space time, ${name}, a ${type}, landed on ${place} with ${sidekick}. ${details.arrival}\n\nThen the emergency screen blinked red: ${problem}. “${details.reaction},” said ${name}. The countdown clock started at ten…`;
  const output = document.querySelector("#storyOutput");
  output.textContent = currentStory;
  output.classList.add("has-story");
  document.querySelector("#storySignal").textContent = details.signal;
  document.querySelector("#endingChoices").hidden = false;
}

document.querySelector("#generateStory").addEventListener("click", makeStory);
document.querySelector("#surpriseStory").addEventListener("click", () => {
  const names = ["Nova", "Ziggy", "Luna", "Cosmo", "Ari", "Rocket"];
  document.querySelector("#heroName").value = names[Math.floor(Math.random() * names.length)];
  storyFields.forEach((id) => {
    const field = document.querySelector(`#${id}`);
    field.selectedIndex = Math.floor(Math.random() * field.options.length);
  });
  const tones = [...document.querySelectorAll('input[name="storyTone"]')];
  tones[Math.floor(Math.random() * tones.length)].checked = true;
  makeStory();
});
document.querySelectorAll("[data-ending]").forEach((button) => button.addEventListener("click", () => {
  if (!currentStory) return;
  document.querySelector("#storyOutput").textContent = `${currentStory}\n\n${endings[button.dataset.ending]}\n\nTHE END… OR IS IT?`;
  document.querySelector("#endingChoices").hidden = true;
  document.querySelector("#storySignal").textContent = "STORY COMPLETE";
}));

let artPlanets = 1;
document.querySelector("#addPlanet").addEventListener("click", () => {
  if (artPlanets >= 5) return;
  const planet = document.createElement("button");
  planet.type = "button";
  planet.className = "made-planet";
  const size = Number(document.querySelector("#artSize").value);
  planet.style.width = `${size}px`;
  planet.style.height = `${size}px`;
  planet.style.background = document.querySelector("#planetColor").value;
  planet.style.left = `${12 + (artPlanets * 17) % 70}%`;
  planet.style.top = `${10 + (artPlanets * 21) % 67}%`;
  planet.setAttribute("aria-label", `Drag planet ${artPlanets + 1}`);
  document.querySelector("#artSystem").appendChild(planet);
  artPlanets += 1;
  document.querySelector("#worldCount").textContent = `${artPlanets} / 5 WORLDS`;
});
document.querySelector("#resetSystem").addEventListener("click", () => {
  document.querySelectorAll(".made-planet").forEach((planet, index) => { if (index) planet.remove(); });
  artPlanets = 1;
  document.querySelector("#worldCount").textContent = "1 / 5 WORLDS";
});

const artSystem = document.querySelector("#artSystem");
let draggedPlanet = null;
function positionPlanet(event) {
  if (!draggedPlanet) return;
  const bounds = artSystem.getBoundingClientRect();
  const size = draggedPlanet.getBoundingClientRect().width;
  const left = Math.max(0, Math.min(event.clientX - bounds.left - size / 2, bounds.width - size));
  const top = Math.max(0, Math.min(event.clientY - bounds.top - size / 2, bounds.height - size));
  draggedPlanet.style.left = `${left}px`;
  draggedPlanet.style.top = `${top}px`;
}
artSystem.addEventListener("pointerdown", (event) => {
  const planet = event.target.closest(".made-planet");
  if (!planet) return;
  draggedPlanet = planet;
  planet.classList.add("dragging");
  planet.setPointerCapture(event.pointerId);
  positionPlanet(event);
});
artSystem.addEventListener("pointermove", positionPlanet);
function stopDragging(event) {
  if (!draggedPlanet) return;
  draggedPlanet.classList.remove("dragging");
  if (draggedPlanet.hasPointerCapture(event.pointerId)) draggedPlanet.releasePointerCapture(event.pointerId);
  draggedPlanet = null;
}
artSystem.addEventListener("pointerup", stopDragging);
artSystem.addEventListener("pointercancel", stopDragging);
artSystem.addEventListener("keydown", (event) => {
  const planet = event.target.closest(".made-planet");
  if (!planet || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const amount = event.shiftKey ? 10 : 3;
  const left = planet.offsetLeft;
  const top = planet.offsetTop;
  if (event.key === "ArrowLeft") planet.style.left = `${Math.max(0, left - amount)}px`;
  if (event.key === "ArrowRight") planet.style.left = `${Math.min(artSystem.clientWidth - planet.offsetWidth, left + amount)}px`;
  if (event.key === "ArrowUp") planet.style.top = `${Math.max(0, top - amount)}px`;
  if (event.key === "ArrowDown") planet.style.top = `${Math.min(artSystem.clientHeight - planet.offsetHeight, top + amount)}px`;
});

let launchTimer;
document.querySelector("#launchRocket").addEventListener("click", () => {
  clearTimeout(launchTimer);
  const rocket = document.querySelector("#rocket");
  rocket.classList.remove("flying", "shake");
  void rocket.offsetWidth;
  const engine = Number(document.querySelector("#engineChoice").value);
  const cargo = Number(document.querySelector("#cargoChoice").value);
  const success = engine >= cargo;
  rocket.classList.add(success ? "flying" : "shake");
  document.querySelector("#launchBadge").textContent = success ? "LIFTOFF!" : "TOO HEAVY";
  document.querySelector("#launchResult").textContent = success ? "Success! Your thrust can lift the cargo." : "Almost! Choose a stronger engine or lighter cargo.";
  launchTimer = setTimeout(() => rocket.classList.remove("flying", "shake"), 1800);
});

let repairStep = 1;
document.querySelectorAll(".repair-list button").forEach((button) => button.addEventListener("click", () => {
  const chosen = Number(button.dataset.step);
  if (button.classList.contains("fixed")) return;
  if (chosen !== repairStep) {
    document.querySelector("#repairResult").textContent = repairStep === 1 ? "No power yet—switch on the backup first!" : "Not quite. Follow the crew checklist in order.";
    return;
  }
  button.classList.add("fixed");
  if (repairStep === 1) document.querySelector(".cabin").classList.add("power");
  repairStep += 1;
  const fixed = repairStep - 1;
  document.querySelector("#repairBadge").textContent = `${fixed} / 3 FIXED`;
  document.querySelector("#repairResult").textContent = fixed < 3 ? "Good teamwork! What comes next?" : "Cabin safe. Crew connected. Rescue complete!";
  if (fixed === 3) {
    document.querySelector(".cabin").classList.add("fixed");
    document.querySelector('[data-complete="history"]').disabled = false;
  }
}));

document.querySelector("#resetProgress").addEventListener("click", () => {
  completed.clear();
  panels.forEach((panel) => panel.setLessonStep(0));
  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

updatePlanetSize();
updateProgress();
const requestedSubject = window.location.hash.slice(1);
if (subjects.includes(requestedSubject)) {
  selectSubject(requestedSubject);
  setTimeout(() => document.querySelector(".lesson-shell").scrollIntoView(), 250);
}
