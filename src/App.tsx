/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  Terminal, 
  Cpu, 
  Box, 
  Activity, 
  Map, 
  Brain, 
  Users, 
  PlayCircle, 
  ShieldAlert, 
  Ship, 
  Download, 
  ChevronRight, 
  Loader2, 
  Zap, 
  Anchor, 
  Wind, 
  Maximize,
  ArrowRight
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { ai, HYGRA_SCHEMA, HYGRA_SYSTEM_INSTRUCTION } from "@/src/lib/gemini.ts";
import { cn, downloadJson } from "@/src/lib/utils.ts";

import { URDFVisualizer } from "@/src/components/URDFVisualizer.tsx";

// --- Types ---
interface HygraResponse {
  metadata: { robot_name: string; robot_type: string; summary: string; environment: string };
  kinematics: { dof: number; joint_topology: any[] };
  physics_math_proof: string;
  hardware: { components: string[]; benchmarks_2026: string };
  digital_twin: { urdf_xml: string };
  control_logic: { python_kernel: string };
  navigation: { nav2_behavior_tree_xml: string };
  cognitive_model: { vla_selection: string; intent_processing_logic: string };
  fleet_config: { zenoh_vda5050_json: string };
  simulation_data: { isaac_sim_telemetry: string; sys_id_block: string };
  safety_audit: { iso_compliance: string; emergency_stop_logic: string; heartbeat_monitor_logic: string };
  deployment_spec: { apptainer_def: string };
  physics_validation: { 
    required_torque_nm: number; 
    mass_kg: number; 
    depth_rating_m_or_lift_n: number; 
    safety_factor: number;
  };
}

const STAGES = [
  { id: "validation", name: "Validation Log", icon: Terminal },
  { id: "kinematics", name: "Kinematics", icon: Bot },
  { id: "hardware", name: "Hardware", icon: Cpu },
  { id: "digital_twin", name: "Digital Twin", icon: Box },
  { id: "control", name: "Control", icon: Activity },
  { id: "navigation", name: "Navigation", icon: Map },
  { id: "cognitive", name: "Cognitive", icon: Brain },
  { id: "fleet", name: "Fleet", icon: Users },
  { id: "simulation", name: "Sim Diagnostics", icon: PlayCircle },
  { id: "safety", name: "Safety/ISO", icon: ShieldAlert },
  { id: "deployment", name: "Deployment", icon: Ship },
];

