# EMP ST50R Price Extraction Issue Analysis

## 🚨 CRITICAL FINDING: Wrong Column Selection

### The Problem
The EMP ST50R extraction is configured to use **column 3** (4th column), but this is extracting the wrong machine's price:

| Column | Machine  | Price   | Status |
|--------|----------|---------|--------|
| 0      | Pricing  | N/A     | Header |
| 1      | EMP ST30R| $4,995  | ✅ Correct |
| 2      | EMP ST50R| $6,995  | ⚠️ **This is the actual ST50R** |
| 3      | EMP ST30J| $6,995  | ❌ **Currently selected (WRONG!)** |
| 4      | EMP ST50J| $8,495  | Different variant |
| 5      | EMP ST60J| $8,995  | Different variant |
| 6      | EMP ST100J| $11,995 | Different variant |

### Current Configuration Issues
1. **Wrong Column**: Configured to use column 3, but ST50R is in column 2
2. **Wrong Expected Price**: Config expects $8,495, but actual ST50R price is $6,995
3. **Wrong Price Range**: Config uses [8000-9000], but ST50R is $6,995

### Root Cause
The site_specific_extractors.py configuration was created based on outdated or incorrect table analysis. The actual table structure shows:
- **EMP ST50R is in column 2 (3rd position) with $6,995**
- The current config selects **EMP ST30J in column 3** instead

### Comparison with Database
- **Database shows**: EMP ST50R = $6,995 ✅ (matches actual table)
- **Extractor config**: Expected $8,495 ❌ (matches different variant)

This confirms the database has the correct price, but the extraction logic is selecting the wrong table column.

## 🔧 Required Fixes

### 1. Fix Column Mapping
```python
'EMP ST50R': {
    'keywords': ['ST50R', 'ST 50R'],  # Remove generic '50R'
    'expected_price': 6995,           # Correct price
    'table_column': 2,                # Correct column (was 3)
    'price_range': [6500, 7500]      # Correct range
}
```

### 2. Fix All EMP Variant Mappings
Based on the actual table structure:
- EMP ST30R: Column 1, $4,995 ✅ (currently correct)
- EMP ST50R: Column 2, $6,995 ❌ (needs fix: column 3→2, price 8495→6995)
- EMP ST30J: Column 3, $6,995 (new variant, not in config)
- EMP ST50J: Column 4, $8,495 (new variant, not in config)
- EMP ST60J: Column 5, $8,995 ✅ (currently correct)
- EMP ST100J: Column 6, $11,995 ✅ (currently correct)

### 3. Remove Problematic Keywords
The keyword '50R' is too generic and could match:
- 50W power ratings
- Other variants with '50' in the name
- Should use only 'ST50R' and 'ST 50R'

## 🎯 Impact Assessment

### Current Impact
- **EMP ST50R** extractions are returning **$6,995** (EMP ST30J price) instead of the correct **$6,995** (EMP ST50R price)
- Wait... they're both $6,995, but we're still selecting wrong machine variant
- The confusion is between ST50R and ST30J which have the same price

### Why This Matters
Even though both machines cost $6,995, we're:
1. Selecting the wrong machine (ST30J instead of ST50R)
2. Using wrong configuration that could break if prices diverge
3. Potentially affecting other EMP variants due to incorrect column mapping

## 📋 Test Results Summary

✅ **Confirmed Issues:**
- Column 3 contains EMP ST30J ($6,995), not EMP ST50R
- EMP ST50R is actually in column 2 ($6,995)
- Current configuration selects wrong variant
- Keyword '50R' is too generic and risky

✅ **Database Accuracy:**
- Database price $6,995 matches actual EMP ST50R price
- Database is correct, extraction configuration is wrong

⚠️ **Potential Similar Issues:**
- Other EMP variants may have similar column mapping problems
- Need to verify all EMP variant configurations