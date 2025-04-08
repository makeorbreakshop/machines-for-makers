'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export default function TestImagePage() {
  const [currentImageUrl, setCurrentImageUrl] = useState('https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/learn-lightburn/story/ac7aded-178c-d125-77bc-ac5a8435dc5_screenshot_2025-02-25_at_8_20_21_am_1744054564012.webp');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const testImages = [
    'https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/learn-lightburn/hero/7a2ca51-8fe4-4ccc-cdd2-7c8fea70d8ae_learn-lightburn-logo-1_1744054561004.webp',
    'https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/learn-lightburn/process/a26832e-38e6-cae3-8aea-b132b662ee8_build11_1744054563382.webp',
    'https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/learn-lightburn/projects/73dd13-d55e-a8ea-d32c-b5c881e1741_dsc08516_1744054560308.webp',
    'https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/learn-lightburn/instructor/brandon_1744054566142.webp'
  ];

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
    console.log('Image loaded successfully!');
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
    console.error('Image failed to load');
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Image Test Page</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Current Test Image URL:</h2>
        <p className="mb-4 break-all">{currentImageUrl}</p>
        
        <div className="flex flex-col space-y-4">
          <input
            type="text"
            value={currentImageUrl}
            onChange={(e) => setCurrentImageUrl(e.target.value)}
            className="p-2 border border-gray-300 rounded w-full"
            placeholder="Enter image URL to test"
          />
        </div>
      </div>
      
      <div className="my-8">
        <h2 className="text-xl font-semibold mb-4">Image Preview:</h2>
        
        <div className="border border-gray-300 rounded p-4">
          {loading && <p>Loading image...</p>}
          {error && <p className="text-red-500">Error loading image. Check console for details.</p>}
          
          <div className="relative w-full h-[400px] bg-gray-100">
            <Image
              src={currentImageUrl}
              alt="Test image"
              fill
              sizes="100vw"
              className="object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
              unoptimized
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Test with img tag:</h3>
          <img 
            src={currentImageUrl} 
            alt="Test with img tag" 
            className="max-w-full h-auto border border-gray-300 p-2"
            onLoad={() => console.log('Native img tag loaded successfully')}
            onError={() => console.error('Native img tag failed to load')}
          />
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Gallery of Test Images:</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {testImages.map((imageUrl, index) => (
            <div 
              key={index} 
              className="border border-gray-300 rounded p-2 cursor-pointer"
              onClick={() => setCurrentImageUrl(imageUrl)}
            >
              <div className="relative w-full h-48">
                <Image
                  src={imageUrl}
                  alt={`Test image ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                  className="object-contain"
                  unoptimized
                />
              </div>
              <p className="mt-2 text-sm text-center truncate">Image {index + 1}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting Info:</h2>
        <ul className="list-disc ml-6 space-y-2">
          <li>Image Status: {loading ? 'Loading...' : error ? 'Error' : 'Loaded'}</li>
          <li>Next.js Image Component: {error ? '❌ Failed' : loading ? '⏳ Loading' : '✅ Success'}</li>
          <li>Try with direct img tag to bypass Next.js image optimization</li>
          <li>Check browser console for network errors</li>
          <li>Verify CORS settings on Supabase bucket</li>
        </ul>
      </div>
    </div>
  );
} 