import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls, ContactShadows, Html } from "@react-three/drei";

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
  if (own.some(t => t.status === "in_progress") || employee.status === "working") return { key: "working", tasks: own };
  if (own.some(t => ["review", "pending"].includes(t.status))) return { key: "review", tasks: own };
  if (own.some(t => t.status === "blocked") || employee.status === "error") return { key: "blocked", tasks: own };
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

function AgentAvatar({ employee, status, position, destination, onSelect, selected, color, variant }) {
  const group = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const tint = color || "#6b9cff";
  const active = status.key === "working";
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (group.current) {
      const target = destination || position;
      const dx = target[0] - group.current.position.x;
      const dz = target[2] - group.current.position.z;
      const distance = Math.hypot(dx, dz);
      const moving = distance > 0.08;
      const step = Math.min(1, delta * 1.8);
      group.current.position.x += dx * step;
      group.current.position.z += dz * step;
      group.current.position.y = position[1] + (moving ? Math.abs(Math.sin(t * 8)) * 0.045 : status.key === "planned" ? 0 : Math.sin(t * 1.7) * 0.018);
      if (moving) {
        const targetYaw = Math.atan2(dx, dz);
        let angle = targetYaw - group.current.rotation.y;
        angle = ((angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        group.current.rotation.y += angle * Math.min(1, delta * 4);
      }
      const walk = moving ? Math.sin(t * 9) * 0.65 : 0;
      if (leftLeg.current) leftLeg.current.rotation.x = walk;
      if (rightLeg.current) rightLeg.current.rotation.x = -walk;
      if (leftArm.current) leftArm.current.rotation.x = moving ? -walk * 0.55 : active ? -0.72 + Math.sin(t * 10) * 0.12 : -0.08;
      if (rightArm.current) rightArm.current.rotation.x = moving ? walk * 0.55 : active ? -0.72 + Math.cos(t * 10) * 0.12 : -0.08;
    }
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
    <mesh position={[-0.078, 1.015, 0.218]}><sphereGeometry args={[0.018, 8, 8]} /><meshStandardMaterial color="#253247" roughness={0.65} /></mesh>
    <mesh position={[0.078, 1.015, 0.218]}><sphereGeometry args={[0.018, 8, 8]} /><meshStandardMaterial color="#253247" roughness={0.65} /></mesh>
    <mesh position={[0, 0.965, 0.231]}><sphereGeometry args={[0.018, 8, 8]} /><meshStandardMaterial color="#b98368" roughness={0.9} /></mesh>
    <mesh ref={leftArm} position={[-0.29, 0.63, 0.08]} rotation={[0, 0, -0.16]}>
      <capsuleGeometry args={[0.075, 0.36, 4, 7]} />
      <meshStandardMaterial color={tint} />
    </mesh>
    <mesh ref={rightArm} position={[0.29, 0.63, 0.08]} rotation={[0, 0, 0.16]}>
      <capsuleGeometry args={[0.075, 0.36, 4, 7]} />
      <meshStandardMaterial color={tint} />
    </mesh>
    <mesh ref={leftLeg} position={[-0.11, 0.12, 0]}>
      <capsuleGeometry args={[0.075, 0.22, 4, 7]} />
      <meshStandardMaterial color="#27384d" />
    </mesh>
    <mesh ref={rightLeg} position={[0.11, 0.12, 0]}>
      <capsuleGeometry args={[0.075, 0.22, 4, 7]} />
      <meshStandardMaterial color="#27384d" />
    </mesh>
    {variant === 0 && <mesh position={[0, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.235, 0.025, 7, 18]} /><meshStandardMaterial color="#303b4b" /></mesh>}
    {variant === 1 && <mesh position={[0, 1.17, 0.02]}><sphereGeometry args={[0.24, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.35]} /><meshStandardMaterial color="#27364a" /></mesh>}
    {variant === 2 && <>
      <mesh position={[-0.085, 1.0, 0.205]}><torusGeometry args={[0.055, 0.012, 6, 12]} /><meshStandardMaterial color="#263341" /></mesh>
      <mesh position={[0.085, 1.0, 0.205]}><torusGeometry args={[0.055, 0.012, 6, 12]} /><meshStandardMaterial color="#263341" /></mesh>
      <mesh position={[0, 1.0, 0.21]}><boxGeometry args={[0.08, 0.018, 0.018]} /><meshStandardMaterial color="#263341" /></mesh>
    </>}
    {variant === 3 && <mesh position={[0, 0.68, 0.16]} rotation={[0.1, 0, 0]}><coneGeometry args={[0.075, 0.3, 4]} /><meshStandardMaterial color="#f0d28a" /></mesh>}
    <mesh position={[0, 1.42, 0]}>
      <sphereGeometry args={[selected ? 0.12 : 0.085, 12, 8]} />
      <meshBasicMaterial color={STATUS[status.key].color} />
    </mesh>
    <mesh position={[0, 1.56, 0]}>
      <sphereGeometry args={[0.035, 8, 8]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
    <Html position={[0, 1.86, 0]} distanceFactor={11} center><button type="button" className={"agent-name-tag agent-select-target" + (selected ? " selected" : "")} aria-label={"Inspect " + employee.name} aria-pressed={selected} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onSelect(employee.id); }}>{employee.name}</button></Html>
  </group>;
}

function OfficeRoom({ department, index, employees, tasks, selectedId, onSelect, visible = true }) {
  const floor = index < 6 ? 0 : 1;
  const local = index % 6;
  const col = local % 3;
  const row = Math.floor(local / 3);
  const x = -9 + col * 9;
  const z = -4 + row * 8;
  const y = floor * 5.7;
  const agents = employees.filter(e => (e.department || "Unassigned") === department);
  const wallColor = PALETTE[index % PALETTE.length];
  return <group position={[x, y, z]} visible={visible}>
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
    <Html position={[-3.45, 2.74, -3.47]} distanceFactor={9} center><div className="room-sign">{department}</div></Html>
    {Array.from({ length: Math.max(1, agents.length) }, (_, seat) => {
      const sx = -2.65 + (seat % 3) * 2.55;
      const sz = -1.25 + Math.floor(seat / 3) * 2.25;
      const employee = agents[seat];
      if (!employee) return null;
      const status = getStatus(employee, tasks);
      const employeeIndex = employees.findIndex(item => item.id === employee.id);
      const avatarColor = roundedColor(employee.role_key || employee.department || employee.id);
      return <group key={employee.id}>
        <Desk position={[sx, 0, sz - 0.5]} />
        <Chair position={[sx, 0, sz + 0.8]} />
        <AgentAvatar
        employee={employee}
        status={status}
        position={[sx, 0, sz + 0.45]}
        destination={status.key === "review"
          ? [18 - x + (employeeIndex % 3) * 0.42, 0, -5 - z + Math.floor(employeeIndex / 3) * 0.42]
          : status.key === "blocked"
            ? [18 - x + (employeeIndex % 3) * 0.42, 0, 3 - z + Math.floor(employeeIndex / 3) * 0.42]
            : [sx, 0, sz + 0.45]}
        selected={selectedId === employee.id}
        onSelect={onSelect}
        color={avatarColor}
        variant={employeeIndex % 4}
      />
      </group>;
    })}
  </group>;
}

function Building({ employees, tasks, selectedId, onSelect, activeFloor }) {
  const departments = useMemo(() => {
    const fromEmployees = [...new Set(employees.map(e => e.department || "Unassigned"))];
    return fromEmployees.length ? fromEmployees : [];
  }, [employees]);
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]} receiveShadow>
      <planeGeometry args={[48, 34]} />
      <meshStandardMaterial color="#7f9a7a" roughness={1} />
    </mesh>
    {departments.map((department, index) =>
      <OfficeRoom key={department} department={department} index={index} employees={employees} tasks={tasks} selectedId={selectedId} onSelect={onSelect} visible={activeFloor === "all" || (index < 6 ? "0" : "1") === activeFloor} />
    )}
    <group position={[13, 0, 5]}>
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, i * 0.45 + 0.22, i * -0.32]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[2.2, 0.12, 0.8]} />
        <meshStandardMaterial color="#b8c0c9" />
      </mesh>)}
    </group>
  </>;
}

