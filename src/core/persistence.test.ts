import { beforeEach, describe, expect, it } from 'vitest';

import { createStore } from './persistence.ts';

interface Settings {
  size: string;
  pages: number;
  prefix?: string;
}

describe('createStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    const store = createStore<Settings>('test:key:1');
    expect(store.load()).toBeNull();
  });

  it('round-trips a value through save / load', () => {
    const store = createStore<Settings>('test:key:2');
    store.save({ size: '6', pages: 3, prefix: '1班' });
    expect(store.load()).toEqual({ size: '6', pages: 3, prefix: '1班' });
  });

  it('returns null on corrupt JSON without throwing', () => {
    localStorage.setItem('test:key:3', '{not valid json');
    const store = createStore<Settings>('test:key:3');
    expect(store.load()).toBeNull();
  });

  it('returns null when stored value is a primitive (defensive)', () => {
    localStorage.setItem('test:key:4', JSON.stringify('hello'));
    const store = createStore<Settings>('test:key:4');
    expect(store.load()).toBeNull();
  });

  it('clear removes the key', () => {
    const store = createStore<Settings>('test:key:5');
    store.save({ size: '5', pages: 1 });
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('isolates by key', () => {
    const a = createStore<Settings>('test:key:a');
    const b = createStore<Settings>('test:key:b');
    a.save({ size: '6', pages: 3 });
    b.save({ size: '8', pages: 1 });
    expect(a.load()).toEqual({ size: '6', pages: 3 });
    expect(b.load()).toEqual({ size: '8', pages: 1 });
  });
});
