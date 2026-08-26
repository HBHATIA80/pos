'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BarChart3, BookOpen, CreditCard, FileText, LayoutDashboard, Lightbulb, Menu, Package, PanelLeftClose, PanelLeftOpen, ReceiptText, ShoppingBag, ShoppingCart, Store, Tags, Users, WalletCards } from 'lucide-react'
import LogoutButton from './logout-button'

type Props = { children: React.ReactNode; profile: { fullName: string; role: 'admin' | 'staff' | 'user'; phone: string | null }; businessName: string }
type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }

const MARKETPLACE = '/marketplace'
const MARKETPLACE_PRODUCTS = '/marketplace/products'
const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Inventory', href: '/dashboard/inventory', icon: Package },
  { label: 'Categories', href: '/dashboard/categories', icon: Tags },
  { label: 'Parties', href: '/dashboard/parties', icon: Users },
  { label: 'Order Management', href: '/dashboard/order-management', icon: FileText },
  { label: 'Sales', href: '/dashboard/sales', icon: ShoppingCart },
  { label: 'Purchases', href: '/dashboard/purchases', icon: ShoppingBag },
  { label: 'Marketplace', href: MARKETPLACE, icon: Store },
  { label: 'List on Marketplace', href: '/dashboard/marketplace/manage', icon: Store },
]
const financeNav: NavItem[] = [
  { label: 'Accounts', href: '/dashboard/accounts', icon: BookOpen },
  { label: 'Journal Vouchers', href: '/dashboard/journal-vouchers', icon: FileText },
  { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  { label: 'Receipts', href: '/dashboard/receipts', icon: ReceiptText },
  { label: 'Expenses', href: '/dashboard/expenses', icon: WalletCards },
  { label: 'Ledger', href: '/dashboard/ledger', icon: FileText },
  { label: 'Analysis', href: '/dashboard/analysis', icon: BarChart3, adminOnly: true },
]
const userNav: NavItem[] = [
  { label: 'Shop & Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { label: 'Marketplace', href: MARKETPLACE, icon: Store },
  { label: 'My Ledger', href: '/dashboard/my-ledger', icon: WalletCards },
]

function openMarketplace() {
  if (typeof window === 'undefined') return
  const popup = window.open(MARKETPLACE_PRODUCTS, 'bizbook-marketplace-products', 'popup=yes,width=1400,height=900,resizable=yes,scrollbars=yes')
  if (popup) popup.focus()
  else window.location.assign(MARKETPLACE_PRODUCTS)
}

function NavSection({ title, items, role, pathname, onNavigate }: { title: string; items: NavItem[]; role: Props['profile']['role']; pathname: string; onNavigate: () => void }) {
  return <div className="mt-6"><p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p><nav className="mt-2 space-y-1">{items.map(item => {
    if (item.adminOnly && role !== 'admin') return null
    const Icon = item.icon
    const active = pathname === item.href || (item.href === '/dashboard/products' && pathname === '/dashboard/categories')
    if (item.href === MARKETPLACE) return <button key={item.label} type="button" onClick={() => { openMarketplace(); onNavigate() }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className="h-5 w-5 shrink-0" /><span>{item.label}</span></button>
    return <Link key={item.label} href={item.href} onClick={onNavigate} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className="h-5 w-5 shrink-0" /><span>{item.label}</span></Link>
  })}</nav></div>
}

function SuggestionsLink({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  return <Link href="/feedback" onClick={onNavigate} title="Suggestions & Help" className={`mt-3 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 ${compact ? 'justify-center' : ''}`}><Lightbulb className="h-5 w-5 shrink-0" />{!compact && <span>Suggestions & Help</span>}</Link>
}

export default function POSShell({ children, profile, businessName }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const closeMobile = () => setMobileOpen(false)
  const adminItems: NavItem[] = [{ label: 'Team', href: '/dashboard/team', icon: Users }, { label: 'Shop Code', href: '/dashboard/shop-code', icon: Store }]
  const isCustomer = profile.role === 'user'
  const desktopNav = isCustomer ? userNav : mainNav
  const desktopFinance = isCustomer ? [] : financeNav
  const allCollapsed = [...desktopNav, ...desktopFinance.filter(x => !x.adminOnly || profile.role === 'admin'), ...(!isCustomer && profile.role === 'admin' ? adminItems : [])]

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <aside className={`fixed inset-y-0 left-0 z-50 hidden border-r border-slate-200 bg-white transition-all duration-200 lg:flex lg:flex-col ${collapsed ? 'w-[76px]' : 'w-64'}`}>
      <div className="flex h-16 items-center border-b border-slate-200 px-4"><Link href={isCustomer ? '/dashboard/orders' : '/dashboard'} aria-label="BIZBook" className="flex min-w-0 items-center gap-3"><BizLogo compact={collapsed} /></Link></div>
      <div className="flex-1 overflow-y-auto px-3 py-4">{!collapsed ? <><NavSection title={isCustomer ? 'Customer Portal' : 'Workspace'} items={desktopNav} role={profile.role} pathname={pathname} onNavigate={closeMobile} />{desktopFinance.length > 0 && <NavSection title="Accounts & Finance" items={desktopFinance} role={profile.role} pathname={pathname} onNavigate={closeMobile} />}{!isCustomer && profile.role === 'admin' && <NavSection title="Administration" items={adminItems} role={profile.role} pathname={pathname} onNavigate={closeMobile} />}<SuggestionsLink onNavigate={closeMobile} /></> : <nav className="space-y-2 pt-2">{allCollapsed.map(item => { const Icon = item.icon; if (item.href === MARKETPLACE) return <button key={item.label} type="button" onClick={openMarketplace} title={item.label} className={`flex w-full items-center justify-center rounded-xl p-2.5 ${pathname === item.href ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-5 w-5" /></button>; return <Link key={item.label} href={item.href} title={item.label} className={`flex items-center justify-center rounded-xl p-2.5 ${pathname === item.href ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-5 w-5" /></Link> })}<SuggestionsLink compact /></nav>}</div>
      <div className="border-t border-slate-200 p-3"><div className={`mb-2 flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-50 to-fuchsia-50 p-3 ${collapsed ? 'justify-center' : ''}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-sm font-bold text-white">{profile.fullName.charAt(0).toUpperCase()}</span>{!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{profile.fullName}</p><p className="truncate text-xs capitalize text-slate-500">{isCustomer ? 'Customer' : profile.role}</p></div>}</div><button type="button" onClick={() => setCollapsed(v => !v)} className={`hidden items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 lg:flex ${collapsed ? 'mx-auto' : ''}`}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}{!collapsed && 'Collapse'}</button></div>
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" onClick={closeMobile} className="absolute inset-0 bg-slate-950/40" /><aside className="relative flex h-full w-[min(88vw,330px)] flex-col bg-white shadow-2xl"><div className="flex h-16 items-center justify-between border-b border-slate-200 px-4"><Link href={isCustomer ? '/dashboard/orders' : '/dashboard'} onClick={closeMobile}><BizLogo /></Link><button onClick={closeMobile} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu"><span className="text-xl">×</span></button></div><div className="flex-1 overflow-y-auto px-3 py-4"><NavSection title={isCustomer ? 'Customer Portal' : 'Workspace'} items={desktopNav} role={profile.role} pathname={pathname} onNavigate={closeMobile} />{desktopFinance.length > 0 && <NavSection title="Accounts & Finance" items={desktopFinance} role={profile.role} pathname={pathname} onNavigate={closeMobile} />}{!isCustomer && profile.role === 'admin' && <NavSection title="Administration" items={adminItems} role={profile.role} pathname={pathname} onNavigate={closeMobile} />}<SuggestionsLink onNavigate={closeMobile} /></div></aside></div>}
    <div className={`min-h-screen transition-all duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}`}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{businessName}</p><p className="hidden text-xs text-slate-500 sm:block">{isCustomer ? 'BIZBook Customer Portal' : 'BIZBook POS Workspace'}</p></div></div><div className="flex items-center gap-2 sm:gap-3"><button type="button" onClick={openMarketplace} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 sm:px-4 sm:text-sm"><Store className="h-4 w-4" /><span>Marketplace</span></button><div className="hidden text-right sm:block"><p className="max-w-[180px] truncate text-sm font-medium">{profile.fullName}</p><p className="text-xs capitalize text-slate-500">{isCustomer ? 'Customer' : profile.role}</p></div><LogoutButton /></div></div></header>
      <main className="px-3 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur"><div className={`mx-auto grid max-w-lg gap-1 ${isCustomer ? 'grid-cols-3' : 'grid-cols-4'}`}>{isCustomer ? <><Link href="/dashboard/orders" className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 ${pathname === '/dashboard/orders' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}><ShoppingCart className="h-5 w-5" /><span className="text-[10px] font-bold">Shop</span></Link><button type="button" onClick={openMarketplace} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-slate-500"><Store className="h-5 w-5" /><span className="text-[10px] font-bold">Market</span></button><button type="button" onClick={() => setMobileOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-slate-500"><Menu className="h-5 w-5" /><span className="text-[10px] font-bold">Menu</span></button></> : <><Link href="/dashboard" className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5"><LayoutDashboard className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></Link><Link href="/dashboard/inventory" className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 ${pathname === '/dashboard/inventory' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}><Package className="h-5 w-5" /><span className="text-[10px] font-medium">Inventory</span></Link><button type="button" onClick={openMarketplace} className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-slate-500"><Store className="h-5 w-5" /><span className="text-[10px] font-medium">Market</span></button><Link href="/dashboard/sales" className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5"><ShoppingCart className="h-5 w-5" /><span className="text-[10px] font-medium">Sales</span></Link></>}</div></nav>
    </div>
  </div>
}

function BizLogo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-sm"><span className="text-sm font-black">B</span></span>{!compact && <span className="truncate text-lg font-black tracking-tight">BIZ<span className="text-indigo-600">Book</span></span>}</div>
}
