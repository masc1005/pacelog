import { describe, it, expect } from 'vitest';
import { App } from './App';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Badge } from './components/ui/Badge';
import { Card } from './components/ui/Card';

describe('Frontend UI & Design System Component Tests', () => {
  it('deve exportar o componente App raiz corretamente', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('deve exportar os componentes do Design System corretamente', () => {
    expect(Button).toBeDefined();
    expect(Input).toBeDefined();
    expect(Badge).toBeDefined();
    expect(Card).toBeDefined();
  });
});
