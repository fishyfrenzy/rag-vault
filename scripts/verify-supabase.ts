
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('Testing connection to:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })

    if (error) {
        console.error('Connection Error:', error.message)
        // specific check for invalid key format
        if (error.message.includes('JWT')) {
            console.error('Make sure access key is a valid JWT (starts with ey...)')
        }
    } else {
        console.log('Connection Successful! (Even if 404, it means Auth worked)')
    }
}

testConnection()
