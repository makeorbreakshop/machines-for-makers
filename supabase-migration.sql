-- Create table for ink calculator calibration factors
create table if not exists ink_calculator_calibration (
  id uuid primary key default uuid_generate_v4(),
  factors jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add RLS policies
alter table ink_calculator_calibration enable row level security;

-- Only allow admins to read/write calibration data
create policy "Allow admin access to calibration data" 
  on ink_calculator_calibration 
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin'); 