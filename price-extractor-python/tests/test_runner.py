"""
Test runner for the discovery system
Runs all tests and generates coverage reports
"""
import pytest
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def run_tests():
    """Run all tests with coverage reporting"""
    
    test_args = [
        "--verbose",
        "--tb=short",
        "--color=yes",
        "--durations=10",  # Show 10 slowest tests
        str(Path(__file__).parent),  # Test directory
    ]
    
    # Add coverage if pytest-cov is available
    try:
        import pytest_cov
        test_args.extend([
            "--cov=normalizers",
            "--cov=services", 
            "--cov=crawlers",
            "--cov=scrapers",
            "--cov-report=term-missing",
            "--cov-report=html:tests/coverage_html"
        ])
        print("Running tests with coverage reporting...")
    except ImportError:
        print("pytest-cov not available, running tests without coverage...")
    
    # Run the tests
    exit_code = pytest.main(test_args)
    
    if exit_code == 0:
        print("\n✅ All tests passed!")
    else:
        print(f"\n❌ Tests failed with exit code {exit_code}")
    
    return exit_code


def run_specific_test(test_name):
    """Run a specific test file or test method"""
    test_args = [
        "--verbose",
        "--tb=short", 
        "--color=yes",
        "-k", test_name
    ]
    
    return pytest.main(test_args)


def run_performance_tests():
    """Run only performance-related tests"""
    test_args = [
        "--verbose",
        "--tb=short",
        "--color=yes",
        "-k", "performance",
        str(Path(__file__).parent)
    ]
    
    return pytest.main(test_args)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "specific":
            if len(sys.argv) > 2:
                exit(run_specific_test(sys.argv[2]))
            else:
                print("Please provide a test name")
                exit(1)
        elif sys.argv[1] == "performance":
            exit(run_performance_tests())
        else:
            print("Unknown command. Use 'specific <test_name>' or 'performance'")
            exit(1)
    else:
        exit(run_tests())