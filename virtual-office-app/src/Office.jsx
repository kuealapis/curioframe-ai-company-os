import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

const STATUS = {
  working: { label: "IN PROGRESS", color: "#45d483" },
  review: { label: "IN REVIEW", color: "#78a9ff" },
  blocked: { label: "BLOCKED", color: "#ff7474" },
  queued: { label: "QUEUED", color: "#e9bd67" },
  planned: { label: "PLANNED", color: "#9aa6b8" },
  idle: { label: "IDLE", color: "#a7b4c8" }
};

const PALETTE = ["#6b9cff", "#48c9bd", "#e7a45e", "#b28be8", "#e87991", "#8dbb70", "#d5bb62", "#6fa9d8", "#d38bb7", "#7db9a2", "#a69be8"];

function getStatus(employee, tasks) {
  const own = tasks.filter(t => t.assigned_employee_id === employee.id && !["completed", "cancelled"].includes(t.status));
  if (own.some(t => t.status === "in_progress")) return { key: "working", tasks: own };
  if (own.some(t => ["review", "pending"].includes(t.status))) return { key: "review", tasks: own };
  if (own.some(t => t.status === "blocked")) return { key: "blocked", tasks: own };
  if (own.some(t => t.status === "queued")) return { key: "queued", tasks: own };
  return { key: employee.status === "planned" ? "planned" : "idle", tasks: own };
}

function roundedColor(value) {
  let hash = 0;
  for (const char of String(value || "agent")) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function Desk({ position, color = "#c4a985" }) {
  return <group position={position}>
    <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.75, 0.13, 1.05]} />
      <meshStandardMaterial color={color} roughness={0.72} />
    </mesh>
    {[[-0.72, 0, -0.39], [0.72, 0, -0.39], [-0.72, 0, 0.39], [0.72, 0, 0.39]].map((p, i) =>
      <mesh key={i} position={[p[0], 0.38, p[2]]}>
        <boxGeometry args={[0.09, 0.75, 0.09]} />
        <meshStandardMaterial color="#6d7888" metalness={0.35} roughness={0.55} />
      </mesh>
    )}
    <mesh position={[0, 1.22, -0.27]} castShadow>
      <boxGeometry args={[0.82, 0.5, 0.07]} />
      <meshStandardMaterial color="#202b3a" roughness={0.35} metalness={0.2} />
    </mesh>
    <mesh position={[0, 1.22, -0.225]}>
      <planeGeometry args={[0.72, 0.39]} />
      <meshBasicMaterial color="#80b9d9" />
    </mesh>
    <mesh position={[0, 0.9, 0.17]}>
      <boxGeometry args={[0.3, 0.035, 0.2]} />
      <meshStandardMaterial color="#333d4c" />
    </mesh>
  </group>;
}

function Chair({ position }) {
  return <group position={position}>
    <mesh position={[0, 0.48, 0]} castShadow>
      <boxGeometry args={[0.62, 0.13, 0.62]} />
      <meshStandardMaterial color="#34455d" roughness={0.82} />
    </mesh>
    <mesh position={[0, 0.92, -0.25]}>
      <boxGeometry args={[0.62, 0.78, 0.12]} />
      <meshStandardMaterial color="#40546e" roughness={0.82} />
    </mesh>
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 0.4, 8]} />
      <meshStandardMaterial color="#8d9aab" metalness={0.5} />
    </mesh>
  </group>;
}

