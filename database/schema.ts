// This file represents the database schema for Supabase
// It can be used with tools like Supabase migrations or as reference

export const schema = {
  // Main machines table
  machines: `
    CREATE TABLE machines (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      machine_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      rating INTEGER,
      award TEXT,
      image_url TEXT,
      machine_category TEXT,
      laser_category TEXT,
      company TEXT,
      laser_type_a TEXT,
      laser_power_a TEXT,
      laser_type_b TEXT,
      laser_power_b TEXT,
      affiliate_link TEXT,
      price DECIMAL(10, 2),
      price_category TEXT,
      work_area TEXT,
      height TEXT,
      machine_size TEXT,
      speed TEXT,
      speed_category TEXT,
      acceleration TEXT,
      software TEXT,
      focus TEXT,
      enclosure TEXT,
      wifi TEXT,
      camera TEXT,
      passthrough TEXT,
      controller TEXT,
      warranty TEXT,
      excerpt_short TEXT,
      excerpt_long TEXT,
      description TEXT,
      highlights TEXT,
      drawbacks TEXT,
      youtube_review TEXT,
      is_featured BOOLEAN DEFAULT false,
      favorited INTEGER DEFAULT 0,
      hidden BOOLEAN DEFAULT false,
      laser_frequency TEXT,
      pulse_width TEXT,
      best_for TEXT,
      laser_source_manufacturer TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      published_at TIMESTAMP WITH TIME ZONE,
      
      -- Legacy IDs for migration purposes
      collection_id TEXT,
      locale_id TEXT,
      item_id TEXT
    );
    
    -- Create index on commonly queried fields
    CREATE INDEX idx_machines_company ON machines(company);
    CREATE INDEX idx_machines_laser_category ON machines(laser_category);
    CREATE INDEX idx_machines_price_category ON machines(price_category);
    CREATE INDEX idx_machines_speed_category ON machines(speed_category);
    CREATE INDEX idx_machines_award ON machines(award);
  `,

  // Reviews table (separate from machines as requested)
  reviews: `
    CREATE TABLE reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      title TEXT,
      content TEXT,
      author TEXT,
      rating DECIMAL(3, 1),
      pros TEXT[],
      cons TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      published_at TIMESTAMP WITH TIME ZONE,
      
      -- Additional fields for review metadata
      verified_purchase BOOLEAN DEFAULT false,
      helpful_votes INTEGER DEFAULT 0,
      featured BOOLEAN DEFAULT false
    );
    
    CREATE INDEX idx_reviews_machine_id ON reviews(machine_id);
  `,

  // Images table for multiple machine images
  images: `
    CREATE TABLE images (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      alt_text TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_images_machine_id ON images(machine_id);
  `,

  // Comparisons table to store saved comparisons
  comparisons: `
    CREATE TABLE comparisons (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT,
      slug TEXT UNIQUE,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      published_at TIMESTAMP WITH TIME ZONE,
      featured BOOLEAN DEFAULT false
    );
  `,

  // Junction table for machines in comparisons
  comparison_machines: `
    CREATE TABLE comparison_machines (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      comparison_id UUID NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
      machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      sort_order INTEGER DEFAULT 0,
      
      -- Ensure a machine can only be added once to a comparison
      UNIQUE(comparison_id, machine_id)
    );
    
    CREATE INDEX idx_comparison_machines_comparison_id ON comparison_machines(comparison_id);
    CREATE INDEX idx_comparison_machines_machine_id ON comparison_machines(machine_id);
  `,

  // Categories table for machine categorization
  categories: `
    CREATE TABLE categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      parent_id UUID REFERENCES categories(id),
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_categories_parent_id ON categories(parent_id);
  `,

  // Junction table for machines in categories
  machine_categories: `
    CREATE TABLE machine_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      
      -- Ensure a machine can only be added once to a category
      UNIQUE(machine_id, category_id)
    );
    
    CREATE INDEX idx_machine_categories_machine_id ON machine_categories(machine_id);
    CREATE INDEX idx_machine_categories_category_id ON machine_categories(category_id);
  `,

  // Brands table
  brands: `
    CREATE TABLE brands (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      description TEXT,
      website_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  // RLS Policies
  rls_policies: `
    -- Enable Row Level Security
    ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
    ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
    ALTER TABLE images ENABLE ROW LEVEL SECURITY;
    ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;
    ALTER TABLE comparison_machines ENABLE ROW LEVEL SECURITY;
    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE machine_categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
    
    -- Public read access policies
    CREATE POLICY "Public can view published machines" 
      ON machines FOR SELECT 
      USING (published_at IS NOT NULL AND NOT hidden);
      
    CREATE POLICY "Public can view published reviews" 
      ON reviews FOR SELECT 
      USING (published_at IS NOT NULL);
      
    CREATE POLICY "Public can view images" 
      ON images FOR SELECT 
      USING (true);
      
    CREATE POLICY "Public can view published comparisons" 
      ON comparisons FOR SELECT 
      USING (published_at IS NOT NULL);
      
    CREATE POLICY "Public can view comparison_machines" 
      ON comparison_machines FOR SELECT 
      USING (true);
      
    CREATE POLICY "Public can view categories" 
      ON categories FOR SELECT 
      USING (true);
      
    CREATE POLICY "Public can view machine_categories" 
      ON machine_categories FOR SELECT 
      USING (true);
      
    CREATE POLICY "Public can view brands" 
      ON brands FOR SELECT 
      USING (true);
      
    -- Admin policies (replace with your actual admin role)
    CREATE POLICY "Admins can do everything with machines" 
      ON machines FOR ALL 
      USING (auth.role() = 'admin');
      
    CREATE POLICY "Admins can do everything with reviews" 
      ON reviews FOR ALL 
      USING (auth.role() = 'admin');
      
    -- Add similar policies for other tables
  `,
}

