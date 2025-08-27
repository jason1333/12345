import React, { useEffect, useMemo, useRef, useState, useCallback, useReducer } from "react";
import * as THREE from "three";

// Mock data
const mockStone = { key: "sapphire", name: "Blue Sapphire" };
const mockCut = { 
  key: "round_brilliant", 
  name: "Round Brilliant", 
  file: "round_brilliant.cut",
  image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop&crop=center"
};

const mockGems = [
  {
    id: "sapphire",
    key: "sapphire", 
    name: "Blue Sapphire",
    hardness: "9.0",
    ri: "1.76-1.77",
    notes: "Excellent hardness for cutting. Watch for inclusions."
  }
];

// Comprehensive stone cutting database
const stoneCuttingDatabase: Record<string, {
  lapWheel: string;
  polishCompound: string;
  avoid: string;
  techniques: string;
}> = {
  "Blue Sapphire": {
    lapWheel: "Ceramic or Tin",
    polishCompound: "Alumina or Diamond", 
    avoid: "Scratches from contaminated laps, excessive heat",
    techniques: "Light pressure; diamond for hard stones; clean laps between grits."
  },
  "Diamond": {
    lapWheel: "Tin or Copper",
    polishCompound: "Diamond paste",
    avoid: "Heavy pressure, overheating",
    techniques: "Use very light pressure; pre-polish thoroughly to avoid scratches."
  },
  "Ruby": {
    lapWheel: "Ceramic or Tin",
    polishCompound: "Alumina or Diamond",
    avoid: "Scratches from contaminated laps, excessive heat", 
    techniques: "Light pressure; similar to sapphire; ensure proper pre-polishing."
  },
  "Emerald": {
    lapWheel: "Tin",
    polishCompound: "Cerium oxide",
    avoid: "Heavy pressure, heat, vibrations",
    techniques: "Fragile; use light pressure; wet polishing only."
  }
};

const useSelection = () => ({
  stone: mockStone,
  cut: mockCut,
  navigate: (page: string) => console.log(`Navigate to: ${page}`)
});

// Cutting program
const cuttingProgram = [
  { step: 1, facet: "P1", angle: 43.0, index: 96, description: "Pavilion main 1", code: "ANGLE 43.0\nINDEX 96\nCUT DEPTH 0.5" },
  { step: 2, facet: "P2", angle: 43.0, index: 48, description: "Pavilion main 2", code: "INDEX 48\nCUT DEPTH 0.5" },
  { step: 3, facet: "P3", angle: 43.0, index: 144, description: "Pavilion main 3", code: "INDEX 144\nCUT DEPTH 0.5" },
  { step: 4, facet: "P4", angle: 43.0, index: 0, description: "Pavilion main 4", code: "INDEX 0\nCUT DEPTH 0.5" },
  { step: 5, facet: "P5", angle: 43.0, index: 192, description: "Pavilion main 5", code: "INDEX 192\nCUT DEPTH 0.5" },
  { step: 6, facet: "P6", angle: 43.0, index: 288, description: "Pavilion main 6", code: "INDEX 288\nCUT DEPTH 0.5" },
  { step: 7, facet: "P7", angle: 43.0, index: 240, description: "Pavilion main 7", code: "INDEX 240\nCUT DEPTH 0.5" },
  { step: 8, facet: "P8", angle: 43.0, index: 336, description: "Pavilion main 8", code: "INDEX 336\nCUT DEPTH 0.5" },
  { step: 9, facet: "C1", angle: 34.0, index: 96, description: "Crown main 1", code: "ANGLE 34.0\nINDEX 96\nCUT DEPTH 0.3" },
  { step: 10, facet: "C2", angle: 34.0, index: 48, description: "Crown main 2", code: "INDEX 48\nCUT DEPTH 0.3" },
  { step: 11, facet: "C3", angle: 34.0, index: 144, description: "Crown main 3", code: "INDEX 144\nCUT DEPTH 0.3" },
  { step: 12, facet: "C4", angle: 34.0, index: 0, description: "Crown main 4", code: "INDEX 0\nCUT DEPTH 0.3" },
  { step: 13, facet: "TABLE", angle: 0, index: 0, description: "Table polish", code: "ANGLE 0\nPOLISH TABLE\nFINISH" }
];

// Types
type CuttingState = {
  isRunning: boolean;
  isPaused: boolean;
  currentStep: number;
  currentFacet: string | null;
  completedFacets: string[];
  position: { index: number; angle: number; depth: number };
  settings: { speed: number; pressure: number; coolant: number };
  emergencyStop: boolean;
  progress: number;
};

type CuttingAction = 
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'EMERGENCY_STOP' }
  | { type: 'JOG_INDEX'; delta: number }
  | { type: 'JOG_ANGLE'; delta: number }
  | { type: 'JOG_DEPTH'; delta: number }
  | { type: 'ADJUST_SPEED'; delta: number }
  | { type: 'ADJUST_PRESSURE'; delta: number }
  | { type: 'ADJUST_COOLANT'; delta: number }
  | { type: 'NEXT_STEP'; step: number; facet: string; position: { index: number; angle: number; depth: number } }
  | { type: 'COMPLETE_FACET'; facet: string };

