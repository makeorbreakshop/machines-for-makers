import { redirect } from 'next/navigation';

export default function AffiliatePage() {
  // Redirect to the programs page as the main entry point
  redirect('/admin/affiliate/programs');
}