// --- Mock Telemetry Stream ---
const useTelemetry = (active: boolean) => {
  const [data, setData] = useState<{ time: number; val: number }[]>([]);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setData(prev => {
        const next = [...prev, { time: prev.length, val: Math.random() * 100 }];
        if (next.length > 20) return next.slice(1);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);
  return data;
};

// --- Sub-components ---
const MemoryBar = ({ value }: { value: number }) => (
  <div className="w-full bg-[#141414] h-1.5 rounded-full overflow-hidden border border-[#1a1a1a]">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      className={cn(
        "h-full transition-colors duration-500",
        value > 80 ? "bg-red-500" : value > 50 ? "bg-yellow-500" : "bg-[#F27D26]"
      )}
    />
  </div>
);

// --- Main App ---
export default function App() {
  const [input, setInput] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [result, setResult] = useState<HygraResponse | null>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [memUsage, setMemUsage] = useState(12);
  const [history, setHistory] = useState<HygraResponse[]>([]);
  const telemetry = useTelemetry(!!result);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem("hygra_archives");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history when it changes
  useEffect(() => {
    localStorage.setItem("hygra_archives", JSON.stringify(history.slice(0, 50)));
  }, [history]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMemUsage(prev => {
        const delta = (Math.random() - 0.5) * 4;
        return Math.min(Math.max(prev + delta, 5), 98);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunch = async () => {
    if (!input.trim()) return;
    setIsDispatching(true);
    setResult(null);
    setActiveStage(0);

    const modelName = "gemini-2.0-flash";
    
    const generate = async () => {
      const config: any = {
        systemInstruction: HYGRA_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: HYGRA_SCHEMA,
      };

      return await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: input }] }],
        config,
      });
    };

    try {
      const response = await generate();
      const parsed = JSON.parse(response.text || "{}") as HygraResponse;
      
      // Stage Validation
      const requiredStages = [
        { key: "physics_math_proof", name: "Validation proof" },
        { key: "kinematics", name: "Kinematics" },
        { key: "hardware", name: "Hardware" },
        { key: "digital_twin", name: "Digital Twin" },
        { key: "control_logic", name: "Control" },
        { key: "navigation", name: "Navigation" },
        { key: "cognitive_model", name: "Cognitive" },
        { key: "fleet_config", name: "Fleet" },
        { key: "simulation_data", name: "Simulation" },
        { key: "safety_audit", name: "Safety" },
        { key: "deployment_spec", name: "Deployment" }
      ];

      const missing = requiredStages.filter(s => !parsed[s.key as keyof HygraResponse]);
      if (missing.length > 0) {
        throw new Error(`Sovereign Architecture Incomplete: Missing ${missing.map(m => m.name).join(", ")}`);
      }

      setResult(parsed);
      setHistory(prev => [parsed, ...prev.filter(h => h.metadata.robot_name !== parsed.metadata.robot_name)]);
      setActiveStage(0);
    } catch (error: any) {
      console.error("Dispatch Error:", error);
      let errorMsg = "Failed to communicate with HYGRA engine.";
      
      try {
        // Handle Gemini API specific error objects
        const detail = typeof error.message === 'string' ? error.message : JSON.stringify(error);
        if (detail.includes("Thinking level")) {
          errorMsg = "Thinking level not supported in this region. Engine fallback failed.";
        } else if (detail.includes("API_KEY")) {
          errorMsg = "Invalid API Key. Please check Secrets in Settings.";
        } else {
          errorMsg = detail;
        }
      } catch {
        errorMsg = error.message || errorMsg;
      }
      
      alert(`Sovereign Engine Error: ${errorMsg}`);
    } finally {
      setIsDispatching(false);
    }
  };

  const currentStageData = result ? (function() {
    const stage = STAGES[activeStage].id;
    switch(stage) {
      case "validation": return { title: "Physics-First Math Proof", content: result.physics_math_proof, lang: "markdown" };
      case "kinematics": return { title: "6-DoF Mapping & Topology", content: `DOF: ${result.kinematics.dof}\n\nEnvironment: ${result.metadata.environment}\n\n` + result.kinematics.joint_topology.map(j => `- **${j.id}** (${j.type}): Axis [${j.axis.join(", ")}]`).join("\n"), lang: "markdown" };
      case "hardware": return { title: "2026 Component Benchmarks", content: `### Components:\n${result.hardware.components.map(c => `- ${c}`).join("\n")}\n\n### Benchmarks:\n${result.hardware.benchmarks_2026}`, lang: "markdown" };
      case "digital_twin": return { 
        title: "URDF XML Synthesis", 
        content: result.digital_twin.urdf_xml, 
        lang: "xml",
        visualizer: <URDFVisualizer urdfXml={result.digital_twin.urdf_xml} dof={result.kinematics.dof} />
      };
      case "control": return { title: "PID/MRAC Python Kernel", content: result.control_logic.python_kernel, lang: "python" };
      case "navigation": return { title: "Nav2 Behavior Tree", content: result.navigation.nav2_behavior_tree_xml, lang: "xml" };
      case "cognitive": return { title: "Cognitive Intent Agent (Gemma 4)", content: `### Model Strategy:\n${result.cognitive_model.vla_selection}\n\n### Intent Processing Logic (E2B/E4B):\n\`\`\`python\n${result.cognitive_model.intent_processing_logic}\n\`\`\``, lang: "markdown" };
      case "fleet": return { title: "Zenoh & VDA 5050 v3.0", content: result.fleet_config.zenoh_vda5050_json, lang: "json" };
      case "simulation": return { title: "SysId & Isaac Sim 6.0 Diagnostics", content: `### System Identification (SysId)\n\`\`\`python\n${result.simulation_data.sys_id_block}\n\`\`\`\n\n### Isaac Sim Bridge\n\`\`\`python\n${result.simulation_data.isaac_sim_telemetry}\n\`\`\``, lang: "markdown" };
      case "safety": return { title: "Hardware-Mapped Safety Audit", content: `### ISO 10218-1:2025 Compliance:\n${result.safety_audit.iso_compliance}\n\n### Hardware E-Stop Logic (GPIO/EtherCAT):\n\`\`\`python\n${result.safety_audit.emergency_stop_logic}\n\`\`\`\n\n### Heartbeat Monitor:\n\`\`\`python\n${result.safety_audit.heartbeat_monitor_logic}\n\`\`\``, lang: "markdown" };
      case "deployment": return { 
        title: "Apptainer Deployment (Ubuntu 24.04 + ROS 2 Jazzy)", 
        content: `### Deployment Definition\n${result.deployment_spec.apptainer_def}\n\n---\n\n### Sovereign Dispatch v1.2 Protocols\nThese standards ensure the robot operates within the 2026 Sovereign Robotics environment.\n\n#### 1. Real-World Hardware Integration\n- Joint Controller: controls Sovereign joints with safety overrides.\n- Vision Bridge: high-bandwidth image data for Gemma 4 processing.\n- Sovereign Launch: master orchestration for the full 10-stage stack.`, 
        lang: "markdown" 
      };
      default: return { title: "", content: "", lang: "" };
    }
  })() : null;

  return (
    <div className="flex h-screen bg-[#050505] text-[#E4E3E1] font-sans selection:bg-[#F27D26]/30 overflow-hidden">
      {/* --- Sidebar --- */}
      <aside className="w-64 border-r border-[#1a1a1a] flex flex-col bg-[#080808]">
        <div className="p-6 border-bottom border-[#1a1a1a] flex items-center gap-3">
          <Zap className="text-[#F27D26] w-6 h-6 animate-pulse" />
          <h1 className="text-sm font-bold tracking-widest uppercase">Hygra Engine</h1>
        </div>

        <nav className="flex-1 overflow-y-auto pt-4">
          <div className="px-6 mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8E9299]">Stage Tracker</span>
          </div>
          {STAGES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => idx <= (result ? activeStage : -1) && setActiveStage(idx)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-3 text-xs transition-all duration-300 group",
                activeStage === idx ? "bg-[#141414] text-[#F27D26] border-r-2 border-[#F27D26]" : "text-[#8E9299] hover:text-white hover:bg-[#0a0a0a]",
                !result && idx > 0 && "opacity-30 cursor-not-allowed"
              )}
            >
              <s.icon className={cn("w-4 h-4", activeStage === idx ? "text-[#F27D26]" : "text-[#4a4a4a]")} />
              <span className="font-mono tracking-tighter">0{idx + 1} {s.name}</span>
            </button>
          ))}
        </nav>

        {result && (
          <div className="p-6 border-t border-[#1a1a1a]">
            <button 
              onClick={() => downloadJson(result, `${result.metadata.robot_name}_master.json`)}
              className="w-full flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-[#F27D26] hover:brightness-125 transition-all"
            >
              Master JSON <Download className="w-3 h-3" />
            </button>
          </div>
        )}
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        {/* --- Top Input Area --- */}
        {!result && !isDispatching ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Users className="w-16 h-16 text-[#F27D26] mx-auto mb-6 opacity-80" />
              <h2 className="text-4xl font-light tracking-tight mb-4">Launch Sovereign Dispatch</h2>
              <p className="text-[#8E9299] text-sm font-mono uppercase tracking-widest">Architect the future of robotics in 10 technical stages</p>
            </motion.div>

            <div className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden focus-within:border-[#F27D26] transition-colors shadow-2xl">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your Robot Idea (e.g. An autonomous sub-aquatic repair drone with 4 manipulator arms)..."
                className="w-full h-32 p-6 bg-transparent outline-none resize-none text-lg font-light placeholder:text-[#4a4a4a]"
              />
              <div className="p-4 border-t border-[#1a1a1a] flex justify-end">
                <button
                  onClick={handleLaunch}
                  disabled={!input.trim()}
                  className="bg-[#F27D26] text-black px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-[#ff8f40] transition-colors disabled:opacity-50"
                >
                  Dispatch <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : isDispatching ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-12 h-12 text-[#F27D26] animate-spin" />
            <div className="space-y-2 text-center">
              <h3 className="text-sm font-bold uppercase tracking-[0.4em] text-[#F27D26]">Executing Stage Architecture</h3>
              <p className="text-xs text-[#8E9299] font-mono animate-pulse">Running Physics Simulations & Digital Twin Synthesis...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* --- Header / Metrics Bar --- */}
            <header className="p-6 border-b border-[#1a1a1a] flex items-center justify-between bg-[#080808]/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[#141414] rounded">
                  {result.metadata.robot_type === "aquatic" ? <Anchor className="w-5 h-5 text-[#3b82f6]" /> : <Zap className="w-5 h-5 text-[#F27D26]" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{result.metadata.robot_name}</h2>
                  <p className="text-[10px] uppercase tracking-widest text-[#8E9299]">{result.metadata.robot_type} Configuration</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-xs font-mono text-[#F27D26]">{result.physics_validation.required_torque_nm} Nm</div>
                  <div className="text-[9px] uppercase text-[#4a4a4a] font-bold">Req. Torque</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-white">{result.physics_validation.mass_kg} KG</div>
                  <div className="text-[9px] uppercase text-[#4a4a4a] font-bold">Projected Mass</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-[#3b82f6]">{result.physics_validation.depth_rating_m_or_lift_n} {result.metadata.robot_type === 'aquatic' ? 'M' : 'N'}</div>
                  <div className="text-[9px] uppercase text-[#4a4a4a] font-bold">{result.metadata.robot_type === 'aquatic' ? 'Depth Rating' : 'Lift Force'}</div>
                </div>
                <div className="h-8 w-px bg-[#1a1a1a]" />
                <button onClick={() => {setResult(null); setInput("");}} className="p-2 hover:bg-[#1a1a1a] rounded transition-colors text-[#8E9299]">
                   <Maximize className="w-4 h-4 rotate-45" />
                </button>
              </div>
            </header>

            {/* --- Dashboard Body --- */}
            <div className="flex-1 flex overflow-hidden">
              {/* Content Panel */}
              <div className="flex-1 p-8 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="max-w-4xl mx-auto"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-light">{currentStageData?.title}</h3>
                      <div className="text-[10px] bg-[#141414] px-3 py-1 rounded text-[#8E9299] uppercase font-mono tracking-widest">
                        {currentStageData?.lang} syntax
                      </div>
                    </div>

                    {currentStageData?.visualizer && (
                      <div className="mb-8">
                        {currentStageData.visualizer}
                      </div>
                    )}

                    <div className="bg-[#0a0a0a]/50 border border-[#1a1a1a] rounded-xl p-6 font-mono text-xs leading-relaxed overflow-x-auto selection:bg-[#F27D26]/20">
                      {currentStageData?.lang === "markdown" ? (
                        <div className="prose prose-invert prose-xs max-w-none">
                          <ReactMarkdown>{currentStageData.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <pre className="text-[#8E9299]">
                          <code>{currentStageData?.content}</code>
                        </pre>
                      )}
                    </div>
                    
                    {activeStage < STAGES.length - 1 && (
                      <button 
                        onClick={() => setActiveStage(s => s + 1)}
                        className="mt-8 flex items-center gap-2 text-[#F27D26] text-[10px] uppercase font-bold tracking-widest hover:translate-x-2 transition-transform"
                      >
                        Next Stage: {STAGES[activeStage + 1].name} <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Telemetry Sidebar */}
              <div className="w-80 border-l border-[#1a1a1a] bg-[#080808] p-6 flex flex-col gap-6">
                <div>
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#4a4a4a] mb-4">Summary</h4>
                  <p className="text-xs text-[#8E9299] leading-relaxed italic">"{result.metadata.summary}"</p>
                </div>

                <div className="flex-1">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#4a4a4a] mb-4">Memory Integrity</h4>
                  <div className="mb-6 space-y-4">
                     <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] uppercase tracking-tighter text-[#8E9299]">
                           <span>NVIDIA Thor Buffer</span>
                           <span>{memUsage.toFixed(1)}%</span>
                        </div>
                        <MemoryBar value={memUsage} />
                     </div>
                     <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] uppercase tracking-tighter text-[#8E9299]">
                           <span>Zenoh Bridge Load</span>
                           <span>{(memUsage * 0.7).toFixed(1)}%</span>
                        </div>
                        <MemoryBar value={memUsage * 0.7} />
                     </div>
                  </div>

                  {history.length > 0 && (
                    <div className="mb-8">
                       <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#4a4a4a] mb-4">Sovereign Archives</h4>
                       <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {history.map((h, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setResult(h);
                                setActiveStage(0);
                              }}
                              className={cn(
                                "w-full text-left p-2 rounded-lg border transition-all text-[10px] font-mono",
                                result?.metadata.robot_name === h.metadata.robot_name 
                                  ? "bg-[#F27D26]/10 border-[#F27D26]/50 text-[#F27D26]" 
                                  : "bg-transparent border-[#1a1a1a] text-[#4a4a4a] hover:border-[#F27D26]/30 hover:text-[#8E9299]"
                              )}
                            >
                              <div className="truncate font-bold">{h.metadata.robot_name}</div>
                              <div className="text-[8px] opacity-60 uppercase">{h.metadata.robot_type}</div>
                            </button>
                          ))}
                       </div>
                    </div>
                  )}

                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#4a4a4a] mb-4">Live Telemetry (SIM)</h4>
                  <div className="h-40 w-full bg-[#050505] rounded-xl border border-[#1a1a1a] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={telemetry}>
                        <defs>
                          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F27D26" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#F27D26" fillOpacity={1} fill="url(#colorVal)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between mt-2 font-mono text-[8px] text-[#4a4a4a] px-1 uppercase tracking-widest">
                    <span>Active Stream</span>
                    <span>1.4 THz</span>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                   <div className="p-3 bg-[#141414] rounded border border-[#1a1a1a]">
                      <div className="text-[9px] uppercase font-bold text-[#4a4a4a] mb-1">Safety Guardrail</div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-[#4ade80]">
                         <ShieldAlert className="w-3 h-3" /> BLOCH_LOW_ACTIVE
                      </div>
                   </div>
                   <div className="p-3 bg-[#141414] rounded border border-[#1a1a1a]">
                      <div className="text-[9px] uppercase font-bold text-[#4a4a4a] mb-1">Logic Status</div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white">
                         <Terminal className="w-3 h-3" /> HEARTBEAT_OK
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

