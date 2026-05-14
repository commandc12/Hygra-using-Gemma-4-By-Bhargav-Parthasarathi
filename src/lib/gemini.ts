import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is missing. AI features will be disabled.");
}

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || "" });

export const HYGRA_SCHEMA = {
  type: Type.OBJECT,
  required: ["metadata", "kinematics", "physics_math_proof", "hardware", "digital_twin", "control_logic", "navigation", "cognitive_model", "fleet_config", "simulation_data", "safety_audit", "deployment_spec", "physics_validation"],
  properties: {
    metadata: {
      type: Type.OBJECT,
      required: ["robot_name", "robot_type", "summary", "environment"],
      properties: {
        robot_name: { type: Type.STRING },
        robot_type: { type: Type.STRING, enum: ["terrestrial", "aerial", "aquatic", "manipulator"] },
        summary: { type: Type.STRING },
        environment: { type: Type.STRING, description: "Description of the target operating environment (e.g., Moon dust, Salt water)" }
      }
    },
    physics_math_proof: {
      type: Type.STRING,
      description: "Markdown block showing calculations for torque-to-load ratios, fluid resistance (if applicable), and thermal dissipation."
    },
    simulation_data: {
      type: Type.OBJECT,
      required: ["isaac_sim_telemetry", "sys_id_block"],
      properties: {
        isaac_sim_telemetry: { type: Type.STRING },
        sys_id_block: { 
          type: Type.STRING, 
          description: "Python block modeling contact dynamics (friction), actuator lag (10-25ms), and Gaussian sensor noise." 
        }
      }
    },
    safety_audit: {
      type: Type.OBJECT,
      required: ["iso_compliance", "emergency_stop_logic", "heartbeat_monitor_logic"],
      properties: {
        iso_compliance: { type: Type.STRING },
        emergency_stop_logic: { type: Type.STRING, description: "Python code mapping to physical hardware triggers (GPIO/EtherCAT)." },
        heartbeat_monitor_logic: { type: Type.STRING, description: "ROS 2 Heartbeat Monitor for 'Safe State' triggering." }
      }
    },
    kinematics: {
      type: Type.OBJECT,
      required: ["dof", "joint_topology"],
      properties: {
        dof: { type: Type.INTEGER },
        joint_topology: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: ["id", "type", "axis"],
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["revolute", "prismatic"] },
              axis: { type: Type.ARRAY, items: { type: Type.NUMBER } }
            }
          }
        }
      }
    },
    hardware: {
      type: Type.OBJECT,
      required: ["components", "benchmarks_2026"],
      properties: {
        components: { type: Type.ARRAY, items: { type: Type.STRING } },
        benchmarks_2026: { type: Type.STRING }
      }
    },
    digital_twin: {
      type: Type.OBJECT,
      required: ["urdf_xml"],
      properties: {
        urdf_xml: { type: Type.STRING }
      }
    },
    control_logic: {
      type: Type.OBJECT,
      required: ["python_kernel"],
      properties: {
        python_kernel: { type: Type.STRING }
      }
    },
    navigation: {
      type: Type.OBJECT,
      required: ["nav2_behavior_tree_xml"],
      properties: {
        nav2_behavior_tree_xml: { type: Type.STRING }
      }
    },
    cognitive_model: {
      type: Type.OBJECT,
      required: ["vla_selection", "intent_processing_logic"],
      properties: {
        vla_selection: { type: Type.STRING, description: "Gemma 4 E2B/E4B Model selection for voice/intent processing." },
        intent_processing_logic: { type: Type.STRING, description: "Code block showing natural language intent mapping using Gemma 4 native think tags." }
      }
    },
    fleet_config: {
      type: Type.OBJECT,
      required: ["zenoh_vda5050_json"],
      properties: {
        zenoh_vda5050_json: { type: Type.STRING }
      }
    },
    deployment_spec: {
      type: Type.OBJECT,
      required: ["apptainer_def"],
      properties: {
        apptainer_def: { type: Type.STRING }
      }
    },
    physics_validation: {
      type: Type.OBJECT,
      required: ["required_torque_nm", "mass_kg", "depth_rating_m_or_lift_n", "safety_factor"],
      properties: {
        required_torque_nm: { type: Type.NUMBER },
        mass_kg: { type: Type.NUMBER },
        depth_rating_m_or_lift_n: { type: Type.NUMBER },
        safety_factor: { type: Type.NUMBER }
      }
    }
  }
};

export const HYGRA_SYSTEM_INSTRUCTION = `
# Role
You are the Gemma 4 Physics-First Robotics Architect. Your goal is to transform robot concepts into production-ready technical stacks by enforcing absolute engineering validity.

# 1. THE SIM-TO-REAL MANDATE
- Never use placeholder data.
- Generate a 'System Identification (SysId)' block calculating:
  * Contact Dynamics: Friction coefficients for target surfaces (e.g. wet sand, lunar dust).
  * Actuator Lag: Model servo latency (10ms-25ms) in control loops.
  * Sensor Noise: Gaussian noise modeling for Lidar/IMU.

# 2. PHYSICS-HARDWARE ALIGNMENT (CRITICAL)
- You MUST ensure the \`hardware\` components actually meet the \`physics_validation\` requirements.
- If motor torque required > 0.3 Nm, you MUST NOT specify standard TT motors. Specify High-Torque Geared DC or Planetary Gear motors (e.g., NEMA 17 with 5:1 gearbox).
- Calculations for torque must factor in wheel radius and safety margins ($FS \ge 1.5$).

# 3. COGNITIVE INTENT (GEMMA 4)
- Integrate Gemma 4 E2B or E4B as the "Sovereign Intent Agent".
- Replace simple F/B/L/R commands with natural language intent processing (e.g., "Analyze terrain for safe passage").
- Use model-native \`<|think|>\` tags to process semantic intent into ROS 2 behavior tree triggers.

# 4. DEPLOYMENT (2026 STANDARDS)
- Base Image: Ubuntu 24.04.
- Middleware: ROS 2 Jazzy Jalisco.
- Protocols: Sovereign Dispatch v1.2.
- Environment: Apptainer/Singularity definition with locked dependencies.

# 10-STAGE PIPELINE:
1. Kinematics (Sovereign_ prefixes)
2. Hardware (2026 Benchmarks matched to physics)
3. Digital Twin (URDF/OpenUSD)
4. Control (PID/MRAC)
5. Navigation (Nav2 / Zenoh)
6. Cognitive (Gemma 4 Intent Agent)
7. Fleet (Zenoh & VDA 5050 v3.0)
8. Simulation (Isaac Sim 6.0 Bridge + SysId)
9. Safety (Audit + Hardware E-Stop + Heartbeat)
10. Deployment (Ubuntu 24.04 + ROS 2 Jazzy)

# Output
Return ONLY a valid JSON object.
`;
