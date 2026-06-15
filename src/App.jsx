import { useState, useEffect } from 'react'
import { supabase, COMPANY_ID } from './supabase.js'

const PINS = { javier: '1111', jake: '2222' }
const TAGS_FALLBACK = [
  { en: 'Turf', es: 'Turf' },
  { en: 'Turf + Putting green', es: 'Turf + Putting green' },
  { en: 'Putting green', es: 'Putting green' },
  { en: 'Base prep', es: 'Preparación de base' },
  { en: 'Cut & fit', es: 'Corte y ajuste' },
  { en: 'Infill', es: 'Relleno de infill' },
  { en: 'Final cleanup', es: 'Limpieza final' },
]
const T = {
  en: {
    selectRole:'Select your role', who:'Who are you?',
    fdesc:'Field entry', adesc:'Admin · PIN required', odesc:'Owner · PIN required',
    pinPrompt:'Enter your PIN', pinWrong:'Incorrect PIN.',
    enter:'Enter', register:'Register', reports:'Reports', payroll:'Payroll', team:'Team',
    wpLabel:'Worker & Project', worker:'Worker', city:'City', projNum:'Project #',
    address:'Address (optional)', date:'Date',
    hoursLabel:'Hours worked', start:'Start', end:'End', lunch:'Lunch', noBreak:'No break',
    workType:'Work type', notes:'Notes', submit:'Submit report',
    from:'From', to:'To', satOff:'+ Sat', satOn:'Sat included',
    pWorkers:'Workers', pHours:'Total hours', pTotal:'Total payroll',
    paySummary:'Payroll detail', noPay:'No reports in this period.',
    activeW:'Active workers', inactiveW:'Inactive (history preserved)',
    deactivate:'Deactivate', reactivate:'Reactivate', exists:'Worker already exists.',
    success:'Report submitted.', fill:'Please fill in all required fields.',
    noReports:'No reports yet.', supervisor:'Supervisor', installer:'Installer',
    downloadPeriod:'Download period', downloadAll:'Download all history',
    loading:'Loading...', saving:'Saving...', error:'Error, please try again.',
    myReports:'My reports', noMyReports:'You have no reports yet.',
    rateLabel:'Rate ($/hr)', updateRate:'Update',
    insights:'Insights', insightsPeriod:'Period', allTime:'All time',
    byCity:'Activity by city', byProject:'Cost by project', byWorker:'Hours by worker', weeklyTrend:'Weekly trend',
    projects:'Projects', avgCostHr:'Avg cost/hr', laborCost:'Labor cost', totalDays:'Days',
    noData:'No data for this period.',
    days: d => d===1?'1 day':`${d} days`,
    editedBy: (who, when) => `Edited by ${who} · ${when}`,
  },
  es: {
    selectRole:'Selecciona tu rol', who:'¿Quién eres?',
    fdesc:'Registro de campo', adesc:'Admin · PIN requerido', odesc:'Owner · PIN requerido',
    pinPrompt:'Ingresa tu PIN', pinWrong:'PIN incorrecto.',
    enter:'Entrar', register:'Registrar', reports:'Reportes', payroll:'Nómina', team:'Equipo',
    wpLabel:'Trabajador y proyecto', worker:'Trabajador', city:'Ciudad', projNum:'# Proyecto',
    address:'Dirección (opcional)', date:'Fecha',
    hoursLabel:'Horas trabajadas', start:'Inicio', end:'Fin', lunch:'Almuerzo', noBreak:'Sin almuerzo',
    workType:'Tipo de trabajo', notes:'Notas', submit:'Enviar reporte',
    from:'Desde', to:'Hasta', satOff:'+ Sáb', satOn:'Sáb incluido',
    pWorkers:'Trabajadores', pHours:'Horas totales', pTotal:'Nómina total',
    paySummary:'Detalle de nómina', noPay:'Sin reportes en este período.',
    activeW:'Trabajadores activos', inactiveW:'Inactivos (historial preservado)',
    deactivate:'Desactivar', reactivate:'Reactivar', exists:'Ese trabajador ya existe.',
    success:'Reporte enviado.', fill:'Completa todos los campos requeridos.',
    noReports:'Sin reportes aún.', supervisor:'Supervisor', installer:'Installer',
    downloadPeriod:'Descargar período', downloadAll:'Descargar historial completo',
    loading:'Cargando...', saving:'Guardando...', error:'Error, intenta de nuevo.',
    myReports:'Mis reportes', noMyReports:'Aún no tienes reportes.',
    rateLabel:'Tarifa ($/hr)', updateRate:'Actualizar',
    insights:'Insights', insightsPeriod:'Período', allTime:'Todo el tiempo',
    byCity:'Actividad por ciudad', byProject:'Costo por proyecto', byWorker:'Horas por trabajador', weeklyTrend:'Tendencia semanal',
    projects:'Proyectos', avgCostHr:'Costo prom/hr', laborCost:'Costo de mano de obra', totalDays:'Días',
    noData:'Sin datos para este período.',
    days: d => d===1?'1 día':`${d} días`,
    editedBy: (who, when) => `Editado por ${who} · ${when}`,
  }
}

const card = { background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'1.25rem', marginBottom:'1rem', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }
const sLabel = { fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14, display:'block' }
const inp = (focused) => ({ fontSize:14, color:'#1e293b', background:'#f8fafc', border:`2px solid ${focused?'#2563eb':'#cbd5e1'}`, borderRadius:8, padding:'9px 12px', width:'100%', outline:'none', boxShadow:focused?'0 0 0 3px #2563eb22':'none', transition:'border 0.15s, box-shadow 0.15s' })
const statBox = (color) => ({ background:color+'15', borderRadius:10, padding:14, flex:1, borderLeft:`3px solid ${color}` })
const btn = (bg, color, border) => ({ padding:'9px 16px', borderRadius:8, border:border||'none', background:bg, color, fontSize:13, fontWeight:600, cursor:'pointer' })

function getMonday(offset=0) {
  const d=new Date(), day=d.getDay()
  const diff=d.getDate()-day+(day===0?-6:1)+offset*7
  const mon=new Date(d); mon.setDate(diff); mon.setHours(0,0,0,0)
  return mon
}
function toISO(d){ return d.toISOString().split('T')[0] }
function fmtDateStr(iso, lang) {
  return new Date(iso+'T12:00:00').toLocaleDateString(lang==='es'?'es-MX':'en-US',{weekday:'short',month:'short',day:'numeric'})
}