// Reducer
const cuttingReducer = (state: CuttingState, action: CuttingAction): CuttingState => {
  switch (action.type) {
    case 'START':
      return { ...state, isRunning: true, isPaused: false, emergencyStop: false };
    case 'PAUSE':
      return { ...state, isRunning: false, isPaused: true };
    case 'STOP':
      return { 
        ...state, 
        isRunning: false, 
        isPaused: false, 
        currentStep: 0, 
        currentFacet: null,
        completedFacets: [],
        progress: 0
      };
    case 'EMERGENCY_STOP':
      return { ...state, isRunning: false, isPaused: false, emergencyStop: true };
    case 'JOG_INDEX':
      return {
        ...state,
        position: { ...state.position, index: (state.position.index + action.delta + 360) % 360 }
      };
    case 'JOG_ANGLE':
      return {
        ...state,
        position: { ...state.position, angle: Math.max(0, Math.min(90, state.position.angle + action.delta)) }
      };
    case 'JOG_DEPTH':
      return {
        ...state,
        position: { ...state.position, depth: Math.max(0, state.position.depth + action.delta) }
      };
    case 'ADJUST_SPEED':
      return {
        ...state,
        settings: { ...state.settings, speed: Math.max(10, Math.min(100, state.settings.speed + action.delta)) }
      };
    case 'ADJUST_PRESSURE':
      return {
        ...state,
        settings: { ...state.settings, pressure: Math.max(1, Math.min(10, state.settings.pressure + action.delta)) }
      };
    case 'ADJUST_COOLANT':
      return {
        ...state,
        settings: { ...state.settings, coolant: Math.max(0, Math.min(100, state.settings.coolant + action.delta)) }
      };
    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: action.step,
        currentFacet: action.facet,
        position: action.position,
        progress: (action.step / cuttingProgram.length) * 100
      };
    case 'COMPLETE_FACET':
      return {
        ...state,
        completedFacets: [...state.completedFacets, action.facet]
      };
    default:
      return state;
  }
};

// Log buffer
class LogBuffer {
  private buffer: string[];
  private maxSize: number;
  private head: number = 0;
  private size: number = 0;

  constructor(maxSize: number = 400) {
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
  }

  add(message: string): void {
    this.buffer[this.head] = `${new Date().toLocaleTimeString()}  ${message}`;
    this.head = (this.head + 1) % this.maxSize;
    if (this.size < this.maxSize) {
      this.size++;
    }
  }

  getAll(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this.size; i++) {
      const index = (this.head - 1 - i + this.maxSize) % this.maxSize;
      result.push(this.buffer[index]);
    }
    return result;
  }
}

