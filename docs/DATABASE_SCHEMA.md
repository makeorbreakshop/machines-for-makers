# Database Schema Guide

This document provides a comprehensive overview of the Machines for Makers database schema, table relationships, and conventions used throughout the system.

## Overview

The database uses PostgreSQL (via Supabase) with the following key characteristics:
- **Primary Keys**: All tables use UUID primary keys with `extensions.uuid_generate_v4()` defaults
- **Timestamps**: Uses `timestamp with time zone` for all datetime fields
- **Naming Convention**: Mix of camelCase and space-separated column names (legacy from Webflow import)
- **Soft Deletes**: Uses visibility flags rather than hard deletes (e.g., `Hidden` field)

## Core Tables

### machines
The central table containing all machine data (laser cutters, 3D printers, CNC machines).

**Key Columns:**
- `id` (uuid, PK) - Unique identifier
- `Machine Name` (text) - Display name of the machine
- `Internal link` (text) - URL slug for the machine page
- `Company` (text) - Manufacturer/brand name
- `Machine Category` (text) - Type: "Laser Cutter", "3D Printer", "CNC"
- `Laser Category` (text) - Sub-category for lasers: "Diode", "CO2", "Fiber"
- `Price` (numeric) - Base price in USD
- `Rating` (numeric) - Review rating (1-5 scale)
- `Hidden` (text) - Visibility flag: "true"/"false" (string, not boolean)

**Specification Columns:**
- `Laser Type A/B` (text) - Primary/secondary laser types
- `Laser Power A/LaserPower B` (text) - Power ratings
- `Work Area` (text) - Working dimensions
- `Speed` (text) - Operating speed
- `Machine Size` (text) - Physical dimensions
- `Software` (text) - Compatible software
- `Focus` (text) - Auto/Manual focus capability
- `Enclosure` (text) - "Yes"/"No" for enclosed design
- `Wifi` (text) - "Yes"/"No" for wireless connectivity
- `Camera` (text) - "Yes"/"No" for camera integration
- `Passthrough` (text) - "Yes"/"No" for passthrough capability

**Content Columns:**
- `Description` (text) - Full product description
- `Excerpt (Short/Long)` (text) - Summary text for listings
- `Review` (text) - Expert review content
- `Brandon's Take` (text) - Personal commentary
- `Highlights` (text) - Key selling points
- `Drawbacks` (text) - Known limitations
- `YouTube Review` (text) - Video review URL

**Price Tracking Columns:**
- `product_link` (text) - Official product URL
- `price_selector_data` (jsonb) - CSS selectors for price extraction
- `price_selector_last_used` (timestamp) - Last price check
- `html_content` (text) - Cached page HTML
- `html_timestamp` (timestamp) - HTML cache timestamp

**Important Notes:**
- Boolean-like fields are stored as text ("Yes"/"No", "true"/"false")
- Column names include spaces (legacy from Webflow)
- Many specification fields are text to accommodate varied formats

### brands
Manufacturer and brand information.

**Columns:**
- `id` (uuid, PK)
- `Name` (text) - Brand display name
- `Slug` (text) - URL-friendly identifier
- `Website` (text) - Official website URL
- `Logo` (text) - Logo image URL
- Legacy Webflow fields: `Collection ID`, `Locale ID`, `Item ID`

### categories
Product categories and subcategories.

**Columns:**
- `id` (uuid, PK)
- `name` (text) - Category name
- `slug` (text) - URL slug
- `description` (text) - Category description

### reviews
User and expert reviews for machines.

**Columns:**
- `id` (uuid, PK)
- `machine_id` (uuid, FK → machines.id)
- `title` (text) - Review title
- `content` (text) - Review body
- `author` (text) - Reviewer name
- `rating` (numeric) - 1-5 star rating
- `pros` (text[]) - Array of positive points
- `cons` (text[]) - Array of negative points
- `verified_purchase` (boolean) - Purchase verification
- `helpful_votes` (integer) - Helpfulness score
- `featured` (boolean) - Editor's choice flag
- `is_ai_generated` (boolean) - AI content flag
- `youtube_video_id` (uuid, FK) - Associated video review

## Price Tracking System

### price_history
Complete history of price changes for all machines.

**Key Columns:**
- `id` (uuid, PK)
- `machine_id` (uuid, FK → machines.id)
- `price` (numeric) - Recorded price
- `date` (timestamp) - When price was recorded
- `variant_attribute` (text) - Product variant (DEFAULT for base model)
- `status` (text) - SUCCESS/FAILED/PENDING
- `extraction_method` (text) - How price was obtained
- `confidence` (real) - Extraction confidence score (0-1)
- `tier` (text) - Pricing tier or model variant

