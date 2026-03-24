import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from '@client/components/HomePage';

describe('HomePage', () => {
  it('renders API base URL from NEXT_PUBLIC_API_URL', () => {
    render(<HomePage />);
    expect(screen.getByText('http://127.0.0.1:3000')).toBeInTheDocument();
  });
});
