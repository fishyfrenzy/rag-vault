#!/bin/bash

# Generate TypeScript types from Supabase schema
# 
# Prerequisites:
# 1. Install Supabase CLI: npm install -g supabase
# 2. Login: supabase login
#
# Usage:
# 1. Set your project ID below (find in Supabase dashboard URL)
# 2. Run: ./scripts/gen-types.sh

PROJECT_ID="YOUR_PROJECT_ID_HERE"  # Replace with your Supabase project ID

if [ "$PROJECT_ID" = "YOUR_PROJECT_ID_HERE" ]; then
    echo "Error: Please set your PROJECT_ID in this script first"
    echo "Find it in your Supabase dashboard URL: app.supabase.com/project/<PROJECT_ID>"
    exit 1
fi

echo "Generating types from Supabase..."
npx supabase gen types typescript --project-id "$PROJECT_ID" > src/types/supabase.ts

echo "Done! Types generated at src/types/supabase.ts"
echo ""
echo "Next steps:"
echo "1. Review the generated types in src/types/supabase.ts"
echo "2. Update imports in your code to use the generated types"
