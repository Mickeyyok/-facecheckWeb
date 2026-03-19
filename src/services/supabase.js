import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

VITE_SUPABASE_URL= https://nsvtahebxqrkrjzqcqwk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_bNQo29CRR-N4qzX3-vDiKg_Q9BxybiG