**Detailed Tracking:**
- `scraped_from_url` (text) - Source URL
- `http_status` (integer) - Response status
- `html_size` (integer) - Page size
- `extraction_duration_seconds` (numeric) - Processing time
- `dom_elements_analyzed` (integer) - Elements checked
- `extraction_attempts` (jsonb) - Detailed attempt log
- `validation_steps` (jsonb) - Validation process log

### machines_latest
Current/latest price for each machine variant.

**Columns:**
- `machine_id` (uuid, PK, FK → machines.id)
- `variant_attribute` (text, PK) - Product variant
- `machines_latest_price` (numeric) - Current price
- `last_checked` (timestamp) - Last check time
- `confidence` (real) - Price confidence score
- `manual_review_flag` (boolean) - Needs human review
- `latest_price_history_id` (uuid, FK) - Reference to price_history

### batch_results & batches
Batch processing system for bulk price updates.

**batches:**
- `id` (uuid, PK)
- `start_time` / `end_time` (timestamp) - Batch duration
- `total_machines` (integer) - Machines processed
- `status` (text) - in_progress/completed/failed
- `batch_type` (text) - Type of batch operation

**batch_results:**
- `batch_id` (uuid, FK → batches.id)
- `machine_id` (uuid, FK → machines.id)
- `success` (boolean) - Operation success
- `old_price` / `new_price` (numeric) - Price changes
- `error` (text) - Error details if failed

## Image Management

### images
Machine images and media assets.

**Columns:**
- `id` (uuid, PK)
- `machine_id` (uuid, FK → machines.id)
- `url` (text) - Image URL
- `alt_text` (text) - Accessibility text
- `sort_order` (integer) - Display order
- `is_primary` (boolean) - Main product image
- `display_location` (text[]) - Where to show: ['hero', 'gallery', 'specs']
- `source_type` (text) - Origin: 'upload', 'webflow', 'scraped'

### v_images
View/computed table for image sorting and display logic.

## Content Management

### promo_codes
Promotional discounts and affiliate codes.

**Columns:**
- `id` (uuid, PK)
- `code` (text) - Promo code text
- `description` (text) - What the code offers
- `discount_percent` / `discount_amount` (numeric) - Discount value
- `valid_from` / `valid_until` (timestamp) - Validity period
- `max_uses` / `current_uses` (integer) - Usage limits
- `applies_to_machine_id` (uuid, FK) - Specific machine
- `applies_to_brand_id` (uuid, FK) - Brand-wide code
- `is_global` (boolean) - Site-wide code
- `affiliate_link` (text) - Tracking URL

### site_settings
Global site configuration.

**Columns:**
- `id` (integer, PK)
- `key` (text) - Setting name
- `value` (text) - Setting value
- `created_at` / `updated_at` (timestamp)

## Comparison System

### comparisons
Saved comparison sets.

**Columns:**
- `id` (uuid, PK)
- `title` (text) - Comparison name
- `slug` (text) - URL identifier
- `description` (text) - Comparison description
- `featured` (boolean) - Editorial feature flag

### comparison_machines
Many-to-many relationship between comparisons and machines.

**Columns:**
- `comparison_id` (uuid, FK → comparisons.id)
- `machine_id` (uuid, FK → machines.id)
- `sort_order` (integer) - Display order

## Video Content

### youtube_videos
YouTube video metadata.

**Columns:**
- `id` (uuid, PK)
- `youtube_id` (text) - YouTube video ID
- `title` (text) - Video title
- `description` (text) - Video description
- `thumbnail_url` (text) - Thumbnail image
- `published_at` (timestamp) - Upload date
- `duration` (text) - Video length
- `status` (text) - Processing status
- `chapters` (jsonb) - Video chapters/timestamps

### transcripts
Video transcription content.

**Columns:**
- `youtube_video_id` (uuid, FK → youtube_videos.id)
- `content` (text) - Full transcript text

### review_drafts
AI-generated review drafts from video content.

**Columns:**
- `youtube_video_id` (uuid, FK → youtube_videos.id)
- `machine_id` (uuid, FK → machines.id)
- `title` (text) - Draft title
- `structure` (jsonb) - Review outline
- `content` (text) - Generated content
- `rating` (smallint) - Suggested rating
- `generation_status` (text) - Processing status

## Ink Calculator System

### ink_test_data
Real-world ink usage test data for UV printers.

**Columns:**
- `id` (uuid, PK)
- `ink_mode` (text) - Print mode (e.g., "6C", "4C+W")
- `quality` (text) - Print quality setting
- `image_type` (text) - Type of test image
- `dimensions` (jsonb) - Print dimensions
- `channel_ml` (jsonb) - Actual ink usage per channel
- `image_url` (text) - Test image reference
- `image_analysis` (jsonb) - Color analysis data

