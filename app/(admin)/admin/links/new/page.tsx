export const runtime = 'nodejs';

import { NewLinkForm } from './new-link-form';

export const metadata = {
  title: 'Create Short Link | Admin',
  description: 'Create a new branded short URL',
};

export default function NewLinkPage() {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Short Link</h1>
        <p className="text-gray-600 mt-1">Create a new branded short URL with tracking</p>
      </div>
      <NewLinkForm />
    </div>
  );
}