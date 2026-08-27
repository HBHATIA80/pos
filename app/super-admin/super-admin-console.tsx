'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Building2, CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign, Database, Eye, Package, RefreshCw, Search, ShieldCheck, ShoppingCart, UserCheck, UserX, Users, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

type Shop = { id:string; name:string; code:string|null; phone:string|null; address:string|null; status:string; created_at:string; owner:{id:string;full_name:string;phone:string|null;role:string;is_active:boolean}|null; users:number; activeUsers:number; customers:number; products:number; lowStock:number; salesCount:number; salesTotal:number; purchaseCount:number; purchaseTotal:number; expenseTotal:number }
type UserRow = { id:string; full_name:string; phone:string|null; role:string; business_id:string|null; is_active:boolean; created_at:string }
type ActivityRow = { id:number; business_id:string|null; actor_id:string|null; action:string; entity_type:string; entity_id:string|null; metadata:Record<string,unknown>; created_at:string }
type Data = { generatedAt:string; metrics:Record<string,number>; shops:Shop[]; users:UserRow[]; recentActivity:ActivityRow[] }

const money = (value:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value)
const date = (value:string) => new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})

export default function SuperAdminConsole(){
  const [data,setData]=useState<Data|null>(null)
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [tab,setTab]=useState<'shops'|'users'|'activity'>('shops')
  const [busy,setBusy]=useState<string|null>(null)
  const [expanded,setExpanded]=useState<string|null>(null)

  const load=useCallback(async()=>{
    setLoading(true)
    try{ const r=await fetch('/api/super-admin',{cache:'no-store'}); const body=await r.json(); if(!r.ok) throw new Error(body.error||'Unable to load control center'); setData(body) }
    catch(e){ toast.error(e instanceof Error?e.message:'Unable to load control center') }
    finally{ setLoading(false) }
  },[])
  useEffect(()=>{ void load() },[load])

  const filteredShops=useMemo(()=>{
    const q=search.trim().toLowerCase(); if(!q) return data?.shops??[]
    return (data?.shops??[]).filter(s=>[s.name,s.code,s.phone,s.owner?.full_name,s.owner?.phone].some(v=>String(v??'').toLowerCase().includes(q)))
  },[data,search])
  const filteredUsers=useMemo(()=>{
    const q=search.trim().toLowerCase(); if(!q) return data?.users??[]
    return (data?.users??[]).filter(u=>[u.full_name,u.phone,u.role,u.business_id].some(v=>String(v??'').toLowerCase().includes(q)))
  },[data,search])

  async function control(action:string,targetId:string){
    setBusy(targetId)
    try{ const r=await fetch('/api/super-admin',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action,targetId})}); const body=await r.json(); if(!r.ok) throw new Error(body.error||'Action failed'); toast.success(body.message); await load() }
    catch(e){ toast.error(e instanceof Error?e.message:'Action failed') }
    finally{ setBusy(null) }
  }

  if(loading&&!data) return <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-blue-600"/></main>
  if(!data) return <main className="mx-auto max-w-7xl p-6"><div className="rounded-2xl border bg-white p-8 text-center">Unable to load platform control center.</div></main>

  const m=data.metrics
  return <main className="mx-auto max-w-7xl space-y-6">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-8 text-white sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold"><ShieldCheck className="h-4 w-4"/> SUPER ADMIN</div><h1 className="mt-3 text-3xl font-black tracking-tight">BIZYBUK.IN Platform Control</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">One control center for every shop, user, customer, transaction and platform activity. This view is restricted to your designated super admin account.</p></div>
          <button onClick={()=>void load()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15"><RefreshCw className="h-4 w-4"/> Refresh</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4 lg:grid-cols-8">
        <Metric icon={Building2} label="Shops" value={m.shops}/><Metric icon={CheckCircle2} label="Active shops" value={m.activeShops}/><Metric icon={Users} label="Users" value={m.users}/><Metric icon={UserCheck} label="Customers" value={m.customers}/><Metric icon={ShoppingCart} label="Sales" value={money(m.salesTotal)} /><Metric icon={CircleDollarSign} label="Purchases" value={money(m.purchaseTotal)} /><Metric icon={Database} label="Expenses" value={money(m.expenseTotal)}/><Metric icon={AlertTriangle} label="Low stock" value={m.lowStock}/>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-4">
      <StatCard title="Platform net" value={money(m.netAfterExpenses)} hint="Sales − purchases − expenses"/>
      <StatCard title="Sales invoices" value={m.salesCount.toLocaleString('en-IN')} hint={`${money(m.salesTotal)} gross sales`}/>
      <StatCard title="Customer memberships" value={m.customerMemberships.toLocaleString('en-IN')} hint={`${m.activeUsers} active user accounts`}/>
      <StatCard title="User mix" value={`${m.admins} admin / ${m.staff} staff`} hint={`${m.customers} customer accounts`}/>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex gap-2 rounded-xl bg-slate-100 p-1"><Tab active={tab==='shops'} onClick={()=>setTab('shops')}>Shops</Tab><Tab active={tab==='users'} onClick={()=>setTab('users')}>Users</Tab><Tab active={tab==='activity'} onClick={()=>setTab('activity')}>Audit activity</Tab></div>
        {tab!=='activity'&&<div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==='shops'?'Search shops, owners, phone...':'Search users, phone, role...'} className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400"/></div>}
      </div>
      {tab==='shops'&&<div className="divide-y divide-slate-100">{filteredShops.map(shop=><div key={shop.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-black text-slate-950">{shop.name}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${shop.status==='active'?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{shop.status}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-600">{shop.code}</span></div><p className="mt-1 text-xs text-slate-500">Owner: {shop.owner?.full_name??'Not found'} {shop.owner?.phone?`• ${shop.owner.phone}`:''} • Created {date(shop.created_at)}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7"><Mini label="Users" value={shop.users}/><Mini label="Customers" value={shop.customers}/><Mini label="Products" value={shop.products}/><Mini label="Low stock" value={shop.lowStock}/><Mini label="Sales" value={shop.salesCount}/><Mini label="Sales ₹" value={money(shop.salesTotal)}/><Mini label="Expenses ₹" value={money(shop.expenseTotal)}/></div></div><div className="flex shrink-0 gap-2"><button onClick={()=>setExpanded(expanded===shop.id?null:shop.id)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50">{expanded===shop.id?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>} Details</button><button disabled={busy===shop.id} onClick={()=>void control(shop.status==='active'?'deactivate_shop':'activate_shop',shop.id)} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${shop.status==='active'?'bg-rose-600 hover:bg-rose-700':'bg-emerald-600 hover:bg-emerald-700'}`}>{shop.status==='active'?<XCircle className="h-4 w-4"/>:<CheckCircle2 className="h-4 w-4"/>}{shop.status==='active'?'Suspend':'Activate'}</button></div></div>{expanded===shop.id&&<div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Shop phone</p><p className="mt-1 font-semibold">{shop.phone||'—'}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Address</p><p className="mt-1 font-semibold">{shop.address||'—'}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Purchases</p><p className="mt-1 font-semibold">{shop.purchaseCount} • {money(shop.purchaseTotal)}</p></div></div>}</div>)}{filteredShops.length===0&&<Empty text="No shops match your search."/>}</div>}
      {tab==='users'&&<div className="divide-y divide-slate-100">{filteredUsers.map(user=><div key={user.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{user.full_name}</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold capitalize text-blue-700">{user.role}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${user.is_active?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{user.is_active?'active':'inactive'}</span></div><p className="mt-1 text-xs text-slate-500">{user.phone||'No phone'} • Business {data.shops.find(s=>s.id===user.business_id)?.name||'—'} • Joined {date(user.created_at)}</p></div><button disabled={busy===user.id} onClick={()=>void control(user.is_active?'deactivate_user':'activate_user',user.id)} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 ${user.is_active?'bg-rose-600 hover:bg-rose-700':'bg-emerald-600 hover:bg-emerald-700'}`}>{user.is_active?<UserX className="h-4 w-4"/>:<UserCheck className="h-4 w-4"/>}{user.is_active?'Deactivate':'Activate'}</button></div>)}{filteredUsers.length===0&&<Empty text="No users match your search."/>}</div>}
      {tab==='activity'&&<div className="divide-y divide-slate-100">{data.recentActivity.map(item=><div key={item.id} className="p-4 sm:p-5"><div className="flex items-start gap-3"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"/><div className="min-w-0"><p className="text-sm font-bold text-slate-800">{item.action}</p><p className="mt-1 text-xs text-slate-500">{item.entity_type}{item.entity_id?` • ${item.entity_id}`:''} • {date(item.created_at)}</p></div></div></div>)}{data.recentActivity.length===0&&<Empty text="No audit activity recorded yet."/>}</div>}
    </section>
    <p className="pb-4 text-xs text-slate-400">Last refreshed: {date(data.generatedAt)}. Control actions are written to the platform audit log.</p>
  </main>
}
function Metric({icon:Icon,label,value}:{icon:React.ComponentType<{className?:string}>;label:string;value:number|string}){return <div className="bg-white p-4"><Icon className="h-4 w-4 text-blue-600"/><p className="mt-2 text-lg font-black">{value}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p></div>}
function StatCard({title,value,hint}:{title:string;value:string;hint:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p><p className="mt-2 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></div>}
function Mini({label,value}:{label:string;value:string|number}){return <div className="rounded-lg bg-white px-2.5 py-2"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-0.5 font-black text-slate-800">{value}</p></div>}
function Tab({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){return <button onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-bold ${active?'bg-white text-slate-950 shadow-sm':'text-slate-500'}`}>{children}</button>}
function Empty({text}:{text:string}){return <div className="p-10 text-center text-sm text-slate-500">{text}</div>}