### ink_calculator_calibration
Calibration factors for ink usage calculations.

**Columns:**
- `id` (uuid, PK)
- `factors` (jsonb) - Calibration coefficients
- `calibration_type` (varchar) - Type: 'combined', 'cmyk', 'special'
- `created_at` (timestamp) - When calibrated

## Analytics & Tracking

### llm_usage_tracking
LLM API usage monitoring for price extraction.

**Columns:**
- `machine_id` (text) - Target machine
- `model` (text) - AI model used
- `tier` (text) - Processing tier
- `prompt_tokens` / `completion_tokens` (integer) - Token usage
- `estimated_cost` (numeric) - API cost
- `success` (boolean) - Operation outcome

### claude_conversations
Claude AI conversation history.

**Columns:**
- `id` (uuid, PK)
- `messages` (jsonb) - Conversation messages
- `model` (text) - Claude model version
- `metadata` (jsonb) - Additional context

## Advanced Configuration

### variant_extraction_config
Price extraction configuration per machine/domain.

**Columns:**
- `machine_id` (text, PK)
- `variant_attribute` (text, PK) - Product variant
- `domain` (text) - Target website domain
- `requires_js_interaction` (boolean) - Needs JavaScript
- `css_price_selector` (text) - CSS selector for price
- `js_click_sequence` (jsonb) - UI interaction steps
- `min_extraction_confidence` (real) - Quality threshold
- `api_endpoint_template` (text) - API-based extraction

### machine_html_scrapes
Cached HTML content for analysis.

**Columns:**
- `machine_id` (uuid, FK → machines.id)
- `html_content` (text) - Full page HTML
- `scrape_date` (timestamp) - Cache time
- `scraped_url` / `final_url` (text) - Source URLs
- `scrape_success` (boolean) - Fetch success

## Relationship Mapping

### Core Relationships
```
machines (1) → (many) reviews
machines (1) → (many) images  
machines (1) → (many) price_history
machines (1) → (1) machines_latest
brands (1) → (many) machines [via Company field]
categories (1) → (many) machines [via Machine Category field]
```

### Comparison System
```
comparisons (1) → (many) comparison_machines ← (many) machines
```

### Video Content
```
youtube_videos (1) → (1) transcripts
youtube_videos (1) → (many) review_drafts
review_drafts (many) → (1) machines
reviews (many) → (1) youtube_videos [optional]
```

### Price Tracking
```
machines (1) → (many) price_history
machines (1) → (1) machines_latest
batches (1) → (many) batch_results
price_history (many) → (1) batches [optional]
```

## Data Conventions

### Boolean Values
Most boolean-like data is stored as text:
- `"Yes"` / `"No"` for features (Wifi, Camera, Enclosure, etc.)
- `"true"` / `"false"` for flags (Hidden, Featured, etc.)

### Pricing
- All prices stored in USD as `numeric` type
- Price history maintains detailed extraction metadata
- Confidence scores range from 0.0 to 1.0

### UUIDs
- All primary keys are UUID v4
- Foreign key relationships use UUIDs
- Enables distributed system compatibility

### Legacy Fields
Several tables contain Webflow legacy fields:
- `Collection ID`, `Locale ID`, `Item ID`
- `Created On`, `Updated On`, `Published On` (text format)
- These are maintained for data integrity but not actively used

### Text Formatting
- Rich text stored as plain text with manual formatting
- No markdown processing in database layer
- HTML rendering handled in application layer

## Performance Considerations

### Indexes
- All tables have primary key indexes
- Foreign key relationships are indexed
- Large text fields (html_content, Description) may need full-text search indexes

### Views
- `v_images` provides optimized image querying
- Additional views may be beneficial for complex queries

### Partitioning Opportunities
- `price_history` could benefit from date-based partitioning
- `llm_usage_tracking` suitable for time-based partitioning

## Security & Access

### Row Level Security (RLS)
Tables use Supabase RLS policies for access control:
- Public read access for published content
- Admin-only write access for management operations
- User-specific access for saved comparisons

### Sensitive Data
- No direct storage of payment information
- Affiliate links and promo codes handled securely
- API keys and secrets stored in environment variables

## Migration Strategy

### Schema Changes
- Use Supabase migrations for schema modifications
- Maintain backward compatibility where possible
- Document breaking changes in migration files

### Data Migrations
- Bulk operations should use batch processing system
- Test migrations on development branches
- Maintain data backups before major changes

This schema supports a comprehensive machine comparison platform with robust price tracking, content management, and analytics capabilities while maintaining flexibility for future enhancements.