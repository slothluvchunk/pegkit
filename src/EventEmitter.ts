type Listener<T> = (event: T) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EventEmitter<TEventMap extends Record<keyof TEventMap, any>> {
  private listeners: { [K in keyof TEventMap]?: Listener<TEventMap[K]>[] } = {};

  on<K extends keyof TEventMap>(event: K, listener: Listener<TEventMap[K]>): () => void {
    const list = (this.listeners[event] ??= []);
    list.push(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof TEventMap>(event: K, listener: Listener<TEventMap[K]>): void {
    const list = this.listeners[event];
    if (!list) return;
    const idx = list.indexOf(listener);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]): void {
    const list = this.listeners[event];
    if (!list) return;
    for (const listener of [...list]) {
      listener(data);
    }
  }
}
