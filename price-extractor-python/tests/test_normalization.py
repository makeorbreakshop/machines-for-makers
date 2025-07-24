"""
Tests for machine data normalization system
"""
import pytest
import sys
import os
from decimal import Decimal

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from normalizers.machine_data_normalizer import MachineDataNormalizer


class TestMachineDataNormalizer:
    """Test cases for machine data normalization"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.normalizer = MachineDataNormalizer()
    
    def test_unit_standardization(self):
        """Test unit conversion to standard formats"""
        # Power conversions
        test_cases = [
            ("20W", 20.0),
            ("2kW", 2000.0),
            ("1.5 kW", 1500.0),
            ("500mW", 0.5),
            ("2000 milliwatts", 2.0),
            ("3 kilowatts", 3000.0)
        ]
        
        for input_val, expected in test_cases:
            result = self.normalizer._standardize_power(input_val)
            assert result == expected, f"Expected {expected} for {input_val}, got {result}"
    
    def test_speed_conversion(self):
        """Test speed unit conversions"""
        test_cases = [
            ("1000mm/min", 1000.0),
            ("50mm/s", 3000.0),  # 50 * 60
            ("2 m/min", 2000.0),  # 2 * 1000
            ("0.5 m/s", 30000.0),  # 0.5 * 1000 * 60
            ("100 millimeters per minute", 100.0)
        ]
        
        for input_val, expected in test_cases:
            result = self.normalizer._standardize_speed(input_val)
            assert result == expected, f"Expected {expected} for {input_val}, got {result}"
    
    def test_dimension_parsing(self):
        """Test dimension parsing to standard format"""
        test_cases = [
            ("400x300mm", {"width": 400.0, "height": 300.0, "unit": "mm"}),
            ("16x12 inches", {"width": 406.4, "height": 304.8, "unit": "mm"}),  # Converted to mm
            ("400 x 300 x 200", {"width": 400.0, "height": 300.0, "depth": 200.0, "unit": "mm"}),
            ("A4 (210 x 297)", {"width": 210.0, "height": 297.0, "unit": "mm"}),
            ("12\" x 8\"", {"width": 304.8, "height": 203.2, "unit": "mm"})
        ]
        
        for input_val, expected in test_cases:
            result = self.normalizer._parse_dimensions(input_val)
            # Compare with tolerance for floating point
            for key, value in expected.items():
                if isinstance(value, float):
                    assert abs(result[key] - value) < 0.1, f"Expected {value} for {key}, got {result[key]}"
                else:
                    assert result[key] == value
    
    def test_price_cleaning(self):
        """Test price string cleaning and parsing"""
        test_cases = [
            ("$1,299.99", 1299.99),
            ("€2.500,00", 2500.00),  # European format
            ("£999", 999.00),
            ("$1,999 - $2,499", 1999.00),  # Range - takes first value
            ("From $899", 899.00),
            ("¥150,000", 150000.00),
            ("1299.99 USD", 1299.99),
            ("MSRP: $1,799", 1799.00)
        ]
        
        for input_val, expected in test_cases:
            result = self.normalizer._parse_price(input_val)
            assert abs(result - expected) < 0.01, f"Expected {expected} for '{input_val}', got {result}"
    
    def test_boolean_conversion(self):
        """Test boolean value standardization"""
        true_values = ["yes", "true", "1", "on", "enabled", "available", "included"]
        false_values = ["no", "false", "0", "off", "disabled", "unavailable", "not included"]
        
        for val in true_values:
            result = self.normalizer._normalize_boolean(val)
            assert result == "Yes", f"Expected 'Yes' for '{val}', got '{result}'"
        
        for val in false_values:
            result = self.normalizer._normalize_boolean(val)
            assert result == "No", f"Expected 'No' for '{val}', got '{result}'"
    
    def test_field_mapping(self):
        """Test legacy field name mapping"""
        raw_data = {
            "power": "60W",
            "laser_power": "20W",
            "cutting_area": "400x300mm",
            "engraving_area": "350x250mm",
            "connectivity": "wifi, usb",
            "software": "LaserGRBL",
            "weight": "25kg",
            "dimensions": "500x400x300mm"
        }
        
        normalized, validation = self.normalizer.normalize(raw_data, "laser-cutter")
        
        # Check that fields were mapped correctly
        assert "Laser Power (W)" in normalized
        assert "Working Area" in normalized
        assert "Software Compatibility" in normalized
        assert "Weight (kg)" in normalized
        assert "Machine Dimensions" in normalized
    
    def test_laser_specific_normalization(self):
        """Test laser-specific field normalization"""
        raw_data = {
            "name": "Test Laser Engraver",
            "power": "60W",
            "working_area": "400x300mm", 
            "laser_type": "Diode",
            "wavelength": "450nm",
            "max_speed": "6000mm/min",
            "precision": "0.1mm",
            "connectivity": "WiFi, USB",
            "software": "LaserGRBL, LightBurn",
            "price": "$1,299"
        }
        
        normalized, validation = self.normalizer.normalize(raw_data, "laser-cutter")
        
        # Verify normalization
        assert normalized["Laser Power (W)"] == 60.0
        assert "400" in normalized["Working Area"]
        assert normalized["Max Speed (mm/min)"] == 6000.0
        assert normalized["Precision (mm)"] == 0.1
        assert normalized["Connectivity"] == "WiFi, USB"
        assert validation.is_valid
    
    def test_3d_printer_normalization(self):
        """Test 3D printer specific normalization"""
        raw_data = {
            "name": "Test 3D Printer",
            "build_volume": "220x220x250mm",
            "layer_height": "0.1-0.4mm",
            "nozzle_diameter": "0.4mm", 
            "filament_diameter": "1.75mm",
            "print_speed": "150mm/s",
            "heated_bed": "yes",
            "auto_leveling": "true",
            "connectivity": "USB, SD Card, WiFi",
            "price": "$299.99"
        }
        
        normalized, validation = self.normalizer.normalize(raw_data, "3d-printer")
        
        # Verify normalization
        assert "220" in normalized["Build Volume"]
        assert normalized["Layer Height Min (mm)"] == 0.1
        assert normalized["Layer Height Max (mm)"] == 0.4
        assert normalized["Nozzle Diameter (mm)"] == 0.4
        assert normalized["Print Speed (mm/s)"] == 150.0
        assert normalized["Heated Bed"] == "Yes"
        assert normalized["Auto Leveling"] == "Yes"
    
    def test_cnc_normalization(self):
        """Test CNC machine specific normalization"""
        raw_data = {
            "name": "Test CNC Router",
            "working_area": "750x750x80mm",
            "spindle_power": "2.2kW",
            "max_rpm": "24000",
            "spindle_type": "Water-cooled",
            "positioning_accuracy": "±0.05mm",
            "repeatability": "±0.02mm",
            "max_feed_rate": "8000mm/min",
            "control_system": "Mach3",
            "price": "$3,499"
        }
        
        normalized, validation = self.normalizer.normalize(raw_data, "cnc-machine")
        
        # Verify normalization
        assert normalized["Spindle Power (W)"] == 2200.0  # Converted from kW
        assert normalized["Max RPM"] == 24000
        assert normalized["Max Feed Rate (mm/min)"] == 8000.0
        assert normalized["Positioning Accuracy (mm)"] == 0.05
        assert "±0.02" in normalized["Repeatability"]
    
    def test_validation_errors(self):
        """Test validation error detection"""
        # Missing required fields
        incomplete_data = {
            "name": "Test Machine"
            # Missing price, specifications, etc.
        }
        
        normalized, validation = self.normalizer.normalize(incomplete_data, "laser-cutter")
        
        assert not validation.is_valid
        assert len(validation.errors) > 0
        assert any("price" in error.lower() for error in validation.errors)
    
    def test_validation_warnings(self):
        """Test validation warning detection"""
        # Suspicious price
        data_with_warnings = {
            "name": "Test Laser",
            "price": "$50000",  # Unusually high for a basic laser
            "power": "20W",
            "working_area": "300x200mm"
        }
        
        normalized, validation = self.normalizer.normalize(data_with_warnings, "laser-cutter")
        
        assert validation.warnings  # Should have warnings
        assert any("price" in warning.lower() for warning in validation.warnings)
    
    def test_brand_matching(self):
        """Test brand name fuzzy matching"""
        test_cases = [
            ("commarker", "ComMarker"),
            ("x-tool", "xTool"),
            ("xtool", "xTool"),
            ("bambulab", "Bambu Lab"),
            ("bambu lab", "Bambu Lab"),
            ("creality", "Creality"),
            ("prusa research", "Prusa")
        ]
        
        for input_brand, expected in test_cases:
            result = self.normalizer._match_brand_name(input_brand)
            assert result == expected, f"Expected '{expected}' for '{input_brand}', got '{result}'"
    
    def test_category_assignment(self):
        """Test automatic category assignment"""
        test_cases = [
            ({"name": "Laser Engraver", "power": "20W"}, "laser-cutter"),
            ({"name": "3D Printer", "build_volume": "200x200x200"}, "3d-printer"),
            ({"name": "CNC Router", "spindle_power": "1.5kW"}, "cnc-machine"),
            ({"name": "UV Printer", "print_technology": "UV-LED"}, "uv-dtf-printer")
        ]
        
        for raw_data, expected_category in test_cases:
            normalized, validation = self.normalizer.normalize(raw_data)
            category = self.normalizer._auto_assign_category(raw_data)
            assert category == expected_category
    
    def test_specification_range_validation(self):
        """Test specification range validation"""
        # Test reasonable ranges
        valid_data = {
            "name": "Test Laser",
            "power": "40W",  # Reasonable for diode laser
            "working_area": "400x300mm",  # Reasonable size
            "price": "$899"  # Reasonable price
        }
        
        normalized, validation = self.normalizer.normalize(valid_data, "laser-cutter")
        assert validation.is_valid
        
        # Test unreasonable ranges
        invalid_data = {
            "name": "Test Laser", 
            "power": "10000W",  # Unreasonably high for diode laser
            "working_area": "10x10mm",  # Unreasonably small
            "price": "$50"  # Unreasonably cheap
        }
        
        normalized, validation = self.normalizer.normalize(invalid_data, "laser-cutter")
        assert not validation.is_valid or validation.warnings  # Should have errors or warnings
    
    def test_duplicate_detection(self):
        """Test duplicate machine detection logic"""
        machine1 = {
            "name": "ComMarker B6 MOPA 60W",
            "brand": "ComMarker",
            "power": "60W",
            "price": "$4589"
        }
        
        machine2 = {
            "name": "ComMarker B6 60W MOPA Fiber Laser", 
            "brand": "ComMarker",
            "power": "60W",
            "price": "$4599"  # Slightly different price
        }
        
        # These should be detected as potential duplicates
        similarity = self.normalizer._calculate_similarity(machine1, machine2)
        assert similarity > 0.8  # High similarity threshold
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        # Empty data
        empty_data = {}
        normalized, validation = self.normalizer.normalize(empty_data)
        assert not validation.is_valid
        
        # None values
        none_data = {"name": None, "price": None}
        normalized, validation = self.normalizer.normalize(none_data)
        
        # Invalid types
        invalid_data = {"name": 123, "price": [1, 2, 3]}
        normalized, validation = self.normalizer.normalize(invalid_data)
        # Should handle gracefully without crashing
    
    def test_comprehensive_laser_data(self):
        """Test comprehensive laser machine data normalization"""
        comprehensive_data = {
            "name": "ComMarker B6 MOPA 60W Fiber Laser Engraver",
            "brand": "ComMarker",
            "model": "B6",
            "laser_type": "MOPA Fiber",
            "laser_power": "60W",
            "wavelength": "1064nm",
            "working_area": "180 x 180mm",
            "max_engraving_speed": "7000mm/min",
            "max_cutting_speed": "3000mm/min", 
            "positioning_accuracy": "±0.01mm",
            "repetition_accuracy": "±0.005mm",
            "minimum_line_width": "0.01mm",
            "laser_head": "Galvanometer",
            "cooling_system": "Air cooling",
            "power_consumption": "400W",
            "connectivity": "USB, Ethernet, WiFi",
            "software": "EZCAD2, LightBurn Compatible",
            "operating_system": "Windows 7/8/10/11",
            "file_formats": "PLT, DXF, BMP, JPG, PNG, AI",
            "safety_features": "Laser safety class 4, Emergency stop",
            "weight": "35kg",
            "dimensions": "700 x 500 x 300mm",
            "power_supply": "AC 110-240V, 50/60Hz",
            "operating_temperature": "10-40°C",
            "operating_humidity": "5-95% RH",
            "price": "$4,589.00",
            "warranty": "2 years",
            "shipping_weight": "45kg"
        }
        
        normalized, validation = self.normalizer.normalize(comprehensive_data, "laser-cutter")
        
        # Verify key normalizations
        assert normalized["Machine Name"] == "ComMarker B6 MOPA 60W Fiber Laser Engraver"
        assert normalized["Brand"] == "ComMarker"
        assert normalized["Laser Power (W)"] == 60.0
        assert normalized["Working Area"] == "180 x 180 mm"
        assert normalized["Max Speed (mm/min)"] == 7000.0
        assert normalized["Price ($)"] == 4589.0
        assert normalized["Weight (kg)"] == 35.0
        assert validation.is_valid
        
        # Check that all important fields are present
        expected_fields = [
            "Machine Name", "Brand", "Laser Power (W)", "Working Area", 
            "Max Speed (mm/min)", "Price ($)", "Connectivity", "Software Compatibility"
        ]
        
        for field in expected_fields:
            assert field in normalized, f"Expected field '{field}' not found in normalized data"


if __name__ == "__main__":
    # Run tests if script is executed directly
    pytest.main([__file__, "-v"])