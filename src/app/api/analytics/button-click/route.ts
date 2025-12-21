import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * API endpoint to log button clicks server-side
 * This allows you to query button clicks from your database
 * 
 * POST /api/analytics/button-click
 * Body: { button: string, campus?: string, metadata?: Record<string, any> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { button, campus, metadata } = body

    if (!button) {
      return NextResponse.json({ error: 'button name is required' }, { status: 400 })
    }

    // Log to database (you'll need to create this table)
    // For now, we'll just log to console and return success
    // You can create a 'button_clicks' table in Supabase if you want to store this
    
    const clickData = {
      button,
      campus: campus || null,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      user_agent: req.headers.get('user-agent') || null,
      referer: req.headers.get('referer') || null,
    }

    // Log to console (visible in Vercel logs)
    console.log('[Button Click]', JSON.stringify(clickData))

    // Optional: Store in database
    // Uncomment this if you create a 'button_clicks' table:
    /*
    const { error } = await supabaseAdmin
      .from('button_clicks')
      .insert({
        button,
        campus,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      })
    
    if (error) {
      console.error('Error logging button click:', error)
      // Don't fail the request if logging fails
    }
    */

    return NextResponse.json({ 
      success: true, 
      logged: clickData 
    })
  } catch (error) {
    console.error('Error in button-click endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to log button click' }, 
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to retrieve button click stats
 * 
 * GET /api/analytics/button-click?button=learn_more_click&date=2024-12-25
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const button = searchParams.get('button')
  const date = searchParams.get('date') // YYYY-MM-DD format
  const campus = searchParams.get('campus')

  // For now, return instructions since we're just logging to console
  // If you create a database table, you can query it here
  
  return NextResponse.json({
    message: 'Button clicks are currently logged to Vercel logs',
    instructions: [
      'View logs in Vercel Dashboard → Your Project → Logs',
      'Filter by: [Button Click]',
      'Or check Vercel Analytics dashboard for event counts',
    ],
    note: 'To store in database, create a button_clicks table and uncomment the insert code',
  })
}

