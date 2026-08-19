'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Minus, Plus, RefreshCw, Search, ShoppingCart, Trash2, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Product = { id:string; sku:string; barcode:string|null; name:string; sale_price:number; current_stock:number; reorder_level:number }
type Party = { id:string; party_code:string; name:string; phone:string|null; party_type:'customer'|'supplier'|'both' }
type CartItem = Product & { quantity:number; unit_price:number; pricing_source:'base'|'price_list' }
type Invoice = { id:string; invoice_no:string; status:'draft'|'completed'|'void'; grand_total:number; subtotal:number; discount_amount:number; created_at:string; parties?: { name:string } | null }

export default function SalesPage() {
  const [products,setProducts]=useState<Product[]>([])
  const [parties,setParties]=useState<Party[]>([])
  const [invoices,setInvoices]=useState<Invoice[]>([])
  const [cart,setCart]=useState<CartItem[]>([])
  const [productSearch,setProductSearch]=useState('')
  const [partySearch,setPartySearch]=useState('')
  const [customer,setCustomer]=useState('')
  const [saving,setSaving]=useState(false)
  const [loading,setLoading]=useState(true)
  const [productLoading,setProductLoading]=useState(false)
  const [partyLoading,setPartyLoading]=useState(false)

  async function loadInvoices() {
    const response=await fetch('/api/sales',{cache:'no-store'})
    const result=await response.json().catch(()=>({}))
    if(response.ok)setInvoices(result.invoices??[])
  }

  async function searchProducts(q:string) {
    setProductLoading(true)
    const response=await fetch(`/api/pos/products?q=${encodeURIComponent(q)}&limit=30`,{cache:'no-store'})
    const result=await response.json().catch(()=>({}))
    setProductLoading(false)
    if(!response.ok)return toast.error(result.error??'Unable to search products')
    setProducts(result.products??[])
  }

  async function searchParties(q:string) {
    setPartyLoading(true)
    const response=await fetch(`/api/pos/parties?q=${encodeURIComponent(q)}&limit=30`,{cache:'no-store'})
    const result=await response.json().catch(()=>({}))
    setPartyLoading(false)
    if(!response.ok)return toast.error(result.error??'Unable to search customers')
    setParties((result.parties??[]).filter((x:Party)=>x.party_type==='customer'||x.party_type==='both'))
  }

  async function load() {
    setLoading(true)
    await Promise.all([searchProducts(''),searchParties(''),loadInvoices()])
    setLoading(false)
  }

  useEffect(()=>{void load()},[])
  useEffect(()=>{const timer=setTimeout(()=>void searchProducts(productSearch),250);return()=>clearTimeout(timer)},[productSearch])
  useEffect(()=>{const timer=setTimeout(()=>void searchParties(partySearch),250);return()=>clearTimeout(timer)},[partySearch])

  const subtotal=useMemo(()=>cart.reduce((sum,item)=>sum+item.quantity*Number(item.unit_price),0),[cart])
  const total=subtotal

  async function resolvePrice(productId:string,quantity:number) {
    const params=new URLSearchParams({product_id:productId,quantity:String(quantity)})
    if(customer)params.set('customer_id',customer)
    const response=await fetch(`/api/pos/pricing?${params.toString()}`,{cache:'no-store'})
    const result=await response.json().catch(()=>({}))
    if(!response.ok)throw new Error(result.error??'Unable to resolve price')
    return {unit_price:Number(result.unit_price),pricing_source:result.source as CartItem['pricing_source']}
  }

  async function add(product:Product) {
    try {
      const existing=cart.find(x=>x.id===product.id)
      const nextQuantity=(existing?.quantity??0)+1
      const price=await resolvePrice(product.id,nextQuantity)
      setCart(current=>existing
        ? current.map(x=>x.id===product.id?{...x,quantity:nextQuantity,...price}:x)
        : [...current,{...product,quantity:1,...price}])
    } catch(error) { toast.error(error instanceof Error?error.message:'Unable to add product') }
  }

  async function setQty(id:string,quantity:number) {
    if(quantity<=0){setCart(c=>c.filter(x=>x.id!==id));return}
    try {
      const price=await resolvePrice(id,quantity)
      setCart(c=>c.map(x=>x.id===id?{...x,quantity,...price}:x))
    } catch(error) { toast.error(error instanceof Error?error.message:'Unable to update quantity') }
  }

  async function save(status:'draft'|'completed') {
    if(!cart.length)return toast.error('Add at least one product')
    setSaving(true)
    const response=await fetch('/api/sales',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{party_id:customer||null,status,items:cart.map(x=>({product_id:x.id,quantity:x.quantity,unit_price:x.unit_price,discount_amount:0}))}})})
    const result=await response.json().catch(()=>({}));setSaving(false)
    if(!response.ok)return toast.error(result.error??'Unable to save sale')
    toast.success(status==='completed'?'Sale completed':'Draft sale saved');setCart([]);setCustomer('');setPartySearch('');void loadInvoices()
  }

  async function action(id:string,action:'complete'|'void') {
    const response=await fetch('/api/sales',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})})
    const result=await response.json().catch(()=>({}))
    if(!response.ok)return toast.error(result.error??'Unable to update invoice')
    toast.success(action==='complete'?'Sale completed':'Sale voided');void loadInvoices()
  }

  const selectedCustomer=parties.find(p=>p.id===customer)

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div><span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Phase 7.1 · Scalable POS</span><h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Point of Sale</h1><p className="mt-2 text-sm text-slate-500">Search products and customers on the server. Only matching records are loaded; the full catalogue is never placed in a browser dropdown.</p></div>
      <button onClick={()=>void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4"/> Refresh</button>
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search product, SKU or barcode" className="min-h-11 w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></div><p className="mt-2 text-xs text-slate-400">Showing up to 30 matching active products.</p></div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 sm:p-5">
          {products.map(product=><button key={product.id} onClick={()=>void add(product)} className="group rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><ShoppingCart className="h-5 w-5"/></div><p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</p><p className="mt-1 truncate text-[11px] text-slate-500">{product.sku}{product.barcode?` · ${product.barcode}`:''}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-900">{Number(product.sale_price).toFixed(2)}</span><span className="text-[10px] text-slate-400">Stock {product.current_stock}</span></div></button>)}
        </div>
        {!productLoading&&!products.length&&<div className="px-6 py-14 text-center text-sm text-slate-500">No active products match your search.</div>}
        {productLoading&&<div className="px-6 py-6 text-center text-xs text-slate-400">Searching products…</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-20 xl:h-fit">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5"><div><h2 className="font-semibold text-slate-900">Current sale</h2><p className="text-xs text-slate-500">{cart.length} line{cart.length===1?'':'s'}</p></div><button onClick={()=>setCart([])} className="text-xs font-semibold text-slate-400 hover:text-red-600">Clear</button></div>
        <div className="border-b border-slate-200 p-4 sm:p-5"><label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer (optional)</label><div className="relative mt-2"><UserRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input value={partySearch} onChange={e=>{setPartySearch(e.target.value);setCustomer('')}} placeholder="Search name, phone or code" className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500"/></div>{selectedCustomer&&<div className="mt-2 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-xs"><span className="font-semibold text-blue-800">{selectedCustomer.name}</span><button onClick={()=>{setCustomer('');setPartySearch('')}} className="text-blue-600"><X className="h-4 w-4"/></button></div>}{partySearch&&!selectedCustomer&&<div className="mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">{parties.map(p=><button key={p.id} onClick={()=>{setCustomer(p.id);setPartySearch(p.name)}} className="block w-full px-3 py-2 text-left hover:bg-slate-50"><span className="block text-sm font-semibold text-slate-800">{p.name}</span><span className="text-[11px] text-slate-400">{p.phone||p.party_code}</span></button>)}{partyLoading&&<p className="px-3 py-3 text-xs text-slate-400">Searching customers…</p>}{!partyLoading&&!parties.length&&<p className="px-3 py-3 text-xs text-slate-400">No customers found.</p>}</div>}</div>
        <div className="max-h-[42vh] divide-y divide-slate-100 overflow-y-auto">{cart.map(item=><div key={item.id} className="p-4"><div className="flex gap-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{item.name}</p><p className="text-[11px] text-slate-500">{Number(item.unit_price).toFixed(2)} / unit · {item.pricing_source==='price_list'?'customer price':'base price'}</p></div><button onClick={()=>void setQty(item.id,0)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-xl border border-slate-200"><button onClick={()=>void setQty(item.id,item.quantity-1)} className="p-2 text-slate-600"><Minus className="h-4 w-4"/></button><span className="min-w-10 text-center text-sm font-semibold">{item.quantity}</span><button onClick={()=>void setQty(item.id,item.quantity+1)} className="p-2 text-slate-600"><Plus className="h-4 w-4"/></button></div><span className="text-sm font-bold">{(item.quantity*item.unit_price).toFixed(2)}</span></div></div>)}{!cart.length&&<div className="px-6 py-14 text-center"><ShoppingCart className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-600">Cart is empty</p><p className="mt-1 text-xs text-slate-400">Search and tap a product to add it.</p></div>}</div>
        <div className="border-t border-slate-200 p-4 sm:p-5"><div className="flex items-center justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{subtotal.toFixed(2)}</span></div><div className="mt-2 flex items-center justify-between text-lg"><span className="font-bold">Total</span><span className="font-bold text-blue-700">{total.toFixed(2)}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><button disabled={saving||!cart.length} onClick={()=>void save('draft')} className="min-h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-40">Save draft</button><button disabled={saving||!cart.length} onClick={()=>void save('completed')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white disabled:opacity-40"><Check className="h-4 w-4"/>{saving?'Saving…':'Complete sale'}</button></div></div>
      </section>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-4 sm:p-5"><h2 className="font-semibold text-slate-900">Recent sales</h2><p className="mt-1 text-xs text-slate-500">Completed invoices are transaction records. Inventory and payment effects are intentionally deferred.</p></div><div className="divide-y divide-slate-100">{invoices.map(invoice=><div key={invoice.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{invoice.invoice_no}</span><Status status={invoice.status}/></div><p className="mt-1 text-xs text-slate-500">{invoice.parties?.name??'Walk-in customer'} · {new Date(invoice.created_at).toLocaleString()}</p></div><div className="flex items-center justify-between gap-4 sm:justify-end"><span className="text-sm font-bold">{Number(invoice.grand_total).toFixed(2)}</span>{invoice.status==='draft'&&<button onClick={()=>void action(invoice.id,'complete')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700"><Check className="h-4 w-4"/> Complete</button>}{invoice.status==='completed'&&<button onClick={()=>void action(invoice.id,'void')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:text-red-600"><X className="h-4 w-4"/> Void</button>}</div></div>)}{!invoices.length&&<div className="p-10 text-center text-sm text-slate-500">No sales yet.</div>}</div></section>
    {loading&&<div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">Loading POS…</div>}
  </div>
}

function Status({status}:{status:Invoice['status']}){const cls=status==='completed'?'bg-emerald-50 text-emerald-700':status==='void'?'bg-red-50 text-red-600':'bg-amber-50 text-amber-700';return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${cls}`}>{status}</span>}
