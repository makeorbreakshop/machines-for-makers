CREATE TABLE IF NOT EXISTS machine_html_scrapes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id),
  html_content TEXT,
  scrape_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scrape_success BOOLEAN DEFAULT TRUE,
  scraped_url TEXT,
  final_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_machine_html_scrapes_machine_id ON machine_html_scrapes(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_html_scrapes_date ON machine_html_scrapes(scrape_date);

COMMENT ON TABLE machine_html_scrapes IS 'Stores HTML content from machine price scraping for debugging and pattern learning'; 