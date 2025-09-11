export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { LeadMagnetForm } from '../lead-magnet-form';

export const metadata: Metadata = {
  title: 'Add Lead Magnet | Admin',
  description: 'Create a new lead magnet',
};

export default function NewLeadMagnetPage() {

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Add Lead Magnet</h1>
        <p className="text-muted-foreground mt-1">
          Create a new lead magnet with ConvertKit integration
        </p>
      </div>
      <LeadMagnetForm />
    </div>
  );
}