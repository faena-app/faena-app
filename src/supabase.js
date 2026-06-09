import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yinmpadclybycvtfhhnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlpbm1wYWRjbHlieWN2dGZoaG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Njk5MzgsImV4cCI6MjA5NjU0NTkzOH0.hJUA5F-QS_2EwMomzZBnQWcflSO3bi3kWkVpCJF5Fgw'

export const supabase = createClient(supabaseUrl, supabaseKey)
export const COMPANY_ID = '00000000-0000-0000-0000-000000000001'
