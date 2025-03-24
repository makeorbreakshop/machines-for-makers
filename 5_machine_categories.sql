-- Link machines to categories
INSERT INTO machine_categories (machine_id, category_id) VALUES ((SELECT id FROM machines WHERE slug = 'acmer-p3'), (SELECT id FROM categories WHERE slug = 'desktop-diode-laser'));
INSERT INTO machine_categories (machine_id, category_id) VALUES ((SELECT id FROM machines WHERE slug = 'aeon-mira-5-s'), (SELECT id FROM categories WHERE slug = 'desktop-co2-laser'));