export default function App() {
  const [lang, setLang] = useState('en')
  const t = T[lang]
  const [role, setRole] = useState(null)
  const [pending, setPending] = useState(null)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [tab, setTab] = useState('register')
  const [workers, setWorkers] = useState([])
  const [reports, setReports] = useState([])
  const [tags, setTags] = useState(TAGS_FALLBACK)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [satIncluded, setSatIncluded] = useState(false)
  const [payFrom, setPayFrom] = useState('')
  const [payTo, setPayTo] = useState('')
  const [newName, setNewName] = useState('')
  const [newWorkerRole, setNewWorkerRole] = useState('installer')
  const [newRate, setNewRate] = useState('18')
  const [selectedTags, setSelectedTags] = useState([0])
  const [focused, setFocused] = useState(null)
  const [editingReport, setEditingReport] = useState(null)
  const [editingRate, setEditingRate] = useState({id:null, value:''})
  const [editingWorkerName, setEditingWorkerName] = useState({id:null, value:''})
  const [payrollFilter, setPayrollFilter] = useState('all')
  const [insightsPeriod, setInsightsPeriod] = useState('month')
  const [form, setForm] = useState({
    worker_id:'', worker_name:'', city:'', project_number:'', project_address:'', area_sqft:'',
    date:toISO(new Date()), start:'', end:'', lunch:'0', notes:''
  })

  useEffect(() => {
    const mon=getMonday(weekOffset)
    const end=new Date(mon); end.setDate(end.getDate()+(satIncluded?5:4))
    setPayFrom(toISO(mon)); setPayTo(toISO(end))
  }, [weekOffset, satIncluded])

  useEffect(() => { if(role) { loadWorkers(); loadReports(); loadTags() } }, [role])

  const loadTags = async () => {
    const { data } = await supabase.from('work_types').select('*').eq('company_id', COMPANY_ID).eq('active', true).order('created_at')
    if(data && data.length > 0) setTags(data.map(t=>({en:t.name_en, es:t.name_es})))
  }

  const loadWorkers = async () => {
    const { data } = await supabase.from('workers').select('*').eq('company_id', COMPANY_ID).order('name')
    if(data) setWorkers(data)
  }

  const loadReports = async () => {
    setLoading(true)
    const { data } = await supabase.from('reports').select('*').eq('company_id', COMPANY_ID).order('date', {ascending:false}).order('created_at', {ascending:false})
    if(data) setReports(data)
    setLoading(false)
  }

  const netHours = (f=form) => {
    if(!f.start||!f.end) return 0
    const [sh,sm]=f.start.split(':').map(Number)
    const [eh,em]=f.end.split(':').map(Number)
    return Math.max(0,((eh*60+em)-(sh*60+sm)-parseInt(f.lunch||0))/60)
  }

  const hoursDisplay = () => {
    const h=netHours(); if(!h) return ''
    const hrs=Math.floor(h), mins=Math.round((h-hrs)*60)
    return `${hrs}h ${mins>0?mins+'min':''} net`
  }

  const submitReport = async () => {
    if(!form.worker_id||!form.city||!form.project_number||!form.date||!form.start||!form.end){ alert(t.fill); return }
    const [sh,sm]=form.start.split(':').map(Number)
    const [eh,em]=form.end.split(':').map(Number)
    const totalMins=(eh*60+em)-(sh*60+sm)-parseInt(form.lunch||0)
    if((eh*60+em)<=(sh*60+sm)){ alert(lang==='en'?'End time must be after start time.':'La hora de fin debe ser después del inicio.'); return }
    if(totalMins<=0){ alert(lang==='en'?'Total hours cannot be 0. Please check your times.':'Las horas totales no pueden ser 0. Revisa los horarios.'); return }
    const hours=+(totalMins/60).toFixed(2)
    const worker=workers.find(w=>w.id===form.worker_id)
    const rate=worker?.rate||18
    const reporter=role==='will'?'Will':role==='javier'?'Javier':'Jake'
    setLoading(true)
    const { error } = await supabase.from('reports').insert({
      company_id:COMPANY_ID, worker_id:form.worker_id, worker_name:form.worker_name,
      reporter, project_city:form.city.trim(), project_number:form.project_number.trim(),
      project_address:form.project_address?.trim(), area_sqft:form.area_sqft?parseFloat(form.area_sqft):null, date:form.date, start_time:form.start,
      end_time:form.end, lunch_minutes:parseInt(form.lunch||0), hours, rate, pay:+(hours*rate).toFixed(2),
      tags:selectedTags.map(i=>tags[i].en), notes:form.notes
    })
    setLoading(false)
    if(error){ alert(t.error); return }
    setBanner(t.success); setTimeout(()=>setBanner(''),3000)
    setForm(f=>({...f,worker_id:'',worker_name:'',city:'',project_number:'',project_address:'',start:'',end:'',lunch:'0',notes:''}))
    setSelectedTags([0])
    loadReports()
  }

  const saveEdit = async () => {
    if(!editingReport) return
    const r=editingReport; if(!r.start_time||!r.end_time){alert("Fill in start and end time");return}; const [sh,sm]=r.start_time.split(":").map(Number); const [eh,em]=r.end_time.split(":").map(Number); const hours=+Math.max(0,((eh*60+em)-(sh*60+sm)-parseInt(r.lunch_minutes||0))/60).toFixed(2)
    const worker=workers.find(w=>w.id===editingReport.worker_id)
    const rate=worker?.rate||editingReport.rate
    const editorName=role==='javier'?'Javier':'Jake'
    setLoading(true)

    // Log changes
    const fields = ['worker_name','project_city','project_number','date','start_time','end_time','lunch_minutes','notes']
    const original = reports.find(r=>r.id===editingReport.id)
    for(const field of fields) {
      const oldVal = String(original?.[field]||'')
      const newVal = String(editingReport[field]||'')
      if(oldVal !== newVal) {
        await supabase.from('report_edits').insert({
          report_id:editingReport.id, edited_by:editorName,
          field_changed:field, old_value:oldVal, new_value:newVal
        })
      }
    }

    await supabase.from('reports').update({
      worker_id:editingReport.worker_id, worker_name:editingReport.worker_name,
      project_city:editingReport.project_city, project_number:editingReport.project_number,
      project_address:editingReport.project_address, date:editingReport.date,
      start_time:editingReport.start_time, end_time:editingReport.end_time,
      lunch_minutes:editingReport.lunch_minutes, hours, rate, pay:+(hours*rate).toFixed(2),
      notes:editingReport.notes, updated_at:new Date().toISOString()
    }).eq('id', editingReport.id)

    setLoading(false)
    setEditingReport(null)
    loadReports()
  }

  const toggleWorker = async (id, active) => {
    await supabase.from('workers').update({active:!active}).eq('id',id)
    loadWorkers()
  }

  const updateRate = async (id, rate) => {
    await supabase.from('workers').update({rate:parseFloat(rate)||18}).eq('id',id)
    setEditingRate({id:null,value:''})
    loadWorkers()
  }

  const updateWorkerName = async (id, name) => {
    if(!name.trim()) return
    await supabase.from('workers').update({name:name.trim()}).eq('id',id)
    setEditingWorkerName({id:null,value:''})
    loadWorkers()
  }

  const addWorker = async () => {
    if(!newName.trim()) return
    if(workers.find(w=>w.name.toLowerCase()===newName.toLowerCase())){ alert(t.exists); return }
    await supabase.from('workers').insert({ company_id:COMPANY_ID, name:newName.trim(), role:newWorkerRole, rate:parseFloat(newRate)||18, active:true })
    setNewName(''); loadWorkers()
  }

  const downloadCSV = (data, filename) => {
    const headers = ['Worker','Date','City','Project #','Address','Start','End','Lunch(min)','Hours','Rate($/hr)','Pay($)','Work Type','Reporter','Notes']
    const rows = data.map(r=>[r.worker_name,r.date,r.project_city,r.project_number,r.project_address||'',r.start_time,r.end_time,r.lunch_minutes,r.hours,r.rate,r.pay,(r.tags||[]).join('|'),r.reporter,r.notes||''])
    const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=filename; a.click()
  }

  const filteredReports = reports.filter(r=>r.date>=payFrom&&r.date<=payTo)
  const payrollByWorker = () => {
    const bw={}
    const filtered = payrollFilter==='all' ? filteredReports : filteredReports.filter(r=>r.worker_name===payrollFilter)
    filtered.forEach(r=>{
      if(!bw[r.worker_name]) bw[r.worker_name]={lines:[],totalHours:0,totalPay:0,rate:r.rate}
      bw[r.worker_name].lines.push(r)
      bw[r.worker_name].totalHours+=r.hours
      bw[r.worker_name].totalPay+=r.pay
    })
    return bw
  }
  const pw=payrollByWorker()
  const totalPay=Object.values(pw).reduce((a,w)=>a+w.totalPay,0)
  const totalHours=Object.values(pw).reduce((a,w)=>a+w.totalHours,0)
  const isAdmin=role==='javier'||role==='jake'
  const activeWorkers=workers.filter(w=>w.active)
  const inactiveWorkers=workers.filter(w=>!w.active)
  const fmtWeek=()=>payFrom&&payTo?`${fmtDateStr(payFrom,lang)} – ${fmtDateStr(payTo,lang)}`:''

  const LangBar = () => (
    <div style={{display:'flex',gap:4}}>
      {['en','es'].map(l=>(
        <button key={l} onClick={()=>setLang(l)} style={{padding:'4px 10px',borderRadius:8,border:`2px solid ${lang===l?'#2563eb':'#e2e8f0'}`,background:lang===l?'#eff6ff':'transparent',color:lang===l?'#2563eb':'#94a3b8',fontWeight:lang===l?600:400,fontSize:12,cursor:'pointer'}}>{l.toUpperCase()}</button>
      ))}
    </div>
  )

  // ROLE SELECTION
  if(!role) return (
    <div style={{maxWidth:680,margin:'0 auto',padding:'1.5rem 1rem',fontFamily:'system-ui,sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <p style={{fontSize:22,fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em'}}>Faena</p>
          <p style={{fontSize:13,color:'#64748b'}}>{t.selectRole}</p>
        </div>
        <LangBar />
      </div>
      <div style={card}>
        <span style={sLabel}>{t.who}</span>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:pending&&pending!=='will'?16:0}}>
          {[['will','Will',t.fdesc,'#16a34a'],['javier','Javier',t.adesc,'#2563eb'],['jake','Jake',t.odesc,'#d97706']].map(([r,name,desc,color])=>(
            <div key={r} onClick={()=>{setPending(r);if(r==='will'){setRole('will');setPending(null);}else{setPinErr('');setPin('');} }}
              style={{padding:'14px 10px',border:`2px solid ${pending===r?color:'#e2e8f0'}`,borderRadius:10,textAlign:'center',cursor:'pointer',background:pending===r?color+'12':'#fafafa',transition:'all 0.15s'}}>
              <div style={{fontWeight:700,fontSize:15,color:pending===r?color:'#1e293b'}}>{name}</div>
              <div style={{fontSize:11,color:pending===r?color:'#94a3b8',marginTop:3}}>{desc}</div>
            </div>
          ))}
        </div>
        {pending&&pending!=='will'&&(
          <div style={{background:'#f8fafc',borderRadius:10,padding:'1.5rem',textAlign:'center',marginTop:12,border:'1px solid #e2e8f0'}}>
            <div style={{fontSize:28,marginBottom:8}}>🔒</div>
            <p style={{fontSize:14,fontWeight:600,color:'#1e293b',marginBottom:12}}>{t.pinPrompt} — {pending==='javier'?'Javier':'Jake'}</p>
            <input type="password" maxLength={4} value={pin} onChange={e=>setPin(e.target.value)}
              onKeyUp={e=>{if(e.key==='Enter'){if(pin===PINS[pending]){setRole(pending);setPending(null);}else{setPinErr(t.pinWrong);setPin('')}}}}
              style={{fontSize:28,letterSpacing:'0.5em',textAlign:'center',width:150,border:'2px solid #cbd5e1',borderRadius:8,padding:10,background:'#fff',color:'#1e293b',outline:'none'}} placeholder="····" />
            {pinErr&&<p style={{color:'#ef4444',fontSize:13,marginTop:6}}>{pinErr}</p>}
            <button onClick={()=>{if(pin===PINS[pending]){setRole(pending);setPending(null);}else{setPinErr(t.pinWrong);setPin('')}}}
              style={{display:'block',width:160,margin:'12px auto 0',padding:10,border:'none',borderRadius:8,background:'#1e293b',color:'#fff',fontWeight:600,fontSize:14,cursor:'pointer'}}>{t.enter}</button>
          </div>
        )}
      </div>
    </div>
  )

  // EDIT MODAL
  if(editingReport) return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'1rem'}}>
      <div style={{background:'#fff',borderRadius:16,padding:'1.5rem',width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <p style={{fontWeight:700,fontSize:16,color:'#1e293b'}}>Edit Report</p>
          <button onClick={()=>setEditingReport(null)} style={{border:'none',background:'transparent',fontSize:20,cursor:'pointer',color:'#94a3b8'}}>×</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>City</label>
            <input value={editingReport.project_city} onChange={e=>setEditingReport(r=>({...r,project_city:e.target.value}))} style={inp(false)} />
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>Project #</label>
            <input value={editingReport.project_number} onChange={e=>setEditingReport(r=>({...r,project_number:e.target.value}))} style={inp(false)} />
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>Start</label>
            <input type="time" value={editingReport.start_time} onChange={e=>setEditingReport(r=>({...r,start_time:e.target.value}))} style={inp(false)} />
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>End</label>
            <input type="time" value={editingReport.end_time} onChange={e=>setEditingReport(r=>({...r,end_time:e.target.value}))} style={inp(false)} />
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>Notes</label>
          <textarea value={editingReport.notes||''} onChange={e=>setEditingReport(r=>({...r,notes:e.target.value}))} style={{...inp(false),minHeight:60,resize:'vertical'}} />
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={saveEdit} disabled={loading} style={{...btn('#1e293b','#fff'),flex:1,opacity:loading?0.7:1}}>{loading?t.saving:'Save changes'}</button>
          <button onClick={()=>setEditingReport(null)} style={{...btn('transparent','#64748b','2px solid #e2e8f0'),flex:1}}>Cancel</button>
        </div>
      </div>
    </div>
  )

  // MAIN APP
  return (
    <div style={{maxWidth:680,margin:'0 auto',padding:'1rem',fontFamily:'system-ui,sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',flexWrap:'wrap',gap:8}}>
        <div>
          <p style={{fontSize:20,fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em'}}>Faena</p>
          <p style={{fontSize:13,color:'#64748b'}}>{role==='will'?`Will · ${t.fdesc}`:role==='javier'?'Javier · Admin':'Jake · Owner'}</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <LangBar />
          <button onClick={()=>{setRole(null);setPending(null);setTab('register')}} style={{...btn('transparent','#64748b','2px solid #e2e8f0'),fontSize:12}}>← {lang==='en'?'Exit':'Salir'}</button>
        </div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:'1.5rem',flexWrap:'wrap'}}>
        {[['register','📋',t.register],['myreports','📋',t.myReports],['reports','📊',t.reports],['payroll','💵',t.payroll],['insights','💡',t.insights],['team','👥',t.team]].filter(([v])=>{
          if(v==='register') return true
          if(v==='myreports') return role==='will'
          if(v==='insights') return isAdmin
          return isAdmin
        }).map(([v,icon,label])=>(
          <button key={v} onClick={()=>setTab(v)} style={{padding:'8px 14px',borderRadius:8,border:`2px solid ${tab===v?'#2563eb':'#e2e8f0'}`,background:tab===v?'#eff6ff':'transparent',color:tab===v?'#2563eb':'#64748b',fontWeight:tab===v?600:400,fontSize:13,cursor:'pointer'}}>{icon} {label}</button>
        ))}
      </div>

      {banner&&<div style={{background:'#f0fdf4',border:'1px solid #86efac',color:'#166534',borderRadius:8,padding:'12px 16px',fontSize:14,marginBottom:12}}>✓ {banner}</div>}

      {/* REGISTER */}
      {tab==='register'&&(
        <>
          <div style={card}>
            <span style={sLabel}>{t.wpLabel}</span>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>{t.worker}</label>
                <select value={form.worker_id} onChange={e=>{const w=activeWorkers.find(x=>x.id===e.target.value);setForm(f=>({...f,worker_id:e.target.value,worker_name:w?.name||''}))}} onFocus={()=>setFocused('worker')} onBlur={()=>setFocused(null)} style={inp(focused==='worker')}>
                  <option value="">{lang==='en'?'Select...':'Seleccionar...'}</option>
                  {activeWorkers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>{t.city}</label>
                <input value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} onFocus={()=>setFocused('city')} onBlur={()=>setFocused(null)} placeholder="e.g. Draper" style={inp(focused==='city')} />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>{t.projNum}</label>
                <input value={form.project_number} onChange={e=>setForm(f=>({...f,project_number:e.target.value}))} onFocus={()=>setFocused('proj')} onBlur={()=>setFocused(null)} placeholder="e.g. 445" style={inp(focused==='proj')} />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>{t.date}</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} onFocus={()=>setFocused('date')} onBlur={()=>setFocused(null)} style={inp(focused==='date')} />
              </div>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>{t.address}</label>
              <input value={form.project_address} onChange={e=>setForm(f=>({...f,project_address:e.target.value}))} onFocus={()=>setFocused('addr')} onBlur={()=>setFocused(null)} placeholder="e.g. 445 S State St" style={inp(focused==='addr')} />
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>{lang==='en'?'Area (sq ft, optional)':'Área (pies², opcional)'}</label>
              <input type="number" min="0" value={form.area_sqft} onChange={e=>setForm(f=>({...f,area_sqft:e.target.value}))} onFocus={()=>setFocused('area')} onBlur={()=>setFocused(null)} placeholder="e.g. 500" style={inp(focused==='area')} />
            </div>
          </div>

          <div style={card}>
            <span style={sLabel}>{t.hoursLabel}</span>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:8}}>
              {[['start',t.start],['end',t.end]].map(([key,label])=>(
                <div key={key}>
                  <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>{label}</label>
                  <input type="time" value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} onFocus={()=>setFocused(key)} onBlur={()=>setFocused(null)} style={inp(focused===key)} />
                </div>
              ))}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>{t.lunch} (min)</label>
                <input type="number" min="0" max="180" value={form.lunch} onChange={e=>setForm(f=>({...f,lunch:e.target.value||'0'}))} onFocus={()=>setFocused('lunch')} onBlur={()=>setFocused(null)} placeholder="0" style={inp(focused==='lunch')} />
              </div>
            </div>
            {hoursDisplay()&&<div style={{background:'#eff6ff',borderRadius:6,padding:'8px 12px',fontSize:13,fontWeight:600,color:'#2563eb'}}>⏱ {hoursDisplay()}</div>}
          </div>

          <div style={card}>
            <span style={sLabel}>{t.workType}</span>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {tags.map((tag,i)=>(
                <div key={i} onClick={()=>setSelectedTags(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])}
                  style={{padding:'7px 16px',borderRadius:99,border:`2px solid ${selectedTags.includes(i)?'#2563eb':'#e2e8f0'}`,fontSize:13,cursor:'pointer',fontWeight:selectedTags.includes(i)?600:400,color:selectedTags.includes(i)?'#2563eb':'#64748b',background:selectedTags.includes(i)?'#eff6ff':'#fafafa',transition:'all 0.15s'}}>{lang==='en'?tag.en:tag.es}</div>
              ))}
            </div>
          </div>

          <div style={card}>
            <span style={sLabel}>{t.notes}</span>
            <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} onFocus={()=>setFocused('notes')} onBlur={()=>setFocused(null)} placeholder={lang==='en'?'Observations, materials, incidents...':'Observaciones, materiales, incidentes...'} style={{...inp(focused==='notes'),minHeight:80,resize:'vertical'}} />
          </div>

          <button onClick={submitReport} disabled={loading} style={{width:'100%',padding:13,border:'none',borderRadius:10,background:'#1e293b',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',opacity:loading?0.7:1}}>{loading?t.saving:`✓ ${t.submit}`}</button>
        </>
      )}

      {/* WILL MY REPORTS */}
      {tab==='myreports'&&role==='will'&&(
        <div style={card}>
          <span style={sLabel}>{t.myReports}</span>
          {reports.filter(r=>r.reporter==='Will').length===0
            ?<p style={{color:'#94a3b8',textAlign:'center',padding:'1.5rem'}}>{t.noMyReports}</p>
            :reports.filter(r=>r.reporter==='Will').map((r,i,arr)=>(
              <div key={r.id} style={{padding:'12px 0',borderBottom:i<arr.length-1?'1px solid #f1f5f9':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:14,color:'#1e293b'}}>{r.worker_name}</span>
                  <span style={{fontSize:12,color:'#94a3b8'}}>{fmtDateStr(r.date,lang)}</span>
                </div>
                <div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>
                  📍 {r.project_city} {r.project_number} · ⏱ {r.hours.toFixed(1)}h
                  {r.tags?.length>0&&<><br />{r.tags.map((tag,ti)=>{const found=tags.find(t=>t.en===tag);return <span key={ti} style={{display:'inline-block',padding:'2px 8px',borderRadius:99,fontSize:11,background:'#eff6ff',color:'#2563eb',marginRight:4,marginTop:2}}>{lang==='en'?tag:(found?found.es:tag)}</span>})}</>}
                  {r.notes&&<><br /><span style={{color:'#94a3b8',fontStyle:'italic'}}>{r.notes}</span></>}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* REPORTS */}
      {tab==='reports'&&isAdmin&&(
        <>
          <div style={{display:'flex',gap:10,marginBottom:14}}>
            {[[reports.length,lang==='en'?'Reports':'Reportes','#2563eb'],[reports.reduce((a,r)=>a+r.hours,0).toFixed(1)+'h',lang==='en'?'Total hours':'Horas totales','#16a34a'],[new Set(reports.map(r=>r.project_city+r.project_number)).size,lang==='en'?'Projects':'Proyectos','#7c3aed']].map(([val,lbl,color],i)=>(
              <div key={i} style={statBox(color)}><div style={{fontSize:20,fontWeight:700,color}}>{val}</div><div style={{fontSize:12,color:'#64748b',marginTop:2}}>{lbl}</div></div>
            ))}
          </div>
          <div style={card}>
            <span style={sLabel}>{t.reports}</span>
            {loading?<p style={{color:'#94a3b8',textAlign:'center',padding:'1.5rem'}}>{t.loading}</p>:
            reports.length===0?<p style={{color:'#94a3b8',textAlign:'center',padding:'1.5rem'}}>{t.noReports}</p>:
            reports.map((r,i)=>(
              <div key={r.id} style={{padding:'12px 0',borderBottom:i<reports.length-1?'1px solid #f1f5f9':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:14,color:'#1e293b'}}>{r.worker_name} <span style={{padding:'2px 8px',borderRadius:99,fontSize:11,background:'#f0fdf4',color:'#166534',marginLeft:4}}>{r.reporter}</span></span>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{fontSize:12,color:'#94a3b8'}}>{fmtDateStr(r.date,lang)}</span>
                    <button onClick={()=>setEditingReport({...r})} style={{border:'none',background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:13,padding:'2px 6px'}}>✏️</button>
                  </div>
                </div>
                <div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>
                  📍 {r.project_city} {r.project_number} · ⏱ {r.hours.toFixed(1)}h · <span style={{color:'#16a34a',fontWeight:600}}>${r.pay.toFixed(2)}</span>
                  {r.tags?.length>0&&<><br />{r.tags.map((tag,ti)=>{const found=tags.find(t=>t.en===tag);return <span key={ti} style={{display:'inline-block',padding:'2px 8px',borderRadius:99,fontSize:11,background:'#eff6ff',color:'#2563eb',marginRight:4,marginTop:2}}>{lang==='en'?tag:(found?found.es:tag)}</span>})}</>}
                  {r.notes&&<><br /><span style={{color:'#94a3b8',fontStyle:'italic'}}>{r.notes}</span></>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PAYROLL */}
      {tab==='payroll'&&isAdmin&&(
        <>
          <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap',alignItems:'flex-end'}}>
            {[[payFrom,setPayFrom,t.from],[payTo,setPayTo,t.to]].map(([val,setter,label],i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
                <label style={{fontSize:12,fontWeight:600,color:'#64748b'}}>{label}</label>
                <input type="date" value={val} onChange={e=>setter(e.target.value)} style={{...inp(false),fontSize:13}} />
              </div>
            ))}
            <button onClick={()=>setSatIncluded(s=>!s)} style={{padding:'8px 14px',borderRadius:8,border:`2px solid ${satIncluded?'#d97706':'#e2e8f0'}`,background:satIncluded?'#fffbeb':'transparent',color:satIncluded?'#d97706':'#64748b',fontSize:13,fontWeight:satIncluded?600:400,cursor:'pointer'}}>{satIncluded?t.satOn:t.satOff}</button>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>{lang==='en'?'Filter by worker':'Filtrar por trabajador'}</label>
            <select value={payrollFilter} onChange={e=>setPayrollFilter(e.target.value)} style={{...inp(false),fontSize:13}}>
              <option value="all">{lang==='en'?'All workers':'Todos los trabajadores'}</option>
              {workers.filter(w=>w.active).map(w=><option key={w.id} value={w.name}>{w.name}</option>)}
            </select>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <button onClick={()=>setWeekOffset(w=>w-1)} style={{padding:'7px 14px',borderRadius:8,border:'2px solid #e2e8f0',background:'transparent',color:'#64748b',cursor:'pointer',fontSize:16}}>‹</button>
            <div style={{flex:1,textAlign:'center',fontSize:13,fontWeight:600,color:'#1e293b'}}>{fmtWeek()}</div>
            <button onClick={()=>setWeekOffset(w=>w+1)} style={{padding:'7px 14px',borderRadius:8,border:'2px solid #e2e8f0',background:'transparent',color:'#64748b',cursor:'pointer',fontSize:16}}>›</button>
          </div>
          <div style={{display:'flex',gap:10,marginBottom:12}}>
            {[[Object.keys(pw).length,t.pWorkers,'#2563eb'],[totalHours.toFixed(1)+'h',t.pHours,'#0d9488'],['$'+totalPay.toFixed(2),t.pTotal,'#16a34a']].map(([val,lbl,color],i)=>(
              <div key={i} style={statBox(color)}><div style={{fontSize:20,fontWeight:700,color}}>{val}</div><div style={{fontSize:12,color:'#64748b',marginTop:2}}>{lbl}</div></div>
            ))}
          </div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <button onClick={()=>downloadCSV(filteredReports,`faena_payroll_${payFrom}_${payTo}.csv`)} style={{...btn('#eff6ff','#2563eb','2px solid #2563eb'),flex:1}}>⬇ {t.downloadPeriod}</button>
            <button onClick={()=>downloadCSV(reports,'faena_full_history.csv')} style={{...btn('#fafafa','#64748b','2px solid #e2e8f0'),flex:1}}>⬇ {t.downloadAll}</button>
          </div>
          <div style={card}>
            <span style={sLabel}>{t.paySummary}</span>
            {Object.keys(pw).length===0?<p style={{color:'#94a3b8',textAlign:'center',padding:'1.5rem'}}>{t.noPay}</p>:
            Object.entries(pw).sort((a,b)=>b[1].totalPay-a[1].totalPay).map(([name,data],wi,arr)=>(
              <div key={name} style={{marginBottom:wi<arr.length-1?16:0,paddingBottom:wi<arr.length-1?16:0,borderBottom:wi<arr.length-1?'1px solid #f1f5f9':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,background:'#f8fafc',padding:'8px 12px',borderRadius:8}}>
                  <span style={{fontWeight:700,fontSize:14,color:'#1e293b'}}>{name}</span>
                  <span style={{fontWeight:700,fontSize:15,color:'#16a34a'}}>${data.totalPay.toFixed(2)}</span>
                </div>
                {data.lines.sort((a,b)=>a.date.localeCompare(b.date)).map((r,li)=>(
                  <div key={li} style={{display:'grid',gridTemplateColumns:'90px 1fr 50px 60px 70px',gap:6,alignItems:'center',padding:'5px 12px',fontSize:13,color:'#475569',background:r.hours===0?'#fff5f5':'transparent',borderRadius:r.hours===0?6:0,border:r.hours===0?'1px solid #fee2e2':'none',marginBottom:r.hours===0?2:0}}>
                    <span style={{color:r.hours===0?'#ef4444':'#94a3b8',fontSize:12}}>{fmtDateStr(r.date,lang)}</span>
                    <span style={{fontWeight:500,color:r.hours===0?'#ef4444':'inherit'}}>📍 {r.project_city} {r.project_number}{r.hours===0?' ⚠️':''}</span>
                    <span style={{color:r.hours===0?'#ef4444':'#64748b',textAlign:'right',fontWeight:r.hours===0?700:400}}>{r.hours.toFixed(1)}h</span>
                    <span style={{color:'#94a3b8',textAlign:'right',fontSize:12}}>${r.rate}/hr</span>
                    <span style={{color:r.hours===0?'#ef4444':'#16a34a',fontWeight:600,textAlign:'right'}}>${r.pay.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{display:'grid',gridTemplateColumns:'90px 1fr 50px 60px 70px',gap:6,padding:'6px 12px',fontSize:13,borderTop:'1px dashed #e2e8f0',marginTop:4}}>
                  <span></span><span style={{color:'#94a3b8',fontSize:12}}>{data.lines.length} {lang==='en'?'entries':'entradas'}</span>
                  <span style={{fontWeight:700,color:'#1e293b',textAlign:'right'}}>{data.totalHours.toFixed(1)}h</span>
                  <span></span>
                  <span style={{fontWeight:700,color:'#16a34a',textAlign:'right'}}>${data.totalPay.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* INSIGHTS */}
      {tab==='insights'&&isAdmin&&(()=>{
        const now = new Date()
        const getFrom = () => {
          if(insightsPeriod==='week') { const d=getMonday(0); return toISO(d) }
          if(insightsPeriod==='month') { return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01` }
          if(insightsPeriod==='year') { return `${now.getFullYear()}-01-01` }
          return '2000-01-01'
        }
        const fromDate = getFrom()
        const insReports = reports.filter(r=>r.date>=fromDate && r.hours>0)

        // By city
        const byCity = {}
        insReports.forEach(r=>{
          const k=r.project_city
          if(!byCity[k]) byCity[k]={city:k,projects:new Set(),hours:0,cost:0}
          byCity[k].projects.add(r.project_city+r.project_number)
          byCity[k].hours+=r.hours
          byCity[k].cost+=r.pay
        })
        const cityArr = Object.values(byCity).sort((a,b)=>b.cost-a.cost)
        const maxCityCost = cityArr[0]?.cost||1

        // By project
        const byProject = {}
        insReports.forEach(r=>{
          const k=r.project_city+' '+r.project_number
          if(!byProject[k]) byProject[k]={name:k,days:new Set(),hours:0,cost:0,workers:new Set()}
          byProject[k].days.add(r.date)
          byProject[k].hours+=r.hours
          byProject[k].cost+=r.pay
          byProject[k].workers.add(r.worker_name)
        })
        const projArr = Object.values(byProject).sort((a,b)=>b.cost-a.cost)

        // By worker
        const byWorker = {}
        insReports.forEach(r=>{
          if(!byWorker[r.worker_name]) byWorker[r.worker_name]={name:r.worker_name,hours:0,cost:0}
          byWorker[r.worker_name].hours+=r.hours
          byWorker[r.worker_name].cost+=r.pay
        })
        const workerArr = Object.values(byWorker).sort((a,b)=>b.hours-a.hours)
        const maxWorkerHours = workerArr[0]?.hours||1

        // Weekly trend (last 8 weeks)
        const weeklyData = []
        for(let i=7;i>=0;i--){
          const mon=getMonday(-i)
          const fri=new Date(mon); fri.setDate(fri.getDate()+6)
          const wReports=reports.filter(r=>r.date>=toISO(mon)&&r.date<=toISO(fri)&&r.hours>0)
          const label=mon.toLocaleDateString(lang==='es'?'es-MX':'en-US',{month:'short',day:'numeric'})
          weeklyData.push({label,hours:+wReports.reduce((a,r)=>a+r.hours,0).toFixed(1),cost:+wReports.reduce((a,r)=>a+r.pay,0).toFixed(2)})
        }
        const maxWeeklyHours = Math.max(...weeklyData.map(w=>w.hours))||1

        const totalHoursIns = insReports.reduce((a,r)=>a+r.hours,0)
        const totalCostIns = insReports.reduce((a,r)=>a+r.pay,0)
        const totalProjects = Object.keys(byProject).length

        return <>
          {/* Period selector */}
          <div style={{display:'flex',gap:6,marginBottom:16}}>
            {[['week',lang==='en'?'This week':'Esta semana'],['month',lang==='en'?'This month':'Este mes'],['year',lang==='en'?'This year':'Este año'],['all',lang==='en'?'All time':'Todo']].map(([v,label])=>(
              <button key={v} onClick={()=>setInsightsPeriod(v)} style={{padding:'7px 14px',borderRadius:8,border:`2px solid ${insightsPeriod===v?'#2563eb':'#e2e8f0'}`,background:insightsPeriod===v?'#eff6ff':'transparent',color:insightsPeriod===v?'#2563eb':'#64748b',fontWeight:insightsPeriod===v?600:400,fontSize:13,cursor:'pointer'}}>{label}</button>
            ))}
          </div>

          {/* KPIs */}
          <div style={{display:'flex',gap:10,marginBottom:14}}>
            {[[totalProjects,lang==='en'?'Projects':'Proyectos','#7c3aed'],[totalHoursIns.toFixed(1)+'h',lang==='en'?'Total hours':'Horas totales','#0d9488'],['$'+totalCostIns.toFixed(2),lang==='en'?'Labor cost':'Costo mano de obra','#16a34a']].map(([val,lbl,color],i)=>(
              <div key={i} style={statBox(color)}><div style={{fontSize:20,fontWeight:700,color}}>{val}</div><div style={{fontSize:12,color:'#64748b',marginTop:2}}>{lbl}</div></div>
            ))}
          </div>

          {/* Weekly trend */}
          <div style={card}>
            <span style={sLabel}>{lang==='en'?'Weekly trend (hours)':'Tendencia semanal (horas)'}</span>
            <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120}}>
              {weeklyData.map((w,i)=>(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <div style={{fontSize:10,color:'#64748b',fontWeight:600}}>{w.hours>0?w.hours:''}</div>
                  <div style={{width:'100%',background:w.hours>0?'#2563eb':'#e2e8f0',borderRadius:'4px 4px 0 0',height:`${Math.max((w.hours/maxWeeklyHours)*90,w.hours>0?8:2)}px`,transition:'height 0.3s'}}></div>
                  <div style={{fontSize:9,color:'#94a3b8',textAlign:'center',lineHeight:1.2}}>{w.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* By city - heatmap style */}
          <div style={card}>
            <span style={sLabel}>{lang==='en'?'Activity by city':'Actividad por ciudad'}</span>
            {cityArr.length===0?<p style={{color:'#94a3b8',fontSize:13}}>{t.noData}</p>:
            cityArr.map((c,i)=>(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>📍 {c.city}</span>
                  <div style={{display:'flex',gap:16}}>
                    <span style={{fontSize:12,color:'#64748b'}}>{c.projects.size} {lang==='en'?'project':'proyecto'}{c.projects.size!==1?'s':''}</span>
                    <span style={{fontSize:12,color:'#64748b'}}>{c.hours.toFixed(1)}h</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>${c.cost.toFixed(0)}</span>
                  </div>
                </div>
                <div style={{height:8,background:'#f1f5f9',borderRadius:99}}>
                  <div style={{height:8,background:`hsl(${220-Math.round((c.cost/maxCityCost)*60)},70%,50%)`,borderRadius:99,width:`${Math.max((c.cost/maxCityCost)*100,3)}%`,transition:'width 0.4s'}}></div>
                </div>
              </div>
            ))}
          </div>

          {/* By project */}
          <div style={card}>
            <span style={sLabel}>{lang==='en'?'Cost by project':'Costo por proyecto'}</span>
            {projArr.length===0?<p style={{color:'#94a3b8',fontSize:13}}>{t.noData}</p>:
            projArr.map((p,i,arr)=>(
              <div key={i} style={{padding:'10px 0',borderBottom:i<arr.length-1?'1px solid #f1f5f9':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:600,color:'#1e293b'}}>📍 {p.name}</span>
                  <span style={{fontSize:14,fontWeight:700,color:'#16a34a'}}>${p.cost.toFixed(2)}</span>
                </div>
                <div style={{display:'flex',gap:16,fontSize:12,color:'#64748b'}}>
                  <span>⏱ {p.hours.toFixed(1)}h</span>
                  <span>📅 {p.days.size} {lang==='en'?'day':'día'}{p.days.size!==1?'s':''}</span>
                  <span>👷 {p.workers.size} {lang==='en'?'worker':'trabajador'}{p.workers.size!==1?(lang==='en'?'s':'es'):''}</span>
                  <span style={{color:'#7c3aed'}}>~${(p.cost/p.hours).toFixed(2)}/hr</span>
                </div>
              </div>
            ))}
          </div>

          {/* By worker */}
          <div style={card}>
            <span style={sLabel}>{lang==='en'?'Hours by worker':'Horas por trabajador'}</span>
            {workerArr.length===0?<p style={{color:'#94a3b8',fontSize:13}}>{t.noData}</p>:
            workerArr.map((w,i)=>(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>{w.name}</span>
                  <div style={{display:'flex',gap:16}}>
                    <span style={{fontSize:13,fontWeight:600,color:'#0d9488'}}>{w.hours.toFixed(1)}h</span>
                    <span style={{fontSize:12,color:'#64748b'}}>${w.cost.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{height:6,background:'#f1f5f9',borderRadius:99}}>
                  <div style={{height:6,background:'#0d9488',borderRadius:99,width:`${Math.max((w.hours/maxWorkerHours)*100,2)}%`,transition:'width 0.4s'}}></div>
                </div>
              </div>
            ))}
          </div>
        </>
      })()}

      {/* TEAM */}
      {tab==='team'&&isAdmin&&(
        <>
          <div style={card}>
            <span style={sLabel}>{t.activeW}</span>
            {activeWorkers.map(w=>{
              const count=reports.filter(r=>r.worker_name===w.name).length
              const initials=w.name.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()
              const color=w.role==='supervisor'?'#d97706':'#2563eb'
              return (
                <div key={w.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid #f1f5f9'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color,flexShrink:0}}>{initials}</div>
                    <div>
                      {editingWorkerName.id===w.id
                        ?<div style={{display:'flex',alignItems:'center',gap:6}}>
                          <input value={editingWorkerName.value} onChange={e=>setEditingWorkerName(n=>({...n,value:e.target.value}))} style={{...inp(false),padding:'4px 8px',fontSize:13,width:160}} onKeyUp={e=>{if(e.key==='Enter') updateWorkerName(w.id,editingWorkerName.value)}} />
                          <button onClick={()=>updateWorkerName(w.id,editingWorkerName.value)} style={{...btn('#16a34a','#fff'),padding:'4px 10px',fontSize:12}}>{t.updateRate}</button>
                          <button onClick={()=>setEditingWorkerName({id:null,value:''})} style={{...btn('transparent','#94a3b8','1px solid #e2e8f0'),padding:'4px 10px',fontSize:12}}>✕</button>
                        </div>
                        :<div style={{fontSize:14,fontWeight:600,color:'#1e293b',cursor:'pointer'}} onClick={()=>setEditingWorkerName({id:w.id,value:w.name})}>{w.name} ✏️</div>
                      }
                      {editingRate.id===w.id
                        ?<div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                          <input type="number" value={editingRate.value} onChange={e=>setEditingRate(r=>({...r,value:e.target.value}))} style={{...inp(false),width:70,padding:'4px 8px',fontSize:13}} />
                          <button onClick={()=>updateRate(w.id,editingRate.value)} style={{...btn('#16a34a','#fff'),padding:'4px 10px',fontSize:12}}>{t.updateRate}</button>
                          <button onClick={()=>setEditingRate({id:null,value:''})} style={{...btn('transparent','#94a3b8','1px solid #e2e8f0'),padding:'4px 10px',fontSize:12}}>✕</button>
                        </div>
                        :<div style={{fontSize:12,color:'#94a3b8'}}>
                          {w.role==='supervisor'?t.supervisor:t.installer} · 
                          <span style={{color:'#16a34a',fontWeight:600,cursor:'pointer'}} onClick={()=>setEditingRate({id:w.id,value:String(w.rate)})}> ${w.rate}/hr ✏️</span>
                          · {count} report{count!==1&&lang==='en'?'s':''}
                        </div>
                      }
                    </div>
                  </div>
                  <button onClick={()=>toggleWorker(w.id,w.active)} style={{padding:'5px 12px',borderRadius:99,border:'2px solid #fee2e2',background:'#fff5f5',color:'#ef4444',fontSize:12,fontWeight:600,cursor:'pointer'}}>{t.deactivate}</button>
                </div>
              )
            })}
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder={lang==='en'?'New worker name':'Nombre del trabajador'} style={{...inp(focused==='newname'),flex:1}} onFocus={()=>setFocused('newname')} onBlur={()=>setFocused(null)} />
              <select value={newWorkerRole} onChange={e=>setNewWorkerRole(e.target.value)} style={{...inp(false),width:110}}>
                <option value="installer">Installer</option>
                <option value="supervisor">Supervisor</option>
              </select>
              <input value={newRate} onChange={e=>setNewRate(e.target.value)} placeholder="$/hr" style={{...inp(false),width:70}} />
              <button onClick={addWorker} style={{...btn('#1e293b','#fff'),padding:'0 16px',fontSize:18}}>+</button>
            </div>
          </div>
          {inactiveWorkers.length>0&&(
            <div style={card}>
              <span style={sLabel}>{t.inactiveW}</span>
              {inactiveWorkers.map(w=>{
                const count=reports.filter(r=>r.worker_name===w.name).length
                const initials=w.name.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()
                return (
                  <div key={w.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid #f1f5f9'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#94a3b8',flexShrink:0}}>{initials}</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:'#94a3b8'}}>{w.name}</div>
                        <div style={{fontSize:12,color:'#94a3b8'}}>{lang==='en'?'Inactive':'Inactivo'} · {count} report{count!==1&&lang==='en'?'s':''} {lang==='en'?'preserved':'preservados'}</div>
                      </div>
                    </div>
                    <button onClick={()=>toggleWorker(w.id,w.active)} style={{padding:'5px 12px',borderRadius:99,border:'2px solid #dcfce7',background:'#f0fdf4',color:'#16a34a',fontSize:12,fontWeight:600,cursor:'pointer'}}>{t.reactivate}</button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