// Compact 3D Gemstone viewer
const GemstoneViewer = ({ currentFacet, completedFacets, isRunning }: { currentFacet: string | null; completedFacets: string[]; isRunning: boolean; }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const facetMaterialsRef = useRef<Map<string, THREE.MeshPhongMaterial>>(new Map());

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(180, 180);
    renderer.setClearColor(0x000000, 0.1);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(3, 3, 3);
    scene.add(directionalLight);

    // Create gemstone
    const group = new THREE.Group();
    
    // Pavilion facets
    for (let i = 0; i < 8; i++) {
      const facetGeometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, -0.6, 0,
        Math.cos(i * Math.PI / 4) * 0.8, 0.4, Math.sin(i * Math.PI / 4) * 0.8,
        Math.cos((i + 1) * Math.PI / 4) * 0.8, 0.4, Math.sin((i + 1) * Math.PI / 4) * 0.8,
      ]);
      
      facetGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      facetGeometry.computeVertexNormals();
      
      const facetName = `P${i + 1}`;
      const material = new THREE.MeshPhongMaterial({
        color: 0x3344aa,
        transparent: true,
        opacity: 0.7,
        shininess: 100
      });
      
      const facet = new THREE.Mesh(facetGeometry, material);
      facetMaterialsRef.current.set(facetName, material);
      group.add(facet);
    }
    
    // Crown facets
    for (let i = 0; i < 4; i++) {
      const facetGeometry = new THREE.BufferGeometry();
      const angle1 = (i * Math.PI / 2) + (Math.PI / 4);
      const angle2 = ((i + 1) * Math.PI / 2) + (Math.PI / 4);
      
      const vertices = new Float32Array([
        0, 0.8, 0,
        Math.cos(angle1) * 0.6, 0.4, Math.sin(angle1) * 0.6,
        Math.cos(angle2) * 0.6, 0.4, Math.sin(angle2) * 0.6,
      ]);
      
      facetGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      facetGeometry.computeVertexNormals();
      
      const facetName = `C${i + 1}`;
      const material = new THREE.MeshPhongMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.8,
        shininess: 120
      });
      
      const facet = new THREE.Mesh(facetGeometry, material);
      facetMaterialsRef.current.set(facetName, material);
      group.add(facet);
    }
    
    // Table
    const tableGeometry = new THREE.CircleGeometry(0.25, 8);
    const tableMaterial = new THREE.MeshPhongMaterial({
      color: 0x6699dd,
      transparent: true,
      opacity: 0.9,
      shininess: 150
    });
    
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.rotation.x = -Math.PI / 2;
    table.position.y = 0.8;
    facetMaterialsRef.current.set('TABLE', tableMaterial);
    group.add(table);

    scene.add(group);
    camera.position.set(0, 0, 3);

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update facet colors
  useEffect(() => {
    facetMaterialsRef.current.forEach((material, facetName) => {
      if (completedFacets.includes(facetName)) {
        material.color.setHex(0x22aa44);
        material.emissive.setHex(0x001100);
      } else if (currentFacet === facetName) {
        material.color.setHex(0xffcc00);
        material.emissive.setHex(isRunning ? 0x332200 : 0x000000);
      } else {
        const baseColor = facetName.startsWith('P') ? 0x3344aa : 
                         facetName.startsWith('C') ? 0x4488cc : 0x6699dd;
        material.color.setHex(baseColor);
        material.emissive.setHex(0x000000);
      }
    });
  }, [currentFacet, completedFacets, isRunning]);

  return (
    <div style={{ 
      background: 'rgba(0,0,0,.25)', 
      borderRadius: 8, 
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6
    }}>
      <div style={{ fontWeight: 600, color: '#e6e6ff', fontSize: 11 }}>
        3D Facet Progress
      </div>
      <div 
        ref={mountRef}
        style={{ 
          border: '1px solid #4a4a5a', 
          borderRadius: 6,
          width: 180,
          height: 180,
          background: 'radial-gradient(circle, rgba(20,20,40,0.8) 0%, rgba(10,10,20,0.9) 100%)'
        }}
      />
      <div style={{ fontSize: 10, opacity: 0.8, textAlign: 'center' }}>
        <span style={{ color: '#22c55e' }}>●</span> Done{' '}
        <span style={{ color: '#fbbf24' }}>●</span> Cutting{' '}
        <span style={{ color: '#6699dd' }}>●</span> Pending
      </div>
    </div>
  );
};

