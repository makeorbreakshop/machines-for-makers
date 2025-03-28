"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { laserParameters, LaserParameter, LaserParameterSource } from "./data";
import { Search, Settings, Sparkles, Scissors, ChevronDown, ChevronRight, Info, X, FileText, Download, AlertCircle, Check, Laptop2, Zap, Cpu, FlameKindling } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type OperationType = 'engrave' | 'cut' | 'photo';
type MaterialDisplayMode = 'tiles' | 'compact';
type MachineDisplayMode = 'tiles' | 'list';

type Material = {
  id: string;
  name: string;
  icon?: React.ReactNode;
  color: string;
  lightColor: string;
  darkColor: string;
  textColor: string;
};

interface Machine {
  id: string;
  name: string;
  wattage: number;
  type: string;
  company: string;
  image?: string | null;
}

// Helper function to get machine type icon
const getMachineTypeIcon = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('fiber')) return <Zap className="h-4 w-4" />;
  if (lowerType.includes('co2')) return <FlameKindling className="h-4 w-4" />;
  if (lowerType.includes('diode')) return <Cpu className="h-4 w-4" />;
  return <Laptop2 className="h-4 w-4" />;
};

// Helper function to get color based on machine type
const getMachineTypeColor = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('fiber')) return "bg-blue-500/80";
  if (lowerType.includes('co2')) return "bg-red-500/80";
  if (lowerType.includes('diode')) return "bg-purple-500/80";
  return "bg-slate-500/80";
};

// Replace the getSourceBadgeColor function with a simpler one
const getSourceBadgeColor = (sourceId: string) => {
  return "bg-background text-foreground border-border";
};

