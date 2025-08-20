export const runtime = 'nodejs';

import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import LaserComparisonLanding from './components/LaserComparisonLanding';
import LaserComparisonServer from './components/LaserComparisonServer';

export const metadata: Metadata = {
  title: '157 Laser Cutters Compared: Real Specs, Real Prices',
  description: 'Compare actual work areas, real power specs, and software compatibility for every major laser cutter in one place.',
  robots: 'noindex, nofollow', // Landing page, not for SEO
};

export default async function LaserComparisonPage() {
  const supabase = await createServerClient();
  
  // Fetch popular laser cutters in the sweet spot price range with complete data
  const { data: allMachines } = await supabase
    .from('machines')
    .select(`
      id,
      "Machine Name",
      "Internal link",
      "Company",
      "Price",
      "Work Area",
      "Laser Power A",
      "Laser Type A",
      "Speed",
      "Software",
      "Focus",
      "Camera",
      "Image"
    `)
    .eq('Machine Category', 'laser')
    .neq('Hidden', 'true')
    .not('Published On', 'is', null)
    .not('Price', 'is', null)
    .gte('Price', 500)
    .lte('Price', 5000)
    .in('Company', ['xtool', 'omtech', 'glowforge', 'creality', 'thunder', 'onelaser'])
    .neq('Speed', '?')
    .not('Speed', 'is', null)
    .neq('Software', '?')
    .not('Software', 'is', null)
    .neq('Machine Name', 'Creality Falcon A1 10W')
    .order('Price', { ascending: true });

  // Find OneLaser XRF specifically
  const oneLaserXRF = allMachines?.find(m => 
    m['Machine Name']?.toLowerCase().includes('onelaser') && 
    m['Machine Name']?.toLowerCase().includes('xrf')
  );
  
  // Separate xTool machines and other machines
  const xtoolMachines = allMachines?.filter(m => m.Company === 'xtool') || [];
  const otherMachines = allMachines?.filter(m => 
    m.Company !== 'xtool' && 
    m['Machine Name'] !== oneLaserXRF?.['Machine Name']
  ) || [];
  
  // Group other machines by laser type
  const machinesByType: Record<string, any[]> = {};
  otherMachines.forEach(machine => {
    const type = machine['Laser Type A'] || 'Other';
    if (!machinesByType[type]) {
      machinesByType[type] = [];
    }
    machinesByType[type].push(machine);
  });

  // Select machines: Start with OneLaser XRF and xTool machines, then add diverse types
  const machines: any[] = [];
  
  // Add OneLaser XRF first if found
  if (oneLaserXRF) {
    machines.push(oneLaserXRF);
  }
  
  // Add 2 xTool machines (different types if possible)
  const xtoolTypes = new Set<string>();
  for (const machine of xtoolMachines) {
    if (machines.length < 3) {
      const type = machine['Laser Type A'];
      if (!xtoolTypes.has(type) || machines.filter(m => m.Company === 'xtool').length < 2) {
        machines.push(machine);
        xtoolTypes.add(type);
      }
    }
  }
  
  // Add machines from other brands with type diversity
  const typeKeys = Object.keys(machinesByType);
  let typeIndex = 0;
  
  while (machines.length < 6 && typeKeys.length > 0) {
    const currentType = typeKeys[typeIndex % typeKeys.length];
    const typeMachines = machinesByType[currentType];
    
    if (typeMachines && typeMachines.length > 0) {
      machines.push(typeMachines.shift());
      if (typeMachines.length === 0) {
        typeKeys.splice(typeIndex % typeKeys.length, 1);
      }
    }
    typeIndex++;
  }

  return (
    <>
      <LaserComparisonServer />
      <LaserComparisonLanding machines={machines || []} />
    </>
  );
}