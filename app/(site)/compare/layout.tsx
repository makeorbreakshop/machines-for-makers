import React from 'react';
import { Metadata } from 'next';

// Define config directly instead of importing
export const dynamic = 'auto';
export const revalidate = 3600;

// Add font display optimization metadata
export const metadata: Metadata = {
  other: {
    // Set font-display strategy without preloading non-existent fonts
    'font-display': 'swap',
  },
}

// Default layout function
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
} 