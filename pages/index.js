import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useLogs, totalHours, totalEarned, fmtShort } from '../lib/data';

function statusBadge(status) {
  const map = { active:{label:'Active',color:'#22C55E'}, completed:{label:'Done',color:'#98989D'}, paused:{label:'Paused',color:'#FBBF24'} };
  return map[status] || map.active;
}

function ProjectCard({ project, entries, onOpen }) {
  const pEntries = entries.filter(e => e.project === project.id);
  const hrs = totalHours(pEntries);
  const earned = totalEarned(pEntries);
  const days = pEntries.length;
  const lastEntry = [...pEntries].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const badge = statusBadge(project.status);

  // Progress bar: assume ~60 working days for a big job
  const estimatedDays = project.estimatedDays || 60;
  const progress = Math.min((days/estimatedDays)*100, 100);

  return (
    <div
      onClick={onOpen}
      style={{
        background:'var(--bg2)', borderRadius:20, overflow:'hidden',
        border:'1px solid var(--sep)', boxShadow:'var(--card-shadow)',
        cursor:'pointer', marginBottom:14,
        transition:'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        position:'relative',
      }}
      onPointerDown={e=>e.currentTarget.style.transform='scale(0.985)'}
      onPointerUp={e=>e.currentTarget.style.transform='scale(1)'}
      onPointerLeave={e=>e.currentTarget.style.transform='scale(1)'}
    >
      {/* Color bar top */}
      <div style={{ height:4, background:project.color, width:`${Math.max(progress,8)}%`, transition:'width 0.6s ease' }} />

      <div style={{ padding:'16px 16px 14px' }}>
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:42, height:42, borderRadius:12, background:project.color+'18',
              border:`1.5px solid ${project.color}30`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0,
            }}>
              {project.icon}
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, letterSpacing:'-0.02em', color:'var(--t1)', lineHeight:1.2 }}>{project.name}</div>
              {project.client && <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{project.client}</div>}
            </div>
          </div>
          <span style={{
            fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:9999,
            background:badge.color+'18', color:badge.color, letterSpacing:'0.05em',
            flexShrink:0, marginTop:2,
          }}>
            {badge.label}
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
          {[
            { val: `${hrs.toFixed(1)}h`, lbl:'Hours' },
            { val: days, lbl:'Days' },
            { val: `$${earned.toFixed(0)}`, lbl:'Earned', green:true },
          ].map(({val,lbl,green})=>(
            <div key={lbl} style={{ textAlign:'center', background:'var(--bg3)', borderRadius:10, padding:'9px 6px' }}>
              <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.04em', color:green?'#22C55E':project.color }}>{val}</div>
              <div style={{ fontSize:10, color:'var(--t4)', fontWeight:600, marginTop:2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        {project.description && (
          <div style={{ fontSize:12, color:'var(--t3)', lineHeight:1.55, marginBottom:12 }}>{project.description}</div>
        )}

        {/* Footer */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:11, color:'var(--t4)' }}>
            Started {fmtShort(project.startDate)}
            {lastEntry && ` · Last logged ${fmtShort(lastEntry.date)}`}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, color:project.color, fontSize:13, fontWeight:700 }}>
            Open <span style={{ fontSize:16 }}>›</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { projects, entries, loading } = useLogs();
  const router = useRouter();

  return (
    <Layout title="Projects" subtitle="Your work, organized">
      {loading ? (
        <div>
          {[1,2].map(i=><div key={i} className="skel" style={{height:190,marginBottom:14,borderRadius:20}}/>)}
        </div>
      ) : (
        <>
          {projects.length === 0 ? (
            <div className="empty">
              <div className="empty-ico">📁</div>
              <div className="empty-title">No projects yet</div>
              <div className="empty-sub">Tell me about your first job and I'll set up a project folder for it.</div>
            </div>
          ) : (
            projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                entries={entries}
                onOpen={() => router.push(`/project/${p.id}`)}
              />
            ))
          )}

          {/* Add project hint */}
          <div style={{
            border:'1.5px dashed var(--sep)', borderRadius:20,
            padding:'20px 16px', textAlign:'center', marginTop:4,
          }}>
            <div style={{ fontSize:22, marginBottom:8 }}>＋</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--t2)', marginBottom:4 }}>New Project</div>
            <div style={{ fontSize:12, color:'var(--t4)', lineHeight:1.5 }}>Tell me about a new job and I'll create a project folder for it</div>
          </div>
        </>
      )}
    </Layout>
  );
}
