import { hatchEgg, createRun } from '../src/state/run.js';
import { Hud } from '../src/ui/hud.js';

const markup = await (await fetch('../index.html')).text();
const template = new DOMParser().parseFromString(markup, 'text/html');
template.querySelectorAll('script').forEach(script => script.remove());
document.body.innerHTML = template.body.innerHTML;

const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = '../css/main.css';
document.head.append(style);

const run = createRun();
run.coins = 2500;
run.progress.unlocked.frost = 1;
const hud = new Hud({ onHatch: key => hatchEgg(run, key, () => 0) });
hud.render(run, false, true);
hud.openMenu('pet-shop');
document.documentElement.dataset.fixtureReady = 'true';
