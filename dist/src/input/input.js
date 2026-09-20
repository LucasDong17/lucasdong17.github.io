const ACTIONS = {
  KeyW: 'north', ArrowUp: 'north', KeyS: 'south', ArrowDown: 'south',
  KeyA: 'west', ArrowLeft: 'west', KeyD: 'east', ArrowRight: 'east',
  Space: 'attack', KeyE: 'pickup', KeyR: 'restart',
};

export class Input {
  constructor(canvas, onPause, onRestart, onGesture) {
    this.canvas = canvas;
    this.held = new Set();
    this.attackPressed = false;
    this.controller = new AbortController();
    const listen = (target, type, fn) => target.addEventListener(type, fn, { signal: this.controller.signal });
    listen(window, 'keydown', event => {
      if (document.activeElement !== canvas || !ACTIONS[event.code]) return;
      event.preventDefault();
      onGesture();
      this.held.add(event.code);
      if (ACTIONS[event.code] === 'attack' && !event.repeat) this.attackPressed = true;
      if (ACTIONS[event.code] === 'restart' && !event.repeat) onRestart();
    });
    listen(window, 'keyup', event => {
      if (document.activeElement === canvas && ACTIONS[event.code]) event.preventDefault();
      this.held.delete(event.code);
    });
    listen(canvas, 'pointerdown', event => {
      if (event.button !== 0) return;
      canvas.focus();
      onGesture();
      this.held.add('pointerAttack');
      this.attackPressed = true;
    });
    listen(window, 'pointerup', () => this.held.delete('pointerAttack'));
    listen(window, 'pointercancel', () => this.clear());
    listen(window, 'blur', () => { this.clear(); onPause(); });
    listen(canvas, 'blur', event => {
      this.clear();
      // UI buttons manage their own pause state; moving focus to them is not a focus-loss pause.
      if (!(event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest('button'))) onPause();
    });
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { this.clear(); onPause(); }
    });
  }
  has(action) { return [...this.held].some(code => ACTIONS[code] === action); }
  sample() {
    // Preserve short taps that begin and end between two simulation steps.
    const attack = this.attackPressed || this.has('attack') || this.held.has('pointerAttack');
    this.attackPressed = false;
    return { moveX: Number(this.has('east')) - Number(this.has('west')), moveZ: Number(this.has('south')) - Number(this.has('north')), attack, pickup: this.has('pickup') };
  }
  clear() { this.held.clear(); this.attackPressed = false; }
  destroy() { this.clear(); this.controller.abort(); }
}