export default function LaserNewDesignTest() {
  // Primary state
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<OperationType | null>(null);
  const [displayMode, setDisplayMode] = useState<MaterialDisplayMode>('tiles');
  const [machineDisplayMode, setMachineDisplayMode] = useState<MachineDisplayMode>('tiles');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParameter, setSelectedParameter] = useState<LaserParameter | null>(null);
  
  // Machine selection state
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [machineSearchQuery, setMachineSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [selectedMachineInModal, setSelectedMachineInModal] = useState<Machine | null>(null);

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualMachine, setManualMachine] = useState({
    name: '',
    type: '',
    wattage: 0
  });
  
  // Fetch machines from API
  useEffect(() => {
    const fetchMachines = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/laser-machines');
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        // Transform data to our Machine interface if needed
        const transformedMachines: Machine[] = (data.machines || []).map((machine: any) => ({
          id: machine.id,
          name: machine.name || "Unknown Machine",
          wattage: machine.wattage || 0,
          type: machine.type || "unknown",
          company: machine.company || "Unknown",
          image: machine.image
        }));
        
        setMachines(transformedMachines);
        
      } catch (error) {
        console.error("Error fetching machines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, []);

  // Filter machines based on search query
  const filteredMachines = useMemo(() => {
    if (!machineSearchQuery) return machines;
    
    return machines.filter(machine => 
      machine.name.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
      machine.company.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
      machine.type.toLowerCase().includes(machineSearchQuery.toLowerCase())
    );
  }, [machines, machineSearchQuery]);

  // Materials definition with color schemes
  const materials = useMemo(() => {
    return [
      {
        id: 'aluminum',
        name: 'Aluminum',
        color: 'bg-blue-100',
        lightColor: 'bg-blue-50',
        darkColor: 'bg-blue-200',
        textColor: 'text-blue-800'
      },
      {
        id: 'brass',
        name: 'Brass',
        color: 'bg-amber-100',
        lightColor: 'bg-amber-50',
        darkColor: 'bg-amber-200',
        textColor: 'text-amber-800'
      },
      {
        id: 'gold',
        name: 'Gold',
        color: 'bg-yellow-100',
        lightColor: 'bg-yellow-50',
        darkColor: 'bg-yellow-200',
        textColor: 'text-yellow-800'
      },
      {
        id: 'silver',
        name: 'Silver',
        color: 'bg-slate-100',
        lightColor: 'bg-slate-50',
        darkColor: 'bg-slate-200',
        textColor: 'text-slate-800'
      },
      {
        id: 'steel',
        name: 'Steel',
        color: 'bg-gray-100',
        lightColor: 'bg-gray-50',
        darkColor: 'bg-gray-200',
        textColor: 'text-gray-800'
      },
      {
        id: 'titanium',
        name: 'Titanium',
        color: 'bg-neutral-100',
        lightColor: 'bg-neutral-50',
        darkColor: 'bg-neutral-200',
        textColor: 'text-neutral-800'
      },
      {
        id: 'glass',
        name: 'Glass',
        color: 'bg-sky-100',
        lightColor: 'bg-sky-50',
        darkColor: 'bg-sky-200',
        textColor: 'text-sky-800'
      },
      {
        id: 'leather',
        name: 'Leather',
        color: 'bg-orange-100',
        lightColor: 'bg-orange-50',
        darkColor: 'bg-orange-200',
        textColor: 'text-orange-800'
      },
      {
        id: 'plastic',
        name: 'Plastic & Acrylic',
        color: 'bg-emerald-100',
        lightColor: 'bg-emerald-50',
        darkColor: 'bg-emerald-200',
        textColor: 'text-emerald-800'
      },
      {
        id: 'powder',
        name: 'Powder Coat',
        color: 'bg-violet-100',
        lightColor: 'bg-violet-50',
        darkColor: 'bg-violet-200',
        textColor: 'text-violet-800'
      },
      {
        id: 'other',
        name: 'Other Materials',
        color: 'bg-stone-100',
        lightColor: 'bg-stone-50',
        darkColor: 'bg-stone-200',
        textColor: 'text-stone-800'
      }
    ];
  }, []);

  // Add this grouping function
  const groupParametersByName = (params: LaserParameter[]) => {
    const grouped: Record<string, LaserParameter[]> = {};
    
    params.forEach((param: LaserParameter) => {
      if (!grouped[param.name]) {
        grouped[param.name] = [];
      }
      grouped[param.name].push(param);
    });
    
    return grouped;
  };

  // Filter parameters for the selected material and operation
  const filteredParameters = useMemo(() => {
    if (!selectedMaterial || !selectedOperation) return [];
    
    return laserParameters.filter(param => {
      // Filter by search query if present
      if (searchQuery && !param.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filter by selected material (match by name)
      const materialMatches = param.name.toLowerCase().includes(selectedMaterial.id.toLowerCase());
      
      // Filter by operation type
      const operationMatches = 
        (selectedOperation === 'engrave' && !param.name.toLowerCase().includes('cut') && !param.name.toLowerCase().includes('photo')) ||
        (selectedOperation === 'cut' && param.name.toLowerCase().includes('cut')) ||
        (selectedOperation === 'photo' && param.name.toLowerCase().includes('photo'));
      
      return materialMatches && operationMatches;
    });
  }, [selectedMaterial, selectedOperation, searchQuery]);
  
  // Group filtered parameters by name
  const groupedParameters = useMemo(() => {
    return groupParametersByName(filteredParameters);
  }, [filteredParameters]);

  // Get material filtered parameters (for counter display)
  const materialParameters = useMemo(() => {
    const materialParams: Record<string, number> = {};
    
    materials.forEach(material => {
      const params = laserParameters.filter(param => 
        param.name.toLowerCase().includes(material.id)
      );
      materialParams[material.id] = params.length;
    });
    
    return materialParams;
  }, [materials]);

  // Reset selections
  const resetSelections = () => {
    setSelectedMaterial(null);
    setSelectedOperation(null);
    setSearchQuery("");
    setSelectedMachine(null);
  };

  // Operation type labels
  const operationTypes: { id: OperationType, label: string, color: string }[] = [
    { 
      id: 'engrave', 
      label: 'Engraving', 
      color: 'text-blue-600'
    },
    { 
      id: 'cut', 
      label: 'Cutting', 
      color: 'text-red-600'
    },
    { 
      id: 'photo', 
      label: 'Photo Engraving', 
      color: 'text-purple-600'
    }
  ];

  // Calculate operation counts for material
  const getOperationCounts = (materialId: string) => {
    const materialParams = laserParameters.filter(param => 
      param.name.toLowerCase().includes(materialId)
    );
    
    const counts = {
      engrave: 0,
      cut: 0,
      photo: 0
    };
    
    materialParams.forEach(param => {
      const name = param.name.toLowerCase();
      if (name.includes('cut')) {
        counts.cut++;
      } else if (name.includes('photo')) {
        counts.photo++;
      } else {
        counts.engrave++;
      }
    });
    
    return counts;
  };

  // Function to handle machine selection in modal
  const handleMachineSelect = (machine: Machine) => {
    setSelectedMachineInModal(machine);
  };
  
  // Function to confirm machine selection
  const confirmMachineSelection = () => {
    if (selectedMachineInModal) {
      setSelectedMachine(selectedMachineInModal);
      setMachineModalOpen(false);
      setSelectedMachineInModal(null);
    } else if (manualMachine.name && manualMachine.type && manualMachine.wattage) {
      // Create and select custom machine from manual entry
      const customMachine: Machine = {
        id: `custom-${Date.now()}`,
        name: manualMachine.name,
        type: manualMachine.type,
        wattage: Number(manualMachine.wattage),
        company: 'Custom',
        image: null
      };
      
      setSelectedMachine(customMachine);
      setMachineModalOpen(false);
      
      // Reset manual machine state
      setManualMachine({
        name: '',
        type: '',
        wattage: 0
      });
    }
  };

  // Handle manual entry submission
  const handleManualEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirmMachineSelection();
  };

  // Replace the render section for parameters with this updated version
  const renderParameters = () => {
    if (!selectedMaterial || !selectedOperation) {
      return (
        <div className="flex items-center justify-center h-60 text-gray-400">
          <div className="text-center">
            <Settings className="mx-auto h-10 w-10 mb-2" />
            <p>Select a material and operation to view parameters</p>
          </div>
        </div>
      );
    }

    if (filteredParameters.length === 0) {
      return (
        <div className="flex items-center justify-center h-60 text-gray-400">
          <div className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 mb-2" />
            <p>No parameters found for this material and operation</p>
            {searchQuery && <p className="mt-2">Try adjusting your search query</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(groupedParameters).map(([paramName, paramGroup]) => (
          <div key={paramName} className="space-y-2">
            <h3 className="text-lg font-medium">{paramName}</h3>
            <div className="rounded-md border shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold w-[180px]">Source</TableHead>
                    <TableHead className="text-center font-semibold w-[80px]">Power</TableHead>
                    <TableHead className="text-center font-semibold w-[80px]">Speed</TableHead>
                    <TableHead className="text-center font-semibold w-[80px]">Passes</TableHead>
                    <TableHead className="text-center font-semibold w-[100px]">Frequency</TableHead>
                    <TableHead className="text-center font-semibold w-[120px]">Line Distance</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paramGroup.map((param: LaserParameter, index: number) => (
                    <TableRow 
                      key={`${param.name}-${param.source.id}-${index}`}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      style={{ 
                        borderLeft: `4px solid ${param.source.id === 'cloudray' ? '#06b6d4' : '#a855f7'}` 
                      }}
                      onClick={() => setSelectedParameter(param)}
                    >
                      <TableCell className="w-[180px]">
                        <div className="flex items-center">
                          <div className="px-2 py-1 rounded-full text-xs font-medium border">
                            {param.source.verified && <Check className="w-3 h-3 inline-block mr-1" />}
                            {param.source.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-sm w-[80px]">{param.power}%</TableCell>
                      <TableCell className="text-center text-sm w-[80px]">{param.speed}</TableCell>
                      <TableCell className="text-center text-sm w-[80px]">{param.passes}</TableCell>
                      <TableCell className="text-center text-sm w-[100px]">{param.frequency} kHz</TableCell>
                      <TableCell className="text-center text-sm w-[120px]">{param.lineDistance}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {param.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Update parameter details dialog to include source information
  const renderParameterDetails = () => {
    if (!selectedParameter) return null;
    
    return (
      <Dialog open={selectedParameter !== null} onOpenChange={(open) => !open && setSelectedParameter(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedParameter.name}</DialogTitle>
              <div className="px-3 py-1 rounded-full text-xs font-medium border">
                {selectedParameter.source.verified && <Check className="w-3 h-3 inline-block mr-1" />}
                {selectedParameter.source.name}
              </div>
            </div>
          </DialogHeader>
          
          {/* Rest of parameter details dialog content remains the same */}
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label className="text-xs text-gray-500">Speed</Label>
              <div className="font-medium">{selectedParameter.speed} mm/s</div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Power</Label>
              <div className="font-medium">{selectedParameter.power}%</div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Frequency</Label>
              <div className="font-medium">{selectedParameter.frequency} kHz</div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Passes</Label>
              <div className="font-medium">{selectedParameter.passes}</div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Line Distance</Label>
              <div className="font-medium">{selectedParameter.lineDistance}</div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Hatch Angle</Label>
              <div className="font-medium">{selectedParameter.hatchAngle}</div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Hatch Pattern</Label>
              <div className="font-medium">{selectedParameter.hatchPattern}</div>
            </div>
          </div>
          
          {selectedParameter.notes && (
            <div className="mt-2">
              <Label className="text-xs text-gray-500">Notes</Label>
              <div className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{selectedParameter.notes}</div>
            </div>
          )}
          
          <div className="pt-4 flex justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {selectedMachine && (
              <Button>
                Use with {selectedMachine.name}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-5 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Laser Parameters
          </h1>
          {selectedMachine ? (
            <div className="flex items-center gap-4 px-4 py-3 border rounded-lg bg-background shadow-sm">
              <div className="h-14 w-14 rounded-md overflow-hidden flex items-center justify-center bg-white">
                {selectedMachine.image ? (
                  <img
                    src={selectedMachine.image}
                    alt={selectedMachine.name}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <div className={`h-full w-full flex items-center justify-center ${getMachineTypeColor(selectedMachine.type)} text-white`}>
                    {getMachineTypeIcon(selectedMachine.type)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-xl">{selectedMachine.name}</p>
                <p className="text-sm text-muted-foreground">{selectedMachine.type} • {selectedMachine.wattage}W</p>
              </div>
              <Button 
                className="ml-2"
                variant="outline" 
                size="default" 
                onClick={() => setSelectedMachine(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="default" 
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    <span>Select Laser Machine</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => {
                    setShowManualEntry(false);
                    setMachineModalOpen(true);
                  }}>
                    <Search className="h-4 w-4 mr-2" />
                    Search Machines
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setShowManualEntry(true);
                    setMachineModalOpen(true);
                  }}>
                    <Settings className="h-4 w-4 mr-2" />
                    Manual Entry
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <p className="text-lg text-muted-foreground">
            Find optimal settings for your laser projects
          </p>
        </div>
      </div>

      {/* Material Selection */}
      {!selectedMaterial ? (
        <div className="space-y-8 mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Select Material</h2>
            <div className="flex gap-3">
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => setDisplayMode(displayMode === 'tiles' ? 'compact' : 'tiles')}
                className="hover:bg-muted/80 transition-colors"
              >
                <Settings className="h-4 w-4 mr-1" />
                {displayMode === 'tiles' ? 'Table View' : 'Grid View'}
              </Button>
              <Input 
                placeholder="Search materials..." 
                className="w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {displayMode === 'tiles' ? (
            /* Periodic Table Style Material Selection */
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1">
              {/* All Materials Button */}
              <button
                onClick={() => {
                  // Create a custom "all" material
                  setSelectedMaterial({
                    id: 'all',
                    name: 'All Materials',
                    color: 'bg-primary-100',
                    lightColor: 'bg-primary-50',
                    darkColor: 'bg-primary-200',
                    textColor: 'text-primary-800'
                  });
                }}
                className="aspect-square flex flex-col justify-between p-2 rounded-sm border border-primary/30 hover:border-primary hover:bg-primary/10 hover:shadow-md transition-all bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1"
              >
                <div className="text-right text-xs font-medium text-muted-foreground self-end">{laserParameters.length}</div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-mono font-bold text-primary-800">All</span>
                  <span className="text-xs text-muted-foreground">Materials</span>
                </div>
                <div className="h-0.5"></div>
              </button>

              {/* Material Elements */}
              {materials
                .filter(material => !searchQuery || material.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(material => {
                  let symbol = "";
                  let atomicNumber = materialParameters[material.id] || 0;
                  
                  // Generate element-like symbol based on material name
                  if (material.id === 'aluminum') symbol = 'Al';
                  else if (material.id === 'brass') symbol = 'Br';
                  else if (material.id === 'gold') symbol = 'Au';
                  else if (material.id === 'silver') symbol = 'Ag';
                  else if (material.id === 'steel') symbol = 'Fe';
                  else if (material.id === 'titanium') symbol = 'Ti';
                  else if (material.id === 'glass') symbol = 'Gl';
                  else if (material.id === 'leather') symbol = 'Le';
                  else if (material.id === 'plastic') symbol = 'Pl';
                  else if (material.id === 'powder') symbol = 'Pw';
                  else symbol = material.name.substring(0, 2);
                  
                  return (
                    <button
                      key={material.id}
                      onClick={() => setSelectedMaterial(material)}
                      className={`aspect-square flex flex-col justify-between p-2 rounded-sm border transition-all hover:border-primary hover:shadow-md hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 ${material.color}`}
                    >
                      <div className="text-right text-xs font-medium text-muted-foreground self-end">{atomicNumber}</div>
                      <div className="flex flex-col items-center">
                        <span className={`text-3xl font-mono font-bold ${material.textColor}`}>
                          {symbol}
                        </span>
                        <span className={`text-xs ${material.textColor}`}>{material.name}</span>
                      </div>
                      <div className="h-0.5"></div>
                    </button>
                  );
                })}
            </div>
          ) : (
            /* Table-like View */
            <div className="rounded-md border shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold min-w-[240px]">Material</TableHead>
                    <TableHead className="font-semibold">Operations</TableHead>
                    <TableHead className="text-right w-[100px] font-semibold">Settings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* All Materials Row */}
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedMaterial({
                        id: 'all',
                        name: 'All Materials',
                        color: 'bg-primary-100',
                        lightColor: 'bg-primary-50',
                        darkColor: 'bg-primary-200',
                        textColor: 'text-primary-800'
                      });
                    }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-mono font-bold">All</span>
                        </div>
                        <span>All Materials</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-3">
                        {operationTypes.map(op => {
                          const count = laserParameters.filter(param => {
                            const name = param.name.toLowerCase();
                            if (op.id === 'cut') return name.includes('cut');
                            else if (op.id === 'photo') return name.includes('photo');
                            else return !name.includes('cut') && !name.includes('photo');
                          }).length;
                          
                          return (
                            <Badge 
                              key={op.id}
                              variant="outline" 
                              className={`${
                                op.id === 'engrave' 
                                  ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                  : op.id === 'cut' 
                                    ? 'bg-red-50 text-red-600 border-red-200' 
                                    : 'bg-purple-50 text-purple-600 border-purple-200'
                              }`}
                            >
                              {op.label}: {count}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-semibold">{laserParameters.length}</Badge>
                    </TableCell>
                  </TableRow>
                
                  {/* Material Rows */}
                  {materials
                    .filter(material => !searchQuery || material.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(material => {
                      const operationCounts = getOperationCounts(material.id);
                      const totalCount = materialParameters[material.id];
                      let symbol = "";
                      
                      // Generate element-like symbol based on material name
                      if (material.id === 'aluminum') symbol = 'Al';
                      else if (material.id === 'brass') symbol = 'Br';
                      else if (material.id === 'gold') symbol = 'Au';
                      else if (material.id === 'silver') symbol = 'Ag';
                      else if (material.id === 'steel') symbol = 'Fe';
                      else if (material.id === 'titanium') symbol = 'Ti';
                      else if (material.id === 'glass') symbol = 'Gl';
                      else if (material.id === 'leather') symbol = 'Le';
                      else if (material.id === 'plastic') symbol = 'Pl';
                      else if (material.id === 'powder') symbol = 'Pw';
                      else symbol = material.name.substring(0, 2);
                      
                      return (
                        <TableRow 
                          key={material.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedMaterial(material)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-full ${material.color} flex items-center justify-center`}>
                                <span className={`font-mono font-bold ${material.textColor}`}>{symbol}</span>
                              </div>
                              <span>{material.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-3">
                              {operationTypes.map(op => {
                                const count = laserParameters.filter(param => {
                                  const name = param.name.toLowerCase();
                                  if (op.id === 'cut') return name.includes('cut');
                                  else if (op.id === 'photo') return name.includes('photo');
                                  else return !name.includes('cut') && !name.includes('photo');
                                }).length;
                                
                                return (
                                  <Badge 
                                    key={op.id}
                                    variant="outline" 
                                    className={`${
                                      op.id === 'engrave' 
                                        ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                        : op.id === 'cut' 
                                          ? 'bg-red-50 text-red-600 border-red-200' 
                                          : 'bg-purple-50 text-purple-600 border-purple-200'
                                    }`}
                                  >
                                    {op.label}: {count}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-semibold">{totalCount}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 hover:bg-muted/80 transition-colors" 
                onClick={() => setSelectedMaterial(null)}
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back
              </Button>
              <h2 className="text-2xl font-bold tracking-tight">
                <span className={selectedMaterial.textColor}>{selectedMaterial.name}</span> Parameters
              </h2>
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="Search parameters..." 
                className="w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Operation Tabs */}
          <Tabs defaultValue={selectedOperation || "engrave"} className="w-full material-tabs" onValueChange={(value) => {
            setSelectedOperation(value as OperationType);
          }}>
            <TabsList className="w-full justify-start mb-6 border-b bg-transparent p-0 space-x-2">
              {operationTypes.map(op => (
                <TabsTrigger 
                  key={op.id}
                  value={op.id}
                  className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium px-4 py-3 transition-all hover:bg-muted/30"
                >
                  {op.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Operation-specific Tabs */}
            {operationTypes.map(op => (
              <TabsContent key={op.id} value={op.id} className="m-0">
                {renderParameters()}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {/* Machine Selection Modal */}
      <Dialog open={machineModalOpen} onOpenChange={setMachineModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Select Your Laser Machine</DialogTitle>
            <DialogDescription>
              Choose your machine model or enter details manually
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-between items-center mt-4">
            <Tabs defaultValue={showManualEntry ? "manual" : "search"} className="w-full" onValueChange={(value) => {
              setShowManualEntry(value === "manual");
              // Reset selected machine when switching tabs
              setSelectedMachineInModal(null);
            }}>
              <TabsList>
                <TabsTrigger value="search">Machine Search</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>
              
              <TabsContent value="search" className="mt-4">
                <div className="space-y-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      value={machineSearchQuery}
                      onChange={(e) => setMachineSearchQuery(e.target.value)}
                      placeholder="Search for your laser machine (e.g., Aeon MIRA, Diode, 60W)..."
                      className="pl-10 py-6 text-lg w-full"
                    />
                  </div>
                  
                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden h-64 flex flex-col">
                          <div className="h-40 bg-gray-200 animate-pulse"></div>
                          <CardContent className="p-4 flex-1 flex flex-col gap-2">
                            <div className="h-5 bg-gray-200 animate-pulse rounded-md"></div>
                            <div className="h-4 bg-gray-200 animate-pulse rounded-md w-3/4"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : machineSearchQuery.length > 0 ? (
                    filteredMachines.length > 0 ? (
                      <>
                        {selectedMachineInModal ? (
                          <div className="mb-6 border p-4 rounded-lg">
                            <div className="flex flex-col md:flex-row gap-4">
                              <div className="flex items-center gap-4">
                                <div className="h-24 w-24 flex items-center justify-center bg-white rounded-md overflow-hidden">
                                  {selectedMachineInModal.image ? (
                                    <img
                                      src={selectedMachineInModal.image}
                                      alt={selectedMachineInModal.name}
                                      className="object-contain w-full h-full"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full w-full">
                                      {getMachineTypeIcon(selectedMachineInModal.type)}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{selectedMachineInModal.name}</h3>
                                  <p className="text-sm text-muted-foreground">{selectedMachineInModal.company}</p>
                                </div>
                              </div>
                              
                              <Separator orientation="vertical" className="h-auto hidden md:block" />
                              
                              <div className="space-y-3 flex-1">
                                <div>
                                  <Label htmlFor="modal-laser-type">Laser Type</Label>
                                  <Select 
                                    value={selectedMachineInModal.type}
                                    onValueChange={(value) => {
                                      setSelectedMachineInModal({
                                        ...selectedMachineInModal,
                                        type: value
                                      });
                                    }}
                                  >
                                    <SelectTrigger id="modal-laser-type" className="mt-1">
                                      <SelectValue placeholder="Select laser type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="CO2">CO2</SelectItem>
                                      <SelectItem value="CO2-Glass">CO2-Glass</SelectItem>
                                      <SelectItem value="CO2-RF">CO2-RF</SelectItem>
                                      <SelectItem value="Fiber">Fiber</SelectItem>
                                      <SelectItem value="Diode">Diode</SelectItem>
                                      <SelectItem value="MOPA">MOPA</SelectItem>
                                      <SelectItem value="Infrared">Infrared</SelectItem>
                                      <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label htmlFor="modal-wattage">Power (Watts)</Label>
                                  <Input
                                    id="modal-wattage"
                                    type="number"
                                    placeholder="Enter wattage"
                                    value={selectedMachineInModal.wattage.toString()}
                                    className="mt-1"
                                    onChange={(e) => {
                                      setSelectedMachineInModal({
                                        ...selectedMachineInModal,
                                        wattage: parseInt(e.target.value) || 0
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-4">
                              <Button variant="outline" onClick={() => setSelectedMachineInModal(null)}>Back to Search</Button>
                              <Button onClick={confirmMachineSelection}>Confirm & Save</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                            {filteredMachines.map((machine) => (
                              <Card
                                key={machine.id}
                                className={`overflow-hidden border hover:shadow-md transition-shadow duration-200 cursor-pointer`}
                                onClick={() => handleMachineSelect(machine)}
                              >
                                <div className="relative h-[150px]">
                                  {machine.image ? (
                                    <div className="relative h-full w-full">
                                      <img
                                        src={machine.image}
                                        alt={machine.name}
                                        className="object-contain w-full h-full"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center h-full bg-white">
                                      {getMachineTypeIcon(machine.type)}
                                      <span className="ml-2 text-gray-500">No image</span>
                                    </div>
                                  )}
                                </div>
                                <CardContent className="p-4">
                                  <h3 className="font-bold text-base mb-1 line-clamp-1">{machine.name}</h3>
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    {getMachineTypeIcon(machine.type)}
                                    <span className="ml-1">{machine.type} • {machine.wattage}W</span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 border rounded-lg bg-muted/5">
                        <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <h3 className="text-xl font-semibold mb-2">No machines found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or use manual entry</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-10 border rounded-lg bg-muted/5">
                      <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <h3 className="text-xl font-semibold mb-2">Search for your laser machine</h3>
                      <p className="text-muted-foreground">
                        Type the name, brand, type or wattage to find your machine
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="manual" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <form onSubmit={handleManualEntrySubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="machine-name">Machine Name</Label>
                          <Input 
                            id="machine-name" 
                            placeholder="Enter machine name" 
                            value={manualMachine.name}
                            onChange={(e) => setManualMachine({...manualMachine, name: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="machine-type">Laser Type</Label>
                          <Select 
                            value={manualMachine.type} 
                            onValueChange={(value) => setManualMachine({...manualMachine, type: value})}
                          >
                            <SelectTrigger id="machine-type">
                              <SelectValue placeholder="Select laser type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CO2">CO2</SelectItem>
                              <SelectItem value="CO2-Glass">CO2-Glass</SelectItem>
                              <SelectItem value="CO2-RF">CO2-RF</SelectItem>
                              <SelectItem value="Fiber">Fiber</SelectItem>
                              <SelectItem value="Diode">Diode</SelectItem>
                              <SelectItem value="MOPA">MOPA</SelectItem>
                              <SelectItem value="Infrared">Infrared</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="machine-wattage">Wattage</Label>
                          <Input 
                            id="machine-wattage" 
                            type="number" 
                            placeholder="Enter wattage" 
                            value={manualMachine.wattage || ''}
                            onChange={(e) => setManualMachine({...manualMachine, wattage: parseInt(e.target.value) || 0})}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="outline" onClick={() => setMachineModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Machine</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {renderParameterDetails()}
    </div>
  );
} 