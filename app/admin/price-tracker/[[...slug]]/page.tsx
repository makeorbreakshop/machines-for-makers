import { redirect } from 'next/navigation';

export default function PriceTrackerRedirect({ params }: { params: { slug?: string[] } }) {
  const slug = params.slug || [];
  
  // Map old URLs to new URLs
  let newPath = '/admin/tools/price-tracker';
  
  if (slug.length === 0) {
    // Default to the main price tracker page
    return redirect(newPath);
  }
  
  if (slug[0] === 'batch-results') {
    // Map old batch results page to new one
    if (slug.length > 1) {
      // If we have a batch ID, use it in the new path
      return redirect(`${newPath}/batch-results/${slug[1]}`);
    } else {
      // Default batch results page
      return redirect(`${newPath}/batch-results`);
    }
  }
  
  // For all other paths, just add them to the new base path
  return redirect(`${newPath}/${slug.join('/')}`);
} 