function AgentAvatar({ employee, status, position, onSelect, selected }) {
  const group = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const tint = roundedColor(employee.role_key || employee.department || employee.id);
  const active = status.key === "working" || status.key === "review";
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (leftArm.current) leftArm.current.rotation.x = active ? -0.72 + Math.sin(t * 10) * 0.12 : -0.08;
    if (rightArm.current) rightArm.current.rotation.x = active ? -0.72 + Math.cos(t * 10) * 0.12 : -0.08;
    if (group.current) group.current.position.y = position[1] + (status.key === "planned" ? 0 : Math.sin(t * 1.7) * 0.018);
  });
  return <group ref={group} position={position} onClick={e => { e.stopPropagation(); onSelect(employee.id); }}>
    <mesh position={[0, 0.48, 0]} castShadow>
      <capsuleGeometry args={[0.22, 0.48, 4, 8]} />
      <meshStandardMaterial color={tint} roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.98, 0.02]} castShadow>
      <sphereGeometry args={[0.22, 16, 12]} />
      <meshStandardMaterial color="#d9ad8d" roughness={0.9} />
    </mesh>
    <mesh position={[0, 1.14, -0.015]}>
      <sphereGeometry args={[0.225, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
      <meshStandardMaterial color={tint} roughness={0.9} />
    </mesh>
    <mesh ref={leftArm} position={[-0.29, 0.63, 0.08]} rotation={[0, 0, -0.16]}>
      <capsuleGeometry args={[0.075, 0.36, 4, 7]} />
      <meshStandardMaterial color={tint} />
    </mesh>
    <mesh ref={rightArm} position={[0.29, 0.63, 0.08]} rotation={[0, 0, 0.16]}>
      <capsuleGeometry args={[0.075, 0.36, 4, 7]} />
      <meshStandardMaterial color={tint} />
    </mesh>
    <mesh position={[0, 0.14, 0]}>
      <boxGeometry args={[0.38, 0.26, 0.28]} />
      <meshStandardMaterial color="#27384d" />
    </mesh>
    <mesh position={[0, 1.42, 0]}>
      <sphereGeometry args={[selected ? 0.12 : 0.085, 12, 8]} />
      <meshBasicMaterial color={STATUS[status.key].color} />
    </mesh>
    <mesh position={[0, 1.56, 0]}>
      <sphereGeometry args={[0.035, 8, 8]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  </group>;
}

function OfficeRoom({ department, index, employees, tasks, selectedId, onSelect }) {
  const floor = index < 6 ? 0 : 1;
  const local = index % 6;
  const col = local % 3;
  const row = Math.floor(local / 3);
  const x = -9 + col * 9;
  const z = -4 + row * 8;
  const y = floor * 5.7;
  const agents = employees.filter(e => e.department === department);
  const wallColor = PALETTE[index % PALETTE.length];
  return <group position={[x, y, z]}>
    <mesh position={[0, -0.1, 0]} receiveShadow>
      <boxGeometry args={[8.5, 0.2, 7.5]} />
      <meshStandardMaterial color={floor ? "#d8d8d1" : "#d5d0c5"} roughness={0.9} />
    </mesh>
    <mesh position={[0, 1.35, -3.7]}>
      <boxGeometry args={[8.5, 2.7, 0.16]} />
      <meshStandardMaterial color="#e8e6df" roughness={0.85} />
    </mesh>
    <mesh position={[-4.2, 1.35, 0]}>
      <boxGeometry args={[0.16, 2.7, 7.5]} />
      <meshStandardMaterial color="#e8e6df" roughness={0.85} />
    </mesh>
    <mesh position={[4.2, 1.35, 0]}>
      <boxGeometry args={[0.16, 2.7, 7.5]} />
      <meshStandardMaterial color="#d5e4e8" transparent opacity={0.32} roughness={0.18} />
    </mesh>
    <mesh position={[0, 0.04, 3.7]}>
      <boxGeometry args={[8.5, 0.08, 0.16]} />
      <meshStandardMaterial color={wallColor} />
    </mesh>
    <mesh position={[-3.45, 2.74, -3.57]}>
      <boxGeometry args={[1.3, 0.48, 0.12]} />
      <meshStandardMaterial color={wallColor} emissive={wallColor} emissiveIntensity={0.18} />
    </mesh>
    {Array.from({ length: Math.max(1, agents.length) }, (_, seat) => {
      const sx = -2.65 + (seat % 3) * 2.55;
      const sz = -1.25 + Math.floor(seat / 3) * 2.25;
      const employee = agents[seat];
      if (!employee) return null;
      const status = getStatus(employee, tasks);
      return <group key={employee.id}>
        <Desk position={[sx, 0, sz - 0.5]} />
        <Chair position={[sx, 0, sz + 0.8]} />
        <AgentAvatar employee={employee} status={status} position={[sx, 0, sz + 0.45]} selected={selectedId === employee.id} onSelect={onSelect} />
      </group>;
    })}
  </group>;
}

function Building({ employees, tasks, selectedId, onSelect }) {
  const departments = useMemo(() => {
    const fromEmployees = [...new Set(employees.map(e => e.department).filter(Boolean))];
    return fromEmployees.length ? fromEmployees : [];
  }, [employees]);
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]} receiveShadow>
      <planeGeometry args={[48, 34]} />
      <meshStandardMaterial color="#7f9a7a" roughness={1} />
    </mesh>
    {departments.map((department, index) =>
      <OfficeRoom key={department} department={department} index={index} employees={employees} tasks={tasks} selectedId={selectedId} onSelect={onSelect} />
    )}
    <group position={[13, 0, 5]}>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, i * 0.45 + 0.22, i * -0.32]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[2.2, 0.12, 0.8]} />
        <meshStandardMaterial color="#b8c0c9" />
      </mesh>)}
    </group>
  </>;
}

