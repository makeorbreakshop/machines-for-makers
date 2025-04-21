import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Coordinate {
  x: number;
  y: number;
}

interface CoordinateSelectorProps {
  imageUrl: string;
  onCoordinateSelected: (coordinate: Coordinate) => void;
  initialCoordinate?: Coordinate;
  width?: number;
  height?: number;
}

export default function CoordinateSelector({
  imageUrl,
  onCoordinateSelected,
  initialCoordinate,
  width = 800,
  height = 600
}: CoordinateSelectorProps) {
  const [coordinate, setCoordinate] = useState<Coordinate>(initialCoordinate || { x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number, height: number }>({ width, height });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle click on image to select coordinates
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    
    const newCoordinate = {
      x: Math.round((x / rect.width) * imageSize.width),
      y: Math.round((y / rect.height) * imageSize.height)
    };
    
    setCoordinate(newCoordinate);
    onCoordinateSelected(newCoordinate);
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, axis: 'x' | 'y') => {
    const value = parseInt(e.target.value) || 0;
    const newCoordinate = { ...coordinate, [axis]: value };
    setCoordinate(newCoordinate);
    onCoordinateSelected(newCoordinate);
  };
  
  // Get image dimensions on load
  const handleImageLoad = () => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      setImageSize({ width: naturalWidth, height: naturalHeight });
      setIsImageLoaded(true);
    }
  };
  
  // Center the pin marker when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && imgRef.current && isImageLoaded) {
        // Force re-render to update pin position
        setCoordinate({ ...coordinate });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [coordinate, isImageLoaded]);
  
  return (
    <Card className="p-4 border rounded-lg shadow-sm">
      <div className="mb-4 space-y-2">
        <Label htmlFor="x-coordinate">X Coordinate</Label>
        <Input
          id="x-coordinate"
          type="number"
          value={coordinate.x}
          onChange={(e) => handleInputChange(e, 'x')}
          className="w-full"
        />
      </div>
      
      <div className="mb-4 space-y-2">
        <Label htmlFor="y-coordinate">Y Coordinate</Label>
        <Input
          id="y-coordinate"
          type="number"
          value={coordinate.y}
          onChange={(e) => handleInputChange(e, 'y')}
          className="w-full"
        />
      </div>
      
      <div className="relative mb-4" ref={containerRef}>
        <div 
          className="image-container relative border rounded-md overflow-hidden" 
          style={{ maxWidth: '100%', maxHeight: '70vh' }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Select coordinates"
            onClick={handleImageClick}
            onLoad={handleImageLoad}
            className="cursor-crosshair max-w-full"
            style={{ display: 'block' }}
          />
          
          {isImageLoaded && (
            <div 
              className="absolute w-6 h-6 rounded-full bg-red-500 opacity-70 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${(coordinate.x / imageSize.width) * 100}%`,
                top: `${(coordinate.y / imageSize.height) * 100}%`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                +
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Click on the image to set coordinates
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mb-2">
        Image dimensions: {imageSize.width} x {imageSize.height} px
      </div>
      
      <Button
        onClick={() => onCoordinateSelected(coordinate)}
        className="w-full"
        variant="default"
      >
        Confirm Selection
      </Button>
    </Card>
  );
} 