function SharedSpaces({ activeFloor = "all" }) {
  const rooms = [
    { x: 18, z: -5, color: "#b9c9d6" },
    { x: 18, z: 3, color: "#c9d4c4" },
    { x: 18, z: 11, color: "#c9b9b0" }
  ];
  return <>
    {rooms.flatMap((r, i) => [0, 5.7].map(floorY => <group key={i + ":" + floorY} position={[r.x, floorY, r.z]} visible={activeFloor === "all" || String(Math.round(floorY / 5.7)) === activeFloor}>
      <mesh position={[0, -0.08, 0]} receiveShadow><boxGeometry args={[7.2, 0.16, 7.2]} /><meshStandardMaterial color={r.color} roughness={0.9} /></mesh>
      <mesh position={[0, 1.35, -3.55]}><boxGeometry args={[7.2, 2.7, 0.12]} /><meshStandardMaterial color="#e8e6df" /></mesh>
      <mesh position={[-3.55, 1.35, 0]}><boxGeometry args={[0.12, 2.7, 7.2]} /><meshStandardMaterial color="#e8e6df" /></mesh>
      <mesh position={[3.55, 1.35, 0]}><boxGeometry args={[0.12, 2.7, 7.2]} /><meshStandardMaterial color="#d5e4e8" transparent opacity={0.3} /></mesh>
      {i === 0 && <>
        <mesh position={[0, 0.8, 0]}><boxGeometry args={[4.2, 0.16, 1.5]} /><meshStandardMaterial color="#8b6b52" /></mesh>
        {[-1.5, -0.5, 0.5, 1.5].flatMap(x => [-1.5, 1.5].map(z => <group key={x + ":" + z} position={[x, 0, z]}><mesh position={[0, 0.48, 0]}><boxGeometry args={[0.65, 0.12, 0.65]} /><meshStandardMaterial color="#34455d" /></mesh><mesh position={[0, 0.24, 0]}><cylinderGeometry args={[0.06, 0.06, 0.45, 8]} /><meshStandardMaterial color="#8d9aab" /></mesh></group>))}
        <mesh position={[0, 1.6, -3.42]}><boxGeometry args={[2.8, 1.2, 0.08]} /><meshStandardMaterial color="#26384b" /></mesh>
      </>}
      {i === 1 && <>
        <mesh position={[0, 0.7, -2.5]}><boxGeometry args={[5.4, 1.2, 0.8]} /><meshStandardMaterial color="#8b725d" /></mesh>
        <mesh position={[-2.2, 1.3, -2.5]}><boxGeometry args={[0.8, 1.1, 0.8]} /><meshStandardMaterial color="#e2e7e9" /></mesh>
        <mesh position={[2.2, 0.9, -2.5]}><boxGeometry args={[0.8, 1.7, 0.8]} /><meshStandardMaterial color="#7f9aa8" /></mesh>
        <mesh position={[2.2, 1.9, -2.5]}><cylinderGeometry args={[0.42, 0.42, 0.5, 16]} /><meshStandardMaterial color="#4b9ac5" /></mesh>
        <mesh position={[0, 0.55, 1.1]}><boxGeometry args={[2.4, 0.12, 0.9]} /><meshStandardMaterial color="#9a765a" /></mesh>
      </>}
      {i === 2 && <>
        <mesh position={[0, 0.72, -2.2]}><boxGeometry args={[3.6, 0.9, 1.1]} /><meshStandardMaterial color="#4d7185" /></mesh>
        <mesh position={[0, 1.22, -2.65]}><boxGeometry args={[3.6, 0.55, 0.18]} /><meshStandardMaterial color="#38586c" /></mesh>
        <mesh position={[0, 0.42, 0.2]}><boxGeometry args={[1.7, 0.12, 1.1]} /><meshStandardMaterial color="#805d43" /></mesh>
        <mesh position={[-2.2, 0.65, 1.7]}><boxGeometry args={[1.1, 1.2, 1.1]} /><meshStandardMaterial color="#c38a61" /></mesh>
        <mesh position={[2.2, 0.65, 1.7]}><boxGeometry args={[1.1, 1.2, 1.1]} /><meshStandardMaterial color="#8b9f72" /></mesh>
      </>}
    </group>))}
  </>;
}

