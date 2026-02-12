import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaceholderPage } from '../PlaceholderPage';

describe('PlaceholderPage', () => {
  it('renders title', () => {
    render(<PlaceholderPage title="Hello" />);
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
  });
});