function Scene({ employees, tasks, selectedId, onSelect }) {
  return <>
    <color attach="background" args={["#b9c9d3"]} />
    <fog attach="fog" args={["#b9c9d3", 35, 90]} />
    <ambientLight intensity={1.15} />
    <directionalLight position={[14, 24, 12]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <Building employees={employees} tasks={tasks} selectedId={selectedId} onSelect={onSelect} />
    <ContactShadows position={[0, -0.25, 0]} opacity={0.24} scale={48} blur={2.5} far={12} />
  </>;
}

function normalizeState(payload) {
  const employees = Array.isArray(payload?.employees) ? payload.employees : [];
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  return { employees, tasks, departments: Array.isArray(payload?.departments) ? payload.departments : [] };
}

export function OfficeApp() {
  const [snapshot, setSnapshot] = useState({ employees: [], tasks: [], departments: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const controls = useRef();

  useEffect(() => {
    const receive = event => {
      if (event.origin !== window.location.origin || event.data?.type !== "curioframe:office-snapshot") return;
      setSnapshot(normalizeState(event.data.payload));
      setConnected(true);
      setLastUpdate(new Date());
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "curioframe:office-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  const employees = snapshot.employees;
  const tasks = snapshot.tasks;
  const departments = snapshot.departments.length ? snapshot.departments.map(d => d.name).filter(Boolean) : [...new Set(employees.map(e => e.department).filter(Boolean))];
  const selected = employees.find(e => e.id === selectedId);
  const selectedStatus = selected ? getStatus(selected, tasks) : null;
  const openTasks = tasks.filter(t => !["completed", "cancelled"].includes(t.status));
  const counts = {
    working: employees.filter(e => getStatus(e, tasks).key === "working").length,
    review: employees.filter(e => getStatus(e, tasks).key === "review").length,
    blocked: employees.filter(e => getStatus(e, tasks).key === "blocked").length
  };

  return <main className="office-app">
    <header className="office-topbar">
      <div className="office-brand"><span className="brand-mark">CF</span><div><strong>CURIOFRAME AI</strong><small>VIRTUAL HEADQUARTERS · 3D FLOORPLAN</small></div></div>
      <div className="office-live"><i className={connected ? "live-dot connected" : "live-dot"} />{connected ? "DATABASE SNAPSHOT RECEIVED" : "WAITING FOR COMPANY DATA"}</div>
      <div className="office-actions">
        <button onClick={() => controls.current?.reset?.()}>Reset view</button>
      </div>
    </header>
    <section className="office-stage">
      <Canvas shadows dpr={[1, 1.4]} camera={{ position: [27, 25, 33], fov: 42 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
        <Scene employees={employees} tasks={tasks} selectedId={selectedId} onSelect={setSelectedId} />
        <OrbitControls ref={controls} makeDefault target={[0, 4.2, 0]} enableDamping dampingFactor={0.08} minDistance={12} maxDistance={65} maxPolarAngle={Math.PI / 2.03} />
      </Canvas>
      <div className="office-hud">
        <span><b>{employees.length}</b> REGISTERED AGENTS</span>
        <span><b>{departments.length}</b> DEPARTMENTS</span>
        <span><b>{openTasks.length}</b> OPEN TASKS</span>
        <span className="hud-working"><b>{counts.working}</b> WORKING</span>
        <span className="hud-review"><b>{counts.review}</b> REVIEW</span>
        <span className="hud-blocked"><b>{counts.blocked}</b> BLOCKED</span>
      </div>
      <div className="office-help">Drag to orbit · Pinch to zoom · Two-finger drag to pan · Tap an Agent to inspect</div>
      {selected && <aside className="agent-inspector">
        <button className="inspector-close" onClick={() => setSelectedId(null)}>×</button>
        <small>AGENT PROFILE</small><h2>{selected.name}</h2><p>{selected.department}</p>
        <span className="inspector-status" style={{ color: STATUS[selectedStatus.key].color }}>{STATUS[selectedStatus.key].label}</span>
        <p>{selected.responsibilities || "No role description recorded."}</p>
        <h3>Assigned work</h3>
        {selectedStatus.tasks.length ? selectedStatus.tasks.map(t => <article key={t.id}><b>{t.title}</b><small>{String(t.status).replaceAll("_", " ")}</small></article>) : <p className="empty-state">No open task assigned to this Agent.</p>}
      </aside>}
      <div className="office-freshness">{lastUpdate ? "Last database snapshot: " + lastUpdate.toLocaleTimeString() : "Waiting for parent workspace connection"}</div>
    </section>
  </main>;
}
