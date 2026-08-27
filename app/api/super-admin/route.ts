import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const SUPER_ADMIN_TABLE = 'platform_super_admins'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Supabase service role configuration is missing.')
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function requireSuperAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required.', status: 401 as const }

  const { data: access, error } = await supabase
    .from(SUPER_ADMIN_TABLE)
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !access) return { error: 'Super admin access required.', status: 403 as const }
  return { user }
}

export async function GET() {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = createAdminClient()
    const [businesses, profiles, sales, purchases, expenses, products, memberships, audit] = await Promise.all([
      db.from('businesses').select('id,name,code,phone,address,status,created_by,created_at,updated_at,logo_url').order('created_at', { ascending: false }),
      db.from('profiles').select('id,full_name,phone,role,business_id,is_active,created_at,updated_at').order('created_at', { ascending: false }),
      db.from('sales_invoices').select('id,business_id,invoice_no,status,grand_total,sold_at,created_at,order_channel,order_status').is('deleted_at', null).order('created_at', { ascending: false }).limit(1000),
      db.from('purchase_invoices').select('id,business_id,invoice_no,status,grand_total,invoice_date,created_at').order('created_at', { ascending: false }).limit(1000),
      db.from('expenses').select('id,business_id,expense_no,category,amount,expense_date,created_at').order('created_at', { ascending: false }).limit(1000),
      db.from('products').select('id,business_id,is_active,current_stock,reorder_level,created_at').limit(2000),
      db.from('customer_business_memberships').select('id,business_id,user_id,is_active,joined_at').limit(5000),
      db.from('audit_logs').select('id,business_id,actor_id,action,entity_type,entity_id,metadata,created_at').order('created_at', { ascending: false }).limit(100),
    ])

    const firstError = [businesses, profiles, sales, purchases, expenses, products, memberships, audit].find((result) => result.error)?.error
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 })

    const shopRows = businesses.data ?? []
    const userRows = profiles.data ?? []
    const saleRows = sales.data ?? []
    const purchaseRows = purchases.data ?? []
    const expenseRows = expenses.data ?? []
    const productRows = products.data ?? []
    const membershipRows = memberships.data ?? []

    const sum = (rows: Array<{ grand_total?: number | string | null }>) => rows.reduce((total, row) => total + Number(row.grand_total ?? 0), 0)
    const expenseTotal = expenseRows.reduce((total, row) => total + Number(row.amount ?? 0), 0)
    const activeShops = shopRows.filter((shop) => shop.status === 'active').length
    const activeUsers = userRows.filter((user) => user.is_active).length
    const customerUsers = userRows.filter((user) => user.role === 'user').length
    const adminUsers = userRows.filter((user) => user.role === 'admin').length
    const staffUsers = userRows.filter((user) => user.role === 'staff').length
    const lowStock = productRows.filter((product) => product.is_active && Number(product.current_stock ?? 0) <= Number(product.reorder_level ?? 0)).length

    const salesTotal = sum(saleRows)
    const purchaseTotal = sum(purchaseRows)
    const netAfterExpenses = salesTotal - purchaseTotal - expenseTotal

    const shopStats = shopRows.map((shop) => {
      const shopUsers = userRows.filter((user) => user.business_id === shop.id)
      const shopSales = saleRows.filter((sale) => sale.business_id === shop.id)
      const shopPurchases = purchaseRows.filter((purchase) => purchase.business_id === shop.id)
      const shopExpenses = expenseRows.filter((expense) => expense.business_id === shop.id)
      const shopProducts = productRows.filter((product) => product.business_id === shop.id)
      const shopCustomers = membershipRows.filter((membership) => membership.business_id === shop.id && membership.is_active).length
      return {
        ...shop,
        owner: shopUsers.find((user) => user.role === 'admin') ?? null,
        users: shopUsers.length,
        activeUsers: shopUsers.filter((user) => user.is_active).length,
        customers: shopCustomers,
        products: shopProducts.length,
        lowStock: shopProducts.filter((product) => product.is_active && Number(product.current_stock ?? 0) <= Number(product.reorder_level ?? 0)).length,
        salesCount: shopSales.length,
        salesTotal: sum(shopSales),
        purchaseCount: shopPurchases.length,
        purchaseTotal: sum(shopPurchases),
        expenseTotal: shopExpenses.reduce((total, row) => total + Number(row.amount ?? 0), 0),
      }
    })

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      metrics: {
        shops: shopRows.length,
        activeShops,
        inactiveShops: shopRows.length - activeShops,
        users: userRows.length,
        activeUsers,
        customers: customerUsers,
        admins: adminUsers,
        staff: staffUsers,
        products: productRows.length,
        lowStock,
        salesCount: saleRows.length,
        salesTotal,
        purchaseCount: purchaseRows.length,
        purchaseTotal,
        expenseTotal,
        netAfterExpenses,
        customerMemberships: membershipRows.filter((membership) => membership.is_active).length,
      },
      shops: shopStats,
      users: userRows,
      recentActivity: audit.data ?? [],
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load platform analytics.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => null)
  const action = body?.action
  const targetId = body?.targetId

  if (!['activate_shop', 'deactivate_shop', 'activate_user', 'deactivate_user'].includes(action) || typeof targetId !== 'string') {
    return NextResponse.json({ error: 'Invalid control action.' }, { status: 400 })
  }

  try {
    const db = createAdminClient()
    if (action === 'activate_shop' || action === 'deactivate_shop') {
      const status = action === 'activate_shop' ? 'active' : 'inactive'
      const { data, error } = await db.from('businesses').update({ status, updated_at: new Date().toISOString() }).eq('id', targetId).select('id,name,status').maybeSingle()
      if (error || !data) return NextResponse.json({ error: error?.message ?? 'Shop not found.' }, { status: error ? 500 : 404 })
      await db.from('audit_logs').insert({ business_id: targetId, actor_id: auth.user.id, action: `platform.shop_${status}`, entity_type: 'business', entity_id: targetId, metadata: { source: 'super_admin_portal' } })
      return NextResponse.json({ message: `Shop ${status}.`, shop: data })
    }

    if (targetId === auth.user.id) return NextResponse.json({ error: 'You cannot deactivate your own super admin account.' }, { status: 400 })
    const isActive = action === 'activate_user'
    const { data, error } = await db.from('profiles').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', targetId).select('id,full_name,phone,role,is_active,business_id').maybeSingle()
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'User not found.' }, { status: error ? 500 : 404 })
    await db.from('audit_logs').insert({ business_id: data.business_id, actor_id: auth.user.id, action: `platform.user_${isActive ? 'activated' : 'deactivated'}`, entity_type: 'profile', entity_id: targetId, metadata: { source: 'super_admin_portal' } })
    return NextResponse.json({ message: `User ${isActive ? 'activated' : 'deactivated'}.`, user: data })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to apply control action.' }, { status: 500 })
  }
}
