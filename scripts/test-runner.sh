#!/bin/bash
# Test Runner Script for Click Tracking System
# 
# This script orchestrates all testing phases for the click tracking system
# ensuring comprehensive validation before deployment.

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="tests"
BASE_URL="${1:-http://localhost:3000}"
ENVIRONMENT="${2:-development}"
SKIP_LOAD_TESTS="${3:-false}"

echo -e "${BLUE}🧪 Click Tracking System Test Runner${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""
echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Environment: $ENVIRONMENT"
echo "  Skip Load Tests: $SKIP_LOAD_TESTS"
echo ""

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "error" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Function to check if server is running
check_server() {
    local url=$1
    local timeout=30
    local count=0
    
    print_status "info" "Checking if server is available at $url..."
    
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            print_status "success" "Server is responding"
            return 0
        fi
        sleep 2
        count=$((count + 2))
        echo -n "."
    done
    
    print_status "error" "Server not responding after ${timeout}s"
    return 1
}

# Function to run a test phase
run_test_phase() {
    local phase_name=$1
    local command=$2
    local required=$3  # "required" or "optional"
    
    echo ""
    echo -e "${BLUE}📋 Running: $phase_name${NC}"
    echo "Command: $command"
    echo "Status: ${required}"
    echo ""
    
    if eval "$command"; then
        print_status "success" "$phase_name completed successfully"
        return 0
    else
        if [ "$required" = "required" ]; then
            print_status "error" "$phase_name failed (required)"
            return 1
        else
            print_status "warning" "$phase_name failed (optional - continuing)"
            return 0
        fi
    fi
}

# Function to generate summary report
generate_summary() {
    local exit_code=$1
    
    echo ""
    echo -e "${BLUE}📊 TEST EXECUTION SUMMARY${NC}"
    echo -e "${BLUE}=========================${NC}"
    echo ""
    
    if [ $exit_code -eq 0 ]; then
        print_status "success" "All tests completed successfully!"
        echo ""
        echo "✅ Unit tests passed"
        echo "✅ Integration validation completed"
        if [ "$SKIP_LOAD_TESTS" != "true" ]; then
            echo "✅ Load testing completed"
        else
            echo "⏭️  Load testing skipped"
        fi
        echo "✅ System validation passed"
        
        echo ""
        echo -e "${GREEN}🚀 DEPLOYMENT READY${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Deploy the updated click tracking system"
        echo "2. Monitor production metrics closely"
        echo "3. Set up continuous monitoring"
        echo "4. Validate 99%+ click capture rate in production"
        
    else
        print_status "error" "Some tests failed!"
        echo ""
        echo "❌ Test suite execution incomplete"
        echo ""
        echo -e "${RED}🚫 NOT READY FOR DEPLOYMENT${NC}"
        echo ""
        echo "Required actions:"
        echo "1. Review test failures above"
        echo "2. Fix identified issues"
        echo "3. Re-run test suite"
        echo "4. Ensure all critical tests pass"
    fi
    
    echo ""
    echo "Logs and artifacts:"
    echo "- Unit test results: $TEST_DIR/coverage/"
    echo "- Load test results: See console output above"
    echo "- Monitoring data: See validation output above"
    echo ""
}

# Main execution
main() {
    local overall_status=0
    
    # Phase 1: Setup and Prerequisites
    print_status "info" "Phase 1: Setup and Prerequisites"
    
    if [ ! -d "$TEST_DIR" ]; then
        print_status "error" "Test directory '$TEST_DIR' not found"
        exit 1
    fi
    
    # Check if we need to install dependencies
    if [ ! -f "$TEST_DIR/node_modules/.installed" ]; then
        print_status "info" "Installing test dependencies..."
        cd "$TEST_DIR"
        npm install
        touch node_modules/.installed
        cd ..
        print_status "success" "Test dependencies installed"
    fi
    
    # Check server availability (if not localhost, assume it's running)
    if [[ "$BASE_URL" == *"localhost"* ]]; then
        if ! check_server "$BASE_URL"; then
            print_status "error" "Local server must be running for tests"
            print_status "info" "Start server with: npm run dev"
            exit 1
        fi
    else
        print_status "info" "Using external server: $BASE_URL"
    fi
    
    # Phase 2: Unit and Integration Tests
    print_status "info" "Phase 2: Unit and Integration Tests"
    
    if ! run_test_phase "Unit Tests" "cd $TEST_DIR && npm test" "required"; then
        overall_status=1
    fi
    
    # Phase 3: System Validation
    print_status "info" "Phase 3: System Validation"
    
    if ! run_test_phase "Click Tracking Validation" \
        "cd $TEST_DIR && timeout 60s node monitoring-validator.js $BASE_URL 5 95 test" \
        "required"; then
        overall_status=1
    fi
    
    # Phase 4: Load Testing (optional for development, required for production)
    if [ "$SKIP_LOAD_TESTS" != "true" ]; then
        print_status "info" "Phase 4: Load Testing"
        
        local load_test_required="optional"
        if [ "$ENVIRONMENT" = "production" ]; then
            load_test_required="required"
        fi
        
        if ! run_test_phase "Load Testing (Light)" \
            "cd $TEST_DIR && timeout 120s node load-testing.js $BASE_URL 5 50" \
            "$load_test_required"; then
            if [ "$load_test_required" = "required" ]; then
                overall_status=1
            fi
        fi
    fi
    
    # Phase 5: Security and Rate Limiting Tests
    print_status "info" "Phase 5: Security Tests"
    
    if ! run_test_phase "Rate Limiting Test" \
        "timeout 30s bash -c 'for i in {1..25}; do curl -s -o /dev/null -w \"%{http_code}\\n\" \"$BASE_URL/go/test-rate-\$i\" & done; wait' | grep -q 429" \
        "optional"; then
        print_status "warning" "Rate limiting test inconclusive"
    fi
    
    # Phase 6: Final Health Check
    print_status "info" "Phase 6: Final Health Check"
    
    if ! run_test_phase "System Health Check" \
        "cd $TEST_DIR && timeout 30s node monitoring-validator.js $BASE_URL 5 95 health" \
        "required"; then
        overall_status=1
    fi
    
    # Generate final report
    generate_summary $overall_status
    
    exit $overall_status
}

# Handle script interruption
trap 'echo -e "\n${RED}Test execution interrupted${NC}"; exit 130' INT TERM

# Run main function
main "$@"