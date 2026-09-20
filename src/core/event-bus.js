export class EventBus {
  constructor() { this.listeners = new Map(); }
  on(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
    return () => this.listeners.get(name)?.delete(fn);
  }
  emit(name, value) { this.listeners.get(name)?.forEach(fn => fn(value)); }
}
