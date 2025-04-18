#!/bin/bash
# Run script for Price Extractor Python
# Makes it easier to run the various commands

# Function to display help
show_help() {
    echo "Price Extractor Python Run Script"
    echo ""
    echo "Usage: ./run.sh [command] [arguments]"
    echo ""
    echo "Commands:"
    echo "  start              Start the API server"
    echo "  update [id]        Update price for a specific machine"
    echo "  batch [days]       Batch update machines (default: 7 days)"
    echo "  batch-dry [days]   Batch update in dry-run mode (extract but don't save)"
    echo "  test-claude [url]  Test Claude price extraction on a URL"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run.sh start"
    echo "  ./run.sh update machine-123"
    echo "  ./run.sh batch 14"
    echo "  ./run.sh batch-dry 7"
    echo "  ./run.sh test-claude https://example.com/product"
}

# Ensure the script is executable
chmod +x run.sh 2>/dev/null

# Ensure venv is available (if using a virtual environment)
if [ -d "venv" ]; then
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
fi

# Process commands
case "$1" in
    start)
        echo "Starting API server..."
        python main.py
        ;;
    update)
        if [ -z "$2" ]; then
            echo "Error: Missing machine ID"
            echo "Usage: ./run.sh update [machine_id]"
            exit 1
        fi
        echo "Updating price for machine $2..."
        python update_price.py "$2"
        ;;
    batch)
        days=${2:-7}  # Default to 7 days if not provided
        echo "Batch updating machines not updated in the last $days days..."
        python batch_update.py "$days"
        ;;
    batch-dry)
        days=${2:-7}  # Default to 7 days if not provided
        echo "DRY RUN: Batch updating machines not updated in the last $days days..."
        echo "(Prices will be extracted but NOT saved to the database)"
        python batch_update.py "$days" --dry-run
        ;;
    test-claude)
        if [ -z "$2" ]; then
            echo "Error: Missing URL"
            echo "Usage: ./run.sh test-claude [url]"
            exit 1
        fi
        echo "Testing Claude price extraction on $2..."
        python test_claude_extraction.py "$2"
        ;;
    help)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 