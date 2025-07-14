export const runtime = 'nodejs';

import { Metadata } from 'next';
import GroupBuyProductStyle from '@/components/group-buy/group-buy-product-style';

export const metadata: Metadata = {
  title: 'OneLaser XRF Group Buy - Save $696 | Machines for Makers',
  description: 'Join our exclusive group buy for the OneLaser XRF 38W RF laser cutter. Save $696 per unit with group pricing: $3,999 (regular $4,695). Limited to 20 units only.',
  openGraph: {
    title: 'OneLaser XRF Group Buy - Save $696 Per Unit',
    description: 'Exclusive RF metal tube laser group buy - Only 13 spots remaining!',
    type: 'website',
  },
};

export default function OneLaserXRFGroupBuy() {
  const groupBuyData = {
    machineId: 'onelaser-xrf',
    machineName: 'OneLaser XRF',
    machineImage: 'https://cdn.prod.website-files.com/676083e5495a13bdfd063abb/6793ee0037c163166289d418_onelaser2.webp',
    regularPrice: 4695, // Hypothetical group buy scenario pricing
    groupBuyPrice: 3999,
    actualPrice: 4295, // Real database price
    savings: 696,
    targetQuantity: 20,
    currentQuantity: 7, // Demo data
    depositPercentage: 5,
    endDate: new Date('2025-08-15T23:59:59'),
    affiliateLink: 'https://geni.us/onelaser_xrf',
    workArea: '600x300 mm',
    laserType: 'CO2-RF',
    laserPower: '38W',
    speed: '1200 mm/s',
    software: 'LightBurn',
    features: [
      'CO2 RF metal tube technology - no glass tube degradation',
      'High precision 38W laser with 1200mm/s speed',
      'Fully enclosed design with integrated camera',
      'Auto-focus system for consistent results', 
      'LightBurn software compatibility',
      'American-based company with local support',
      'Compact 600x300mm work area perfect for desktop use'
    ],
    highlights: [
      'High quality build',
      'Excellent price point',
      'American based company',
      'High end specifications'
    ],
    bestFor: 'Best Desktop Laser',
    tradeInOffer: {
      enabled: true,
      maxValue: 500,
      description: 'Upgrade from glass tube CO2 machine to RF metal machine'
    }
  };

  return <GroupBuyProductStyle {...groupBuyData} />;
}