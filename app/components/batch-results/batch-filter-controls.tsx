import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface BatchFilterControlsProps {
  showSuccessful: boolean;
  showFailed: boolean;
  showUnchanged: boolean;
  showUpdated: boolean;
  showNeedsReview: boolean;
  onFilterChange: (filter: string, value: boolean) => void;
}

export function BatchFilterControls({
  showSuccessful,
  showFailed,
  showUnchanged,
  showUpdated,
  showNeedsReview,
  onFilterChange,
}: BatchFilterControlsProps) {
  return (
    <div className="flex flex-wrap gap-6 mb-6">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="showSuccessful" 
          checked={showSuccessful}
          onCheckedChange={(checked) => onFilterChange("showSuccessful", checked === true)}
        />
        <Label 
          htmlFor="showSuccessful" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Show successful
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="showFailed" 
          checked={showFailed}
          onCheckedChange={(checked) => onFilterChange("showFailed", checked === true)}
        />
        <Label 
          htmlFor="showFailed" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Show failed
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="showUnchanged" 
          checked={showUnchanged}
          onCheckedChange={(checked) => onFilterChange("showUnchanged", checked === true)}
        />
        <Label 
          htmlFor="showUnchanged" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Show unchanged
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="showUpdated" 
          checked={showUpdated}
          onCheckedChange={(checked) => onFilterChange("showUpdated", checked === true)}
        />
        <Label 
          htmlFor="showUpdated" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Show updated
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="showNeedsReview" 
          checked={showNeedsReview}
          onCheckedChange={(checked) => onFilterChange("showNeedsReview", checked === true)}
        />
        <Label 
          htmlFor="showNeedsReview" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Show needs review
        </Label>
      </div>
    </div>
  );
} 