// Code display
const CodeDisplay = ({ currentStep, isRunning, machineSpeed }: { currentStep: number; isRunning: boolean; machineSpeed: number; }) => {
  const [highlightLine, setHighlightLine] = useState(0);
  
  const currentProgram = cuttingProgram[currentStep] || cuttingProgram[0];
  const codeLines = currentProgram.code.split('\n');

  useEffect(() => {
    if (!isRunning) return;
    
    const baseSpeed = 1500;
    const speedFactor = machineSpeed / 100;
    const highlightInterval = Math.max(500, baseSpeed / speedFactor);
    
    const interval = setInterval(() => {
      setHighlightLine(prev => (prev + 1) % codeLines.length);
    }, highlightInterval);

    return () => clearInterval(interval);
  }, [isRunning, codeLines.length, machineSpeed]);

  return (
    <div style={{ 
      border: '1px solid #3a3a4a',
      background: 'rgba(0,0,0,.5)',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      <div style={{ 
        background: '#2a2a3a',
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 600,
        borderBottom: '1px solid #3a3a4a'
      }}>
        Step {currentProgram.step}: {currentProgram.description}
      </div>
      <div style={{ 
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        fontSize: 11,
        padding: 10
      }}>
        {codeLines.map((line, index) => (
          <div 
            key={index}
            style={{ 
              padding: '2px 4px',
              borderRadius: 4,
              background: (isRunning && index === highlightLine) ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
              color: (isRunning && index === highlightLine) ? '#fbbf24' : '#e6e6ff',
              transition: 'all 0.3s ease',
              marginBottom: 2
            }}
          >
            <span style={{ color: '#666', marginRight: 6, minWidth: 15, display: 'inline-block' }}>
              {index + 1}
            </span>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

// Settings card
const SettingCard = React.memo(function SettingCard(props: {
  title: string;
  value: string;
  disabled?: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div style={{
      border: "1px solid #3a3a4a",
      background: "rgba(255,255,255,0.02)",
      padding: 4,
      marginBottom: 4,
      borderRadius: 6,
      opacity: props.disabled ? 0.4 : 1,
    }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        marginBottom: 3
      }}>
        <div style={{ fontSize: 10, fontWeight: 600 }}>{props.title}</div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#fbbf24' }}>
          {props.value}
        </div>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        <button 
          className="sf-btn secondary"
          onClick={props.onMinus}
          disabled={props.disabled}
          style={{ fontSize: 9, padding: "2px 6px", flex: 1 }}
        >
          ◄ -
        </button>
        <button 
          className="sf-btn secondary"
          onClick={props.onPlus}
          disabled={props.disabled}
          style={{ fontSize: 9, padding: "2px 6px", flex: 1 }}
        >
          + ►
        </button>
      </div>
    </div>
  );
});

// Axis card
const AxisCard = React.memo(function AxisCard(props: {
  title: string;
  unit?: string;
  disabled?: boolean;
  onFineMinus: () => void;
  onFinePlus: () => void;
  onCoarseMinus: () => void;
  onCoarsePlus: () => void;
}) {
  return (
    <div style={{
      border: "1px solid #3a3a4a",
      background: "rgba(255,255,255,0.03)",
      padding: 6,
      opacity: props.disabled ? 0.4 : 1,
      borderRadius: 6,
      marginBottom: 4
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11 }}>
        {props.title} {props.unit && <span style={{ opacity: 0.7 }}>({props.unit})</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        <div style={{ display: "flex", gap: 3 }}>
          <button 
            className="sf-btn secondary" 
            onClick={props.onFineMinus}
            disabled={props.disabled}
            style={{ fontSize: 8, padding: "3px 4px" }}
          >
            ◄ fine
          </button>
          <button 
            className="sf-btn secondary" 
            onClick={props.onFinePlus}
            disabled={props.disabled}
            style={{ fontSize: 8, padding: "3px 4px" }}
          >
            fine ►
          </button>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          <button 
            className="sf-btn" 
            onClick={props.onCoarseMinus}
            disabled={props.disabled}
            style={{ fontSize: 8, padding: "3px 4px" }}
          >
            ◄◄ coarse
          </button>
          <button 
            className="sf-btn" 
            onClick={props.onCoarsePlus}
            disabled={props.disabled}
            style={{ fontSize: 8, padding: "3px 4px" }}
          >
            coarse ►►
          </button>
        </div>
      </div>
    </div>
  );
});

export default function Cutting() {
  const { stone, cut, navigate } = useSelection();
  const [gems] = useState(mockGems);
  const [notes, setNotes] = useState("");
  const [wsConnected] = useState(true);
  
  const [cuttingState, dispatch] = useReducer(cuttingReducer, {
    isRunning: false,
    isPaused: false,
    currentStep: 0,
    currentFacet: null,
    completedFacets: [],
    position: { index: 96, angle: 43.0, depth: 2.3 },
    settings: { speed: 75, pressure: 5, coolant: 80 },
    emergencyStop: false,
    progress: 0
  });

  const programTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logBuffer = useRef(new LogBuffer(400));
  const [logVersion, setLogVersion] = useState(0);

  const pushLog = useCallback((message: string) => {
    logBuffer.current.add(message);
    setLogVersion(v => v + 1);
  }, []);

  const stoneMeta = useMemo(() => {
    if (!gems || !stone) return null;
    return gems.find(s => s.key === stone.key) || null;
  }, [gems, stone]);

  const stoneData = useMemo(() => {
    if (!stone) return null;
    return stoneCuttingDatabase[stone.name] || null;
  }, [stone]);

  useEffect(() => {
    pushLog("🔧 System initialized");
    pushLog("📐 Machine calibration complete");
    pushLog("💎 Gemstone secured in dop");
    pushLog("⚡ Ready for cutting operations");
  }, [pushLog]);

  const handleStart = useCallback(() => {
    if (cuttingState.emergencyStop) {
      pushLog("❌ Cannot start - Emergency stop active. Reset required.");
      return;
    }
    
    dispatch({ type: 'START' });
    pushLog("🚀 Starting automated cutting sequence");
    
    if (stoneData) {
      pushLog(`💡 Recommended lap: ${stoneData.lapWheel}`);
      pushLog(`💡 Recommended polish: ${stoneData.polishCompound}`);
    }
  }, [cuttingState.emergencyStop, pushLog, stoneData]);

  const handlePause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
    pushLog("⏸️ Cutting sequence paused");
  }, [pushLog]);

  const handleStop = useCallback(() => {
    dispatch({ type: 'STOP' });
    pushLog("⏹️ Cutting sequence stopped");
    if (programTimer.current) {
      clearInterval(programTimer.current);
    }
  }, [pushLog]);

  const handleEmergencyStop = useCallback(() => {
    dispatch({ type: 'EMERGENCY_STOP' });
    pushLog("🚨 EMERGENCY STOP ACTIVATED 🚨");
    if (programTimer.current) {
      clearInterval(programTimer.current);
    }
  }, [pushLog]);

  const jogIndex = useCallback((delta: number, label?: string) => {
    if (cuttingState.emergencyStop) {
      pushLog("❌ Cannot jog - Emergency stop active");
      return;
    }
    dispatch({ type: 'JOG_INDEX', delta });
    const actionType = cuttingState.isRunning ? "Live adjust" : "Manual jog";
    pushLog(`🔧 ${actionType} INDEX ${delta > 0 ? "+" : ""}${delta}°${label ? " (" + label + ")" : ""}`);
  }, [cuttingState.emergencyStop, cuttingState.isRunning, pushLog]);

  const jogAngle = useCallback((delta: number, label?: string) => {
    if (cuttingState.emergencyStop) {
      pushLog("❌ Cannot jog - Emergency stop active");
      return;
    }
    dispatch({ type: 'JOG_ANGLE', delta });
    const actionType = cuttingState.isRunning ? "Live adjust" : "Manual jog";
    pushLog(`🔧 ${actionType} ANGLE ${delta > 0 ? "+" : ""}${delta}°${label ? " (" + label + ")" : ""}`);
  }, [cuttingState.emergencyStop, cuttingState.isRunning, pushLog]);

  const jogDepth = useCallback((delta: number, label?: string) => {
    if (cuttingState.emergencyStop) {
      pushLog("❌ Cannot jog - Emergency stop active");
      return;
    }
    dispatch({ type: 'JOG_DEPTH', delta });
    const actionType = cuttingState.isRunning ? "Live adjust" : "Manual jog";
    pushLog(`🔧 ${actionType} DEPTH ${delta > 0 ? "+" : ""}${delta}mm${label ? " (" + label + ")" : ""}`);
  }, [cuttingState.emergencyStop, cuttingState.isRunning, pushLog]);

  const adjustSpeed = useCallback((delta: number) => {
    if (cuttingState.emergencyStop) return;
    dispatch({ type: 'ADJUST_SPEED', delta });
    const newSpeed = Math.max(10, Math.min(100, cuttingState.settings.speed + delta));
    const timePerStep = (3000 / (newSpeed / 100)) / 1000;
    pushLog(`⚙️ Speed adjust ${delta > 0 ? "+" : ""}${delta}% → ${newSpeed}% (${timePerStep.toFixed(1)}s/step)`);
  }, [cuttingState.emergencyStop, cuttingState.settings.speed, pushLog]);

  const adjustPressure = useCallback((delta: number) => {
    if (cuttingState.emergencyStop) return;
    dispatch({ type: 'ADJUST_PRESSURE', delta });
    const newPressure = Math.max(1, Math.min(10, cuttingState.settings.pressure + delta));
    
    let warning = "";
    if (stoneData && newPressure > 6) {
      if (stoneData.avoid.toLowerCase().includes("heavy pressure")) {
        warning = " ⚠️ High pressure - this stone is sensitive!";
      }
    }
    
    pushLog(`⚙️ Pressure adjust ${delta > 0 ? "+" : ""}${delta} → ${newPressure}/10${warning}`);
  }, [cuttingState.emergencyStop, cuttingState.settings.pressure, stoneData, pushLog]);

  const adjustCoolant = useCallback((delta: number) => {
    if (cuttingState.emergencyStop) return;
    dispatch({ type: 'ADJUST_COOLANT', delta });
    const newCoolant = Math.max(0, Math.min(100, cuttingState.settings.coolant + delta));
    
    let recommendation = "";
    if (stoneData) {
      if (stoneData.techniques.toLowerCase().includes("wet") || 
          stoneData.avoid.toLowerCase().includes("heat")) {
        recommendation = " 💧 Keep wet - this stone needs good cooling!";
      }
    }
    
    pushLog(`💧 Coolant adjust ${delta > 0 ? "+" : ""}${delta}% → ${newCoolant}%${recommendation}`);
  }, [cuttingState.emergencyStop, cuttingState.settings.coolant, stoneData, pushLog]);

  // Program execution
  useEffect(() => {
    if (cuttingState.isRunning && !cuttingState.emergencyStop) {
      const baseInterval = 3000;
      const speedFactor = cuttingState.settings.speed / 100;
      const dynamicInterval = Math.max(1000, baseInterval / speedFactor);
      
      programTimer.current = setInterval(() => {
        const nextStepIndex = cuttingState.currentStep;
        if (nextStepIndex >= cuttingProgram.length) {
          dispatch({ type: 'STOP' });
          pushLog("✅ Cutting program completed successfully!");
          return;
        }

        const step = cuttingProgram[nextStepIndex];
        
        if (cuttingState.currentFacet) {
          dispatch({ type: 'COMPLETE_FACET', facet: cuttingState.currentFacet });
          pushLog(`✓ Completed facet ${cuttingState.currentFacet}`);
        }

        const newPosition = {
          index: (step.index ?? cuttingState.position.index),
          angle: step.angle,
          depth: cuttingState.position.depth + (Math.random() - 0.5) * 0.1
        };

        dispatch({ 
          type: 'NEXT_STEP', 
          step: nextStepIndex + 1,
          facet: step.facet,
          position: newPosition
        });

        pushLog(`→ Starting ${step.description} (${step.facet})`);

      }, dynamicInterval);

      return () => {
        if (programTimer.current) {
          clearInterval(programTimer.current);
        }
      };
    }
  }, [cuttingState.isRunning, cuttingState.currentStep, cuttingState.emergencyStop, cuttingState.currentFacet, pushLog, cuttingState.position.depth, cuttingState.position.index, cuttingState.settings.speed]);

  return (
    <div style={{ 
      color: "#e6e6ff", 
      background: "#0f0f17", 
      minHeight: "100vh",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: 8
    }}>
      <style>{`
        .sf-btn {
          padding: 6px 12px;
          border: 2px solid transparent;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          box-shadow: 
            0 3px 6px rgba(0,0,0,0.3),
            inset 0 1px 2px rgba(255,255,255,0.2),
            inset 0 -1px 2px rgba(0,0,0,0.2);
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, 
            #d4af37 0%, 
            #ffd700 25%, 
            #ffed4e 50%, 
            #ffd700 75%, 
            #b8860b 100%);
          border: 2px solid #b8860b;
          color: #1a1a1a;
        }
        
        .sf-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 
            0 4px 8px rgba(0,0,0,0.4),
            inset 0 1px 3px rgba(255,255,255,0.3);
        }
        
        .sf-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none !important;
        }
        
        .sf-btn.secondary {
          background: linear-gradient(135deg, 
            #c9c9c9 0%, 
            #e8e8e8 25%, 
            #f5f5f5 50%, 
            #e8e8e8 75%, 
            #a8a8a8 100%);
          border: 2px solid #999;
          color: #333;
        }
        
        .sf-btn.start {
          background: linear-gradient(135deg, 
            #228b22 0%, 
            #32cd32 25%, 
            #90ee90 50%, 
            #32cd32 75%, 
            #006400 100%);
          border: 2px solid #006400;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .sf-btn.stop {
          background: linear-gradient(135deg, 
            #8b0000 0%, 
            #dc143c 25%, 
            #ff6b6b 50%, 
            #dc143c 75%, 
            #650000 100%);
          border: 2px solid #650000;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .sf-btn.pause {
          background: linear-gradient(135deg, 
            #d4af37 0%, 
            #ffd700 25%, 
            #ffed4e 50%, 
            #ffd700 75%, 
            #b8860b 100%);
          border: 2px solid #b8860b;
          color: #1a1a1a;
        }
        
        .sf-btn.emergency {
          background: linear-gradient(135deg, 
            #8b0000 0%, 
            #ff0000 25%, 
            #ff4444 50%, 
            #ff0000 75%, 
            #650000 100%);
          border: 3px solid #ff0000;
          color: white;
          text-shadow: 0 2px 4px rgba(0,0,0,0.7);
          font-weight: 700;
          animation: emergency-pulse 2s infinite;
        }
        
        @keyframes emergency-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Compact Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
        borderBottom: "1px solid #2e2e3f",
        paddingBottom: 6,
      }}>
        <button className="sf-btn secondary" onClick={() => navigate("cuts")}>
          ← Back
        </button>
        <div style={{ fontWeight: 900, fontSize: 16 }}>
          {stone?.name || "Stone"} • {cut?.name || "Cut"}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 4, 
            fontSize: 11,
            opacity: 0.8
          }}>
            <div style={{ 
              width: 6, 
              height: 6, 
              borderRadius: "50%", 
              background: wsConnected ? "#22c55e" : "#ef4444" 
            }} />
            {wsConnected ? "Connected" : "Offline"}
          </div>
          {cuttingState.isRunning && (
            <div style={{ 
              background: '#fbbf24', 
              color: '#000', 
              padding: '3px 6px', 
              borderRadius: 4, 
              fontSize: 10, 
              fontWeight: 700,
              animation: "pulse 1s infinite"
            }}>
              CUTTING
            </div>
          )}
        </div>
      </div>

      {/* Emergency banner */}
      {cuttingState.emergencyStop && (
        <div style={{
          background: "#8b1e2b",
          color: "white",
          padding: 6,
          borderRadius: 6,
          marginBottom: 8,
          textAlign: "center",
          fontWeight: 700,
          fontSize: 12,
          animation: "pulse 1s infinite"
        }}>
          🚨 EMERGENCY STOP ACTIVE 🚨
          <button 
            className="sf-btn secondary"
            style={{ marginLeft: 8, fontSize: 10 }}
            onClick={() => dispatch({ type: 'STOP' })}
          >
            Reset
          </button>
        </div>
      )}

      {/* Compact layout for 7" Pi touchscreen */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr 280px",
        gap: 8,
        minHeight: "50vh",
      }}>
        {/* LEFT: Compact Info */}
        <div style={{
          border: "1px solid #3a3a4a",
          background: "rgba(255,255,255,0.02)",
          padding: 8,
          borderRadius: 12,
        }}>
          <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13 }}>Stone Facts</div>
          <div style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.95 }}>
            <div><span style={{ opacity: 0.7 }}>Stone:</span> {stone?.name}</div>
            <div><span style={{ opacity: 0.7 }}>Hardness:</span> {stoneMeta?.hardness}</div>
            <div><span style={{ opacity: 0.7 }}>RI:</span> {stoneMeta?.ri}</div>
          </div>

          <div style={{
            marginTop: 12,
            paddingTop: 8,
            borderTop: "1px dashed #3a3a4a",
          }}>
            <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 12 }}>Position</div>
            <div style={{ fontSize: 11, lineHeight: 1.3, opacity: 0.9, fontFamily: 'monospace' }}>
              <div>INDEX: {cuttingState.position.index.toFixed(1)}°</div>
              <div>ANGLE: {cuttingState.position.angle.toFixed(1)}°</div>
              <div>DEPTH: {cuttingState.position.depth.toFixed(2)}mm</div>
            </div>
          </div>

          <div style={{
            marginTop: 12,
            paddingTop: 8,
            borderTop: "1px dashed #3a3a4a",
          }}>
            <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 12 }}>Settings</div>
            <div style={{ fontSize: 11, lineHeight: 1.3, opacity: 0.9, fontFamily: 'monospace' }}>
              <div>SPEED: {cuttingState.settings.speed}%</div>
              <div>PRESSURE: {cuttingState.settings.pressure}/10</div>
              <div>COOLANT: {cuttingState.settings.coolant}%</div>
            </div>
          </div>

          {cuttingState.currentFacet && (
            <div style={{
              marginTop: 12,
              paddingTop: 8,
              borderTop: "1px dashed #3a3a4a",
            }}>
              <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 12 }}>Current</div>
              <div style={{ fontSize: 11, lineHeight: 1.3, opacity: 0.9 }}>
                <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: 12 }}>
                  🔸 Cutting: {cuttingState.currentFacet}
                </div>
                <div>Step: {cuttingState.currentStep}/{cuttingProgram.length}</div>
                <div>Progress: {cuttingState.progress.toFixed(0)}%</div>
                <div>Done: {cuttingState.completedFacets.length} facets</div>
              </div>
            </div>
          )}

          {/* Quick Notes */}
          <div style={{
            marginTop: 12,
            paddingTop: 8,
            borderTop: "1px dashed #3a3a4a",
          }}>
            <div style={{ fontWeight: 800, marginBottom: 6, color: "#f5d37a", fontSize: 12 }}>Quick Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Facet depth...
Symmetry check...`}
              style={{
                width: "100%",
                height: 60,
                padding: 6,
                background: "rgba(0,0,0,.3)",
                color: "#e6e6ff",
                border: "1px solid #3a3a4a",
                borderRadius: 6,
                outline: "none",
                resize: "vertical",
                fontSize: 10,
                lineHeight: 1.3,
              }}
            />
          </div>

          {/* Stone Database */}
          <div style={{
            marginTop: 12,
            paddingTop: 8,
            borderTop: "1px dashed #3a3a4a",
          }}>
            <div style={{ fontWeight: 800, marginBottom: 6, color: "#4ecdc4", fontSize: 12 }}>
              📊 Cutting Guide
            </div>
            <div style={{
              background: "rgba(0,0,0,.3)",
              border: "1px solid #3a3a4a",
              borderRadius: 6,
              padding: 6,
              fontSize: 10,
              lineHeight: 1.3,
              maxHeight: 100,
              overflow: "auto"
            }}>
              {stoneData ? (
                <>
                  <div style={{ color: "#4ecdc4", fontWeight: 600, marginBottom: 4 }}>
                    {stone?.name} Cutting Guide:
                  </div>
                  
                  <div style={{ marginBottom: 3 }}>
                    <span style={{ color: "#ffd700", fontWeight: 600 }}>Lap:</span> {stoneData.lapWheel}
                  </div>
                  
                  <div style={{ marginBottom: 3 }}>
                    <span style={{ color: "#ffd700", fontWeight: 600 }}>Polish:</span> {stoneData.polishCompound}
                  </div>
                  
                  <div style={{ marginBottom: 3 }}>
                    <span style={{ color: "#ff6b6b", fontWeight: 600 }}>⚠️ Avoid:</span> {stoneData.avoid}
                  </div>
                  
                  <div>
                    <span style={{ color: "#90ee90", fontWeight: 600 }}>💡 Tips:</span> {stoneData.techniques}
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.8 }}>
                  <div>No cutting data available for this stone</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Preview */}
        <div style={{
          border: "1px solid #3a3a4a",
          background: "rgba(255,255,255,0.02)",
          padding: 10,
          display: "grid",
          gridTemplateRows: "auto auto auto auto",
          gap: 8,
          borderRadius: 16,
        }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Live Cutting View</div>

          {/* 3D Gemstone Progress */}
          <GemstoneViewer 
            currentFacet={cuttingState.currentFacet}
            completedFacets={cuttingState.completedFacets}
            isRunning={cuttingState.isRunning}
          />

          {/* GIF Display Box - Under the 3D progress */}
          <div style={{ 
            background: 'rgba(0,0,0,.25)', 
            borderRadius: 8, 
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6
          }}>
            <div style={{ 
              fontWeight: 600, 
              color: '#e6e6ff', 
              fontSize: 11,
              textAlign: 'center'
            }}>
              🎬 Cutting Demonstration
            </div>
            
            <div style={{
              border: '1px solid #4a4a5a', 
              borderRadius: 6,
              width: 180,
              height: 120,
              background: 'radial-gradient(circle, rgba(30,30,50,0.8) 0%, rgba(10,10,20,0.9) 100%)',
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}>
              <div style={{ 
                textAlign: "center", 
                opacity: 0.6,
                fontSize: 11,
                color: "#e6e6ff"
              }}>
                📹 GIF Ready
                <div style={{ fontSize: 9, marginTop: 4 }}>
                  {stone?.name} cutting demo
                </div>
              </div>
            </div>
            
            <div style={{ fontSize: 10, opacity: 0.8, textAlign: 'center' }}>
              {cuttingState.currentFacet && (
                <div style={{ color: '#fbbf24', fontWeight: 600 }}>
                  Demonstrating: {cuttingState.currentFacet}
                </div>
              )}
            </div>
          </div>

          <CodeDisplay 
            currentStep={Math.max(0, cuttingState.currentStep - 1)}
            isRunning={cuttingState.isRunning}
            machineSpeed={cuttingState.settings.speed}
          />
        </div>

        {/* RIGHT: Compact Controls */}
        <div style={{
          border: "1px solid #3a3a4a",
          background: "rgba(255,255,255,0.02)",
          padding: 8,
          display: "grid",
          gridTemplateRows: "auto auto auto 1fr",
          gap: 8,
          borderRadius: 12,
        }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>Controls</div>

          <button className="sf-btn emergency" onClick={handleEmergencyStop}>
            🚨 EMERGENCY STOP
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="sf-btn start"
              onClick={handleStart}
              disabled={cuttingState.isRunning || cuttingState.emergencyStop}
            >
              ▶ Start
            </button>
            <button 
              className="sf-btn pause"
              onClick={handlePause} 
              disabled={!cuttingState.isRunning}
            >
              ⏸ Pause
            </button>
            <button 
              className="sf-btn stop" 
              onClick={handleStop}
            >
              ⏹ Stop
            </button>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <AxisCard
              title="INDEX"
              unit="°"
              disabled={cuttingState.emergencyStop}
              onFineMinus={() => jogIndex(-0.5)}
              onFinePlus={() => jogIndex(0.5)}
              onCoarseMinus={() => jogIndex(-5)}
              onCoarsePlus={() => jogIndex(5)}
            />
            <AxisCard
              title="ANGLE"
              unit="°"
              disabled={cuttingState.emergencyStop}
              onFineMinus={() => jogAngle(-0.1)}
              onFinePlus={() => jogAngle(0.1)}
              onCoarseMinus={() => jogAngle(-1)}
              onCoarsePlus={() => jogAngle(1)}
            />
            <AxisCard
              title="DEPTH"
              unit="mm"
              disabled={cuttingState.emergencyStop}
              onFineMinus={() => jogDepth(-0.01)}
              onFinePlus={() => jogDepth(0.01)}
              onCoarseMinus={() => jogDepth(-0.1)}
              onCoarsePlus={() => jogDepth(0.1)}
            />
            
            <div style={{ borderTop: "1px solid #3a3a4a", paddingTop: 6, marginTop: 4 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
                Machine Settings
              </div>
              
              <SettingCard
                title="SPEED"
                value={`${cuttingState.settings.speed}%`}
                disabled={cuttingState.emergencyStop}
                onMinus={() => adjustSpeed(-5)}
                onPlus={() => adjustSpeed(5)}
              />
              
              <SettingCard
                title="PRESSURE"
                value={`${cuttingState.settings.pressure}/10`}
                disabled={cuttingState.emergencyStop}
                onMinus={() => adjustPressure(-1)}
                onPlus={() => adjustPressure(1)}
              />
              
              <SettingCard
                title="COOLANT"
                value={`${cuttingState.settings.coolant}%`}
                disabled={cuttingState.emergencyStop}
                onMinus={() => adjustCoolant(-10)}
                onPlus={() => adjustCoolant(10)}
              />
            </div>

            <div style={{
              border: "1px solid #3a3a4a",
              background: "rgba(0,0,0,.3)",
              borderRadius: 6,
              maxHeight: 100,
              overflow: "auto",
              fontSize: 10,
              fontFamily: 'monospace'
            }}>
              <div style={{
                background: '#2a2a3a',
                padding: '3px 6px',
                fontSize: 10,
                fontWeight: 600,
                borderBottom: '1px solid #3a3a4a'
              }}>
                Live Log
              </div>
              <div style={{ padding: 4 }}>
                {logBuffer.current.getAll().slice(0, 4).map((l, i) => (
                  <div key={`${logVersion}-${i}`} style={{ 
                    marginBottom: 1, 
                    opacity: i === 0 ? 1 : 0.7 - (i * 0.15)
                  }}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