function Scene({ employees, tasks, selectedId, onSelect, activeFloor }) {
  return <>
    <color attach="background" args={["#b9c9d3"]} />
    <fog attach="fog" args={["#b9c9d3", 35, 90]} />
    <ambientLight intensity={1.15} />
    <directionalLight position={[14, 24, 12]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <Building employees={employees} tasks={tasks} selectedId={selectedId} onSelect={onSelect} activeFloor={activeFloor} />
    <SharedSpaces activeFloor={activeFloor} />
    <ContactShadows position={[0, -0.25, 0]} opacity={0.24} scale={48} blur={2.5} far={12} />
  </>;
}

function getAgentWorldPosition(employee, employees, tasks = []) {
  const departments = [...new Set(employees.map(e => e.department || "Unassigned"))];
  const department = employee.department || "Unassigned";
  const index = departments.indexOf(department);
  const floor = index < 6 ? 0 : 1;
  const local = index % 6;
  const roomX = -9 + (local % 3) * 9;
  const roomZ = -4 + Math.floor(local / 3) * 8;
  const team = employees.filter(e => (e.department || "Unassigned") === department);
  const seat = team.findIndex(e => e.id === employee.id);
  const deskX = -2.65 + (seat % 3) * 2.55;
  const deskZ = -1.25 + Math.floor(seat / 3) * 2.25;
  const status = getStatus(employee, tasks);
  const targetX = status.key === "review" || status.key === "blocked" ? 18 + (seat % 3) * 0.42 : roomX + deskX;
  const targetZ = status.key === "review" ? -5 + Math.floor(seat / 3) * 0.42 : status.key === "blocked" ? 11 + Math.floor(seat / 3) * 0.42 : roomZ + deskZ + 0.45;
  return [targetX, floor * 5.7 + 1.15, targetZ];
}

function WalkController({ enabled, move }) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set());
  const yaw = useRef(0);
  const pitch = useRef(0);
  const pointer = useRef(null);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!enabled) {
      keys.current.clear();
      pointer.current = null;
      return;
    }
    camera.position.set(0, 2.4, 25);
    camera.rotation.order = "YXZ";
    camera.lookAt(0, 2.4, 0);
    yaw.current = camera.rotation.y;
    pitch.current = camera.rotation.x;

    const onKeyDown = event => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e"].includes(key)) {
        event.preventDefault();
        keys.current.add(key);
      }
    };
    const onKeyUp = event => keys.current.delete(event.key.toLowerCase());
    const onPointerDown = event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointer.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      try { gl.domElement.setPointerCapture(event.pointerId); } catch {}
    };
    const onPointerMove = event => {
      if (!pointer.current || pointer.current.id !== event.pointerId) return;
      const dx = event.clientX - pointer.current.x;
      const dy = event.clientY - pointer.current.y;
      pointer.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      yaw.current -= dx * 0.006;
      pitch.current = THREE.MathUtils.clamp(pitch.current - dy * 0.0045, -0.72, 0.48);
      camera.rotation.set(pitch.current, yaw.current, 0);
    };
    const onPointerUp = event => {
      if (pointer.current?.id === event.pointerId) pointer.current = null;
    };
    gl.domElement.addEventListener("pointerdown", onPointerDown);
    gl.domElement.addEventListener("pointermove", onPointerMove);
    gl.domElement.addEventListener("pointerup", onPointerUp);
    gl.domElement.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      gl.domElement.removeEventListener("pointerdown", onPointerDown);
      gl.domElement.removeEventListener("pointermove", onPointerMove);
      gl.domElement.removeEventListener("pointerup", onPointerUp);
      gl.domElement.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [enabled, camera, gl]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const pressed = keys.current;
    let horizontal = Number(move?.x || 0);
    let vertical = -Number(move?.y || 0);
    if (pressed.has("a") || pressed.has("arrowleft")) horizontal -= 1;
    if (pressed.has("d") || pressed.has("arrowright")) horizontal += 1;
    if (pressed.has("w") || pressed.has("arrowup")) vertical += 1;
    if (pressed.has("s") || pressed.has("arrowdown")) vertical -= 1;
    const magnitude = Math.hypot(horizontal, vertical);
    if (magnitude > 1) {
      horizontal /= magnitude;
      vertical /= magnitude;
    }
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    right.y = 0;
    right.normalize();
    const speed = 8 * delta;
    camera.position.addScaledVector(forward, vertical * speed);
    camera.position.addScaledVector(right, horizontal * speed);
    if (pressed.has("q")) camera.position.y -= 4 * delta;
    if (pressed.has("e")) camera.position.y += 4 * delta;
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.4, 10.5);
  });
  return null;
}

