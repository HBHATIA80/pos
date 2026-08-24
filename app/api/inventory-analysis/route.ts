import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('business_id,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('stock_analysis').select('*').eq('business_id', profile.business_id).eq('is_active', true).order('name').limit(2000)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const rows = data ?? []
  const summary = {
    products: rows.length,
    lowStock: rows.filter(row => Number(row.current_stock) <= Number(row.reorder_level)).length,
    outOfStock: rows.filter(row => Number(row.current_stock) <= 0).length,
    totalUnits: rows.reduce((sum,row) => sum + Number(row.current_stock || 0), 0),
    stockCostValue: rows.reduce((sum,row) => sum + Number(row.stock_cost_value || 0), 0),
    stockRetailValue: rows.reduce((sum,row) => sum + Number(row.stock_retail_value || 0), 0),
    soldUnits: rows.reduce((sum,row) => sum + Number(row.sold_units || 0), 0),
    purchasedUnits: rows.reduce((sum,row) => sum + Number(row.purchased_units || 0), 0),
    salesValue: rows.reduce((sum,row) => sum + Number(row.sales_value || 0), 0),
    purchaseValue: rows.reduce((sum,row) => sum + Number(row.purchase_value || 0), 0),
  }
  return NextResponse.json({ analysis: rows, summary })
}
