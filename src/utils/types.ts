// Core simulation types for shock generator platform

export interface VitalSigns {
  heartRate: number; // bpm
  systolic: number; // mmHg
  diastolic: number; // mmHg
  map: number; // Mean Arterial Pressure - mmHg
  spO2: number; // %
  respiratoryRate: number; // breaths/min
  temperature: number; // °C
  cvp: number; // Central Venous Pressure - mmHg
  cardiacOutput: number; // L/min
  svr: number; // Systemic Vascular Resistance - dinas.seg/cm⁻⁵
}

export interface LabValues {
  // Gasometry
  pH: number;
  pCO2: number; // mmHg
  pO2: number; // mmHg
  hco3: number; // mEq/L
  lactate: number; // mmol/L
  lastGasometryTime: number; // simulation minutes
  
  // Complete Blood Count
  hemoglobin: number; // g/dL
  hematocrit: number; // %
  wbc: number; // cells/μL
  platelets: number; // cells/μL
  
  // Chemistry
  potassium: number; // mEq/L
  sodium: number; // mEq/L
  magnesium: number; // mg/dL
  chloride: number; // mEq/L
  creatinine: number; // mg/dL
  urea: number; // mg/dL
  lastLabTime: number; // simulation minutes
  
  // Sepsis biomarkers (optional - for distributive shock)
  procalcitonin?: number; // ng/mL - high in bacterial sepsis
  crp?: number; // mg/L - C-reactive protein
  presepsin?: number; // pg/mL - early sepsis marker
  initialLactate?: number; // Store initial for clearance calculation
}

export interface FluidBalance {
  totalInput: number; // mL
  totalOutput: number; // mL
  netBalance: number; // mL
  
  // Input breakdown
  crystalloids: number; // mL
  colloids: number; // mL
  blood: number; // mL
  
  // Output breakdown
  urine: number; // mL
  insensibleLoss: number; // mL (calculated based on time)
}

export interface ActiveIntervention {
  id: string;
  type: 'fluid' | 'vasopressor' | 'inotrope' | 'medication' | 'procedure';
  name: string;
  dose?: number; // for drugs
  rate?: number; // mL/h or mcg/kg/min
  volume?: number; // mL for boluses
  startTime: number; // simulation minutes
  duration?: number; // minutes, if applicable
  isActive: boolean;
  isCompleted?: boolean; // for single-dose interventions
}

export interface HemodynamicState {
  preload: number; // 0-100 scale (affects CO via Frank-Starling)
  contractility: number; // 0-100 scale
  afterload: number; // 0-100 scale (related to SVR)
  heartRate: number; // bpm
  strokeVolume: number; // mL
}

export interface SimulationState {
  vitals: VitalSigns;
  labs: LabValues;
  fluidBalance: FluidBalance;
  hemodynamics: HemodynamicState;
  activeInterventions: ActiveIntervention[];
  
  // Time tracking (all in simulation time - minutes)
  simTimeElapsed: number; // total simulation time in minutes
  realTimeElapsed: number; // total real time in seconds
  
  // Patient state
  isStable: boolean;
  isDeteriorating: boolean;
  complications: string[];
  
  // Alert states
  criticalAlerts: string[];
  warnings: string[];
  
  // Distributive shock specific state (optional)
  distributiveShockState?: {
    subtype: 'septic' | 'anaphylactic' | 'neurogenic';
    sourceOfInfection?: string;
    antibioticsGiven: boolean;
    sourceControlAchieved: boolean;
    corticosteroidsGiven: boolean;
    fluidVolumeGiven: number;
    vasopressorStartTime?: number;
    lactateClearing: boolean;
    procalcitoninLevel?: number;
  };
}

export interface PatientData {
  initials: string;
  age: number;
  weight: number;
  conditions: string[];
  difficulty: string; // Intensivista, Clínico, Médico, Acadêmico
  resourceLevel: string;
  shockType: string;
  
  // Initial hemodynamic parameters
  rvs: number;
  rvp: number;
  volemia: string;
  ivs: number;
  pvc: number;
  poap: number;
}

export interface ShockProfile {
  name: string;
  
  // Initial hemodynamic characteristics
  initialVitals: Partial<VitalSigns>;
  initialHemodynamics: Partial<HemodynamicState>;
  
  // Progression parameters
  degradationRate: number; // how fast patient deteriorates (0-1 scale)
  compensationCapacity: number; // ability to compensate (0-1 scale)
  
  // Response modifiers
  fluidResponsiveness: number; // 0-1 scale
  vasopressorResponsiveness: number; // 0-1 scale
  inotropeResponsiveness: number; // 0-1 scale
  
  // Characteristic lab patterns
  labProfile: Partial<LabValues>;
}

export interface DifficultyModifiers {
  baselineSeverity: number; // 0.7-1.3 (lower = easier starting state)
  treatmentEfficacy: number; // 0.8-1.5 (higher = easier response)
  degradationSpeed: number; // 0.5-2.0 (lower = slower deterioration)
  complicationThreshold: number; // 0.6-1.4 (higher = fewer complications)
  hintLevel: number; // 0-3 (educational hints available)
}
