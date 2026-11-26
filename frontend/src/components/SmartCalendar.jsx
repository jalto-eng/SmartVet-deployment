import {useEffect,useState} from 'react'
const today = () => new Date(Date.now()+8*3600000).toISOString().slice(0,10)
export default function SmartCalendar({service,secondService,value,onChange,referenceNumber,contactNumber}) {
 contactNumber = /^09[0-9]{9}$/.test(contactNumber || '') ? contactNumber : undefined
 const [month,setMonth]=useState(()=> (value || today()).slice(0,7))
 const [result,setResult]=useState(null)
 const [error,setError]=useState('')
 const [retry,setRetry]=useState(0)
 const key=JSON.stringify([month,service,secondService,referenceNumber,contactNumber,retry])
 useEffect(()=>{
   if(!service)return
   const controller=new AbortController()
   setError('')
   fetch('/api/appointments/calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({month,service,secondService,referenceNumber,contactNumber}),signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.message);return data}).then(data=>{if(!controller.signal.aborted)setResult({key,days:data.days})}).catch(e=>{if(!controller.signal.aborted)setError(e.message || 'Unable to load calendar.')})
   return ()=>controller.abort()
 },[key,month,service,secondService,referenceNumber,contactNumber])
 const days=result?.key===key?result.days:{}
 const start=new Date(month+'-01T00:00:00Z')
 const count=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate()
 function move(delta){const d=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+delta,1));setMonth(d.toISOString().slice(0,7))}
 return <div className="border border-slate-200 rounded-xl p-3 mt-2 space-y-3">
 <div className="flex items-center justify-between gap-2"><button type="button" aria-label="Previous month" disabled={month<=today().slice(0,7)} onClick={()=>move(-1)} className="p-2 disabled:opacity-30">‹</button><strong>{start.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})}</strong><button type="button" aria-label="Next month" onClick={()=>move(1)} className="p-2">›</button></div>
 <div className="grid grid-cols-7 gap-1 text-center text-xs">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><span key={d}>{d}</span>)}{Array.from({length:start.getUTCDay()},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:count},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0');const status=days[date];return <button type="button" key={date} disabled={status!=='available'} aria-label={`${date}: ${status||'not checked'}`} aria-pressed={value===date} onClick={()=>onChange(date)} className={'rounded-md py-2 font-medium '+(status==='available'?(value===date?'bg-teal-600 text-white':'bg-green-100 text-green-800 hover:bg-green-200'):status==='unavailable'?'bg-red-100 text-red-700 line-through':'bg-slate-100 text-slate-400')}>{i+1}</button>})}</div>
 <p className="text-xs text-slate-600">Green: available · Red: no fitting slot · Gray: closed, past or unchecked</p>
 {!service?<p className="text-sm">Select a service first.</p>:error?<p role="alert" className="text-sm text-red-600">{error}</p>:result?.key!==key?<p className="text-sm">Checking availability…</p>:null}
 <button type="button" className="text-sm text-teal-700 underline" disabled={!service} onClick={()=>setRetry(n=>n+1)}>Refresh availability</button>
 {value&&<p className="text-sm">Selected date: {value}</p>}
 </div>
}
