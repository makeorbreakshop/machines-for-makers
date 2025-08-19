import Image from 'next/image';
import { getLogoUrl } from '@/lib/services/logo-service';

export default async function LaserComparisonServer() {
  const logoUrl = await getLogoUrl();

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center">
          <div className="h-12 w-[180px] relative">
            {logoUrl ? (
              <Image 
                src={logoUrl}
                alt="Machines for Makers"
                fill
                quality={90}
                priority
                sizes="180px"
                style={{
                  objectFit: 'contain',
                  objectPosition: 'center'
                }}
              />
            ) : (
              <div 
                className="w-12 h-12 flex items-center justify-center mx-auto"
                style={{ backgroundColor: '#30A9DE' }}
              >
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="5" width="10" height="10" rx="1" fill="white" />
                  <path d="M13 15 L10 18 L16 18 Z" fill="white" />
                  <path d="M13 21 L10 24 L13 27 L16 24 L13 21" stroke="white" strokeWidth="1.5" fill="none" />
                  
                  <circle cx="13" cy="30" r="5" fill="white" />
                  <circle cx="11" cy="30" r="1.5" fill="#30A9DE" />
                  <circle cx="15" cy="30" r="1.5" fill="#30A9DE" />
                  <path d="M11 33 L15 33" stroke="#30A9DE" strokeWidth="1" />
                  
                  <path d="M26 5 C30 5, 30 5, 30 5, 30 5, 30 12, 30 12, 30 12, 26 12, 26 12" stroke="white" strokeWidth="1.5" fill="none" />
                  <rect x="23" y="7" width="4" height="3" fill="white" />
                  <path d="M30 16 L23 16" stroke="white" strokeWidth="1.5" />
                  <path d="M30 20 L23 20" stroke="white" strokeWidth="1.5" />
                  
                  <rect x="25" y="24" width="6" height="3" rx="1" fill="white" />
                  <path d="M26 27 L24 32 L32 32 L30 27" fill="white" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}