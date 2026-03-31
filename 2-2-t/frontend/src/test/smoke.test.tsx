import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import App from '../App';

describe('smoke', () => {
  it('renders app', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /smartbooking/i, level: 1 }),
    ).toBeInTheDocument();
  });
});