function normalizeState(payload) {
  const employees = Array.isArray(payload?.employees) ? payload.employees : [];
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  const events = Array.isArray(payload?.events) ? payload.events : [];
  return { employees, tasks, events, departments: Array.isArray(payload?.departments) ? payload.departments : [] };
}

export function OfficeApp() {
  const [snapshot, setSnapshot] = useState({ employees: [], tasks: [], events: [], departments: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [walkMode, setWalkMode] = useState(false);
  const [activeFloor, setActiveFloor] = useState("all");
  const [joystickMove, setJoystickMove] = useState({ x: 0, y: 0 });
  const controls = useRef();
  const employees = snapshot.employees;
  const tasks = snapshot.tasks;

  useEffect(() => {
    if (!selectedId || !controls.current) return;
    const employee = employees.find(e => e.id === selectedId);
    if (!employee) return;
    const target = getAgentWorldPosition(employee, employees, tasks);
    if (!walkMode && controls.current) {
      controls.current.target.set(target[0], target[1], target[2]);
      controls.current.update();
    }
  }, [selectedId, employees, tasks, walkMode]);

  useEffect(() => {
    const receive = event => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "curioframe:office-snapshot") {
        setSnapshot(normalizeState(event.data.payload));
        setConnected(true);
        setLastUpdate(new Date());
      } else if (event.data?.type === "curioframe:select-agent" && typeof event.data.employeeId === "string") {
        setSelectedId(event.data.employeeId);
      } else if (event.data?.type === "curioframe:office-control") {
        const action = event.data.action;
        if (action === "walk") setWalkMode(true);
        if (action === "orbit") setWalkMode(false);
        if (action === "reset") {
          setWalkMode(false);
          controls.current?.reset?.();
        }
        if (action === "zoom-in" && !walkMode) {
          controls.current?.dollyIn?.(1.2);
          controls.current?.update?.();
        }
        if (action === "zoom-out" && !walkMode) {
          controls.current?.dollyOut?.(1.2);
          controls.current?.update?.();
        }
      } else if (event.data?.type === "curioframe:office-move") {
        setJoystickMove({
          x: THREE.MathUtils.clamp(Number(event.data.x) || 0, -1, 1),
          y: THREE.MathUtils.clamp(Number(event.data.y) || 0, -1, 1)
        });
      }
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "curioframe:office-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  const departments = snapshot.departments.length ? snapshot.departments.map(d => d.name).filter(Boolean) : [...new Set(employees.map(e => e.department || "Unassigned"))];
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
      <div className="office-live"><i className={connected ? "live-dot connected" : "live-dot"} />{connected ? "COMPANY DATA RECEIVED" : "WAITING FOR COMPANY DATA"}</div>
      <div className="office-actions">
        <div className="floor-switcher" role="group" aria-label="Choose office floor">
          <button type="button" className={activeFloor === "all" ? "active" : ""} aria-pressed={activeFloor === "all"} onClick={() => { setWalkMode(false); setActiveFloor("all"); if (controls.current) { controls.current.reset(); controls.current.update(); } }}>Full HQ</button>
          <button type="button" className={activeFloor === "0" ? "active" : ""} aria-pressed={activeFloor === "0"} onClick={() => { setWalkMode(false); setActiveFloor("0"); if (controls.current) { controls.current.target.set(0, 1.35, 0); controls.current.object.position.set(0, 14, 29); controls.current.update(); } }}>Floor 01</button>
          <button type="button" className={activeFloor === "1" ? "active" : ""} aria-pressed={activeFloor === "1"} onClick={() => { setWalkMode(false); setActiveFloor("1"); if (controls.current) { controls.current.target.set(0, 7.05, 0); controls.current.object.position.set(0, 20, 29); controls.current.update(); } }}>Floor 02</button>
        </div>
        <button type="button" onClick={() => { setWalkMode(false); setActiveFloor("all"); controls.current?.reset?.(); }}>Reset view</button>
      </div>
    </header>
    <section className="office-stage">
      <Canvas shadows dpr={[1, 1.4]} camera={{ position: [27, 25, 33], fov: 42 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
        <Scene employees={employees} tasks={tasks} selectedId={selectedId} activeFloor={activeFloor} onSelect={id => { setSelectedId(id); window.parent.postMessage({ type: "curioframe:agent-selected", employeeId: id }, window.location.origin); }} />
        <OrbitControls ref={controls} makeDefault enabled={!walkMode} target={[0, 4.2, 0]} enableDamping dampingFactor={0.08} minDistance={12} maxDistance={65} maxPolarAngle={Math.PI / 2.03} />
        <WalkController enabled={walkMode} move={joystickMove} />
      </Canvas>
      <div className="office-hud">
        <span><b>{employees.length}</b> REGISTERED AGENTS</span>
        <span><b>{departments.length}</b> DEPARTMENTS</span>
        <span><b>{openTasks.length}</b> OPEN TASKS</span>
        <span className="hud-working"><b>{counts.working}</b> WORKING</span>
        <span className="hud-review"><b>{counts.review}</b> REVIEW</span>
        <span className="hud-blocked"><b>{counts.blocked}</b> BLOCKED</span>
      </div>
      <div className="office-help">{walkMode ? "Walk mode: drag to look · joystick / WASD to move · Q / E to move vertically between floors" : "Orbit mode: drag to rotate · pinch to zoom · two-finger drag to pan · tap an Agent to inspect"}</div>
      <nav className="office-crew-picker" aria-label="Select an Agent"><strong>CREW · {employees.length}</strong><div>{employees.map(employee => <button type="button" key={employee.id} className={selectedId === employee.id ? "active" : ""} onClick={() => { setSelectedId(employee.id); window.parent.postMessage({ type: "curioframe:agent-selected", employeeId: employee.id }, window.location.origin); }}>{employee.name}</button>)}</div></nav>
      {!connected && <div className="office-connection-card"><strong>Connect your company workspace</strong><p>This 3D view needs the authenticated CurioFrame workspace to load your 28 Agents, departments, tasks, and activity. Open Virtual HQ from your main dashboard after signing in.</p><a href="../index.html#virtual-hq">Open CurioFrame workspace ↗</a></div>}
      {selected && <aside className="agent-inspector">
        <button className="inspector-close" onClick={() => setSelectedId(null)}>×</button>
        <small>AGENT PROFILE</small><h2>{selected.name}</h2><p>{selected.department}</p>
        <span className="inspector-status" style={{ color: STATUS[selectedStatus.key].color }}>{STATUS[selectedStatus.key].label}</span>
        <p>{selected.responsibilities || "No role description recorded."}</p>
        <h3>Capability record</h3>
        <article><b>{String(selected.capability_status || "not_verified").replaceAll("_", " ").toUpperCase()}</b><small>{selected.capability_verified_at ? "Verified " + new Date(selected.capability_verified_at).toLocaleString() : "No verified capability record"}</small></article>
        {selected.capability_profile && typeof selected.capability_profile === "object" && Object.keys(selected.capability_profile).length > 0
          ? <article><b>Capability profile</b><small>{Object.entries(selected.capability_profile).map(([key, value]) => key.replaceAll("_", " ") + ": " + (typeof value === "string" ? value : JSON.stringify(value))).join(" · ")}</small></article>
          : <p className="empty-state">No capability details recorded.</p>}
        <h3>Recent activity</h3>
        {snapshot.events
          .filter(event => event.employee_id === selected.id || tasks.some(task => task.assigned_employee_id === selected.id && task.id === event.task_id))
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 6).length
          ? snapshot.events
            .filter(event => event.employee_id === selected.id || tasks.some(task => task.assigned_employee_id === selected.id && task.id === event.task_id))
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 6)
            .map(event => <article key={event.id}><b>{String(event.event_type || "activity").replaceAll("_", " ")}</b><small>{event.created_at ? new Date(event.created_at).toLocaleString() : "time unavailable"}</small>{event.message ? <small>{event.message}</small> : null}</article>)
          : <p className="empty-state">No recorded activity events for this Agent.</p>}
        <h3>Task history</h3>
        {tasks.filter(t => t.assigned_employee_id === selected.id).sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, 6).length
          ? tasks.filter(t => t.assigned_employee_id === selected.id).sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, 6).map(t => <article key={t.id}><b>{t.title}</b><small>{String(t.status || "unknown").replaceAll("_", " ")} · {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "date unavailable"}</small>{t.deliverable_url ? <a href={t.deliverable_url} target="_blank" rel="noreferrer">Open deliverable ↗</a> : null}</article>)
          : <p className="empty-state">No task history recorded for this Agent.</p>}
      </aside>}
      <div className="office-freshness">{lastUpdate ? "Last database snapshot: " + lastUpdate.toLocaleTimeString() : "Waiting for parent workspace connection"}</div>
    </section>
  </main>;
}
