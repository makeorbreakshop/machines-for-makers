# Discovery System Monitoring Dashboard

A comprehensive monitoring tool for the machine discovery system that provides insights into performance, data quality, and credit usage.

## Features

### 📊 Discovery Statistics
- **Status Breakdown**: Shows count of machines by status (pending, approved, rejected)
- **Site Breakdown**: Displays machine counts per manufacturer site
- **Recent Scans**: Lists the last 10 discovery scans with performance metrics
- **Unknown Machines**: Identifies products with missing or "Unknown" names

### 📈 Data Quality Metrics
- **Overall Metrics**: Percentages of machines with valid names, prices, images
- **Validation Errors**: Most common validation errors and their frequencies
- **Validation Warnings**: Common warnings that may need attention
- **Price Distribution**: Breakdown of discovered products by price range

### 💰 Credit Usage
- **Monthly Total**: Current month's AI extraction costs
- **Site Credits**: Cost breakdown by manufacturer site
- **Daily Credits**: Daily spending trends over the last 30 days
- **Cost per Product**: Average extraction cost per product by site

### 💡 Actionable Insights
- **High Unknown Rates**: Sites with many products missing names
- **Common Errors**: Most frequent validation issues to fix
- **Cost Optimization**: Sites with higher than average extraction costs
- **Data Completeness**: Overall data quality issues to address

## Usage

### Basic Usage
```bash
cd price-extractor-python
python monitor_discovery.py
```

### Requirements
- Python 3.7+
- Configured Supabase connection (via environment variables)
- Access to the discovery system database

### Output
The script generates a formatted console report with:
- Tables showing key metrics
- Color-coded severity indicators (🔴 High, 🟡 Medium, 🟢 Low)
- Specific recommendations for improvement
- URLs of machines needing manual review

## Understanding the Report

### Status Types
- **pending**: Newly discovered, awaiting review
- **approved**: Reviewed and ready for import
- **rejected**: Not suitable for the catalog
- **imported**: Successfully added to main catalog

### Cost Metrics
- **Total Cost**: Sum of all AI extraction costs
- **Avg/Scan**: Average cost per discovery scan
- **Avg/Product**: Average cost to extract one product's data

### Validation Errors
Common validation errors include:
- Missing required fields (name, price)
- Invalid data formats
- Out-of-range values
- Duplicate products

## Recommendations

Based on the insights provided:

1. **Fix Unknown Products**: Review and update products with "Unknown" names
2. **Optimize High-Cost Sites**: Consider simpler extraction methods for expensive sites
3. **Address Validation Errors**: Update extraction logic to handle common errors
4. **Monitor Credit Usage**: Keep track of monthly spending trends

## Integration

This tool can be integrated into:
- Daily monitoring workflows
- Cost management processes
- Data quality reviews
- Performance optimization efforts

## Troubleshooting

If you see errors:
1. Check database connection settings
2. Ensure you have read access to all required tables
3. Verify the discovery system has run at least once
4. Check for any schema changes in the database

For questions or issues, refer to the main discovery system documentation.