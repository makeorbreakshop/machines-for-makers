# Daily Batch Analysis Workflow

This document outlines the systematic process for analyzing price extraction batches after each daily run.

## Overview

After every batch run, we systematically:
1. Analyze extraction failures and successes
2. Review manual price corrections
3. Identify patterns in errors
4. Apply automated fixes
5. Monitor improvement over time

## Workflow Steps

### 1. Run Daily Batch
```bash
# Batch runs automatically or via admin interface
# Typically processes 10-100 machines per batch
```

### 2. Initial Analysis (Automated)
After batch completion, run the analysis script:
```bash
python daily_batch_analysis.py --batch-id <batch_id>
```

This will:
- Count successes vs failures
- Categorize failure types
- Check for manual corrections
- Identify systematic patterns

### 3. Review Manual Corrections
When users correct prices in the admin interface, the system tracks:
- Original extracted price
- Corrected price
- Extraction method used
- URL and machine details

### 4. Pattern Identification

Common patterns to look for:

#### A. Domain-Specific Issues
- Multiple corrections on same domain → Site rules needed
- Example: Glowforge extracting promotional prices

#### B. Systematic Errors
- Same wrong price across multiple machines → Selector contamination
- Example: Bundle price $4,589 extracted for many machines

#### C. Method Performance
- High failure rate for specific extraction method → Method improvement needed
- Example: Claude AI struggling with multi-price pages

### 5. Apply Fixes

Based on patterns, apply fixes in priority order:

#### Priority 1: Site-Specific Rules
```python
# Add to site_specific_extractors.py
"problematic-domain.com": {
    "price_selectors": [...],
    "avoid_selectors": [...],
    "validation": {...}
}
```

#### Priority 2: Selector Blacklisting
```python
# Add to blacklist in extractors
'blacklist_selectors': ['.bundle-price', '.package-price']
```

#### Priority 3: Validation Rules
```python
# Add price range validation
'validation': {
    'price_ranges': {
        'model-x': {'min': 1000, 'max': 2000}
    }
}
```

### 6. Test Fixes
After implementing fixes:
```bash
# Re-run failed machines
python retest_failed_machines.py --batch-id <batch_id>
```

### 7. Monitor Improvement
Track metrics over time:
- Extraction success rate
- Manual correction frequency
- Pattern recurrence

## Example: Today's Batch Analysis

### Batch: c64cbce7 (2025-07-09)
- **Total**: 10 machines
- **Success**: 7 (70%)
- **Failed**: 3 (30%)

### Manual Corrections Made:
1. **Glowforge Plus**: $3,995 → $4,499 (+12.6%)
2. **Glowforge Plus HD**: $4,995 → $4,999 (+0.1%)
3. **Gweike G6 Split**: $3,999 → $3,899 (-2.5%)

### Pattern Identified:
- Glowforge domain consistently underpricing
- All failures from Claude AI extraction method

### Fix Applied:
Added Glowforge-specific rules to avoid promotional prices and validate against expected ranges.

## Automation Scripts

### 1. `daily_batch_analysis.py`
Main analysis script that:
- Analyzes batch logs
- Queries manual corrections
- Identifies patterns
- Suggests fixes

### 2. `analyze_batch_failures.py`
Detailed failure analysis:
- Categorizes failure types
- Generates MCP investigation scripts
- Provides actionable recommendations

### 3. `simple_batch_analysis.py`
Enhanced analysis combining:
- Log analysis
- Database corrections
- Pattern recognition

## Best Practices

1. **Run analysis immediately after batch completion**
   - Fresh context helps identify issues

2. **Document all manual corrections**
   - Include reason for correction
   - Note any patterns observed

3. **Test fixes on small batches first**
   - Verify improvements before full deployment

4. **Keep extraction rules simple**
   - Complex rules are harder to maintain
   - Prefer specific selectors over generic ones

5. **Monitor long-term trends**
   - Weekly/monthly success rate trends
   - Common failure domains
   - Extraction method performance

## Metrics to Track

### Daily Metrics
- Batch success rate
- Manual corrections required
- Average extraction time
- Method distribution

### Weekly Metrics
- Domain-specific success rates
- Pattern recurrence
- Fix effectiveness
- New issues emerging

### Monthly Metrics
- Overall system accuracy
- Cost per extraction (API calls)
- Database growth
- Performance trends

## Troubleshooting

### High Failure Rate
1. Check for site changes
2. Review recent fixes
3. Analyze network issues
4. Verify API quotas

### Repeated Patterns
1. Ensure fixes are applied
2. Check selector specificity
3. Review validation logic
4. Consider dynamic extraction

### Performance Issues
1. Monitor extraction times
2. Check concurrent limits
3. Review retry logic
4. Optimize selectors

## Future Improvements

1. **ML-based pattern detection**
   - Automatically identify new patterns
   - Suggest fixes based on history

2. **Self-healing selectors**
   - Detect when selectors break
   - Automatically find alternatives

3. **Confidence scoring**
   - Rate extraction confidence
   - Flag low-confidence for review

4. **A/B testing fixes**
   - Test multiple approaches
   - Automatically adopt best performer

## Conclusion

This systematic approach ensures continuous improvement of the price extraction system. By analyzing each batch, identifying patterns, and applying targeted fixes, we maintain high accuracy while minimizing manual intervention.

Remember: The goal is not 100% automation, but rather intelligent automation with human oversight where it adds value.