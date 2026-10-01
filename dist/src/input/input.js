const ACTIONS = {
  KeyW: 'north', ArrowUp: 'north', KeyS: 'south', ArrowDown: 'south',
  KeyA: 'west', ArrowLeft: 'west', KeyD: 'east', ArrowRight: 'east',
  Space: 'attack', KeyE: 'pickup', KeyR: 'restart',
};

export function usesTouchControls(view = globalThis.window, nav = globalThis.navigator) {
  const mobileHint = Boolean(nav?.userAgentData?.mobile);
  const touchPoints = Number(nav?.maxTouchPoints || 0);
  const coarsePointer = Boolean(view?.matchMedia?.('(any-pointer: coarse)').matches);
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(nav?.userAgent || '');
  return mobileHint || mobileUserAgent || (touchPoints > 0 && coarsePointer);
}

export class Input {
  constructor(canvas, onPause, onRestart, onGesture) {
    this.canvas = canvas;
    this.held = new Set();
    this.attackPressed = false;
    this.touchMove = { x: 0, z: 0 };
    this.touchAttackPointers = new Set();
    this.touchPickupPointers = new Set();
    this.joystickPointer = null;
    this.controller = new AbortController();
    const listen = (target, type, fn) => target.addEventListener(type, fn, { signal: this.controller.signal });
    this.touchUi = {
      root: document.getElementById('touch-controls'),
      joystick: document.getElementById('touch-joystick'),
      knob: document.getElementById('touch-joystick-knob'),
      attack: document.getElementById('touch-attack'),
      pickup: document.getElementById('touch-pickup'),
    };
    this.mobile = usesTouchControls();
    document.documentElement.dataset.controlMode = this.mobile ? 'mobile' : 'pc';
    if (this.touchUi.root) this.touchUi.root.hidden = !this.mobile;
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
      if (this.mobile && event.pointerType === 'touch') return;
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

    const keepGameFocused = event => {
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      onGesture();
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const updateJoystick = event => {
      if (event.pointerId !== this.joystickPointer) return;
      const rect = this.touchUi.joystick.getBoundingClientRect();
      const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.31);
      let x = (event.clientX - (rect.left + rect.width / 2)) / radius;
      let z = (event.clientY - (rect.top + rect.height / 2)) / radius;
      const length = Math.hypot(x, z);
      if (length > 1) { x /= length; z /= length; }
      this.touchMove.x = x;
      this.touchMove.z = z;
      this.touchUi.knob.style.transform = `translate(${x * radius}px, ${z * radius}px)`;
    };
    if (this.touchUi.joystick) {
      listen(this.touchUi.joystick, 'pointerdown', event => {
        if (this.joystickPointer !== null) return;
        keepGameFocused(event);
        this.joystickPointer = event.pointerId;
        this.touchUi.joystick.classList.add('active');
        updateJoystick(event);
      });
      listen(this.touchUi.joystick, 'pointermove', event => { event.preventDefault(); updateJoystick(event); });
      const releaseJoystick = event => {
        if (event.pointerId !== this.joystickPointer) return;
        this.joystickPointer = null;
        this.touchMove.x = 0;
        this.touchMove.z = 0;
        this.touchUi.knob.style.transform = '';
        this.touchUi.joystick.classList.remove('active');
      };
      listen(this.touchUi.joystick, 'pointerup', releaseJoystick);
      listen(this.touchUi.joystick, 'pointercancel', releaseJoystick);
      listen(this.touchUi.joystick, 'lostpointercapture', releaseJoystick);
    }
    const bindHoldButton = (button, pointers, onPress) => {
      if (!button) return;
      listen(button, 'pointerdown', event => {
        keepGameFocused(event);
        pointers.add(event.pointerId);
        button.classList.add('active');
        onPress?.();
      });
      const release = event => {
        pointers.delete(event.pointerId);
        if (pointers.size === 0) button.classList.remove('active');
      };
      listen(button, 'pointerup', release);
      listen(button, 'pointercancel', release);
      listen(button, 'lostpointercapture', release);
    };
    bindHoldButton(this.touchUi.attack, this.touchAttackPointers, () => { this.attackPressed = true; });
    bindHoldButton(this.touchUi.pickup, this.touchPickupPointers);
  }
  has(action) { return [...this.held].some(code => ACTIONS[code] === action); }
  sample() {
    // Preserve short taps that begin and end between two simulation steps.
    const attack = this.attackPressed || this.has('attack') || this.held.has('pointerAttack') || this.touchAttackPointers.size > 0;
    this.attackPressed = false;
    const moveX = Math.max(-1, Math.min(1, Number(this.has('east')) - Number(this.has('west')) + this.touchMove.x));
    const moveZ = Math.max(-1, Math.min(1, Number(this.has('south')) - Number(this.has('north')) + this.touchMove.z));
    return { moveX, moveZ, attack, pickup: this.has('pickup') || this.touchPickupPointers.size > 0 };
  }
  clear() {
    this.held.clear();
    this.attackPressed = false;
    this.touchMove.x = 0;
    this.touchMove.z = 0;
    this.touchAttackPointers.clear();
    this.touchPickupPointers.clear();
    this.joystickPointer = null;
    this.touchUi?.knob && (this.touchUi.knob.style.transform = '');
    this.touchUi?.joystick?.classList.remove('active');
    this.touchUi?.attack?.classList.remove('active');
    this.touchUi?.pickup?.classList.remove('active');
  }
  destroy() { this.clear(); this.controller.abort(); }
}
