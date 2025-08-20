'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';

interface ComparisonPreviewProps {
  machines: any[];
}

export default function ComparisonPreview({ machines: propMachines }: ComparisonPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Format machine data from database
  const machines = propMachines?.map(machine => ({
    name: machine?.["Machine Name"] || 'Unknown Machine',
    price: typeof machine?.["Price"] === 'number' ? `$${machine["Price"].toLocaleString()}` : 
           typeof machine?.["Price"] === 'string' ? `$${parseInt(machine["Price"]).toLocaleString()}` : '—',
    workArea: machine?.["Work Area"] || '—',
    power: machine?.["Laser Power A"] || '—',
    type: machine?.["Laser Type A"] || '—',
    speed: machine?.["Speed"] || '—',
    software: machine?.["Software"] || '—',
    autofocus: machine?.["Focus"] || '—',
    camera: machine?.["Camera"] || '—',
    image: machine?.["Image"] || '/placeholder.svg',
  })) || [];

  return (
    <div ref={containerRef} className="relative">
      {/* Preview Table Container */}
      <div className="relative">
        <Card className="relative overflow-hidden shadow-lg">
        {/* Mobile Card View - Show only 3 machines */}
        <div className="md:hidden p-4 space-y-4">
          {machines.slice(0, 3).map((machine, idx) => {
            const getTrustBadge = (machineName: string) => {
              if (machineName?.toLowerCase().includes('xtool')) return '🏆';
              if (machineName?.toLowerCase().includes('omtech')) return '⭐';
              return null;
            };
            const badge = getTrustBadge(machine.name);

            return (
              <Card key={idx} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                    <Image
                      src={machine.image}
                      alt={machine.name}
                      fill
                      className="object-contain p-1"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{machine.name}</h3>
                      {badge && <span className="text-sm">{badge}</span>}
                    </div>
                    <p className="text-xl font-bold text-gray-900 mt-1">{machine.price}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div className="text-gray-600">
                        <span className="font-medium">Area:</span> {machine.workArea}
                      </div>
                      <div className="text-gray-600">
                        <span className="font-medium">Software:</span> {machine.software}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {machines.length > 3 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">+ {machines.length - 3} more machines available</p>
            </div>
          )}
        </div>

        {/* Desktop Table View - Simplified with 5 essential columns */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Machine</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Work Area</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Software</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine, idx) => {
                // Add subtle trust indicators for specific brands
                const getTrustBadge = (machineName: string) => {
                  if (machineName?.toLowerCase().includes('xtool')) {
                    return '🏆'; // xTool employees use our tool
                  }
                  if (machineName?.toLowerCase().includes('omtech')) {
                    return '⭐'; // 200+ owners
                  }
                  return null;
                };

                const badge = getTrustBadge(machine.name);

                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                          <Image
                            src={machine.image}
                            alt={machine.name}
                            fill
                            className="object-contain p-1"
                            sizes="40px"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{machine.name}</span>
                          {badge && (
                            <span className="text-sm" title={
                              badge === '🏆' ? '3 xTool employees use our tool' : 
                              badge === '⭐' ? '200+ Omtech owners trust this data' : ''
                            }>
                              {badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-lg text-gray-900">{machine.price}</span>
                    </TableCell>
                    <TableCell className="text-gray-700">{machine.workArea}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={machine.type?.includes('CO2') ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-gray-200 bg-gray-50 text-gray-700'}
                      >
                        {machine.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700">{machine.software}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        </Card>
      </div>
    </div>
  );
}