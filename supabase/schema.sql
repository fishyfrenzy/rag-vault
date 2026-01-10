-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  display_name text unique,
  karma_score int default 0,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create the_vault table
create table public.the_vault (
  id uuid default gen_random_uuid() primary key,
  subject text not null,
  category text check (category in ('Music', 'Motorcycle', 'Movie', 'Art', 'Sport', 'Other')),
  year int,
  tag_brand text,
  stitch_type text check (stitch_type in ('Single', 'Double', 'Other')),
  reference_image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on the_vault
alter table public.the_vault enable row level security;

create policy "Vault is viewable by everyone."
  on the_vault for select
  using ( true );

create policy "Authenticated users can create vault items."
  on the_vault for insert
  with check ( auth.role() = 'authenticated' );

create policy "Creators can update their vault items."
  on the_vault for update
  using ( auth.uid() = created_by );

-- Create user_inventory table
create table public.user_inventory (
  id uuid default gen_random_uuid() primary key,
  vault_id uuid references public.the_vault(id) not null,
  user_id uuid references public.profiles(id) not null,
  condition int check (condition >= 1 and condition <= 10),
  size text,
  price decimal,
  for_sale boolean default false,
  images jsonb, -- Array of { view, url }
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on user_inventory
alter table public.user_inventory enable row level security;

create policy "Inventory is viewable by everyone."
  on user_inventory for select
  using ( true );

create policy "Users can insert into their inventory."
  on user_inventory for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own inventory."
  on user_inventory for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own inventory."
  on user_inventory for delete
  using ( auth.uid() = user_id );

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
