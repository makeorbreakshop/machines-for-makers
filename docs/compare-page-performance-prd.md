# Compare Page Performance PRD

## Executive Summary

The Compare Page is experiencing significant performance issues in production, resulting in slow load times, high CPU usage, and occasional server errors. Investigation reveals several critical bottlenecks and inefficiencies that can be addressed with targeted, incremental improvements. Most critically, the page is retrieving unnecessarily large data payloads that exceed Supabase's size limits.

## Current Issues

### Critical Problems

1. **Large Response Payloads**
   - Supabase console shows "Single item size exceeds maxsize" errors
   - Machine records include full HTML content (up to 5MB per record)
   - Average HTML content size: 1.4MB per machine, max: 5MB
   - Compare page loads full data for all 148 machines at once

2. **Slow Query Performance**
   - Database queries taking 6.4+ seconds to complete
   - API requests timing out or being rate limited
   - Total processing time exceeding reasonable thresholds

3. **Frontend UI Issues**
   - Sort and table view buttons no longer functional
   - Event listeners not connecting properly
   - Potential event handler issues causing repeated requests

## Root Causes

1. **Inefficient Data Fetching**
   - Using `select("*")` instead of selecting only needed fields
   - Including large `html_content` field unnecessarily in listing views
   - No pagination or proper filtering at database level

2. **Missing Client-Side Optimizations**
   - Event handlers for sorting not functioning properly
   - Potential memory issues from processing large datasets in browser
   - UI state not being maintained correctly

3. **Infrastructure Constraints**
   - Hitting Supabase size limitations for single responses
   - Potential CPU throttling from excessive resource usage

## Immediate Solutions

### 1. Optimize Data Fetching (Critical)

Current implementation:
```typescript
const productsResponse = await supabase.from("machines").select("*").limit(150)
```

Optimized implementation:
```typescript
const productsResponse = await supabase.from("machines").select(`
  id, "Machine Name", "Internal link", "Company", "Laser Type A", 
  "Laser Power A", "Laser Type B", "LaserPower B", "Laser Category", 
  "Price", "Image", "Work Area", "Speed", "Rating", "Award", "Hidden",
  "Focus", "Enclosure", "Wifi", "Camera", "Passthrough", "Controller",
  "Acceleration", "Laser Frequency", "Pulse Width", "Machine Size",
  "Software", "Warranty", "Published On"
`).limit(150)
```

**Impact**: 
- Reduces response payload from ~5MB to ~50KB per machine (99% reduction)
- Resolves "maxsize" errors completely
- Dramatically improves API response times

### 2. Fix UI Interaction Issues

The event listeners for sort and table view are broken:
```javascript
// In ViewToggle component
window.dispatchEvent(new CustomEvent("viewchange", { detail: { view: newView } }))
window.dispatchEvent(new CustomEvent("sortchange", { detail: { sort: newSort } }))
```

These events are not being properly handled. Fix by implementing direct state management:

```typescript
// Replace custom events with prop-based callbacks
const ViewToggle = ({ onViewChange, onSortChange }) => {
  // Use the passed callback functions directly instead of custom events
  const updateView = useCallback((newView) => {
    setView(newView)
    localStorage.setItem("view", newView)
    onViewChange(newView) // Use callback directly
  }, [onViewChange])
}
```

## Medium-Term Improvements

### 1. Implement Server-Side Pagination

Currently loading all machines at once; implement proper pagination:

```typescript
// In compare/page.tsx
const page = 1;
const pageSize = 24;
const productsResponse = await supabase
  .from("machines")
  .select(fieldList)
  .filter('Hidden', 'not.eq', 'true')
  .range((page-1)*pageSize, page*pageSize-1);
```

### 2. Implement Response Caching

Add proper caching headers and strategies:

```typescript
// In API route
export const revalidate = 3600; // Cache for 1 hour

// Include caching headers in response
return NextResponse.json(data, { 
  headers: {
    'Cache-Control': 'max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
  } 
});
```

### 3. Optimize Client-Side Filtering

Move filtering logic to the server when possible, reducing client-side processing.

## Long-Term Solutions

### 1. Database Schema Optimization

- Move large HTML content to a separate table
- Create proper normalized relationships
- Add appropriate indexes on commonly filtered fields

### 2. Frontend Architecture Improvements

- Implement virtualized lists/tables for better performance with large datasets
- Use React Query for better data fetching and caching
- Consider component splitting and code-splitting for faster initial load

### 3. Add Performance Monitoring

- Implement proper client and server-side performance monitoring
- Set up alerts for query performance degradation
- Add tracing to identify bottlenecks

## Implementation Plan

### Phase 1: Emergency Fixes (Immediate)

1. Modify data fetching to select only necessary fields
2. Fix UI interaction bugs with sorting and view toggles
3. Add proper error handling and fallbacks

### Phase 2: Optimization (1-2 weeks)

1. Implement server-side pagination
2. Add response caching
3. Optimize client-side filtering and rendering

### Phase 3: Restructuring (2-4 weeks)

1. Normalize database schema
2. Refactor frontend with performance optimizations
3. Implement comprehensive monitoring

## Success Metrics

1. **Page Load Time**: Reduce from 6+ seconds to under 1 second
2. **API Response Time**: Reduce from 6+ seconds to under 300ms
3. **Error Rate**: Eliminate "maxsize" errors and rate limiting errors
4. **CPU Usage**: Reduce server CPU utilization peaks
5. **Memory Usage**: Reduce client memory consumption

## Ownership

- Frontend Optimization: [Frontend Developer]
- Database Optimization: [Backend Developer]
- API Improvements: [Full-stack Developer]
- Performance Monitoring: [DevOps] 