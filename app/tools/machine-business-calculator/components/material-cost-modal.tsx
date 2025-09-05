'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Material, MaterialUsage } from '../lib/calculator-types';

interface MaterialCostModalProps {
  open: boolean;
  onClose: () => void;
  materials: Material[];
  onAddMaterial: (material: Omit<Material, 'id'>) => string;
  onAddMaterialUsage: (usage: MaterialUsage) => void;
  existingUsage?: MaterialUsage;
}

export function MaterialCostModal({
  open,
  onClose,
  materials,
  onAddMaterial,
  onAddMaterialUsage,
  existingUsage,
}: MaterialCostModalProps) {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('new');
  const [materialName, setMaterialName] = useState('');
  const [batchCost, setBatchCost] = useState('');
  const [batchQuantity, setBatchQuantity] = useState('1');
  const [unit, setUnit] = useState('sheet');
  const [usageQuantity, setUsageQuantity] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  // Initialize from existing usage if editing
  useEffect(() => {
    if (existingUsage) {
      setMaterialName(existingUsage.name);
      setUsageQuantity(existingUsage.quantity.toString());
      
      // Try to find matching material in library
      const matchingMaterial = materials.find(m => m.name === existingUsage.name);
      if (matchingMaterial) {
        setSelectedMaterialId(matchingMaterial.id);
        setBatchCost(matchingMaterial.batchCost.toString());
        setBatchQuantity(matchingMaterial.batchQuantity.toString());
        setUnit(matchingMaterial.unit);
      } else {
        // It's a one-off material
        setSelectedMaterialId('new');
        const unitCost = existingUsage.unitCost;
        setBatchCost(unitCost.toString());
        setBatchQuantity('1');
      }
    }
  }, [existingUsage, materials]);

  // Update form when material is selected from library
  useEffect(() => {
    if (selectedMaterialId !== 'new') {
      const material = materials.find(m => m.id === selectedMaterialId);
      if (material) {
        setMaterialName(material.name);
        setBatchCost(material.batchCost.toString());
        setBatchQuantity(material.batchQuantity.toString());
        setUnit(material.unit);
      }
    }
  }, [selectedMaterialId, materials]);

  const unitCost = parseFloat(batchCost) / parseFloat(batchQuantity) || 0;
  const totalCost = unitCost * parseFloat(usageQuantity) || 0;

  const handleSubmit = () => {
    const quantity = parseFloat(usageQuantity) || 0;
    
    // Create material usage
    const usage: MaterialUsage = {
      materialId: selectedMaterialId === 'new' ? undefined : selectedMaterialId,
      name: materialName,
      quantity,
      unitCost,
      cost: totalCost,
    };

    // Save to library if needed
    if (selectedMaterialId === 'new' && saveToLibrary && materialName) {
      const newMaterialId = onAddMaterial({
        name: materialName,
        batchCost: parseFloat(batchCost) || 0,
        batchQuantity: parseFloat(batchQuantity) || 1,
        unit,
        unitCost,
      });
      usage.materialId = newMaterialId;
    }

    onAddMaterialUsage(usage);
    handleClose();
  };

  const handleClose = () => {
    setSelectedMaterialId('new');
    setMaterialName('');
    setBatchCost('');
    setBatchQuantity('1');
    setUnit('sheet');
    setUsageQuantity('');
    setSaveToLibrary(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingUsage ? 'Edit Material Cost' : 'Add Material Cost'}
          </DialogTitle>
          <DialogDescription>
            Calculate material costs from batch pricing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Material Selection */}
          {!existingUsage && materials.length > 0 && (
            <div className="space-y-2">
              <Label>Choose Material</Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or create new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Create New Material</SelectItem>
                  {materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} (${material.unitCost.toFixed(2)}/{material.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Material Details */}
          {(selectedMaterialId === 'new' || existingUsage) && (
            <>
              <div className="space-y-2">
                <Label>Material Name</Label>
                <Input
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="e.g., 1/4 inch Birch Plywood"
                />
              </div>

              <div className="border dark:border-gray-700 rounded-lg p-3 space-y-3 bg-muted/30 dark:bg-gray-800/50">
                <Label className="text-sm font-medium">How do you buy it?</Label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Total Cost</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={batchCost}
                        onChange={(e) => setBatchCost(e.target.value)}
                        className="pl-6"
                        placeholder="45.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={batchQuantity}
                        onChange={(e) => setBatchQuantity(e.target.value)}
                        className="flex-1"
                        placeholder="1"
                      />
                      <Input
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-20"
                        placeholder="sheet"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-sm font-medium text-center pt-1">
                  = ${unitCost.toFixed(2)} per {unit}
                </div>
              </div>
            </>
          )}

          {/* Usage for this product */}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Using in this product</Label>
            <div className="flex gap-2 items-center">
              <Label className="text-xs text-muted-foreground">Amount:</Label>
              <Input
                type="number"
                step="0.01"
                value={usageQuantity}
                onChange={(e) => setUsageQuantity(e.target.value)}
                className="flex-1"
                placeholder="0.25"
              />
              <span className="text-sm">{unit}{parseFloat(batchQuantity) !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-sm font-medium text-center">
              = ${totalCost.toFixed(2)} cost
            </div>
          </div>

          {/* Save to library checkbox */}
          {selectedMaterialId === 'new' && !existingUsage && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="save-library" 
                checked={saveToLibrary}
                onCheckedChange={(checked) => setSaveToLibrary(checked as boolean)}
              />
              <Label 
                htmlFor="save-library" 
                className="text-sm cursor-pointer"
              >
                Save to library for reuse
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!materialName || !batchCost || !usageQuantity}
          >
            {existingUsage ? 'Update' : 'Add Material'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}