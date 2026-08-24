import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('business_id,role,is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active || !profile.business_id || profile.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const businessId = profile.business_id
  const [sales, payments, expenses, products, customers] = await Promise.all([
    supabase.from('sales_invoices').select('grand_total,status,sold_at').eq('business_id', businessId).eq('status','completed').order('sold_at', { ascending: false }).limit(1000),
    supabase.from('sale_payments').select('amount,paid_at,payment_method').eq('business_id', businessId).eq('status','active').order('paid_at', { ascending: false }).limit(1000),
    supabase.from('expenses').select('amount,expense_date,category').eq('business_id', businessId).order('expense_date', { ascending: false }).limit(1000),
    supabase.from('products').select('id,name,sku,current_stock,reorder_level,purchase_price,sale_price').eq('business_id', businessId).eq('is_active', true).order('name').limit(1000),
    supabase.from('parties').select('id,name,party_type').eq('business_id', businessId).eq('is_active', true).in('party_type',['customer','both']).limit(1000),
  ])
  for (const result of [sales,payments,expenses,products,customers]) if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
  const saleRows = sales.data ?? [], paymentRows = payments.data ?? [], expenseRows = expenses.data ?? [], productRows = products.data ?? [], customerRows = customers.data ?? []
  const revenue = saleRows.reduce((n,r)=>n+Number(r.grand_total||0),0)
  const paid = paymentRows.reduce((n,r)=>n+Number(r.amount||0),0)
  const expenseTotal = expenseRows.reduce((n,r)=>n+Number(r.amount||0),0)
  const stockValue = productRows.reduce((n,r)=>n+Number(r.current_stock||0)*Number(r.purchase_price||0),0)
  const lowStock = productRows.filter(r=>Number(r.current_stock||0)<=Number(r.reorder_level||0))
  const salesByDay = new Map<string,number>()
  for (const r of saleRows) { const key=(r.sold_at||'').slice(0,10); if(key) salesByDay.set(key,(salesByDay.get(key)||0)+Number(r.grand_total||0)) }
  const topDays = [...salesByDay.entries()].sort((a,b)=>b[1]-a[1]).slice(0,7).map(([date,total])=>({date,total}))
  const expenseByCategory = new Map<string,number>()
  for (const r of expenseRows) expenseByCategory.set(r.category,(expenseByCategory.get(r.category)||0)+Number(r.amount||0))
  return NextResponse.json({ summary:{revenue,paid,expenseTotal,estimatedMargin:revenue-expenseTotal,stockValue,invoiceCount:saleRows.length,customerCount:customerRows.length,lowStockCount:lowStock.length}, topDays, expenseByCategory:[...expenseByCategory.entries()].map(([category,total])=>({category,total})).sort((a,b)=>b.total-a.total), lowStock })
}
