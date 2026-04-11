import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useLogs, totalHours, totalEarned, fmtShort, todayStr, getWeekRange } from '../lib/data';
import { computePayStatus } from '../lib/billing';

function statusBadge(status) {
  const map = {
    active:    { label: 'Active',    bg: 'rgba(34,197,94,0.15)',  color: '#22C55E' },
    completed: { label: 'Completed', bg: 'rgba(152,152,157,0.15)', color: '#98989D' },
    paused:    { label: 'Paused',    bg: 'rgba(251,191,36,0.15)', color: '#FBBF24' },
  };
  return map[status] || map.active;
}

function ProjectCard({ project, entries, onOpen }) {
  const pEntries = entries.filter(e => e.project === project.id);
  const hrs = totalHours(pEntries);
  const earned = totalEarned(pEntries);
  const days = pEntries.length;
  const badge = statusBadge(project.status);

  const today = todayStr();
  const { start: ws, end: we } = getWeekRange(today);
  const weekH = totalHours(pEntries.filter(e => e.date >= ws && e.date <= we));
  const lastEntry = [...pEntries].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const hasToday = pEntries.some(e => e.date === today);

  // Mini 7-day sparkline
  const spark = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-6+i);
    const str = d.toISOString().split('T')[0];
    const e = pEntries.find(e=>e.date===str);
    return e ? parseFloat(e.hours)||0 : 0;
  });
  const sparkMax = Math.max(...spark, 1);

  return (
    <div
      onClick={onOpen}
      style={{
        position:'relative', borderRadius:22, overflow:'hidden',
        marginBottom:16, cursor:'pointer',
        background:`linear-gradient(145deg, ${project.color}22 0%, ${project.color}08 60%, var(--bg2) 100%)`,
        border:`1px solid ${project.color}30`,
        boxShadow:`0 2px 24px ${project.color}18, 0 1px 0 rgba(255,255,255,0.05) inset`,
        transition:'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s',
      }}
      onPointerDown={e=>{e.currentTarget.style.transform='scale(0.975)';e.currentTarget.style.boxShadow=`0 1px 8px ${project.color}12`}}
      onPointerUp={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 2px 24px ${project.color}18, 0 1px 0 rgba(255,255,255,0.05) inset`}}
      onPointerLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 2px 24px ${project.color}18, 0 1px 0 rgba(255,255,255,0.05) inset`}}
    >
      {/* Top accent stripe */}
      <div style={{height:3,background:`linear-gradient(90deg,${project.color},${project.color}60)`,width:'100%'}}/>

      <div style={{padding:'16px 18px 18px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{
              width:46,height:46,borderRadius:14,
              background:`linear-gradient(135deg,${project.color}33,${project.color}18)`,
              border:`1.5px solid ${project.color}40`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:22,flexShrink:0,
            }}>{project.icon}</div>
            <div>
              <div style={{fontSize:16,fontWeight:800,letterSpacing:'-0.025em',color:'var(--t1)',lineHeight:1.2}}>{project.name}</div>
              <div style={{fontSize:12,color:'var(--t3)',marginTop:3,fontWeight:500}}>{project.client} · from {fmtShort(project.startDate)}</div>
            </div>
          </div>
          <span style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:9999,background:badge.bg,color:badge.color,letterSpacing:'0.05em',flexShrink:0}}>
            {badge.label}
          </span>
        </div>

        {/* Stats */}
        {(() => {
          const outstanding = Math.max(0, earned - (project.payments||[]).reduce((s,p)=>s+p.amount,0));
          const allPaid = outstanding === 0 && earned > 0;
          return (
            <div style={{marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:11,color:'var(--t3)',fontWeight:500}}>{days} day{days!==1?'s':''} · {hrs.toFixed(1)}h</span>
              {earned > 0 && (
                <span style={{fontSize:11,fontWeight:800,padding:'3px 10px',borderRadius:9999,
                  background:allPaid?'rgba(34,197,94,0.15)':'rgba(251,191,36,0.15)',
                  color:allPaid?'#22C55E':'#FBBF24'}}>
                  {allPaid ? '✅ Fully paid' : `🔴 $${outstanding.toFixed(0)} owed`}
                </span>
              )}
            </div>
          );
        })()}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
          {[
            {val:`${hrs.toFixed(1)}h`,lbl:'Total hrs',c:project.color},
            {val:days,lbl:'Days',c:'var(--t1)'},
            {val:`$${earned.toLocaleString('en-US',{minimumFractionDigits:0})}`,lbl:'Earned',c:'#22C55E'},
          ].map(({val,lbl,c})=>(
            <div key={lbl} style={{background:'rgba(0,0,0,0.15)',backdropFilter:'blur(8px)',borderRadius:12,padding:'10px 8px',textAlign:'center',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:19,fontWeight:800,letterSpacing:'-0.04em',color:c,lineHeight:1}}>{val}</div>
              <div style={{fontSize:10,color:'var(--t3)',fontWeight:600,marginTop:3,letterSpacing:'0.02em'}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Sparkline — last 7 days */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--t4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>Last 7 Days</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:4,height:36}}>
            {spark.map((h,i)=>{
              const isToday = i===6;
              return (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,height:'100%',justifyContent:'flex-end'}}>
                  <div style={{
                    width:'100%',
                    height:h?`${Math.max((h/sparkMax)*28,4)}px`:'3px',
                    background:h?(isToday?project.color:`${project.color}70`):'rgba(255,255,255,0.08)',
                    borderRadius:'4px 4px 2px 2px',
                    transition:'height 0.3s ease',
                  }}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer row */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {hasToday && (
              <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:9999,background:'rgba(34,197,94,0.15)',color:'#22C55E'}}>
                ✓ Logged today
              </span>
            )}
            {!hasToday && lastEntry && (
              <span style={{fontSize:11,color:'var(--t4)'}}>Last: {fmtShort(lastEntry.date)}</span>
            )}
            {weekH > 0 && (
              <span style={{fontSize:11,color:'var(--t3)',fontWeight:600}}>{weekH.toFixed(1)}h this week</span>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5,color:project.color,fontSize:13,fontWeight:800}}>
            Open <span style={{fontSize:18,lineHeight:1}}>›</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { projects, entries, loading } = useLogs();
  const router = useRouter();
  const today = todayStr();
  const now = new Date();
  const hour = now.getHours();
  const greet = hour<12?'Good morning ☀️':hour<17?'Good afternoon 👋':'Good evening 🌙';

  // Overall totals across all projects
  const allH = totalHours(entries);
  const allEarned = totalEarned(entries);
  const { start:ws,end:we } = getWeekRange(today);
  const weekH = totalHours(entries.filter(e=>e.date>=ws&&e.date<=we));

  return (
    <Layout title={greet} subtitle={now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}>
      {loading ? (
        <>
          <div className="skel" style={{height:64,borderRadius:16,marginBottom:18}}/>
          <div className="skel" style={{height:260,borderRadius:22,marginBottom:16}}/>
          <div className="skel" style={{height:80,borderRadius:16}}/>
        </>
      ) : (
        <>
          {/* Overall summary bar */}
          {entries.length > 0 && (
            <div style={{
              background:'var(--bg2)', border:'1px solid var(--sep)',
              borderRadius:16, padding:'14px 16px',
              display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
              gap:0, marginBottom:22,
              boxShadow:'var(--card-shadow)',
            }}>
              {[
                {val:`${weekH.toFixed(1)}h`,lbl:'This week'},
                {val:`${allH.toFixed(1)}h`,lbl:'All time',center:true},
                {val:`$${allEarned.toFixed(0)}`,lbl:'Total earned',right:true,green:true},
              ].map(({val,lbl,center,right,green})=>(
                <div key={lbl} style={{textAlign:center?'center':right?'right':'left',padding:'0 4px',borderRight:center?'1px solid var(--sep)':'none',borderLeft:center?'none':'none'}}>
                  {center&&<div style={{width:'1px',height:'100%'}}/>}
                  <div style={{fontSize:20,fontWeight:800,letterSpacing:'-0.04em',color:green?'#22C55E':'var(--t1)'}}>{val}</div>
                  <div style={{fontSize:10,color:'var(--t3)',fontWeight:600,marginTop:2}}>{lbl}</div>
                </div>
              ))}
            </div>
          )}

          {/* Section label */}
          <div className="lbl">Your Jobs</div>

          {/* Project cards */}
          {projects.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">📁</div>
              <div className="empty-title">No projects yet</div>
              <div className="empty-sub">Tell me about your first job and I'll set it up.</div>
            </div>
          ) : projects.map(p=>(
            <ProjectCard key={p.id} project={p} entries={entries} onOpen={()=>router.push(`/project/${p.id}`)}/>
          ))}

          {/* Add new */}
          <div style={{border:'1.5px dashed var(--sep)',borderRadius:20,padding:'18px 16px',textAlign:'center',opacity:0.6}}>
            <div style={{fontSize:20,marginBottom:6}}>＋</div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--t2)',marginBottom:3}}>Start a New Job</div>
            <div style={{fontSize:12,color:'var(--t4)',lineHeight:1.5}}>Tell me the job details and I'll create a project folder</div>
          </div>
        </>
      )}
    </Layout>
  );
}
