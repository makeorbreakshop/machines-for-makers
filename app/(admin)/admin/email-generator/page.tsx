export const runtime = 'nodejs';

import { EmailGeneratorContent } from './email-generator-content';

export default function EmailGeneratorPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Generator</h1>
        <p className="text-muted-foreground">Generate weekly deal digest emails for ConvertKit</p>
      </div>
      <EmailGeneratorContent />
    </div>
  );
}