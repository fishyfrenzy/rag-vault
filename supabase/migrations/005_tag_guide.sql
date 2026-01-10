-- Create tag_guide table for storing tag/brand reference data
-- Each row represents a SPECIFIC tag variation with its own date range and image
-- e.g., "Giant 1988-1990" vs "Giant 1991-1995" would be separate entries
create table public.tag_guide (
  id uuid default gen_random_uuid() primary key,
  brand_name text not null,           -- e.g., "Giant", "Hanes"
  variation_name text,                -- e.g., "Early", "Late", "Red Label", "Green Label"
  era_start int not null,             -- Start year of THIS specific tag variation
  era_end int,                        -- End year of THIS specific tag variation (null = still in use)
  description text,                   -- Identifying features of THIS specific tag variation
  reference_image_url text,           -- Image of THIS specific tag variation
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on tag_guide
alter table public.tag_guide enable row level security;

-- Everyone can view the tag guide
create policy "Tag guide is viewable by everyone."
  on tag_guide for select
  using ( true );

-- Authenticated users can manage entries
create policy "Authenticated users can create tag guide entries."
  on tag_guide for insert
  with check ( auth.role() = 'authenticated' );

create policy "Authenticated users can update tag guide entries."
  on tag_guide for update
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can delete tag guide entries."
  on tag_guide for delete
  using ( auth.role() = 'authenticated' );

-- Brockum tag variations
insert into public.tag_guide (brand_name, variation_name, era_start, era_end, description) values
  ('Brockum', 'Late 80s Cream', 1988, 1989, 'Cream/beige rectangular tag with blue italic "BROCKUM" text. Has "THE" above and "COLLECTION" below in smaller blue text. Blue horizontal lines. Text reads "FABRIC MADE IN U.S.A. SEWN IN DOMINICAN REPUBLIC". Size in bottom left.'),
  ('Brockum', 'Late 80s Black', 1988, 1991, 'Black rectangular tag with blue italic "BROCKUM" text. Has "THE" above and "COLLECTION" below in smaller blue text. Two blue horizontal lines frame the text. "MADE IN U.S.A." and "CARE/CONTENT OVER" in white text. Size in bottom left.'),
  ('Brockum', 'Early 90s Black', 1990, 1991, 'Black rectangular tag with yellow italic "BROCKUM" text. "THE" in small white text above, "GROUP" in white below. "MADE IN U.S.A." and "CARE/CONTENT OVER" in white. Size at bottom.'),
  ('Brockum', 'Early 90s Gray', 1991, 1992, 'Gray/silver rectangular tag with blue italic "BROCKUM" text. "THE" in small black text above, "GROUP" in black below. "MADE IN U.S.A." and "CARE/CONTENT OVER" in black text. Size at bottom.'),
  ('Brockum', 'Mid 90s Black', 1992, 1996, 'Black rectangular tag with red italic "BROCKUM" text. Yellow "WORLDWIDE" text below. "MADE IN U.S.A." in white, "CARE/CONTENT OVER" at bottom. Size displayed prominently.'),
  ('Brockum', 'Mid 90s Gray', 1992, 1996, 'Gray rectangular tag with red italic "BROCKUM" text. Yellow "WORLDWIDE" text below on gray background. "MADE IN U.S.A." in black text. Size displayed at bottom.'),
  ('Brockum', 'Mid 90s Copyright', 1994, 1994, 'Dark gray rectangular tag with red gradient italic "BROCKUM" text. Yellow "WORLDWIDE" text below. Includes "CA 12280" registration number, copyright symbol with year (© 1994), and "RN 63751" identifier. More detailed legal text than other Worldwide variants.');

