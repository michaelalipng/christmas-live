#!/usr/bin/env tsx
/**
 * One-time script to add duration_seconds and results_seconds columns to events table
 * Run with: npm run add-event-columns
 * Or: npx tsx scripts/add-event-columns.ts
 */

import { supabaseAdmin } from '../src/lib/supabaseAdmin'

async function main() {
  console.log('Adding duration_seconds and results_seconds columns to events table...\n')

  try {
    // Try to add the columns using a raw SQL query
    // Note: Supabase JS client doesn't support ALTER TABLE directly,
    // so this will need to be run in the Supabase SQL editor
    
    console.log('⚠️  Supabase JS client cannot run ALTER TABLE statements.')
    console.log('Please run this SQL in your Supabase SQL Editor:\n')
    console.log('ALTER TABLE events')
    console.log('ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 30,')
    console.log('ADD COLUMN IF NOT EXISTS results_seconds INTEGER DEFAULT 8;\n')
    
    console.log('Or copy from: migrations/add_event_duration_columns.sql\n')
    
    // Verify if columns exist by trying to select them
    const { error } = await supabaseAdmin
      .from('events')
      .select('duration_seconds, results_seconds')
      .limit(1)
    
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('column')) {
        console.log('✓ Confirmed: Columns do not exist yet')
        console.log('  Please run the SQL above in Supabase SQL Editor\n')
      } else {
        console.error('Error checking columns:', error.message)
      }
    } else {
      console.log('✓ Columns already exist!')
    }
    
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

main()

