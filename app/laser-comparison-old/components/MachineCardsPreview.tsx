'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

interface Machine {
  name: string;
  brand: string;
  price: string;
  workArea: string;
  power: string;
  type: string;
  image?: string;
}

export default function MachineCardsPreview() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sample machines with placeholder images
  const machines: Machine[] = [
    {
      name: 'Glowforge Pro',
      brand: 'Glowforge',
      price: '$6,995',
      workArea: '19.5" x 11"',
      power: '45W',
      type: 'CO2',
      image: '/api/placeholder/400/300'
    },
    {
      name: 'xTool P2',
      brand: 'xTool',
      price: '$4,999',
      workArea: '26" x 14"',
      power: '55W',
      type: 'CO2',
      image: '/api/placeholder/400/300'
    },
    {
      name: 'OMTech AF2028-60',
      brand: 'OMTech',
      price: '$2,999',
      workArea: '20" x 28"',
      power: '60W',
      type: 'CO2',
      image: '/api/placeholder/400/300'
    },
    {
      name: 'Longer Ray5',
      brand: 'Longer',
      price: '$289',
      workArea: '15.7" x 15.7"',
      power: '10W',
      type: 'Diode',
      image: '/api/placeholder/400/300'
    },
    {
      name: 'Atomstack X30 Pro',
      brand: 'Atomstack',
      price: '$1,599',
      workArea: '15.7" x 15.7"',
      power: '30W',
      type: 'Diode',
      image: '/api/placeholder/400/300'
    },
    {
      name: 'Creality Falcon 2',
      brand: 'Creality',
      price: '$639',
      workArea: '16" x 16"',
      power: '40W',
      type: 'Diode',
      image: '/api/placeholder/400/300'
    },
    {
      name: 'Sculpfun S30 Ultra',
      brand: 'Sculpfun',
      price: '$769',
      workArea: '24" x 24"',
      power: '33W',
      type: 'Diode',
      image: '/api/placeholder/400/300'
    },
    {
      name: 'WeCreat Vista',
      brand: 'WeCreat',
      price: '$699',
      workArea: '16.5" x 11.8"',
      power: '10W',
      type: 'Diode',
      image: '/api/placeholder/400/300'
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrolled = window.scrollY;
      const containerTop = containerRef.current.offsetTop;
      const containerHeight = containerRef.current.scrollHeight;
      
      // Calculate scroll progress relative to the container
      const relativeScroll = Math.max(0, scrolled - containerTop);
      const progress = Math.min(1, relativeScroll / (containerHeight - window.innerHeight));
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate opacity for each card based on its position and scroll progress
  const getCardOpacity = (index: number) => {
    const fadeStart = index * 0.1; // Start fading each card at different scroll points
    const fadeRange = 0.3; // How long the fade takes
    
    if (scrollProgress < fadeStart) return 1;
    if (scrollProgress > fadeStart + fadeRange) return 0.2;
    
    const fadeFactor = (scrollProgress - fadeStart) / fadeRange;
    return Math.max(0.2, 1 - (fadeFactor * 0.8));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Blur Overlay that appears as user scrolls */}
      <div 
        className="fixed inset-0 bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none z-10 transition-opacity duration-500"
        style={{ 
          opacity: scrollProgress > 0.5 ? 1 : 0,
          top: '50vh'
        }}
      />
      
      {/* Lock Icon that appears when scrolled */}
      <div 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-500"
        style={{ 
          opacity: scrollProgress > 0.6 ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${scrollProgress > 0.6 ? 1 : 0.8})`
        }}
      >
        <div className="bg-white rounded-full p-6 shadow-2xl">
          <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Machine Cards Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {machines.map((machine, idx) => (
          <div 
            key={idx}
            className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 transition-all duration-500 hover:shadow-xl"
            style={{ 
              opacity: getCardOpacity(idx),
              transform: `translateY(${scrollProgress * 10}px)`
            }}
          >
            {/* Machine Image */}
            <div className="relative h-48 md:h-56 bg-gradient-to-br from-gray-100 to-gray-200">
              {/* Using Next.js Image with blur placeholder for better performance */}
              <Image
                src={`https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=${encodeURIComponent(machine.name)}`}
                alt={machine.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
              />
              
              {/* Type Badge */}
              <div className="absolute top-3 right-3">
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  machine.type === 'CO2' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {machine.type}
                </span>
              </div>
            </div>

            {/* Machine Details */}
            <div className="p-4 md:p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{machine.name}</h3>
                  <p className="text-sm text-gray-600">{machine.brand}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{machine.price}</p>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Work Area</p>
                  <p className="text-sm font-medium text-gray-900">{machine.workArea}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Power</p>
                  <p className="text-sm font-medium text-gray-900">{machine.power}</p>
                </div>
              </div>

              {/* View Details Link (disabled) */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button 
                  disabled
                  className="w-full text-center text-sm text-gray-400 font-medium cursor-not-allowed"
                >
                  🔒 Full Specs Available After Sign Up
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* More indicator */}
      <div className="mt-8 text-center">
        <p className="text-lg font-semibold text-gray-700">
          + 149 more machines in the full comparison
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Get instant access to all specs, prices, and exclusive deals
        </p>
      </div>
    </div>
  );
}