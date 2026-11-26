export default function SecondService({services, first, value, onChange}) {
  const duration = services.filter(s => s.name === first || s.name === value).reduce((sum,s)=>sum+s.duration,0)
  return <div className="space-y-2"><label className="block">Second service (optional)
    <select disabled={!first} value={value || ''} onChange={e=>onChange(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 mt-2">
      <option value="">No additional service</option>
      {services.filter(s=>s.name!==first).map(s=><option key={s.id} value={s.name}>{s.name} — {s.duration} minutes</option>)}
    </select></label><p className="bg-teal-50 text-teal-800 rounded-lg p-3">Total appointment duration: {duration} minutes · Maximum 2 services</p></div>
}
