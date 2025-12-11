// Medical constants and normal ranges for shock simulation

// Time scaling: 1 minute real-time = 1 hour simulation time
export const REAL_TO_SIM_RATIO = 12; // 12x speed
export const UPDATE_INTERVAL_MS = 5000; // Update vitals every 5 seconds
export const SIM_MINUTES_PER_UPDATE = 1; // Each update = 1 simulation minute

// Lab refresh intervals (in real-time minutes)
export const LAB_REFRESH_INTERVAL_REAL = 300; // 5 hours = 300 minutes
export const GASOMETRY_REFRESH_INTERVAL_REAL = 30; // 30 minutes

// Convert to simulation time
export const LAB_REFRESH_INTERVAL_SIM = LAB_REFRESH_INTERVAL_REAL * REAL_TO_SIM_RATIO; // 3600 sim minutes = 60 sim hours
export const GASOMETRY_REFRESH_INTERVAL_SIM = GASOMETRY_REFRESH_INTERVAL_REAL * REAL_TO_SIM_RATIO; // 360 sim minutes = 6 sim hours

// Normal vital sign ranges
export const NORMAL_RANGES = {
  heartRate: { min: 60, max: 100, critical_low: 40, critical_high: 140 },
  systolic: { min: 90, max: 140, critical_low: 70, critical_high: 180 },
  diastolic: { min: 60, max: 90, critical_low: 40, critical_high: 110 },
  map: { min: 65, max: 105, critical_low: 55, critical_high: 120 },
  spO2: { min: 95, max: 100, critical_low: 88, critical_high: 100 },
  respiratoryRate: { min: 12, max: 20, critical_low: 8, critical_high: 30 },
  temperature: { min: 36.5, max: 37.5, critical_low: 35, critical_high: 39 },
  cvp: { min: 2, max: 8, critical_low: 0, critical_high: 15 },
};

// Hemodynamic normal values
export const HEMODYNAMIC_NORMALS = {
  cardiacOutput: { min: 4, max: 8 }, // L/min
  cardiacIndex: { min: 2.5, max: 4 }, // L/min/m²
  strokeVolume: { min: 60, max: 100 }, // mL
  svr: { min: 800, max: 1200 }, // dinas.seg/cm⁻⁵
  pvr: { min: 0.25, max: 1.6 }, // Wood units
  pcwp: { min: 6, max: 12 }, // mmHg
};

// Lab normal ranges
export const LAB_NORMALS = {
  pH: { min: 7.35, max: 7.45 },
  pCO2: { min: 35, max: 45 },
  pO2: { min: 80, max: 100 },
  hco3: { min: 22, max: 28 },
  lactate: { min: 0.5, max: 2.0 },
  hemoglobin: { min: 12, max: 16 },
  hematocrit: { min: 36, max: 48 },
  wbc: { min: 4000, max: 11000 },
  platelets: { min: 150000, max: 400000 },
  potassium: { min: 3.5, max: 5.0 },
  sodium: { min: 135, max: 145 },
  magnesium: { min: 1.7, max: 2.2 },
  chloride: { min: 96, max: 106 },
  creatinine: { min: 0.6, max: 1.2 },
  urea: { min: 10, max: 50 },
};

// Cardiovascular physiology formulas constants
export const PHYSIOLOGY = {
  // MAP = DBP + (SBP - DBP) / 3
  mapCalculationFactor: 1 / 3,
  
  // CO = HR × SV / 1000 (convert mL to L)
  mlToLiters: 1000,
  
  // SVR = (MAP - CVP) × 80 / CO (to get dinas.seg/cm⁻⁵)
  svrConversionFactor: 80,
  
  // Body Surface Area (Mosteller formula): BSA = sqrt(height × weight / 3600)
  bsaConstant: 3600,
  
  // Oxygen delivery: DO2 = CO × CaO2 × 10
  do2Factor: 10,
  
  // Insensible fluid loss: ~0.5 mL/kg/hour
  insensibleLossRate: 0.5, // mL/kg/sim_hour
};

// Difficulty level modifiers
export const DIFFICULTY_SETTINGS = {
  'Acadêmico': {
    baselineSeverity: 0.7, // Easier starting condition
    treatmentEfficacy: 1.5, // Treatments work better
    degradationSpeed: 0.6, // Slower deterioration
    complicationThreshold: 1.4, // Fewer complications
    hintLevel: 3, // Maximum hints
  },
  'Médico': {
    baselineSeverity: 0.85,
    treatmentEfficacy: 1.2,
    degradationSpeed: 0.8,
    complicationThreshold: 1.2,
    hintLevel: 2,
  },
  'Clínico': {
    baselineSeverity: 1.0,
    treatmentEfficacy: 1.0,
    degradationSpeed: 1.0,
    complicationThreshold: 1.0,
    hintLevel: 1,
  },
  'Intensivista': {
    baselineSeverity: 1.3, // Harder starting condition
    treatmentEfficacy: 0.8, // Treatments less effective
    degradationSpeed: 1.5, // Faster deterioration
    complicationThreshold: 0.7, // More complications
    hintLevel: 0, // No hints
  },
};

// Drug dosing constants
export const DRUG_DOSES = {
  norepinephrine: {
    min: 0.01, // mcg/kg/min
    max: 3.0,
    typical: 0.1,
  },
  vasopressin: {
    min: 0.01, // units/min
    max: 0.04,
    typical: 0.03,
  },
  dobutamine: {
    min: 2.5, // mcg/kg/min
    max: 20,
    typical: 5,
  },
  epinephrine: {
    min: 0.01, // mcg/kg/min
    max: 1.0,
    typical: 0.1,
  },
};

// Fluid bolus volumes
export const FLUID_VOLUMES = {
  crystalloidBolus: 500, // mL standard bolus
  colloidBolus: 250, // mL
  bloodUnit: 300, // mL per unit
  maintenanceRate: 100, // mL/hour default
};

// Sound alert thresholds
export const ALERT_THRESHOLDS = {
  criticalHR: { low: 40, high: 150 },
  criticalBP: { systolic_low: 70, map_low: 55 },
  criticalSpO2: 85,
  criticalTemp: { low: 35, high: 39.5 },
};

// Shock type identifiers
export const SHOCK_TYPES = {
  DISTRIBUTIVE: 'Choque distributivo',
  CARDIOGENIC: 'Choque cardiogênico',
  HYPOVOLEMIC: 'Choque hipovolêmico',
  OBSTRUCTIVE: 'Choque obstrutivo',
} as const;
