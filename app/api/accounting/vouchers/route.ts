import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema=z.object({voucher_type:z.enum(['journal','contra','payment','receipt']),voucher_no:z.string().trim().min(1).max(50),entry_date:z.string(),narration:z.string().trim().max(500).optional(),lines:z.array(z.object({account_id:z.string().uuid(),party_id:z.string().uuid().nullable().optional(),debit:z.coerce.number().min(0),credit:z.coerce.number().min(0),narration:z.string().max(500).optional()})).min(2)})
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
 const {data:profile}=await supabase.from('profiles').select('id,business_id,role,is_active').eq('id',user.id).maybeSingle();if(!profile?.is_active||!profile.business_id||profile.role!=='admin')return NextResponse.json({error:'Admin access required'},{status:403})
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Invalid voucher'},{status:400});const d=parsed.data
 const debit=d.lines.reduce((s,x)=>s+x.debit,0),credit=d.lines.reduce((s,x)=>s+x.credit,0);if(debit<=0||Math.abs(debit-credit)>0.01)return NextResponse.json({error:'Voucher must have equal debit and credit totals'},{status:400})
 if(d.lines.some(x=>(x.debit>0&&x.credit>0)||(x.debit===0&&x.credit===0)))return NextResponse.json({error:'Each voucher line must be either debit or credit'},{status:400})
 const ids=d.lines.map(x=>x.account_id);const {data:accounts,error:ae}=await supabase.from('accounts').select('id').eq('business_id',profile.business_id).in('id',ids);if(ae||!accounts||accounts.length!==new Set(ids).size)return NextResponse.json({error:'One or more accounts are invalid'},{status:400})
 const {data:entry,error}=await supabase.from('journal_entries').insert({business_id:profile.business_id,voucher_type:d.voucher_type,voucher_no:d.voucher_no,entry_date:d.entry_date,narration:d.narration||null,created_by:user.id}).select('id').single();if(error)return NextResponse.json({error:error.message},{status:400})
 const {error:le}=await supabase.from('journal_lines').insert(d.lines.map(x=>({journal_entry_id:entry.id,business_id:profile.business_id,account_id:x.account_id,party_id:x.party_id||null,debit:x.debit,credit:x.credit,narration:x.narration||d.narration||null})));if(le){await supabase.from('journal_entries').delete().eq('id',entry.id);return NextResponse.json({error:le.message},{status:400})}
 return NextResponse.json({id:entry.id}, {status:201})
}
