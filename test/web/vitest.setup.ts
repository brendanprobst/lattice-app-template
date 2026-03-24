import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

vi.mock('next/image', () => ({
  default: function MockImage({
    src,
    alt,
    priority: _priority,
    ...rest
  }: {
    src: string;
    alt: string;
    priority?: boolean;
    [key: string]: unknown;
  }) {
    return React.createElement('img', { src, alt, ...rest });
  },
}));
