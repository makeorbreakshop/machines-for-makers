import React from 'react';

// Re-export the configuration
export { dynamic, revalidate, fetchCache } from './config';

// Default layout function
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
} 