"""
Site-specific price extraction rules to fix common extraction failures.
This module provides enhanced extraction logic for specific domains.
"""

import json
import re
from urllib.parse import urlparse
from loguru import logger


class SiteSpecificExtractor:
    """Enhanced price extractor with site-specific rules."""
    
    def __init__(self):
        self.site_rules = {
            'commarker.com': {
                'type': 'woocommerce',
                'machine_specific_rules': {
                    # Machine-specific rules for problematic ComMarker machines
                    'ComMarker B6 MOPA 60W': {
                        'url_patterns': ['/commarker-b6-jpt-mopa', '/b6-mopa'],
                        'price_selectors': [
                            # PRIORITIZE sale prices - ComMarker runs frequent sales
                            '.entry-summary .price ins .amount',  # Sale price in <ins> tag (highest priority)
                            '.product-summary .price ins .amount',  # Sale price in product summary
                            '.single-product-content .price ins .amount',
                            'form.cart .price ins .amount',
                            
                            # Target main product price area (regular prices)
                            '.entry-summary .price .amount:last-child',
                            '.product-summary .price .amount:last-child',
                            '.woocommerce-product-details-short .price .woocommerce-Price-amount.amount',
                            '.product-price .price .amount',
                            '.single-product .price .amount'
                        ],
                        'avoid_selectors': [
                            '.bundle-price',  # Avoid bundle pricing
                            '.package-price',
                            '.related .price',
                            '.upsell .price',
                            '.cross-sell .price',
                            '.package-selection .price',  # Avoid package selection prices
                            '.bundle-selection .price',
                            '.selected-package .price'
                        ],
                        'requires_dynamic': True  # May need variant selection for exact match
                    },
                    'ComMarker B4 100W MOPA': {
                        'url_patterns': ['/b4-100w-jpt-mopa', '/b4-100w'],
                        'price_selectors': [
                            '.entry-summary .price ins .amount',  # Prioritize sale price
                            '[data-price]',  # Data attribute method that worked
                            '.product-summary .price ins .amount'
                        ],
                        'avoid_data_price_contamination': True
                    },
                    'ComMarker B6 30W': {
                        'url_patterns': ['/commarker-b6', '/b6-30w'],
                        'requires_dynamic': True,  # MUST select 30W variant first
                        'variant_selection': {
                            'wattage_selector': 'input[value="30W"]',  # Select 30W radio button
                            'wait_for_update': '.wd-swatch-tooltip .price',  # Wait for bundle prices to update
                        },
                        'price_selectors': [
                            # PRIORITY: Look for sale price first (ins tag)
                            '.price ins .woocommerce-Price-amount bdi',
                            'ins .woocommerce-Price-amount bdi',
                            '.price ins .amount bdi',
                            # Then try bundle-specific selectors
                            '.wd-swatch-tooltip:has(.wd-swatch-text:contains("B6 Basic Bundle")) .price ins bdi',
                            '.wd-swatch-tooltip:has(.wd-swatch-text:contains("B6 Basic Bundle")) .price bdi',
                            # Fallback to variation price
                            '.single_variation_wrap .price ins .amount',
                            '.variations_form .price ins .amount'
                        ],
                        'prefer_contexts': [
                            'wd-swatch-tooltip', 'wd-swatch-info'
                        ],
                        'avoid_selectors': [
                            '.entry-summary > .price',  # AVOID header price (static 20W price)
                            '.summary > .price',  # AVOID summary header price
                            '.saveprice',  # Avoid discount/savings amounts
                            '.product-navigation',  # Avoid header/navigation prices
                            'header .price'  # Avoid any header prices
                        ],
                        'price_validation': {
                            'min': 2300,  # ComMarker B6 30W should be at least $2300
                            'max': 2500   # And no more than $2500
                        },
                        'notes': 'MUST select 30W variant then extract B6 Basic Bundle price ($2,399). Header shows static 20W price.'
                    }
                },
                'avoid_contexts': [
                    'related-products', 'cross-sells', 'up-sells', 
                    'product-recommendations', 'comparison', 'bundle', 'package',
                    'accessories', 'addons', 'extras', 'upsell-products',
                    'related_products', 'cross-sell-products'
                ],
                'avoid_selectors': [
                    '.bundle-price', '.bundle-price *', '.package-price', '.package-price *',
                    '.addon-price', '.extra-price', '.accessories-price',
                    '.cross-sell', '.up-sell', '.related', '.recommendation',
                    '.upsell-products', '.related_products', '.cross-sell-products',
                    'section.related', 'section.upsell', '.woocommerce-Tabs-panel'
                ],
                'prefer_contexts': [
                    'product-summary', 'single-product', 'product-main',
                    'woocommerce-product-details', 'entry-summary', 'product-price-wrapper'
                ],
                'price_selectors': [
                    # PRIORITIZE sale prices - ComMarker runs frequent sales
                    '.entry-summary .price ins .amount',  # Sale price in <ins> tag (highest priority)
                    '.product-summary .price ins .amount',  # Sale price in product summary
                    '.single-product-content .price ins .amount',
                    'form.cart .price ins .amount',
                    
                    # Regular prices as fallback
                    '.product-summary .price .amount:last-child',
                    '.entry-summary .price .amount:last-child',
                    
                    # Fallback to basic price structure (avoid bundle contexts)
                    '.product-price .amount:last-child',
                    '.woocommerce-Price-amount:last-child',
                    '.price-current .amount',
                ],
                'blacklist_selectors': [
                    # Comprehensive bundle pricing blacklist
                    '.bundle-price', '.bundle-price .main-amount', '.bundle-price *',
                    '.package-price', '.package-price *', '.combo-price', '.combo-price *',
                    '.package-selection .price', '.package-selection .amount',
                    '.selected-package .price', '.selected-package .amount',
                    '.basic-bundle .price', '.standard-bundle .price', '.premium-bundle .price',
                    '.bundle-option .price', '.package-option .price',
                    '.upsell-products .price', '.related_products .price',
                    # Blacklist learned selectors that commonly extract wrong prices
                    '.price[data-bundle]', '.amount[data-package]'
                ],
                'strict_validation': True,  # Enable strict price validation
                'requires_dynamic': True,  # Re-enable dynamic extraction for variant selection
                'prioritize_sale_prices': True,  # New flag to prioritize <ins> tags
            },
            
            'cloudraylaser.com': {
                'type': 'shopify',
                'avoid_selectors': [
                    '[name*="items"] [data-price]',  # Addon form elements
                    '.product-form [data-price]',    # Form controls
                    'select [data-price]',           # Dropdown options
                    '.hdt-select [data-price]'       # Custom select widgets
                ],
                'prefer_json_ld': True,
                'json_ld_paths': [
                    'hasVariant.0.offers.price',
                    'offers.price',
                    'price'
                ],
                'price_selectors': [
                    '.product-price .price',
                    '.price-current', 
                    '.product__price'
                ]
            },
            
            'acmerlaser.com': {
                'type': 'custom',
                'price_selectors': [
                    '.product-price-wrapper .price',
                    '.current-price',
                    '.sale-price'
                ],
                'avoid_contexts': ['recommended', 'related']
            },
            
            'aeonlaser.us': {
                'type': 'configurator',
                'requires_interaction': True,
                'requires_dynamic': False,  # Now redirects to emplaser.com with static table
                'redirect_to': 'emplaser.com',  # Site redirects to emplaser.com
                'price_selectors': [
                    '.total b',  # Final configurator total
                    '.tot-price .total',  # Alternative total selector
                    '.price strong',  # Starting price display
                    '.selected .price'  # Selected option price
                ],
                'configurator_selectors': {
                    'model_step': 'li.js-option.js-radio',
                    'model_options': '.option-label',
                    'total_display': '.total, .tot-price'
                },
                'variant_detection_rules': {
                    'EMP ST30R': {
                        'keywords': ['ST30R', 'ST 30R', '30R'],
                        'price_tolerance': 0.1,  # 10% tolerance
                        'variant_selector': 'li.js-option.js-radio:contains("ST30R"), li.js-option.js-radio:contains("ST 30R")',
                    },
                    'EMP ST50R': {
                        'keywords': ['ST50R', 'ST 50R'],  # Removed risky '50R' keyword
                        'price_tolerance': 0.1,
                        'variant_selector': 'li.js-option.js-radio:contains("ST50R"), li.js-option.js-radio:contains("ST 50R")',
                    },
                    'EMP ST60J': {
                        'keywords': ['ST60J', 'ST 60J', '60J'],
                        'price_tolerance': 0.1,
                        'variant_selector': 'li.js-option.js-radio:contains("ST60J"), li.js-option.js-radio:contains("ST 60J")',
                    },
                    'EMP ST100J': {
                        'keywords': ['ST100J', 'ST 100J', '100J'],
                        'price_tolerance': 0.1,
                        'variant_selector': 'li.js-option.js-radio:contains("ST100J"), li.js-option.js-radio:contains("ST 100J")',
                    }
                },
                'variant_matching_strategy': 'keyword_based',  # Match machine name to variant keywords
                'fallback_patterns': [
                    r'ST30R[\s\S]*?\$?([\d,]+)',  # Find ST30R followed by price
                    r'ST50R[\s\S]*?\$?([\d,]+)',  # Find ST50R followed by price
                    r'ST60J[\s\S]*?\$?([\d,]+)',  # Find ST60J followed by price
                    r'ST100J[\s\S]*?\$?([\d,]+)'  # Find ST100J followed by price
                ]
            },
            
            'emplaser.com': {
                'type': 'static_table',
                'requires_dynamic': False,  # Price table is in static HTML
                'machine_specific_rules': {
                    # EMP machines with static price table
                    'EMP ST30R': {
                        'keywords': ['ST30R', 'ST 30R', '30R'],
                        'table_column': 0,  # First price column
                    },
                    'EMP ST50R': {
                        'keywords': ['ST50R', 'ST 50R'],  # Removed risky '50R' keyword
                        'table_column': 2,                 # Corrected column (was 3, now 2)
                    },
                    'EMP ST60J': {
                        'keywords': ['ST60J', 'ST 60J', '60J'],
                        'table_column': 4,  # Fixed: Column 4 = $8995, Column 5 was $11995
                    },
                    'EMP ST100J': {
                        'keywords': ['ST100J', 'ST 100J', '100J'],
                        'table_column': 6,  # Seventh price column (corrected)
                    },
                    'EMP ST30J': {
                        'keywords': ['ST30J', 'ST 30J'],
                        'table_column': 3,  # Fourth price column
                    },
                    'EMP ST50J': {
                        'keywords': ['ST50J', 'ST 50J'],
                        'table_column': 4,  # Fifth price column
                    }
                },
                'price_selectors': [
                    # Table-based price extraction
                    'table tr:contains("Pricing") td',  # Price row in table
                    'tr:has(th:contains("Pricing")) td',  # Alternative table selector
                    'td:contains("$")'  # Table cells with prices
                ],
                'extraction_strategy': 'table_column',  # Use table column matching
                'fallback_patterns': [
                    r'ST30R[\s\S]*?\$?([\d,]+)',  # Find ST30R followed by price
                    r'ST50R[\s\S]*?\$?([\d,]+)',  # Find ST50R followed by price
                    r'ST60J[\s\S]*?\$?([\d,]+)',  # Find ST60J followed by price
                    r'ST100J[\s\S]*?\$?([\d,]+)'  # Find ST100J followed by price
                ]
            },
            
            'shop.glowforge.com': {
                'type': 'shopify',
                'use_base_price': True,
                'multi_price_strategy': 'highest_visible',
                'price_selectors': [
                    '.price--main:not(.price--compare)',  # Main price, not comparison price
                    '.product__price .price--main',        # Product page main price
                    '[data-price]:not(.price--compare)',   # Data attribute price
                    '.price:not(.price--compare) .money'   # Money element without compare
                ],
                'avoid_selectors': [
                    '.price--compare',     # Old/comparison price
                    '.was-price',         # Previous price
                    'strike',             # Struck-through price
                    '.price--save',       # Savings amount
                    '.bundle-price'       # Bundle pricing
                ],
                'validation': {
                    'price_ranges': {
                        'plus': {'min': 4000, 'max': 5000},
                        'plus-hd': {'min': 4500, 'max': 5500},
                        'pro': {'min': 5500, 'max': 6500},
                        'pro-hd': {'min': 6500, 'max': 7500}
                    }
                },
                'strict_validation': True,
                'fallback_patterns': [
                    r'starting at \$?([\d,]+)',  # "starting at $6995"
                    r'total[\s\n]*\$?([\d,]+)'   # "Total $6995"
                ]
            },
            
            'omtechlaser.com': {
                'type': 'woocommerce',
                'price_selectors': [
                    '.single_variation_wrap .woocommerce-variation-price .amount',
                    '.variations_form .single_variation .price .amount',
                    '.product-summary .price .amount',
                    '.summary .price .amount'
                ],
                'machine_specific_rules': {
                    'OMTech Pro 2440': {
                        'url_patterns': ['/omtech-pro-2440-80w-and-100w', '/pro-2440-80w-and-100w'],
                        'variant_detection_rules': {
                            '80W': {
                                'keywords': ['80W', '80 W', '80-watt', 'USB-2440-US'],
                                'expected_price_range': [6000, 7000]  # 80W is $6699.99
                            },
                            '100W': {
                                'keywords': ['100W', '100 W', '100-watt', 'USB-2440-U1'],
                                'expected_price_range': [7000, 8000]  # 100W is $7599.99
                            }
                        },
                        'variant_matching_strategy': 'wattage_based',
                        'requires_dynamic': True,  # May need dynamic selection for variants
                        'notes': 'Pro 2440 comes in 80W and 100W variants on same page'
                    }
                },
                'avoid_selectors': [
                    '.bundle-price',
                    '.package-price',
                    '.addon-price'
                ]
            },
            
            'xtool.com': {
                'type': 'shopify',
                'avoid_meta_tags': True,  # Meta tags often inaccurate for xTool
                'requires_dynamic': True,  # Better extraction with dynamic scraper
                'machine_specific_rules': {
                    # Machine-specific URL patterns and extraction rules
                    'xTool S1': {
                        'url_patterns': ['/s1', '/xtool-s1'],
                        'avoid_meta_tags': True,  # Meta tags show wrong 10W price
                        'requires_dynamic': True,  # Need dynamic scraper to get correct variant
                        'price_selectors': [
                            # More specific selectors to get current price, not compare price
                            '.price__current .money:first-child',  # Current price (first in list)
                            '.price__sale .money',  # Sale price specifically
                            '.price .money:not(.price--compare):first-child',  # First price that's not compare
                            '.product-price .price--sale .money',  # Sale price container
                            '.price-item--sale .money'  # Sale price item
                        ],
                        'avoid_selectors': [
                            '.price--compare',  # Compare/struck-out price ($2,199)
                            '.price__was',  # "Was" price
                            '.price--was',  # Alternative "was" price
                            '[data-variant-price]',  # Wrong variant
                            'meta[property="og:price:amount"]'  # Avoid meta tags for S1
                        ],
                        # No price range - use old price for validation instead
                    },
                    'xTool F1': {
                        'url_patterns': ['/f1', '/xtool-f1'],
                        'price_selectors': [
                            '.product-badge-price',
                            '.product-info .price-current'
                        ],
                    },
                    'xTool F1 Lite': {
                        'url_patterns': ['/f1', '/xtool-f1'],  # Same URL as F1, requires variant selection
                        'requires_dynamic': True,  # MUST use dynamic scraper for variant selection
                        'force_dynamic': True,  # Force dynamic extraction even if static finds a price
                        # REMOVED shopify_variant_selection - using custom xTool variant selection instead
                        'target_variant_id': '46187559157999',  # F1 Lite Standalone variant ID
                        'variant_selection': {
                            'method': 'shopify_options',  # Use Shopify option system
                            'option1': 'F1 Lite',  # First option: Version
                            'option2': 'F1 Lite Standalone',  # Second option: Package
                            'selectors': [
                                # Shopify variant selectors
                                'select[name="id"] option[value="46187559157999"]',
                                'input[name="id"][value="46187559157999"]',
                                'button[data-variant-id="46187559157999"]',
                                # Option-based selectors
                                '.product-options__section--version .option[data-value="F1 Lite"]',
                                '.product-options__section--package .option[data-value="F1 Lite Standalone"]'
                            ]
                        },
                        'price_selectors': [
                            # From the screenshot, the price appears in a standard Shopify price format
                            # The sale price $799 is the current price we want
                            '.price__current .money',  # Current price in Shopify format
                            '.price__sale .money',  # Sale price
                            '.price-item--sale .money',  # Sale price item
                            '.product__price .price__current',  # Product price current
                            '[data-product-price]',  # Product price data attribute
                            '.product-price-current',  # Current product price
                            # Fallback selectors
                            '.price:not(.price--compare) .money',  # Price that's not comparison
                            'span.money:first-of-type'  # First money span
                        ],
                        'avoid_selectors': [
                            '.price--compare',  # Avoid comparison price
                            '.bundle-price',  # Avoid bundle pricing
                            '.shipping-price'  # Avoid shipping costs
                        ],
                        'preferred_price': 799,  # Exact expected price
                        'validation_context': 'Use closest to $799 when multiple prices found'
                    },
                    'xTool F2 Ultra': {
                        'url_patterns': ['/f2-ultra', '/xtool-f2-ultra'],
                        'price_selectors': [
                            '.product-badge-price',
                            '.product-info .price-current',
                            '.price__current .money'
                        ],
                        'avoid_meta_tags': True,  # Meta tags inaccurate
                    }
                },
                'price_selectors': [
                    # Primary selectors for current pricing
                    '.product-badge-price',  # xTool's primary price display
                    '.product-info .price .money',  # Main product price display
                    '.price-container .price-current',  # Current price container
                    '.product-price .current-price',  # Product page current price
                    '[data-product-price] .money',  # Data attribute price
                    '.price__regular .money',  # Regular price element
                    
                    # Sale price selectors (prioritize over regular)
                    '.price__sale .money',  # Sale price
                    '.sale-price .money',  # Alternative sale price
                    '.price--on-sale .money',  # On sale price
                    
                    # Fallback selectors
                    '.product-block-price .money',  # Product block price
                    '.price-item--regular',  # Shopify regular price
                    '.price .amount',  # Generic price amount
                    '.current-price'  # Current price fallback
                ],
                'avoid_selectors': [
                    '.price--compare',  # Comparison price (crossed out)
                    '.was-price',  # Old price
                    '.compare-at-price',  # Compare at price
                    '.price__compare',  # Compare price element
                    '.bundle-price',  # Bundle pricing
                    '.shipping-price',  # Shipping costs
                    '.tax-price'  # Tax amounts
                ],
                'validation': {
                    # Price ranges based on known xTool machines
                    'price_ranges': {
                        'f1': {'min': 800, 'max': 1500},  # F1 series
                        'f2': {'min': 3000, 'max': 6000},  # F2 series  
                        's1': {'min': 1500, 'max': 2500},  # S1 series
                        'p2': {'min': 3000, 'max': 4500},  # P2 series
                        'm1': {'min': 800, 'max': 1200},   # M1 series
                        'd1': {'min': 200, 'max': 600}     # D1 series
                    }
                },
                'closest_to_old_price': True,  # Use closest to historical price logic
                'meta_tag_fallback': False,  # Don't fall back to meta tags
                'extraction_strategy': 'dynamic_preferred'  # Prefer dynamic over static
            },
            
            'atomstack.com': {
                'type': 'shopify',
                'price_selectors': [
                    # Atomstack Shopify selectors
                    '.product__price .price__current',
                    '.price__container .price-item--regular',
                    '.product-price-current',
                    '[data-price-wrapper] .price-item--regular',
                    '.ProductItem__Price .Price--highlight',
                    '.price.price--large .price-item--regular',
                    # Standard Shopify selectors
                    '.price--current',
                    '.price-item--regular',
                    'span.money',
                    '[data-price]'
                ],
                'avoid_selectors': [
                    '.price--compare',
                    '.price-item--sale',
                    '.CompareAtPrice',
                    '.bundle-price'
                ],
                'strict_validation': True
            },
            
            'atomstack.net': {
                'type': 'shopify',
                'price_selectors': [
                    # Same selectors for both domains
                    '.product__price .price__current',
                    '.price__container .price-item--regular',
                    '.product-price-current',
                    '[data-price-wrapper] .price-item--regular',
                    '.ProductItem__Price .Price--highlight',
                    '.price.price--large .price-item--regular',
                    # Standard Shopify selectors
                    '.price--current',
                    '.price-item--regular',
                    'span.money',
                    '[data-price]'
                ],
                'avoid_selectors': [
                    '.price--compare',
                    '.price-item--sale',
                    '.CompareAtPrice',
                    '.bundle-price'
                ],
                'strict_validation': True
            },
            
            'wecreat.com': {
                'type': 'shopify',
                'price_selectors': [
                    # WeCreat Shopify selectors
                    '.product__price .price__current',
                    '.price__container .price-item--regular',
                    '.product-single__price',
                    '.product__price-amount',
                    '[data-price-wrapper] .price-item--regular',
                    # Standard Shopify selectors
                    '.price--current',
                    '.price-item--regular',
                    'span.money',
                    '[data-price]'
                ],
                'avoid_selectors': [
                    '.price--compare',
                    '.bundle-price'
                ],
                'strict_validation': True
            },
            
            'mr-carve.com': {
                'type': 'custom',
                'price_selectors': [
                    # Mr Carve specific selectors
                    '.product-price',
                    '.price-now',
                    '.current-price',
                    '.product-info-price',
                    # Generic price selectors
                    '.price',
                    'span.price',
                    '[data-price]'
                ],
                'strict_validation': True
            },
            
            'monportlaser.com': {
                'type': 'shopify_variants',
                'base_machine_preference': True,  # Prefer base machine over bundles
                'price_selectors': [
                    # Specific Monport selectors based on their structure
                    '.product__info .price__regular .price-item--regular',
                    '.product__info .price .price-item--regular',
                    '.price__container .price-item--regular',
                    '.price__container .price__regular',
                    '[data-price-wrapper] .price-item--regular',
                    # Shopify standard selectors
                    '.product-price .price',
                    '.price--current',
                    '.money',
                    '[data-price]',
                    # Fallback selectors
                    'span.price-item--regular',
                    '.price-item.price-item--regular'
                ],
                'avoid_selectors': [
                    '.bundle-price',  # Avoid bundle pricing
                    '.addon-price',   # Avoid addon prices
                    '.variant-price[data-variant*="bundle"]',  # Avoid bundle variants
                    '.variant-price[data-variant*="lightburn"]',  # Avoid LightBurn bundles
                    '.variant-price[data-variant*="rotary"]',  # Avoid rotary bundles
                    '.price-item--sale'  # Avoid sale prices (often wrong variant)
                ],
                'prefer_contexts': [
                    'product__info',
                    'product-form-wrapper',
                    'product-price-container', 
                    'price-container',
                    'product-details'
                ],
                'variant_selection_rules': {
                    'prefer_base_machine': True,
                    'avoid_bundles': ['lightburn', 'rotary', 'bundle', 'combo', 'free 40w'],
                    'base_keywords': ['base', 'machine', 'standalone', 'only'],
                    'selector_base_machine': 'input[value*="Machine"]:not([value*="+"]), input[value*="base"], select option[value*="Machine"]:not([value*="+"])'
                },
                'requires_dynamic': True,  # Monport needs dynamic extraction for variant selection
                'decimal_parsing': {
                    'fix_comma_decimal_confusion': True,
                    'expected_decimal_places': 2,
                    'common_price_patterns': [
                        r'\$(\d{1,2},?\d{3}\.\d{2})',  # $1,399.99 or $1399.99
                        r'(\d{1,2},?\d{3}\.\d{2})',   # 1,399.99 or 1399.99  
                        r'\$(\d{1,2},?\d{3})',        # $1,399 or $1399
                        r'(\d{1,2},?\d{3})'           # 1,399 or 1399
                    ]
                }
            },
            
            'glowforge.com': {
                'type': 'variant_configurator',
                'requires_variant_detection': True,
                'machine_variant_mapping': {
                    'Glowforge Pro HD': {
                        'keywords': ['pro', 'hd'], 
                        'selector_hints': ['.pro.hd', '[data-variant*="pro-hd"]']
                    },
                    'Glowforge Pro': {
                        'keywords': ['pro'], 
                        'exclude_keywords': ['hd'],
                        'selector_hints': ['.pro:not(.hd)', '[data-variant*="pro"]:not([data-variant*="hd"])']
                    },
                    'Glowforge Plus HD': {
                        'keywords': ['plus', 'hd'], 
                        'selector_hints': ['.plus.hd', '[data-variant*="plus-hd"]']
                    },
                    'Glowforge Plus': {
                        'keywords': ['plus'], 
                        'exclude_keywords': ['hd'],
                        'selector_hints': ['.plus:not(.hd)', '[data-variant*="plus"]:not([data-variant*="hd"])']
                    },
                    'Glowforge Aura': {
                        'url_contains': ['/craft', '/aura'], 
                        'separate_page': True
                    }
                },
                'avoid_selectors': [
                    '.bundle-price', '.promotion-price', '.package-price',
                    '.main-bundle-price', '.bundle .main-amount',
                    '.financing-price', '.monthly-price'
                ],
                'price_selectors': [
                    '.product-price:not(.bundle-price)',
                    '.variant-price:not([class*="bundle"])',
                    '.base-price',
                    '.current-price:not(.bundle)',
                    '[data-price]:not([data-bundle])'
                ],
                'prefer_contexts': [
                    'product-variants',
                    'variant-selector', 
                    'product-options',
                    'configurator-step',
                    'product-pricing'
                ],
                'variant_detection_patterns': [
                    r'(?i)glowforge\s+(pro|plus)\s*(hd)?',
                    r'(?i)(pro|plus)(?:\s+hd)?',
                    r'(?i)\$(\d{1,2},?\d{3})'
                ]
            },
            
        }
    
    def get_machine_specific_rules(self, domain, machine_name, url):
        """
        Get machine-specific extraction rules for problematic machines.
        Returns modified site rules if machine-specific rules exist.
        """
        if domain in self.site_rules:
            site_rule = self.site_rules[domain].copy()
            machine_rules = site_rule.get('machine_specific_rules', {})
            
            # Check if we have specific rules for this machine
            # Sort patterns by specificity (longer patterns first) to match "xTool F1 Lite" before "xTool F1"
            sorted_patterns = sorted(machine_rules.items(), key=lambda x: len(x[0]), reverse=True)
            
            for machine_pattern, specific_rules in sorted_patterns:
                if machine_pattern.lower() in machine_name.lower():
                    # Check URL patterns to confirm this is the right machine
                    url_patterns = specific_rules.get('url_patterns', [])
                    logger.info(f"Checking URL patterns for {machine_pattern}: {url_patterns}")
                    logger.info(f"Against URL: {url.lower()}")
                    if url_patterns and any(pattern in url.lower() for pattern in url_patterns):
                        logger.info(f"🎯 Using machine-specific rules for {machine_name} (pattern: {machine_pattern})")
                        
                        # Merge machine-specific rules with site rules
                        if 'price_selectors' in specific_rules:
                            site_rule['price_selectors'] = specific_rules['price_selectors']
                        if 'avoid_selectors' in specific_rules:
                            site_rule['avoid_selectors'] = site_rule.get('avoid_selectors', []) + specific_rules['avoid_selectors']
                        # Use historical price validation instead of hardcoded ranges
                        if 'avoid_meta_tags' in specific_rules:
                            site_rule['avoid_meta_tags'] = specific_rules['avoid_meta_tags']
                        if 'requires_dynamic' in specific_rules:
                            site_rule['requires_dynamic'] = specific_rules['requires_dynamic']
                        if 'variant_detection_rules' in specific_rules:
                            site_rule['variant_detection_rules'] = specific_rules['variant_detection_rules']
                            logger.info(f"✅ Copied variant_detection_rules from machine-specific rules: {list(specific_rules['variant_detection_rules'].keys())}")
                        
                        logger.info(f"🔍 Final site_rule keys: {list(site_rule.keys())}")
                        return site_rule
            
            return site_rule
        return None

    def extract_price_with_rules(self, soup, html_content, url, machine_data=None):
        """
        Extract price using learned selectors first, then site-specific rules.
        
        Args:
            soup: BeautifulSoup object
            html_content: Raw HTML content
            url: Page URL
            machine_data: Machine record containing learned_selectors
            
        Returns:
            tuple: (price, method) or (None, None)
        """
        domain = urlparse(url).netloc.lower()
        original_domain = domain
        
        # Remove 'www.' prefix for rule matching
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Check for domain replacements (e.g., Thunder Laser USA -> Thunder Laser CN)
        if domain in self.site_rules:
            rules = self.site_rules[domain]
            if 'url_replacement' in rules:
                url_replacements = rules['url_replacement']
                # Check if current domain needs replacement
                for old_domain, new_domain in url_replacements.items():
                    if old_domain in original_domain:
                        logger.info(f"🔄 Thunder Laser domain replacement: {old_domain} → {new_domain}")
                        # Note: URL replacement should have been done during fetching
                        # This is just for logging and rule selection
                        break
        
        # METHOD 0: Try learned selectors first (fastest and free!) - BUT AVOID BAD SELECTORS
        if machine_data:
            learned_selectors = machine_data.get('learned_selectors', {})
            if learned_selectors and domain in learned_selectors:
                selector_data = learned_selectors[domain]
                selector = selector_data.get('selector', '')
                
                # BLACKLIST: Skip known bad selectors that extract bundle/addon prices
                bad_selector_patterns = [
                    '.bundle-price', '.addon-price', '.variant-price[data-variant*="bundle"]',
                    '.variant-price[data-variant*="lightburn"]', '.variant-price[data-variant*="rotary"]',
                    '.bundle', '.combo-price', '.package-price'
                ]
                
                # SPECIAL BLACKLIST: Skip generic selectors for sites with variant detection
                if domain == 'aeonlaser.us':
                    bad_selector_patterns.extend(['.price', '.amount', '.total'])  # Too generic for Aeon variants
                elif domain == 'commarker.com':
                    bad_selector_patterns.extend(['.woocommerce-Price-amount'])  # Too generic, catches wrong prices
                
                is_bad_selector = any(bad_pattern in selector.lower() for bad_pattern in bad_selector_patterns)
                
                if selector and not is_bad_selector:
                    logger.info(f"Trying learned selector for {domain}: {selector}")
                    price = self._extract_with_learned_selector(soup, selector, domain)
                    if price is not None:
                        logger.info(f"Successfully used learned selector: {selector}")
                        return price, f"Learned selector ({selector})"
                    else:
                        logger.warning(f"Learned selector failed: {selector}")
                elif is_bad_selector:
                    logger.warning(f"🚫 BLOCKED bad learned selector: {selector} (contains bundle/addon pricing pattern)")
                    # Continue to site-specific rules instead
            
        # METHOD 1: Check if we have specific rules for this domain
        if domain in self.site_rules:
            # Check for machine-specific rules first
            machine_name = machine_data.get('Machine Name', '') if machine_data else ''
            rules = self.get_machine_specific_rules(domain, machine_name, url)
            
            if rules is None:
                rules = self.site_rules[domain]
                logger.info(f"Applying site-specific rules for {domain}")
            else:
                logger.info(f"Applying machine-specific rules for {machine_name} on {domain}")
            
            # Try site-specific extraction
            price, method = self._extract_with_site_rules(soup, html_content, url, rules, machine_data)
            if price is not None:
                return price, method
        
        # Fallback to generic extraction
        return None, None
    
    def _extract_with_learned_selector(self, soup, selector, domain=None):
        """
        Extract price using a learned CSS selector.
        
        Args:
            soup: BeautifulSoup object
            selector: CSS selector to try
            domain: Domain for parsing rules
            
        Returns:
            float or None: Extracted price or None if failed
        """
        try:
            elements = soup.select(selector)
            for element in elements:
                # Try to get price from various attributes first
                price_attrs = ['data-price', 'data-product-price', 'content']
                for attr in price_attrs:
                    if element.has_attr(attr):
                        price = self._parse_price_text(element[attr], domain)
                        if price is not None:
                            return price
                
                # Try text content
                price = self._parse_price_text(element.get_text(), domain)
                if price is not None:
                    return price
                    
            return None
            
        except Exception as e:
            logger.error(f"Error extracting with learned selector '{selector}': {str(e)}")
            return None
    
    def _parse_price_text(self, text, domain=None):
        """Enhanced price parser with domain-specific logic."""
        if not text:
            return None
            
        try:
            import re
            
            # Get domain-specific parsing rules
            parsing_rules = None
            if domain and domain in self.site_rules:
                parsing_rules = self.site_rules[domain].get('decimal_parsing', {})
            
            # Use domain-specific patterns first
            if parsing_rules and 'common_price_patterns' in parsing_rules:
                for pattern in parsing_rules['common_price_patterns']:
                    match = re.search(pattern, str(text))
                    if match:
                        price_str = match.group(1)
                        # Remove thousand separators, keep decimal
                        price_str = price_str.replace(',', '')
                        try:
                            price = float(price_str)
                            if 1 <= price <= 100000:
                                return price
                        except ValueError:
                            continue
            
            # Fallback to original logic
            # Remove currency symbols and extra whitespace
            text_clean = re.sub(r'[$€£¥]', '', str(text))
            text_clean = re.sub(r'\s+', '', text_clean)
            
            # Find numeric pattern - enhanced for Monport issues
            match = re.search(r'\d+(?:[,.]?\d+)*', text_clean)
            if match:
                price_str = match.group(0)
                
                # Enhanced decimal/comma handling for Monport
                if domain == 'monportlaser.com':
                    # Monport uses US format: 1,399.99
                    if ',' in price_str and '.' in price_str:
                        # Remove thousand separators, keep decimal
                        price_str = price_str.replace(',', '')
                    elif ',' in price_str and not '.' in price_str:
                        # Check if comma is thousands (e.g., "1,399") or decimal (e.g., "39,99")
                        comma_parts = price_str.split(',')
                        if len(comma_parts) == 2:
                            if len(comma_parts[0]) >= 2 and len(comma_parts[1]) == 3:
                                # Thousands separator: "1,399" -> "1399"
                                price_str = price_str.replace(',', '')
                            elif len(comma_parts[1]) <= 2:
                                # Decimal separator: "39,99" -> "39.99"
                                price_str = price_str.replace(',', '.')
                        else:
                            # Multiple commas - remove all (thousands)
                            price_str = price_str.replace(',', '')
                else:
                    # Original logic for other domains
                    if ',' in price_str and '.' in price_str:
                        last_comma = price_str.rfind(',')
                        last_dot = price_str.rfind('.')
                        
                        if last_comma > last_dot:
                            # Comma is decimal (European style): 1.234,56
                            price_str = price_str.replace('.', '').replace(',', '.')
                        else:
                            # Dot is decimal (US style): 1,234.56
                            price_str = price_str.replace(',', '')
                    elif ',' in price_str:
                        # Only comma - check if it's decimal or thousands
                        comma_parts = price_str.split(',')
                        if len(comma_parts) == 2 and len(comma_parts[1]) <= 2:
                            # Likely decimal separator (e.g., "123,45")
                            price_str = price_str.replace(',', '.')
                        else:
                            # Likely thousands separator (e.g., "1,234" or "1,234,567")
                            price_str = price_str.replace(',', '')
                
                price = float(price_str)
                # Basic validation
                if 1 <= price <= 100000:
                    return price
                    
        except (ValueError, AttributeError):
            pass
            
        return None
    
    def _extract_with_site_rules(self, soup, html_content, url, rules, machine_data=None):
        """Extract price using specific site rules."""
        domain = urlparse(url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Monport-specific variant selection logic
        if domain == 'monportlaser.com' and rules.get('base_machine_preference'):
            price, method = self._extract_monport_base_machine_price(soup, rules)
            if price and self._validate_price(price, rules, machine_data):
                return price, f"Monport base machine ({method})"
        
        # ComMarker-specific price extraction logic
        if domain == 'commarker.com':
            price, method = self._extract_commarker_main_price(soup, rules, machine_data)
            if price and self._validate_price(price, rules, machine_data):
                return price, f"ComMarker main price ({method})"
        
        # Aeon-specific variant detection logic for EMP lasers
        if domain == 'aeonlaser.us' and rules.get('variant_detection_rules'):
            price, method = self._extract_aeon_variant_price(soup, html_content, url, rules, machine_data)
            if price and self._validate_price(price, rules, machine_data):
                return price, f"Aeon variant ({method})"

        # Glowforge-specific variant detection logic
        if domain == 'glowforge.com' and rules.get('requires_variant_detection'):
            price, method = self._extract_glowforge_variant_price(soup, html_content, url, rules, machine_data)
            if price and self._validate_price(price, rules, machine_data):
                return price, f"Glowforge variant ({method})"
        
        # xTool-specific variant detection logic
        logger.debug(f"🔍 Checking xTool conditions: domain={domain}, requires_dynamic={rules.get('requires_dynamic')}")
        if domain == 'xtool.com' and rules.get('requires_dynamic'):
            logger.debug(f"🔍 xTool conditions met, checking machine_data: {machine_data}")
            # Handle F1 Lite when dynamic extraction fails
            if machine_data:
                machine_name = machine_data.get('name', '')
                logger.debug(f"🔍 Machine name: '{machine_name}', checking for 'F1 Lite'")
                if 'F1 Lite' in machine_name:
                    logger.info(f"🎯 Triggering xTool F1 Lite custom extraction for {machine_name}")
                    price, method = self._extract_xtool_f1_lite_price(soup, rules, machine_data)
                    if price and self._validate_price(price, rules, machine_data):
                        return price, f"xTool F1 Lite static ({method})"
                    else:
                        logger.warning(f"❌ xTool F1 Lite custom extraction failed or price validation failed")
                else:
                    logger.debug(f"❌ Machine name '{machine_name}' does not contain 'F1 Lite'")
            else:
                logger.warning(f"❌ No machine_data provided for xTool extraction")
        
        # Table-based extraction for emplaser.com
        if rules.get('extraction_strategy') == 'table_column':
            price, method = self._extract_table_column_price(soup, rules, machine_data)
            if price and self._validate_price(price, rules, machine_data):
                return price, f"Table column ({method})"
        
        # Method 1: JSON-LD (for Shopify sites)
        if rules.get('prefer_json_ld', False):
            price, method = self._extract_json_ld_with_paths(soup, rules.get('json_ld_paths', []))
            if price and self._validate_price(price, rules, machine_data):
                return price, f"Site-specific JSON-LD ({method})"
        
        # Method 2: Context-aware CSS selector extraction
        price, method = self._extract_with_context_filtering(soup, rules)
        if price and self._validate_price(price, rules, machine_data):
            return price, f"Site-specific CSS ({method})"
        
        # Method 3: Fallback with avoided selectors
        price, method = self._extract_avoiding_selectors(soup, rules)
        if price and self._validate_price(price, rules, machine_data):
            return price, f"Site-specific fallback ({method})"
            
        return None, None
    
    def _extract_commarker_main_price(self, soup, rules, machine_data=None):
        """Extract main product price for ComMarker, targeting main product summary."""
        logger.info("🔍 Attempting ComMarker-specific price extraction")
        
        # Log page structure for debugging
        title_elem = soup.find('title')
        if title_elem:
            logger.info(f"Page title: {title_elem.get_text()}")
        
        # Check if this is actually a ComMarker product page
        page_content = soup.get_text().lower()
        # More lenient check - sometimes the content is corrupted
        if len(page_content) < 100:
            logger.warning("❌ Page content too short, likely corrupted")
            # Don't return None here, continue trying
        
        # Strategy 1: Use machine-specific selectors if available, otherwise use defaults
        if rules and 'price_selectors' in rules:
            priority_selectors = rules['price_selectors']
            logger.info(f"🎯 Using machine-specific selectors: {priority_selectors}")
        else:
            # Fallback to default ComMarker selectors (prioritize sale prices)
            priority_selectors = [
                # Sale prices first (prioritize <ins> tags for sale prices)
                '.entry-summary .price ins .amount',
                '.product-summary .price ins .amount',
                '.summary-inner .price ins .amount',
                # Regular prices as fallback
                '.summary-inner .price .woocommerce-Price-amount.amount',
                '.entry-summary .price .woocommerce-Price-amount.amount',
                '.product-summary .woocommerce-Price-amount.amount',
                '.product .price .woocommerce-Price-amount.amount',
                # Broader fallbacks
                '.woocommerce-Price-amount.amount',
                '.price .amount',
                '.summary-inner .price .amount',
                '.entry-summary .price .amount'
            ]
            logger.info(f"🔧 Using default ComMarker selectors (prioritizing sale prices)")
        
        all_prices_found = []
        for selector in priority_selectors:
            elements = soup.select(selector)
            logger.info(f"🔍 ComMarker selector '{selector}': found {len(elements)} elements")
            
            for i, elem in enumerate(elements):
                price_text = elem.get_text().strip()
                logger.info(f"  Element {i+1} text: '{price_text}'")
                
                # Check element context to avoid bundle/addon prices
                context = self._get_element_context(elem)
                if any(avoid in context.lower() for avoid in ['bundle', 'package', 'addon', 'extra', 'accessory']):
                    logger.info(f"  ❌ Skipping price in bundle/addon context: {context}")
                    continue
                
                price = self._parse_price_text(price_text, 'commarker.com')
                if price and 500 <= price <= 15000:  # Reasonable ComMarker price range
                    parent_classes = ' '.join(elem.parent.get('class', []) if elem.parent else [])
                    all_prices_found.append((price, elem, selector, parent_classes))
                    logger.info(f"  ✅ Valid price: ${price} (context: {parent_classes})")
        
        # Log all found prices
        logger.info(f"🔍 All valid ComMarker prices: {[f'${p[0]}' for p in all_prices_found]}")
        
        # Enhanced price selection logic using historical price comparison
        if len(all_prices_found) >= 1:
            # First check if we have price_validation rules
            if rules and 'price_validation' in rules:
                price_validation = rules['price_validation']
                min_price = price_validation.get('min', 0)
                max_price = price_validation.get('max', float('inf'))
                logger.info(f"🎯 Using price validation rules: ${min_price} - ${max_price}")
                
                # Filter prices within validation range
                valid_prices = [(p, e, s, c) for p, e, s, c in all_prices_found if min_price <= p <= max_price]
                if valid_prices:
                    # Return the first valid price (they're already ordered by selector priority)
                    best_price, best_elem, best_selector, best_context = valid_prices[0]
                    logger.info(f"✅ Selected ComMarker price ${best_price} within validation range using selector: {best_selector}")
                    return best_price, f"validation_range:{best_selector}"
            
            # Fallback to historical price comparison
            elif machine_data and machine_data.get('old_price'):
                historical_price = float(machine_data['old_price'])
                logger.info(f"📊 Using historical price comparison: old_price=${historical_price}")
                
                # Sort by distance from historical price (closest first)
                all_prices_found.sort(key=lambda x: abs(x[0] - historical_price))
                
                # Log the selection logic
                for price, elem, selector, context in all_prices_found[:3]:  # Show top 3 choices
                    diff = abs(price - historical_price)
                    logger.info(f"  - ${price} (diff: ${diff:.2f}) from {selector}")
                
                # Select the closest price
                best_price, best_elem, best_selector, best_context = all_prices_found[0]
                logger.info(f"✅ Selected ComMarker price ${best_price} (closest to historical ${historical_price}) using selector: {best_selector}")
                return best_price, f"historical_match:{best_selector}"
            else:
                # No historical data - sort by price descending as before
                all_prices_found.sort(key=lambda x: x[0], reverse=True)
                logger.info("⚠️ No historical price data - using default selection logic")
            # Special handling for machine-specific selectors targeting sale prices (<ins> tags)
            using_machine_specific = rules and 'price_selectors' in rules
            if using_machine_specific:
                # For machine-specific selectors, look for bundle/variation context first
                # Check for prices in preferred contexts (bundle, variation, woocommerce-price-amount)
                preferred_contexts = rules.get('prefer_contexts', [])
                if preferred_contexts:
                    for price, elem, selector, context in all_prices_found:
                        if price >= 1000:  # Reasonable minimum for a laser machine price
                            # Check if this price is in a preferred context
                            context_lower = context.lower()
                            if any(pref_ctx in context_lower for pref_ctx in preferred_contexts):
                                logger.info(f"✅ Selected ComMarker price ${price} from preferred context '{context}' using selector: {selector}")
                                return price, f"machine_specific_context:{selector}"
                
                
                # Fallback: take the first valid price that's not a savings amount
                for price, elem, selector, context in all_prices_found:
                    if price >= 1000:  # Reasonable minimum for a laser machine price
                        logger.info(f"✅ Selected first valid ComMarker price ${price} using machine-specific selector: {selector}")
                        return price, f"machine_specific:{selector}"
                
                # If no price >= $1000, fall back to highest price
                if all_prices_found:
                    price, elem, selector, context = all_prices_found[0]
                    logger.info(f"✅ Selected highest ComMarker price ${price} (fallback)")
                    return price, f"machine_specific_fallback:{selector}"
            
            # Standard logic for non-machine-specific selectors
            elif len(all_prices_found) >= 2:
                high_price, _, _, high_context = all_prices_found[0]
                low_price, low_elem, low_selector, low_context = all_prices_found[1]
                
                # Calculate price difference
                price_difference_percent = ((high_price - low_price) / high_price) * 100
                
                # Prefer sale prices when there's a reasonable discount
                if price_difference_percent > 15 and low_price < high_price:
                    logger.info(f"✅ Selected ComMarker sale price ${low_price} (was ${high_price}, {price_difference_percent:.1f}% off)")
                    return low_price, f"sale_price:{low_selector}"
                else:
                    logger.info(f"✅ Selected ComMarker primary price ${high_price} (diff too small: {price_difference_percent:.1f}%)")
                    return high_price, f"primary_price:{all_prices_found[0][2]}"
        
        # Single price found
        elif len(all_prices_found) == 1:
            price, elem, selector, context = all_prices_found[0]
            logger.info(f"✅ Selected single ComMarker price: ${price}")
            return price, f"single_price:{selector}"
        
        # Strategy 2: Fallback to even more general search
        fallback_selectors = [
            '.product-summary .price',
            '.entry-summary .price', 
            '.woocommerce-product-details .price',
            '.single-product-summary .price',
            '.product-info .price',
            '.product-main .price'
        ]
        
        for selector in fallback_selectors:
            elements = soup.select(selector)
            logger.info(f"Fallback ComMarker selector '{selector}': found {len(elements)} elements")
            for element in elements:
                # Look for any price text within this element
                price_text = element.get_text()
                logger.info(f"  Fallback element text: '{price_text[:100]}...'")
                price = self._parse_price_text(price_text, 'commarker.com')
                if price is not None and price > 1000:
                    logger.info(f"Found ComMarker fallback price: ${price} using selector: {selector}")
                    return price, f"fallback:{selector}"
        
        logger.warning("ComMarker-specific extraction failed to find valid price")
        return None, None
    
    def _extract_monport_base_machine_price(self, soup, rules):
        """Extract base machine price for Monport, avoiding bundle variants."""
        variant_rules = rules.get('variant_selection_rules', {})
        avoid_bundles = variant_rules.get('avoid_bundles', [])
        
        # Strategy 1: Look for the first/default price (usually base machine)
        price_selectors = rules.get('price_selectors', ['.price--current', '.money'])
        
        for selector in price_selectors:
            elements = soup.select(selector)
            for element in elements:
                # Check if this price is in a bundle context (avoid it)
                element_text = element.get_text().lower()
                parent_text = ''
                
                # Check parent elements for bundle indicators
                parent = element.parent
                for _ in range(3):  # Check up to 3 levels up
                    if parent:
                        parent_text += parent.get_text().lower()
                        parent = parent.parent
                    
                # Skip if contains bundle keywords
                bundle_detected = any(bundle_word in element_text or bundle_word in parent_text 
                                    for bundle_word in avoid_bundles)
                
                if bundle_detected:
                    logger.debug(f"Skipping bundle price: {element_text[:50]}...")
                    continue
                    
                # Extract price
                price = self._parse_price_text(element.get_text(), 'monportlaser.com')
                if price is not None:
                    logger.info(f"Found base machine price: ${price}")
                    return price, f"base_machine:{selector}"
        
        # Strategy 2: Look for first variant option (usually base machine)
        variant_selectors = [
            'input[type="radio"]:first-child + label',
            'select option:first-child',
            '.variant-option:first-child'
        ]
        
        for selector in variant_selectors:
            elements = soup.select(selector)
            for element in elements:
                # Look for price in or near this element
                price_text = element.get_text()
                price = self._parse_price_text(price_text, 'monportlaser.com')
                if price is not None:
                    return price, f"first_variant:{selector}"
                    
                # Check sibling elements for price
                for sibling in element.next_siblings:
                    if hasattr(sibling, 'get_text'):
                        price = self._parse_price_text(sibling.get_text(), 'monportlaser.com')
                        if price is not None:
                            return price, f"variant_sibling:{selector}"
        
        # Strategy 3: JSON-LD data with variant preference
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and 'offers' in data:
                    offers = data['offers']
                    if isinstance(offers, list) and len(offers) > 0:
                        # Take first offer (usually base machine)
                        first_offer = offers[0]
                        if 'price' in first_offer:
                            price = float(first_offer['price'])
                            return price, "json_ld_first_offer"
                    elif isinstance(offers, dict) and 'price' in offers:
                        price = float(offers['price'])
                        return price, "json_ld_offers"
            except (json.JSONDecodeError, ValueError, KeyError):
                continue
        
        return None, None
    
    def _extract_glowforge_variant_price(self, soup, html_content, url, rules, machine_data=None):
        """Extract variant-specific price for Glowforge machines."""
        variant_mapping = rules.get('machine_variant_mapping', {})
        
        # Determine which machine variant we're looking for
        target_variant = None
        machine_name = ''
        
        if machine_data and 'Machine Name' in machine_data:
            machine_name = machine_data['Machine Name'].lower()
            
            # Match machine name to variant mapping
            for variant_name, variant_config in variant_mapping.items():
                variant_keywords = variant_config.get('keywords', [])
                exclude_keywords = variant_config.get('exclude_keywords', [])
                
                # Check if machine name contains required keywords
                has_required = all(keyword.lower() in machine_name for keyword in variant_keywords)
                has_excluded = any(keyword.lower() in machine_name for keyword in exclude_keywords)
                
                if has_required and not has_excluded:
                    target_variant = variant_name
                    break
        
        # Special handling for Aura (different URL)
        if target_variant == 'Glowforge Aura':
            aura_config = variant_mapping['Glowforge Aura']
            url_patterns = aura_config.get('url_contains', [])
            if any(pattern in url.lower() for pattern in url_patterns):
                # This is the Aura page, extract normally
                price_selectors = rules.get('price_selectors', [])
                for selector in price_selectors:
                    elements = soup.select(selector)
                    for element in elements:
                        price = self._parse_price_text(element.get_text(), 'glowforge.com')
                        if price and 1000 <= price <= 1500:  # Aura price range
                            return price, f"aura_page:{selector}"
            return None, None
        
        if not target_variant:
            logger.warning(f"Could not determine Glowforge variant for machine: {machine_name}")
            return None, None
        
        logger.info(f"Looking for Glowforge variant: {target_variant}")
        
        # Strategy 1: Look for variant-specific selectors
        variant_config = variant_mapping[target_variant]
        selector_hints = variant_config.get('selector_hints', [])
        # Use historical price for validation instead of hardcoded ranges
        
        for selector_hint in selector_hints:
            elements = soup.select(selector_hint)
            for element in elements:
                # Look for price in or around this element
                price_element = element.select_one('.price, .amount, [data-price]')
                if not price_element:
                    price_element = element
                
                price = self._parse_price_text(price_element.get_text(), 'glowforge.com')
                if price and expected_range[0] <= price <= expected_range[1]:
                    return price, f"variant_selector:{selector_hint}"
        
        # Strategy 2: Look for all prices on page and match by expected range
        price_selectors = rules.get('price_selectors', [])
        avoid_selectors = rules.get('avoid_selectors', [])
        
        for selector in price_selectors:
            elements = soup.select(selector)
            for element in elements:
                # Skip if element matches avoid selectors
                element_html = str(element)
                if any(avoid_pattern in element_html.lower() for avoid_pattern in [s.lower() for s in avoid_selectors]):
                    continue
                
                price = self._parse_price_text(element.get_text(), 'glowforge.com')
                if price and expected_range[0] <= price <= expected_range[1]:
                    logger.info(f"Found {target_variant} price {price} in expected range {expected_range}")
                    return price, f"range_match:{selector}"
        
        # Strategy 3: Pattern matching in HTML content
        variant_patterns = rules.get('variant_detection_patterns', [])
        keywords = variant_config.get('keywords', [])
        
        for pattern in variant_patterns:
            matches = re.finditer(pattern, html_content, re.IGNORECASE)
            for match in matches:
                match_text = match.group(0).lower()
                
                # Check if this match relates to our target variant
                keyword_match = any(keyword.lower() in match_text for keyword in keywords)
                if keyword_match:
                    # Look for price near this match
                    price_match = re.search(r'\$?(\d{1,2},?\d{3})', match.group(0))
                    if price_match:
                        price = self._parse_price_text(price_match.group(1), 'glowforge.com')
                        if price and expected_range[0] <= price <= expected_range[1]:
                            return price, f"pattern_match:{pattern}"
        
        # Strategy 4: Fallback - look for any price in expected range with context clues
        all_text = soup.get_text().lower()
        keyword_positions = []
        for keyword in keywords:
            pos = all_text.find(keyword.lower())
            if pos != -1:
                keyword_positions.append(pos)
        
        if keyword_positions:
            # Look for prices near keyword positions
            price_pattern = r'\$?(\d{1,2},?\d{3})'
            for match in re.finditer(price_pattern, all_text):
                price = self._parse_price_text(match.group(1), 'glowforge.com')
                if price and expected_range[0] <= price <= expected_range[1]:
                    # Check if price is reasonably close to a keyword
                    match_pos = match.start()
                    min_distance = min(abs(match_pos - kw_pos) for kw_pos in keyword_positions)
                    if min_distance < 500:  # Within 500 characters
                        return price, f"keyword_proximity:{min_distance}chars"
        
        # Strategy 5: Context-aware price extraction - match prices to their product cards
        logger.info(f"Trying Strategy 5: Context-aware price extraction for {target_variant}")
        
        # Create keywords to look for based on the target variant
        variant_keywords = []
        if 'pro hd' in target_variant.lower():
            variant_keywords = ['pro', 'hd']
        elif 'pro' in target_variant.lower():
            variant_keywords = ['pro']
        elif 'plus hd' in target_variant.lower():
            variant_keywords = ['plus', 'hd']  
        elif 'plus' in target_variant.lower():
            variant_keywords = ['plus']
        
        # Find all price elements with their surrounding context
        all_price_elements = soup.find_all(string=re.compile(r'\$\s*[\d,]+'))
        
        for price_text in all_price_elements:
            # Skip if it's in an avoided context
            parent_html = str(price_text.parent) if price_text.parent else ""
            if any(avoid_pattern in parent_html.lower() for avoid_pattern in avoid_selectors):
                continue
                
            price = self._parse_price_text(price_text, 'glowforge.com')
            if not price or not (expected_range[0] <= price <= expected_range[1]):
                continue
                
            # Check the surrounding context for variant keywords
            # Look up the DOM tree to find the product card container
            current_element = price_text.parent
            context_found = False
            variant_context = ""
            
            # Look up to 10 levels up in the DOM to find the product card (increased from 5)
            for level in range(10):
                if not current_element:
                    break
                    
                element_text = current_element.get_text(separator=' ').lower() if hasattr(current_element, 'get_text') else str(current_element).lower()
                variant_context += element_text + " "
                
                # Debug logging to see what context we're finding
                if price == 4499 or price == 4999:  # Debug specific prices
                    logger.info(f"DEBUG: Level {level} for ${price}: Found text snippet: '{element_text[:100]}...'")
                
                # Check if this context contains our variant keywords
                if variant_keywords:
                    # Use specific feature detection based on Glowforge product differences
                    if 'plus' in variant_keywords and 'hd' not in variant_keywords:
                        # Looking for "plus" (not HD) - check for "live camera view" WITHOUT "hd"
                        if 'live camera view' in element_text and 'live camera view hd' not in element_text:
                            logger.info(f"🎯 Found Plus (non-HD) signature: 'live camera view' without 'hd' for ${price}")
                            context_found = True
                            break
                        elif 'glowforge plus' in element_text and 'glowforge plus hd' not in element_text:
                            logger.info(f"🎯 Found exact match for 'glowforge plus' without 'hd' for ${price}")
                            context_found = True
                            break
                    elif 'plus' in variant_keywords and 'hd' in variant_keywords:
                        # Looking for "plus hd" - check for "live camera view hd"
                        if 'live camera view hd' in element_text:
                            logger.info(f"🎯 Found Plus HD signature: 'live camera view hd' for ${price}")
                            context_found = True
                            break
                    elif all(keyword in element_text for keyword in variant_keywords):
                        logger.info(f"🎯 Found all keywords {variant_keywords} for ${price}")
                        context_found = True
                        break
                
                current_element = current_element.parent if hasattr(current_element, 'parent') else None
            
            if context_found:
                logger.info(f"✅ Strategy 5 SUCCESS: Found {target_variant} price ${price} with matching context: {variant_keywords}")
                return price, f"context_aware:keywords_{'+'.join(variant_keywords)}"
        
        # If context-aware matching failed, fall back to simple range matching
        logger.info(f"Strategy 5 context-aware failed, falling back to simple range matching")
        all_found_prices = []
        for price_text in all_price_elements:
            parent_html = str(price_text.parent) if price_text.parent else ""
            if any(avoid_pattern in parent_html.lower() for avoid_pattern in avoid_selectors):
                continue
            price = self._parse_price_text(price_text, 'glowforge.com')
            if price:
                all_found_prices.append(price)
        
        # Look for price in expected range as fallback
        for price in all_found_prices:
            if expected_range[0] <= price <= expected_range[1]:
                logger.info(f"✅ Strategy 5 FALLBACK: Found {target_variant} price ${price} in expected range {expected_range}")
                return price, f"direct_extraction:range_match"
        
        # Log what prices we found for debugging
        logger.warning(f"Strategy 5: Found prices {all_found_prices} but none in expected range {expected_range} for {target_variant}")
        
        logger.warning(f"Could not find price for {target_variant} in expected range {expected_range}")
        return None, None
    
    def _extract_aeon_variant_price(self, soup, html_content, url, rules, machine_data=None):
        """Extract variant-specific price for Aeon EMP lasers."""
        if not machine_data or not machine_data.get('Machine Name'):
            logger.warning("No machine data provided for Aeon variant extraction")
            return None, None
        
        machine_name = machine_data['Machine Name']
        logger.info(f"Extracting Aeon variant price for: {machine_name}")
        
        variant_rules = rules.get('variant_detection_rules', {})
        
        # Find the matching variant based on machine name
        matched_variant = None
        variant_config = None
        
        for variant_name, config in variant_rules.items():
            keywords = config.get('keywords', [])
            # Check if any keyword matches the machine name
            if any(keyword.upper() in machine_name.upper() for keyword in keywords):
                matched_variant = variant_name
                variant_config = config
                logger.info(f"Matched variant: {variant_name} based on keywords: {keywords}")
                break
        
        if not matched_variant:
            logger.warning(f"No matching variant found for machine: {machine_name}")
            return None, None
        
        # Use historical price from machine data instead of hardcoded ranges
        tolerance = variant_config.get('price_tolerance', 0.1)
        historical_price = machine_data.get('old_price') if machine_data else None
        
        # Strategy 1: Look for price in expected range on the page
        all_prices = []
        
        # Find all price-like text on the page
        price_patterns = [
            r'\$\s*(\d{1,2}[,.]?\d{3})',  # $1,234 or $1.234
            r'(\d{1,2}[,.]?\d{3})\s*dollars?',  # 1,234 dollars
            r'price[:\s]*\$?\s*(\d{1,2}[,.]?\d{3})',  # price: $1,234
        ]
        
        for pattern in price_patterns:
            matches = re.finditer(pattern, html_content, re.IGNORECASE)
            for match in matches:
                price_str = match.group(1).replace(',', '').replace('.', '')
                try:
                    price = float(price_str)
                    if self._is_price_reasonable(price, historical_price):
                        all_prices.append(price)
                        logger.info(f"Found candidate price: ${price} (in range {price_range})")
                except ValueError:
                    continue
        
        # Strategy 2: Look for the specific variant pattern in HTML
        fallback_patterns = rules.get('fallback_patterns', [])
        variant_keywords = variant_config.get('keywords', [])
        
        for keyword in variant_keywords:
            # Look for the keyword followed by a price
            pattern = rf'{keyword}[\s\S]*?\$?\s*(\d{{1,2}}[,.]?\d{{3}})'
            matches = re.finditer(pattern, html_content, re.IGNORECASE)
            for match in matches:
                price_str = match.group(1).replace(',', '').replace('.', '')
                try:
                    price = float(price_str)
                    if self._is_price_reasonable(price, historical_price):
                        all_prices.append(price)
                        logger.info(f"Found variant-specific price: ${price} near keyword '{keyword}'")
                except ValueError:
                    continue
        
        # Strategy 3: Use BeautifulSoup to find prices in structured elements
        price_selectors = rules.get('price_selectors', [])
        for selector in price_selectors:
            elements = soup.select(selector)
            for element in elements:
                price_text = element.get_text().strip()
                price = self._parse_price_text(price_text, 'aeonlaser.us')
                if price and self._is_price_reasonable(price, historical_price):
                    all_prices.append(price)
                    logger.info(f"Found structured price: ${price} using selector: {selector}")
        
        # Remove duplicates and sort
        unique_prices = list(set(all_prices))
        unique_prices.sort()
        
        logger.info(f"All candidate prices for {matched_variant}: {unique_prices}")
        
        if not unique_prices:
            logger.warning(f"No prices found in expected range {price_range} for {matched_variant}")
            return None, None
        
        # Strategy 4: Select the best price
        best_price = None
        
        if len(unique_prices) == 1:
            best_price = unique_prices[0]
            logger.info(f"Single price found: ${best_price}")
        else:
            # Multiple prices found - prefer the one closest to expected price
            # Use historical price from machine_data if available for closest price selection
            if machine_data and machine_data.get('old_price'):
                historical_price = float(machine_data['old_price'])
                best_price = min(unique_prices, key=lambda x: abs(x - historical_price))
                logger.info(f"Selected price closest to historical ${historical_price}: ${best_price}")
            else:
                # No expected price, take the highest (usually the bundle/full price)
                best_price = max(unique_prices)
                logger.info(f"Selected highest price: ${best_price}")
        
        # Final validation
        if best_price and self._is_price_reasonable(best_price, historical_price):
            logger.info(f"✅ Successfully extracted {matched_variant} price: ${best_price}")
            return best_price, f"variant_detection:{matched_variant}"
        else:
            logger.warning(f"Final validation failed for {matched_variant}: ${best_price} not reasonable compared to historical price")
            return None, None
    
    def _is_price_reasonable(self, price, historical_price, tolerance=0.5):
        """
        Check if a price is reasonable compared to historical price.
        
        Args:
            price: The price to validate
            historical_price: The historical price to compare against
            tolerance: Allowed percentage change (default 50%)
        
        Returns:
            bool: True if price is reasonable
        """
        if not historical_price or historical_price <= 0:
            # No historical data, accept prices in reasonable range
            return 100 <= price <= 100000
        
        # Calculate percentage change
        change = abs(price - historical_price) / historical_price
        return change <= tolerance
    
    def _extract_table_column_price(self, soup, rules, machine_data=None):
        """Extract price from a specific table column for structured price tables."""
        logger.info("🎯 Attempting table column extraction")
        
        if not machine_data or not machine_data.get('Machine Name'):
            logger.warning("No machine data provided for table extraction")
            return None, None
        
        machine_name = machine_data['Machine Name']
        machine_rules = rules.get('machine_specific_rules', {})
        
        # Find the matching machine rule
        machine_config = None
        for rule_name, config in machine_rules.items():
            if rule_name == machine_name or any(keyword.upper() in machine_name.upper() for keyword in config.get('keywords', [])):
                machine_config = config
                logger.info(f"Found matching rule for {machine_name}: {rule_name}")
                break
        
        if not machine_config:
            logger.warning(f"No specific table column rule found for {machine_name}")
            return None, None
        
        table_column = machine_config.get('table_column')
        if table_column is None:
            logger.warning(f"No table_column specified for {machine_name}")
            return None, None
        
        # Find pricing table
        tables = soup.find_all('table')
        for table in tables:
            # Look for tables with pricing headers
            rows = table.find_all('tr')
            
            # Find the pricing row specifically
            pricing_row = None
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if cells and cells[0].get_text().strip().lower() == 'pricing':
                    pricing_row = row
                    logger.info(f"Found pricing row: {[cell.get_text().strip() for cell in cells[:7]]}")
                    break
            
            if not pricing_row:
                continue
            
            # Get all cells from the pricing row
            pricing_cells = pricing_row.find_all(['td', 'th'])
            
            # Check if we have enough columns (add 1 because first cell is "Pricing" header)
            if len(pricing_cells) > table_column + 1:
                # Extract price from the specified column (+1 to skip the "Pricing" header cell)
                price_cell = pricing_cells[table_column + 1]
                price_text = price_cell.get_text().strip()
                price = self._parse_price_string(price_text)
                
                if price:
                    logger.info(f"✅ Found table price for {machine_name}: ${price} in column {table_column}")
                    return price, f"table_column_{table_column}"
            else:
                logger.warning(f"Not enough columns in pricing row. Found {len(pricing_cells)} cells, need at least {table_column + 2}")
        
        logger.warning(f"Could not find table price for {machine_name}")
        return None, None
    
    def _extract_json_ld_with_paths(self, soup, json_ld_paths):
        """Extract from JSON-LD using specific paths."""
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        
        for script_idx, script in enumerate(json_ld_scripts):
            try:
                data = json.loads(script.string)
                logger.debug(f"Processing JSON-LD script {script_idx} for specific paths")
                
                # Handle both single objects and arrays
                items = data if isinstance(data, list) else [data]
                
                for item in items:
                    for path in json_ld_paths:
                        value = self._get_nested_value(item, path)
                        if value:
                            logger.debug(f"Found price at path '{path}': {value}")
                            if isinstance(value, (int, float)):
                                return float(value), path
                            else:
                                # Try to parse string value
                                parsed = self._parse_price_string(str(value))
                                if parsed:
                                    return parsed, path
                                    
            except (json.JSONDecodeError, AttributeError) as e:
                logger.debug(f"Error parsing JSON-LD script {script_idx}: {e}")
                continue
                
        return None, None
    
    def _extract_with_context_filtering(self, soup, rules):
        """Extract price with context filtering."""
        prefer_contexts = rules.get('prefer_contexts', [])
        avoid_contexts = rules.get('avoid_contexts', [])
        price_selectors = rules.get('price_selectors', [])
        preferred_price = rules.get('preferred_price')
        
        # Collect all found prices first
        all_found_prices = []
        
        # First try preferred contexts
        for context in prefer_contexts:
            container = soup.select_one(f'.{context}, #{context}, [class*="{context}"]')
            if container:
                logger.debug(f"Found preferred context: {context}")
                
                # Try specific selectors within this context
                for selector in price_selectors:
                    elements = container.select(selector)
                    for element in elements:
                        price = self._extract_price_from_element(element)
                        if price:
                            all_found_prices.append((price, f"context:{context} selector:{selector}"))
                
                # Try generic price selectors within context
                generic_selectors = ['.price', '.amount', '[data-price]']
                for selector in generic_selectors:
                    elements = container.select(selector)
                    for element in elements:
                        price = self._extract_price_from_element(element)
                        if price:
                            all_found_prices.append((price, f"context:{context} generic:{selector}"))
        
        # If no preferred context worked, try direct selectors
        if not all_found_prices:
            for selector in price_selectors:
                elements = soup.select(selector)
                for element in elements:
                    price = self._extract_price_from_element(element)
                    if price:
                        all_found_prices.append((price, f"direct:{selector}"))
        
        # If we have a preferred price, look for exact matches first
        if preferred_price and all_found_prices:
            for price, method in all_found_prices:
                if price == preferred_price:
                    logger.info(f"✅ Found exact preferred price ${preferred_price} using {method}")
                    return price, method
            
            # If no exact match, find the closest to preferred price
            closest_price, closest_method = min(all_found_prices, key=lambda x: abs(x[0] - preferred_price))
            logger.info(f"Using closest price ${closest_price} to preferred ${preferred_price} (diff: ${abs(closest_price - preferred_price)})")
            return closest_price, closest_method
        
        # If no preferred price, return the first found price
        if all_found_prices:
            return all_found_prices[0]
        
        return None, None
    
    def _extract_avoiding_selectors(self, soup, rules):
        """Extract price while avoiding specific selectors."""
        avoid_selectors = rules.get('avoid_selectors', [])
        avoid_contexts = rules.get('avoid_contexts', [])
        
        # Get all potential price elements
        all_price_elements = []
        generic_selectors = [
            '.price', '.amount', '.product-price', '.current-price',
            '[data-price]', '.woocommerce-Price-amount'
        ]
        
        for selector in generic_selectors:
            elements = soup.select(selector)
            for element in elements:
                all_price_elements.append((element, selector))
        
        # Filter out avoided elements
        filtered_elements = []
        for element, selector in all_price_elements:
            should_avoid = False
            
            # Check if element matches avoided selectors
            for avoid_selector in avoid_selectors:
                if element.select(avoid_selector) or element.parent.select(avoid_selector):
                    should_avoid = True
                    break
            
            # Check if element is in avoided context
            if not should_avoid:
                element_html = str(element)
                for avoid_context in avoid_contexts:
                    if avoid_context in element_html or avoid_context in ' '.join(element.get('class', [])):
                        should_avoid = True
                        break
            
            if not should_avoid:
                filtered_elements.append((element, selector))
        
        # Try to extract from filtered elements
        for element, selector in filtered_elements:
            price = self._extract_price_from_element(element)
            if price:
                return price, f"filtered:{selector}"
        
        return None, None
    
    def _extract_price_from_element(self, element):
        """Extract price from a single element."""
        # Try data attributes first
        for attr in ['data-price', 'data-product-price', 'content']:
            if element.has_attr(attr):
                value = element[attr]
                price = self._parse_price_string(value)
                if price:
                    return price
        
        # Try text content
        text = element.get_text(strip=True)
        if text:
            price = self._parse_price_string(text)
            if price:
                return price
        
        return None
    
    def _parse_price_string(self, price_text):
        """Parse price from string with enhanced logic."""
        if not price_text:
            return None
            
        # Handle numeric values in cents (common in data attributes)
        if isinstance(price_text, str) and price_text.isdigit() and len(price_text) >= 5:
            # Check if this looks like cents (e.g., "259900" = $2599.00)
            cents_value = int(price_text)
            if cents_value >= 10000:  # Minimum $100.00 in cents
                dollars = cents_value / 100
                if dollars <= 50000:  # Maximum $50,000
                    return dollars
        
        # Standard price parsing
        price_str = str(price_text).strip()
        
        # Remove currency symbols and extra whitespace
        price_str = re.sub(r'[$€£¥]', '', price_str)
        price_str = re.sub(r'\s+', '', price_str)
        
        # Extract first price (handle cases with multiple prices like "$8,888 $6,666")
        # Look for price patterns: 1,234.56 or 1234.56 or 1234
        matches = re.findall(r'\d+(?:[,.]?\d+)*', price_str)
        if not matches:
            # Fallback to any number
            match = re.search(r'\d+', price_str)
            if not match:
                return None
            price_clean = match.group(0)
        else:
            # Take the first match
            price_clean = matches[0]
        
        # Handle thousand separators and decimal points
        if ',' in price_clean and '.' in price_clean:
            # Both separators present
            last_comma = price_clean.rfind(',')
            last_dot = price_clean.rfind('.')
            
            if last_comma > last_dot:
                # Comma is decimal (European style)
                price_clean = price_clean.replace('.', '').replace(',', '.')
            else:
                # Dot is decimal (US style)
                price_clean = price_clean.replace(',', '')
        elif ',' in price_clean:
            # Only comma - check if it's decimal or thousands
            comma_parts = price_clean.split(',')
            if len(comma_parts) == 2 and len(comma_parts[1]) <= 2:
                # Likely decimal separator (e.g., "123,45")
                price_clean = price_clean.replace(',', '.')
            else:
                # Likely thousands separator (e.g., "1,234" or "1,234,567")
                price_clean = price_clean.replace(',', '')
        
        try:
            result = float(price_clean)
            
            # Additional validation: if result seems too low for an obvious price, it might be parsing error
            if ('.' not in str(price_text) and 
                ',' not in str(price_text) and 
                str(price_text).isdigit() and 
                len(str(price_text)) >= 3 and
                result < 100 and 
                int(price_text) > 100):
                # This might be a case where the number should be treated as-is
                # e.g., "1799" should be 1799.0, not 179.9
                return float(str(price_text))
                
            return result
        except ValueError:
            return None
    
    def _validate_price(self, price, rules, machine_data=None):
        """Validate price against machine-specific data."""
        if not price:
            return False
        
        # Use machine data if available, otherwise use wide defaults
        if machine_data and machine_data.get('old_price'):
            old_price = float(machine_data['old_price'])
            # Allow 60% variance from old price
            min_price = old_price * 0.4
            max_price = old_price * 1.6
            logger.debug(f"Using machine-based range: ${min_price:.2f} - ${max_price:.2f} (old: ${old_price:.2f})")
        else:
            # Wide defaults when no machine data
            min_price = 10
            max_price = 100000
        
        if price < min_price:
            logger.warning(f"Price ${price} below expected range (min: ${min_price:.2f})")
            return False
        
        if price > max_price:
            logger.warning(f"Price ${price} above expected range (max: ${max_price:.2f})")
            return False
        
        return True
    
    def _get_nested_value(self, obj, path):
        """Get nested value from object using dot notation."""
        keys = path.split('.')
        value = obj
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            elif isinstance(value, list) and key.isdigit():
                try:
                    value = value[int(key)]
                except (IndexError, ValueError):
                    return None
            else:
                return None
        
        return value
    
    def _get_element_context(self, element):
        """Get contextual information about an element for better price filtering."""
        context_parts = []
        
        # Get element's own classes and attributes
        if element.get('class'):
            context_parts.extend(element.get('class'))
        if element.get('id'):
            context_parts.append(element.get('id'))
        
        # Get parent element context
        current = element.parent
        depth = 0
        while current and depth < 3:  # Check up to 3 levels up
            if current.name:
                if current.get('class'):
                    context_parts.extend([f"parent-{cls}" for cls in current.get('class')])
                if current.get('id'):
                    context_parts.append(f"parent-{current.get('id')}")
            current = current.parent
            depth += 1
        
        # Get surrounding text content
        if element.parent:
            parent_text = element.parent.get_text()[:200].lower()
            context_parts.append(parent_text)
        
        return ' '.join(context_parts)


def integrate_with_existing_extractor():
    """
    Example of how to integrate with existing PriceExtractor class.
    Add this method to the existing PriceExtractor class.
    """
    integration_code = '''
    def extract_price(self, soup, html_content, url):
        """Enhanced extract_price method with site-specific rules."""
        
        # Try site-specific extraction first
        site_extractor = SiteSpecificExtractor()
        price, method = site_extractor.extract_price_with_rules(soup, html_content, url)
        if price is not None:
            logger.info(f"Extracted price {price} using site-specific method: {method}")
            return price, method
        
        # Fall back to original methods
        # Method 1: Try structured data (JSON-LD, microdata)
        price, method = self._extract_from_structured_data(soup)
        if price is not None:
            return price, method
        
        # Method 2: Try common price selectors
        price, method = self._extract_from_common_selectors(soup)
        if price is not None:
            return price, method
        
        # Method 3: Use Claude AI as fallback
        price, method = self._extract_using_claude(html_content, url)
        if price is not None:
            return price, method
        
        # No price found with any method
        logger.warning(f"Failed to extract price from {url} using any method")
        return None, None
    '''
    
    return integration_code


    def _extract_table_column_price(self, soup, rules, machine_data):
        """Extract price from a table column based on machine-specific rules."""
        try:
            machine_name = machine_data.get('Machine Name', '') if machine_data else ''
            logger.info(f"🏗️ Attempting table column extraction for {machine_name}")
            
            # Get machine-specific rules
            machine_rules = rules.get('machine_specific_rules', {})
            machine_config = None
            
            # Find matching machine configuration
            for machine_pattern, config in machine_rules.items():
                if machine_pattern.lower() in machine_name.lower():
                    machine_config = config
                    logger.info(f"Found table config for {machine_pattern}: column {config.get('table_column', 'unknown')}")
                    break
            
            if not machine_config:
                logger.warning(f"No table column configuration found for {machine_name}")
                return None, None
            
            column_index = machine_config.get('table_column', -1)
            if column_index < 0:
                return None, None
            
            # Try each price selector to find the price table
            for selector in rules.get('price_selectors', []):
                try:
                    # Find price table cells
                    price_cells = soup.select(selector)
                    
                    if price_cells and len(price_cells) > column_index:
                        price_text = price_cells[column_index].get_text(strip=True)
                        logger.info(f"Found price text in column {column_index}: {price_text}")
                        
                        price = self._parse_price_text(price_text, 'emplaser.com')
                        if price:
                            logger.info(f"✅ Extracted table price: ${price} from column {column_index}")
                            return price, f"column {column_index}"
                    
                except Exception as e:
                    logger.debug(f"Table selector {selector} failed: {str(e)}")
                    continue
            
            # Fallback: Try pattern matching
            if 'fallback_patterns' in rules:
                html_text = str(soup)
                for pattern in rules['fallback_patterns']:
                    if machine_name:
                        # Use machine-specific pattern
                        for keyword in machine_config.get('keywords', []):
                            if keyword.upper() in machine_name.upper():
                                specific_pattern = pattern.replace(keyword.upper(), keyword.upper())
                                import re
                                match = re.search(specific_pattern, html_text, re.IGNORECASE)
                                if match:
                                    price_str = match.group(1)
                                    price = self._parse_price_text(price_str, 'emplaser.com')
                                    if price:
                                        logger.info(f"✅ Extracted price via pattern: ${price}")
                                        return price, f"pattern match ({keyword})"
            
            return None, None
            
        except Exception as e:
            logger.error(f"Error in table column extraction: {str(e)}")
            return None, None

    def _extract_xtool_f1_lite_price(self, soup, rules, machine_data):
        """
        Extract F1 Lite price when dynamic extraction fails.
        Look for F1 Lite specific price elements even if marked as out of stock.
        """
        try:
            logger.info(f"Attempting static F1 Lite price extraction for {machine_data.get('name', 'unknown')}")
            
            # Look for F1 Lite sections in the HTML
            f1_lite_sections = []
            
            # Find elements containing "F1 Lite" text
            for element in soup.find_all(text=re.compile(r'F1\s+Lite', re.IGNORECASE)):
                parent = element.parent
                while parent and parent.name != 'body':
                    # Look for price-related elements in this section
                    price_elements = parent.find_all(['span', 'div', 'p'], 
                                                   class_=re.compile(r'price|money|amount|cost', re.IGNORECASE))
                    if price_elements:
                        f1_lite_sections.append(parent)
                        break
                    parent = parent.parent
            
            # Try to extract prices from F1 Lite sections
            for section in f1_lite_sections:
                logger.debug(f"Checking F1 Lite section: {section.get_text()[:100]}...")
                
                # Look for price patterns in this section
                price_selectors = [
                    '.money', '.amount', '.price', '.cost',
                    '[data-price]', '[data-amount]', '[data-cost]',
                    '.price-current', '.price-sale', '.price-regular'
                ]
                
                for selector in price_selectors:
                    elements = section.select(selector)
                    for element in elements:
                        # Check data attributes first
                        for attr in ['data-price', 'data-amount', 'data-cost', 'data-value']:
                            if element.has_attr(attr):
                                price_text = element[attr]
                                if price_text and price_text.strip():
                                    price = self._parse_price_text(price_text)
                                    if price:
                                        logger.info(f"Found F1 Lite price in data attribute {attr}: ${price}")
                                        return price, f"F1 Lite section data-{attr}"
                        
                        # Check text content
                        price_text = element.get_text().strip()
                        if price_text and not any(word in price_text.lower() 
                                                for word in ['out of stock', 'sold out', 'unavailable']):
                            price = self._parse_price_text(price_text)
                            if price:
                                logger.info(f"Found F1 Lite price in text: ${price}")
                                return price, f"F1 Lite section text"
            
            # If no F1 Lite specific price found, look for Shopify variant data
            # Check for script tags with variant data
            script_tags = soup.find_all('script', string=re.compile(r'46187559157999|F1.*Lite', re.IGNORECASE))
            for script in script_tags:
                script_content = script.string
                if script_content:
                    # Look for variant price data in JavaScript
                    variant_match = re.search(r'46187559157999.*?price["\']?\s*:\s*([0-9]+)', script_content)
                    if variant_match:
                        price_cents = int(variant_match.group(1))
                        price = price_cents / 100.0
                        logger.info(f"Found F1 Lite price in script variant data: ${price}")
                        return price, "Shopify variant script"
                    
                    # Look for general price patterns with F1 Lite context
                    if 'F1 Lite' in script_content or 'f1-lite' in script_content.lower():
                        price_matches = re.findall(r'["\']?price["\']?\s*:\s*([0-9]+)', script_content)
                        for price_match in price_matches:
                            price_cents = int(price_match)
                            price = price_cents / 100.0
                            # Use historical price validation instead of hardcoded range
                            if machine_data and machine_data.get('old_price'):
                                old_price = float(machine_data['old_price'])
                                if 0.5 * old_price <= price <= 1.5 * old_price:  # Within reasonable range of historical price
                                    logger.info(f"Found F1 Lite price in script context: ${price}")
                                    return price, "F1 Lite script context"
                            else:
                                # Fallback if no historical price
                                logger.info(f"Found F1 Lite price in script context: ${price}")
                                return price, "F1 Lite script context"
            
            logger.warning("No F1 Lite price found in static extraction")
            return None, None
            
        except Exception as e:
            logger.error(f"Error in F1 Lite static extraction: {str(e)}")
            return None, None


if __name__ == "__main__":
    # Test the extractor
    extractor = SiteSpecificExtractor()
    print("Site-specific price extractor rules loaded:")
    for domain, rules in extractor.site_rules.items():
        print(f"- {domain}: {rules['type']} site")