"""
Simple integration test without heavy dependencies
"""
import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from normalizers.machine_data_normalizer import MachineDataNormalizer


class TestSimpleIntegration:
    """Integration tests without external dependencies"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.normalizer = MachineDataNormalizer()
    
    def test_complete_laser_normalization_workflow(self):
        """Test complete laser data normalization workflow"""
        raw_laser_data = {
            "name": "ComMarker B6 MOPA 60W Fiber Laser",
            "brand": "commarker",
            "laser_power": "60W",
            "working_area": "180x180mm",
            "max_speed": "7000mm/min",
            "price": "$4,589",
            "connectivity": "WiFi, USB",
            "enclosure": True,
            "software": "EZCAD2"
        }
        
        # Normalize the data
        normalized, validation = self.normalizer.normalize(raw_laser_data, "laser-cutter")
        
        # Verify complete workflow
        assert validation.is_valid
        assert len(validation.errors) == 0
        
        # Check normalized fields
        assert normalized["Machine Name"] == "ComMarker B6 MOPA 60W Fiber Laser"
        assert normalized["Brand"] == "ComMarker"  # Brand mapping applied
        assert normalized["Laser Power (W)"] == 60.0  # Power normalized to float
        assert normalized["Working Area"] == "180 x 180 mm"  # Dimensions normalized
        assert normalized["Max Speed (mm/min)"] == 7000.0  # Speed normalized
        assert normalized["Price ($)"] == 4589.0  # Price parsed correctly
        assert normalized["Connectivity"] == "WiFi, USB"  # Text fields preserved
        assert normalized["Enclosure"] == "Yes"  # Boolean normalized
        assert normalized["Software Compatibility"] == "EZCAD2"  # Field mapped
        assert normalized["Machine Category"] == "laser-cutter"  # Category assigned
    
    def test_complete_3d_printer_workflow(self):
        """Test complete 3D printer data normalization workflow"""
        raw_printer_data = {
            "name": "Bambu Lab X1 Carbon",
            "brand": "bambulab",
            "build_volume": "256x256x256mm",
            "layer_height": "0.08-0.28mm",
            "nozzle_diameter": "0.4mm",
            "print_speed": "500mm/s",
            "heated_bed": "yes",
            "auto_leveling": True,
            "price": "$1,199"
        }
        
        # Normalize the data
        normalized, validation = self.normalizer.normalize(raw_printer_data, "3d-printer")
        
        # Verify complete workflow
        assert validation.is_valid
        assert len(validation.errors) == 0
        
        # Check normalized fields
        assert normalized["Machine Name"] == "Bambu Lab X1 Carbon"
        assert normalized["Brand"] == "Bambu Lab"  # Brand mapping applied
        assert "256 x 256 x 256 mm" in normalized["Build Volume"]
        assert normalized["Layer Height Min (mm)"] == 0.08
        assert normalized["Layer Height Max (mm)"] == 0.28
        assert normalized["Nozzle Diameter (mm)"] == 0.4
        assert normalized["Print Speed (mm/s)"] == 500.0  # Already in mm/s
        assert normalized["Heated Bed"] == "Yes"
        assert normalized["Auto Leveling"] == "Yes"
        assert normalized["Price ($)"] == 1199.0
        assert normalized["Machine Category"] == "3d-printer"
    
    def test_validation_error_handling(self):
        """Test validation error handling in workflow"""
        # Missing required fields
        incomplete_data = {
            "power": "20W"
            # Missing name and price
        }
        
        normalized, validation = self.normalizer.normalize(incomplete_data, "laser-cutter")
        
        # Should have validation errors
        assert not validation.is_valid
        assert len(validation.errors) >= 2  # Missing name and price
        assert any("Machine Name" in error for error in validation.errors)
        assert any("Price" in error for error in validation.errors)
    
    def test_field_mapping_priority(self):
        """Test field mapping priority system"""
        data_with_conflicts = {
            "name": "Primary Name",
            "model": "Model Name",
            "max_engraving_speed": "7000mm/min", 
            "max_cutting_speed": "3000mm/min",
            "speed": "5000mm/min"
        }
        
        normalized, validation = self.normalizer.normalize(data_with_conflicts, "laser-cutter")
        
        # Higher priority fields should win
        assert normalized["Machine Name"] == "Primary Name"  # name > model
        assert normalized["Max Speed (mm/min)"] == 7000.0  # max_engraving_speed > others
    
    def test_unit_conversion_consistency(self):
        """Test unit conversion consistency across different inputs"""
        test_cases = [
            {"power": "2kW", "expected_power": 2000.0},
            {"power": "500mW", "expected_power": 0.5},
            {"working_area": "16x12 inches", "expected_area": "406 x 305 mm"},
            {"price": "€2.500,00", "expected_price": 2500.0},
        ]
        
        for case in test_cases:
            test_data = {"name": "Test Machine"}
            # Add default price only if not testing price
            if "price" not in case:
                test_data["price"] = "$100"
            test_data.update({k: v for k, v in case.items() if not k.startswith("expected_")})
            
            normalized, validation = self.normalizer.normalize(test_data, "laser-cutter")
            
            if "expected_power" in case:
                assert abs(normalized["Laser Power (W)"] - case["expected_power"]) < 0.01
            if "expected_area" in case and "Working Area" in normalized:
                assert "406" in normalized["Working Area"]  # Converted inches to mm
            if "expected_price" in case:
                assert abs(normalized["Price ($)"] - case["expected_price"]) < 0.01
    
    def test_category_auto_assignment(self):
        """Test automatic category assignment"""
        test_cases = [
            ({"name": "Laser Cutting Machine", "power": "100W"}, "laser-cutter"),
            ({"name": "3D Printer FDM", "build_volume": "200x200x200"}, "3d-printer"),
            ({"name": "CNC Mill", "spindle_power": "2kW"}, "cnc-machine"),
            ({"name": "UV Flatbed Printer", "print_technology": "UV-LED"}, "uv-dtf-printer"),
        ]
        
        for data, expected_category in test_cases:
            data["price"] = "$1000"  # Add required price
            normalized, validation = self.normalizer.normalize(data)
            
            category = self.normalizer._auto_assign_category(data)
            assert category == expected_category
    
    def test_performance_with_large_dataset(self):
        """Test performance with larger data sets"""
        import time
        
        # Create 100 machine records
        machines = []
        for i in range(100):
            machines.append({
                "name": f"Test Machine {i}",
                "brand": "TestBrand",
                "power": f"{20 + (i % 50)}W",
                "working_area": f"{300 + (i % 100)}x{200 + (i % 100)}mm",
                "price": f"${1000 + (i * 10)}"
            })
        
        start_time = time.time()
        
        results = []
        for machine in machines:
            normalized, validation = self.normalizer.normalize(machine, "laser-cutter")
            results.append((normalized, validation))
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should process 100 records in reasonable time (< 1 second)
        assert processing_time < 1.0, f"Processing took too long: {processing_time:.2f}s"
        
        # All records should be valid
        valid_count = sum(1 for _, validation in results if validation.is_valid)
        assert valid_count == 100, f"Only {valid_count}/100 records were valid"


if __name__ == "__main__":
    # Run tests if script is executed directly
    pytest.main([__file__, "-v"])