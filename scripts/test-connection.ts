import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log("Testing Connection...")
console.log("URL:", url)
console.log("Key (first 10 chars):", key?.substring(0, 10))

if (!url || !key) {
    console.error("Missing URL or Key")
    process.exit(1)
}

const supabase = createClient(url, key)

async function test() {
    const { data, error } = await supabase.from('the_vault').select('count').limit(1)

    if (error) {
        // If table doesn't exist or other error, print it
        console.error("CONNECTION FAILED:", error.message)
    } else {
        console.log("CONNECTION SUCCESSFUL! Supabase responded correctly.")
    }
}

test()
