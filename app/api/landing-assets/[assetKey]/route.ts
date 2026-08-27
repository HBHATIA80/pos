import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ assetKey: string }> }) {
  const { assetKey } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('landing_assets').select('mime_type,data_base64').eq('asset_key', assetKey).maybeSingle()
  if (error || !data) return new NextResponse('Asset not found', { status: 404 })
  const bytes = Buffer.from(data.data_base64, 'base64')
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': data.mime_type,
      // This asset can be replaced by a super admin, so it must not be cached forever.
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'CDN-Cache-Control': 'no-store',
    },
  })
}
