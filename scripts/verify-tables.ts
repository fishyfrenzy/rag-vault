
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyTables() {
    console.log('Verifying tables...')

    const tables = ['profiles', 'the_vault', 'user_inventory']

    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1)
        if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows" which is fine
            console.error(`❌ Table '${table}' check failed:`, error.message)
        } else {
            console.log(`✅ Table '${table}' exists.`)
        }
    }
}

verifyTables()
