import { describe, it, expect } from 'vitest';
import { App } from './App.js';

describe('Frontend Base Sanity Test', () => {
  it('deve exportar o componente App corretamente', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });
});
