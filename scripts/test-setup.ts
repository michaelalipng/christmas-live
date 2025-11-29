#!/usr/bin/env tsx
/**
 * Test Setup Script for Christmas Live App
 * 
 * This script sets up test data and provides a testing workflow.
 * 
 * Usage:
 *   npm run test-setup
 *   or
 *   npx tsx scripts/test-setup.ts
 * 
 * Prerequisites:
 *   - Environment variables set in .env.local:
 *     - NEXT_PUBLIC_SUPABASE_URL
 *     - SUPABASE_SERVICE_ROLE_KEY
 *     - ADMIN_TOKEN (for moderator API calls)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Simple env loader for .env.local
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  } catch (err) {
    // .env.local might not exist, that's okay
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

type UUID = string

interface Campus {
  id: UUID
  name: string
  slug: string
}

interface Event {
  id: UUID
  campus_id: UUID
  name: string
}

interface Poll {
  id: UUID
  event_id: UUID
  question: string
  order_index: number
  state: 'scheduled' | 'active' | 'showing_results' | 'closed'
}

async function ensureCampus(slug: string, name: string): Promise<UUID> {
  console.log(`\n📍 Ensuring campus exists: ${slug} (${name})`)
  
  // Check if campus exists
  const { data: existing } = await supabase
    .from('campuses')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  
  if (existing) {
    console.log(`   ✓ Campus already exists: ${existing.id}`)
    return existing.id
  }
  
  // Create campus
  const { data, error } = await supabase
    .from('campuses')
    .insert({ slug, name })
    .select('id')
    .single()
  
  if (error) {
    console.error(`   ✗ Error creating campus:`, error.message)
    throw error
  }
  
  console.log(`   ✓ Created campus: ${data.id}`)
  return data.id
}

async function createTestEvent(campusId: UUID, name: string): Promise<UUID> {
  console.log(`\n🎉 Creating test event: ${name}`)
  
  const { data, error } = await supabase
    .from('events')
    .insert({
      campus_id: campusId,
      name,
      auto_advance: false,
      gap_seconds: 5,
    })
    .select('id')
    .single()
  
  if (error) {
    console.error(`   ✗ Error creating event:`, error.message)
    throw error
  }
  
  console.log(`   ✓ Created event: ${data.id}`)
  return data.id
}

async function createPoll(
  eventId: UUID,
  question: string,
  orderIndex: number,
  options: string[],
  durationSeconds: number = 30
): Promise<UUID> {
  console.log(`\n📊 Creating poll ${orderIndex}: "${question}"`)
  
  // Create poll
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      event_id: eventId,
      question,
      order_index: orderIndex,
      state: 'scheduled',
      duration_seconds: durationSeconds,
      results_seconds: 8,
    })
    .select('id')
    .single()
  
  if (pollError) {
    console.error(`   ✗ Error creating poll:`, pollError.message)
    throw pollError
  }
  
  console.log(`   ✓ Created poll: ${poll.id}`)
  
  // Create poll options
  const optionInserts = options.map((label, idx) => ({
    poll_id: poll.id,
    label,
    order_index: idx,
  }))
  
  const { error: optionsError } = await supabase
    .from('poll_options')
    .insert(optionInserts)
  
  if (optionsError) {
    console.error(`   ✗ Error creating options:`, optionsError.message)
    throw optionsError
  }
  
  console.log(`   ✓ Created ${options.length} options`)
  
  return poll.id
}

async function main() {
  console.log('🚀 Starting test data setup...\n')
  
  try {
    // 1. Ensure test campus exists
    const campusId = await ensureCampus('ascension', 'Ascension Campus')
    
    // 2. Create a test event
    const eventId = await createTestEvent(campusId, 'Test Event - ' + new Date().toISOString())
    
    // 3. Create test polls
    const poll1Id = await createPoll(
      eventId,
      'What is your favorite Christmas tradition?',
      1,
      ['Decorating the tree', 'Giving gifts', 'Christmas dinner', 'Watching movies'],
      30
    )
    
    const poll2Id = await createPoll(
      eventId,
      'Best Christmas movie?',
      2,
      ['Home Alone', 'Elf', 'The Grinch', 'A Christmas Story'],
      25
    )
    
    const poll3Id = await createPoll(
      eventId,
      'Favorite Christmas treat?',
      3,
      ['Cookies', 'Eggnog', 'Gingerbread', 'Candy canes'],
      20
    )
    
    // 4. Print test information
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Test data setup complete!')
    console.log('='.repeat(60))
    console.log('\n📋 Test Information:')
    console.log(`   Campus ID: ${campusId}`)
    console.log(`   Event ID: ${eventId}`)
    console.log(`   Poll IDs: ${poll1Id}, ${poll2Id}, ${poll3Id}`)
    console.log('\n🌐 Test URLs:')
    console.log(`   Vote Page: ${baseUrl}/ascension/vote`)
    console.log(`   Moderator: ${baseUrl}/moderator?campus=ascension`)
    console.log(`   Overlay: ${baseUrl}/overlay?campus=ascension`)
    console.log(`   Results: ${baseUrl}/results?campus=ascension`)
    console.log('\n🧪 Testing Workflow:')
    console.log('   1. Open moderator panel and start the first poll')
    console.log('   2. Open vote page in multiple tabs/browsers')
    console.log('   3. Cast votes from different devices')
    console.log('   4. Watch live tally update in real-time')
    console.log('   5. Show results from moderator panel')
    console.log('   6. Check overlay page for chroma key display')
    console.log('   7. Advance to next poll using "Next" button')
    console.log('\n💡 Tips:')
    console.log('   - Use browser dev tools to simulate different devices')
    console.log('   - Open overlay page to see chroma key green background')
    console.log('   - Check results page to see final tallies')
    console.log('   - Test banner push/clear from moderator panel')
    console.log('\n')
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

main()

