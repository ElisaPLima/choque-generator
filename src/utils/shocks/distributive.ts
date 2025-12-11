// Distributive Shock Algorithm
// Based on Surviving Sepsis Campaign 2021 and SCCM/ESICM Guidelines
// Subtypes: Septic shock, Anaphylactic shock, Neurogenic shock
// Characterized by: severe vasodilation, low SVR, variable CO, warm/vasodilated periphery

import { ShockProfile, VitalSigns, HemodynamicState, LabValues } from '../types';

// Distributive shock subtypes with distinct characteristics
export type DistributiveSubtype = 'septic' | 'anaphylactic' | 'neurogenic';

export interface DistributiveShockState {
  subtype: DistributiveSubtype;
  sourceOfInfection?: string; // For septic shock
  timeSinceOnset: number; // minutes
  antibioticsGiven: boolean;
  sourceControlAchieved: boolean;
  corticosteroidsGiven: boolean;
  fluidVolumeGiven: number; // mL - SSC recommends 30mL/kg initial
  vasopressorStartTime?: number;
  lactateClearing: boolean; // Is lactate trending down?
  procalcitoninLevel?: number; // ng/mL - sepsis biomarker
}

// Septic Shock Profile (most common distributive shock)
// Based on Sepsis-3 criteria: hypotension requiring vasopressors + lactate >2 despite fluids
export const distributiveShock: ShockProfile = {
  name: 'Choque distributivo',
  
  initialVitals: {
    heartRate: 118, // Tachycardia - compensatory response to low SVR
    systolic: 84, // Hypotension - pathognomonic of septic shock
    diastolic: 46, // Wide pulse pressure - characteristic of distributive shock
    spO2: 93, // Mild hypoxia - ARDS risk in sepsis
    respiratoryRate: 26, // Tachypnea - respiratory compensation + SIRS
    temperature: 38.8, // Fever (>38°C) or hypothermia (<36°C) in severe sepsis
    cvp: 6, // Variable CVP - depends on fluid resuscitation status
    cardiacOutput: 8.2, // High CO - hyperdynamic circulation (early septic shock)
    svr: 480, // Very low SVR - pathological vasodilation (normal: 800-1200)
  },
  
  initialHemodynamics: {
    preload: 42, // Reduced venous return from vasodilation
    contractility: 58, // Mildly reduced - myocardial depression in sepsis
    afterload: 22, // Severely reduced - profound vasodilation
    heartRate: 118,
    strokeVolume: 70, // Initially preserved in hyperdynamic phase
  },
  
  // Progression parameters - based on time-sensitive nature of sepsis
  degradationRate: 0.82, // Rapid deterioration - "golden hour" concept
  compensationCapacity: 0.55, // Limited compensation - systemic inflammatory response
  
  // Response to treatments - evidence-based from SSC guidelines
  fluidResponsiveness: 0.65, // Moderate response - about 50% of septic patients are fluid responsive
  vasopressorResponsiveness: 0.88, // Excellent response - norepinephrine is first-line
  inotropeResponsiveness: 0.35, // Limited utility unless myocardial dysfunction present
  
  // Characteristic lab patterns - sepsis biomarkers and organ dysfunction
  labProfile: {
    pH: 7.26, // Metabolic acidosis - lactic acidosis from tissue hypoperfusion
    pCO2: 30, // Respiratory compensation - minute ventilation increased
    pO2: 72, // Hypoxemia - V/Q mismatch, potential ARDS
    hco3: 16, // Low bicarbonate - consumed buffering lactic acid
    lactate: 4.8, // Elevated lactate (>2 mmol/L defines septic shock)
    hemoglobin: 9.8, // Anemia - dilutional, chronic disease, bleeding
    hematocrit: 30,
    wbc: 19500, // Leukocytosis (>12,000) or leukopenia (<4,000) in sepsis
    platelets: 82000, // Thrombocytopenia - DIC, consumption, splenic sequestration
    potassium: 5.1, // Hyperkalemia - cellular shift, renal dysfunction
    sodium: 136, // Often normal or hyponatremia
    creatinine: 2.2, // Acute kidney injury - sepsis-induced AKI common
    urea: 64, // Elevated BUN - prerenal and intrinsic renal injury
    magnesium: 1.6, // Hypomagnesemia common in critical illness
    chloride: 98,
  },
};

// Anaphylactic Shock Profile - IgE-mediated mast cell degranulation
export const anaphylacticShock: ShockProfile = {
  name: 'Choque anafilático',
  
  initialVitals: {
    heartRate: 135, // Severe tachycardia - rapid onset
    systolic: 75, // Severe hypotension - rapid vascular collapse
    diastolic: 42, // Very wide pulse pressure
    spO2: 87, // Hypoxia - bronchospasm, laryngeal edema
    respiratoryRate: 32, // Severe tachypnea - airway compromise
    temperature: 37.1, // Usually normothermic (vs fever in sepsis)
    cvp: 3, // Low CVP - massive vasodilation
    cardiacOutput: 9.5, // Very high CO initially
    svr: 380, // Extremely low SVR - histamine-mediated
  },
  
  initialHemodynamics: {
    preload: 35,
    contractility: 75, // Heart function normal
    afterload: 15, // Profoundly reduced
    heartRate: 135,
    strokeVolume: 70,
  },
  
  degradationRate: 0.95, // Extremely rapid - can be fatal within minutes
  compensationCapacity: 0.4, // Poor compensation ability
  
  fluidResponsiveness: 0.75, // Good response to aggressive fluids
  vasopressorResponsiveness: 0.85, // Responds to vasopressors + epinephrine
  inotropeResponsiveness: 0.3,
  
  labProfile: {
    pH: 7.30,
    pCO2: 28, // Hyperventilation
    pO2: 65,
    hco3: 19,
    lactate: 3.5,
    hemoglobin: 13.5, // Normal initially
    hematocrit: 41,
    wbc: 9500, // Normal
    platelets: 245000, // Normal
    potassium: 4.2,
    sodium: 140,
    creatinine: 1.1,
    urea: 35,
  },
};

// Neurogenic Shock Profile - spinal cord injury, loss of sympathetic tone
export const neurogenicShock: ShockProfile = {
  name: 'Choque neurogênico',
  
  initialVitals: {
    heartRate: 58, // BRADYCARDIA - key distinguishing feature
    systolic: 88,
    diastolic: 50,
    spO2: 94,
    respiratoryRate: 18, // May have impaired respiratory muscles
    temperature: 36.2, // Hypothermia - poikilothermia (can't regulate temp)
    cvp: 4,
    cardiacOutput: 4.5, // Low-normal CO
    svr: 520, // Low SVR - lost sympathetic tone
  },
  
  initialHemodynamics: {
    preload: 40,
    contractility: 70,
    afterload: 28,
    heartRate: 58,
    strokeVolume: 78,
  },
  
  degradationRate: 0.45, // Slower deterioration than septic
  compensationCapacity: 0.25, // Very poor - lost autonomic compensation
  
  fluidResponsiveness: 0.55, // Moderate response
  vasopressorResponsiveness: 0.80, // Good response
  inotropeResponsiveness: 0.25,
  
  labProfile: {
    pH: 7.34,
    pCO2: 42,
    pO2: 82,
    hco3: 22,
    lactate: 2.4,
    hemoglobin: 12.5,
    hematocrit: 38,
    wbc: 9000,
    platelets: 220000,
    potassium: 4.0,
    sodium: 140,
    creatinine: 1.0,
    urea: 32,
  },
};

// Calculate vital sign progression over time for distributive shock
// Implements evidence-based pathophysiology and treatment responses
export function progressDistributiveShock(
  currentVitals: VitalSigns,
  timeSinceOnset: number, // minutes
  hasVasopressors: boolean,
  hasFluids: boolean,
  shockState?: DistributiveShockState
): Partial<VitalSigns> {
  // Progression differs by subtype and treatment adherence
  const progressionFactor = timeSinceOnset / 60; // hours since onset
  
  // Natural deterioration without treatment
  let svrDelta = -65 * progressionFactor; // Progressive vasodilation
  let hrDelta = 8 * progressionFactor; // Compensatory tachycardia
  let coDelta = 0.3 * progressionFactor; // CO may initially increase (hyperdynamic)
  let tempDelta = 0.15 * progressionFactor; // Temperature progression
  let spo2Delta = -1.5 * progressionFactor; // Gradual hypoxia from ARDS/V-Q mismatch
  
  // Late septic shock: transition to hypodynamic phase (>6-12 hours untreated)
  if (timeSinceOnset > 360 && !hasVasopressors) {
    coDelta = -0.8 * progressionFactor; // Myocardial depression sets in
    svrDelta = -45 * progressionFactor; // Continued vasodilation but slower
  }
  
  // FLUID RESUSCITATION EFFECTS
  // SSC guidelines: 30mL/kg crystalloid within 3 hours
  if (hasFluids) {
    svrDelta += 35; // Improved preload partially compensates for vasodilation
    coDelta += 0.5; // Frank-Starling mechanism improves CO
    hrDelta -= 10; // Reduced compensatory tachycardia
    
    // Assess fluid tolerance (risk of fluid overload after ~4-5L)
    const estimatedFluidGiven = shockState?.fluidVolumeGiven || 0;
    if (estimatedFluidGiven > 4000) {
      spo2Delta -= 2; // Risk of pulmonary edema with excessive fluids
    }
  } else {
    // Inadequate resuscitation worsens outcomes
    svrDelta -= 20; // Worse vasodilation
    hrDelta += 5; // More tachycardia
  }
  
  // VASOPRESSOR EFFECTS
  // Norepinephrine is first-line (alpha-1 and beta-1 effects)
  if (hasVasopressors) {
    svrDelta += 180; // Significant vasoconstriction via alpha-1 receptors
    
    // Target MAP 65 mmHg per SSC guidelines
    const currentMAP = currentVitals.diastolic + (currentVitals.systolic - currentVitals.diastolic) / 3;
    if (currentMAP < 65) {
      svrDelta += 60; // Additional response if MAP below target
    }
    
    // Vasopressors improve organ perfusion when MAP adequate
    if (currentMAP >= 65) {
      spo2Delta += 1; // Better oxygenation with adequate perfusion
    }
  } else {
    // Delayed vasopressor initiation worsens outcomes
    if (timeSinceOnset > 60 && currentVitals.map < 65) {
      // "Vasopressor-dependent" - should have started pressors
      svrDelta -= 30;
      coDelta -= 0.3;
    }
  }
  
  // SEPTIC SHOCK-SPECIFIC CONSIDERATIONS
  if (shockState?.subtype === 'septic') {
    // Source control and antibiotics critical
    if (!shockState.antibioticsGiven && timeSinceOnset > 60) {
      // Each hour delay in antibiotics increases mortality
      const delayPenalty = Math.floor(timeSinceOnset / 60) * 0.1;
      svrDelta -= 20 * delayPenalty;
      tempDelta += 0.3 * delayPenalty; // Worsening fever
    }
    
    if (shockState.antibioticsGiven) {
      tempDelta -= 0.2; // Fever control improves
      spo2Delta += 0.5; // Better inflammatory control
    }
    
    // Corticosteroids (hydrocortisone) if refractory shock
    if (shockState.corticosteroidsGiven && hasVasopressors) {
      svrDelta += 25; // Improved vasopressor responsiveness
    }
    
    // Lactate clearance indicates resuscitation success
    if (shockState.lactateClearing) {
      coDelta += 0.4; // Improving perfusion
      spo2Delta += 1;
    } else if (timeSinceOnset > 120) {
      // Persistent hyperlactatemia = poor prognosis
      coDelta -= 0.5;
    }
    
    // Procalcitonin-guided therapy
    if (shockState.procalcitoninLevel && shockState.procalcitoninLevel > 10) {
      // Very high PCT suggests severe sepsis
      svrDelta -= 15;
      tempDelta += 0.2;
    }
  }
  
  // ANAPHYLACTIC SHOCK-SPECIFIC
  if (shockState?.subtype === 'anaphylactic') {
    // Epinephrine is definitive treatment (not just norepinephrine)
    // Rapid response if epinephrine given early
    if (hasVasopressors && timeSinceOnset < 30) {
      svrDelta += 250; // Dramatic response to epinephrine
      spo2Delta += 5; // Bronchodilation effect
      hrDelta -= 20; // Tachycardia resolves
    }
    
    // Airway compromise is major risk
    if (currentVitals.spO2 < 90) {
      spo2Delta -= 3; // Laryngeal edema can progress rapidly
    }
  }
  
  // NEUROGENIC SHOCK-SPECIFIC
  if (shockState?.subtype === 'neurogenic') {
    // Bradycardia is hallmark - won't have compensatory tachycardia
    hrDelta = -2 * progressionFactor; // May actually worsen
    
    // Impaired temperature regulation (poikilothermia)
    tempDelta = -0.1 * progressionFactor; // Tends toward hypothermia
    
    // Limited autonomic compensation
    if (!hasVasopressors) {
      svrDelta -= 30; // Can't compensate on their own
    }
  }
  
  // Calculate final values with physiological limits
  return {
    svr: Math.max(280, Math.min(2000, currentVitals.svr + svrDelta)),
    heartRate: Math.max(45, Math.min(165, currentVitals.heartRate + hrDelta)),
    cardiacOutput: Math.max(2.5, Math.min(12, currentVitals.cardiacOutput + coDelta)),
    temperature: Math.max(35.0, Math.min(41.5, currentVitals.temperature + tempDelta)),
    spO2: Math.max(75, Math.min(100, currentVitals.spO2 + spo2Delta)),
  };
}

// Calculate response to fluid bolus in distributive shock
// Based on fluid responsiveness assessment and dynamic parameters
export function distributiveFluidResponse(
  currentCO: number, 
  currentCVP: number,
  currentSVR: number,
  bolusMl: number,
  shockState?: DistributiveShockState
): { co: number; svr: number; map: number; preload: number } {
  // Fluid responsiveness in distributive shock is variable (40-60% are responders)
  // Predictors: low CVP, high SVR variation, passive leg raise positive
  
  // Assess fluid responsiveness
  const isLikelyResponder = currentCVP < 8 && currentSVR > 400;
  const cumulativeVolume = shockState?.fluidVolumeGiven || 0;
  
  // Diminishing returns with cumulative volume (>30mL/kg or ~2-3L)
  const volumeFactor = Math.max(0.3, 1 - (cumulativeVolume / 5000));
  
  let coResponsePercent = 0;
  let svrResponsePercent = 0;
  
  if (isLikelyResponder) {
    // Good responder: Frank-Starling curve still on ascending limb
    coResponsePercent = (bolusMl / 500) * 0.12 * volumeFactor; // 12% per 500mL
    svrResponsePercent = (bolusMl / 500) * 0.06; // Modest SVR improvement
  } else {
    // Poor responder: flat portion of Frank-Starling curve
    coResponsePercent = (bolusMl / 500) * 0.04 * volumeFactor; // 4% per 500mL
    svrResponsePercent = (bolusMl / 500) * 0.02;
  }
  
  // Colloid vs crystalloid (if we could distinguish - 3:1 volume effect)
  // For now, assume crystalloid
  
  const newCO = currentCO * (1 + coResponsePercent);
  const newSVR = currentSVR * (1 + svrResponsePercent);
  
  // MAP improvement from CO increase
  // MAP ≈ CO × SVR / 80 + CVP (simplified)
  const oldMAP = (currentCO * currentSVR / 80);
  const newMAP = (newCO * newSVR / 80);
  const mapDelta = newMAP - oldMAP;
  
  // Preload increases with fluid
  const preloadIncrease = (bolusMl / 500) * 8 * volumeFactor;
  
  return {
    co: Math.min(12, newCO),
    svr: Math.min(1200, newSVR),
    map: mapDelta,
    preload: preloadIncrease,
  };
}

// Calculate response to vasopressor in distributive shock
// Norepinephrine: first-line per SSC guidelines (strong alpha-1, moderate beta-1)
// Vasopressin: adjunctive therapy (V1 receptor-mediated vasoconstriction)
// Epinephrine: second-line or for anaphylaxis (alpha and beta effects)
export function distributiveVasopressorResponse(
  currentSVR: number,
  currentMAP: number,
  currentCO: number,
  dose: number, // mcg/kg/min for norepinephrine
  drug: 'norepinephrine' | 'vasopressin' | 'epinephrine' = 'norepinephrine',
  shockState?: DistributiveShockState
): { svr: number; map: number; co: number; hr: number } {
  let svrIncrease = 0;
  let mapIncrease = 0;
  let coChange = 0;
  let hrChange = 0;
  
  switch (drug) {
    case 'norepinephrine':
      // Alpha-1 effect (vasoconstriction) - dose-dependent
      // Therapeutic range: 0.01-3 mcg/kg/min, typical 0.05-0.2
      svrIncrease = dose * 220; // Strong alpha effect
      mapIncrease = dose * 15; // Direct MAP improvement
      
      // Mild beta-1 effect (slight CO and HR increase)
      coChange = dose * 0.15;
      hrChange = dose * 4;
      
      // Distributive shock is highly responsive to norepinephrine
      if (shockState?.subtype === 'septic') {
        svrIncrease *= 1.15; // 15% more effective in septic shock
      }
      
      // Refractory shock (high dose NE >0.5 mcg/kg/min)
      if (dose > 0.5) {
        // Consider adding vasopressin or corticosteroids
        if (!shockState?.corticosteroidsGiven) {
          svrIncrease *= 0.85; // Diminished response at high doses
        }
      }
      break;
      
    case 'vasopressin':
      // Pure V1-mediated vasoconstriction
      // Fixed dose: 0.01-0.04 units/min (NOT weight-based)
      // Used as adjunct to catecholamines
      const vasopressinUnits = dose; // Reinterpret dose parameter as units
      svrIncrease = vasopressinUnits * 4500; // Very potent vasoconstriction
      mapIncrease = vasopressinUnits * 350;
      
      // No cardiac effects (unlike catecholamines)
      coChange = 0;
      hrChange = 0;
      
      // Particularly effective in catecholamine-refractory shock
      if (currentSVR < 500) {
        svrIncrease *= 1.25;
      }
      
      // Risk: splanchnic vasoconstriction (monitor lactate)
      break;
      
    case 'epinephrine':
      // Combined alpha (vasoconstriction) + beta (inotropy, chronotropy)
      // Second-line in septic shock, first-line in anaphylaxis
      svrIncrease = dose * 180;
      mapIncrease = dose * 18;
      coChange = dose * 0.6; // Significant inotropic effect
      hrChange = dose * 18; // Significant chronotropic effect
      
      // Highly effective in anaphylactic shock
      if (shockState?.subtype === 'anaphylactic') {
        svrIncrease *= 1.4; // 40% more effective
        mapIncrease *= 1.5;
        // Also bronchodilator effect (beta-2)
      }
      
      // Side effects: tachycardia, arrhythmias, increased lactate
      if (dose > 0.2) {
        hrChange += 10; // Excessive tachycardia risk
      }
      break;
  }
  
  // Apply physiological limits
  const newSVR = Math.min(2200, Math.max(300, currentSVR + svrIncrease));
  const newMAP = Math.min(120, Math.max(40, currentMAP + mapIncrease));
  const newCO = Math.min(12, Math.max(2, currentCO + coChange));
  
  // HR changes (note: neurogenic shock won't have normal HR response)
  let newHR = hrChange;
  if (shockState?.subtype === 'neurogenic') {
    newHR = hrChange * 0.3; // Blunted chronotropic response
  }
  
  return {
    svr: newSVR,
    map: newMAP,
    co: newCO,
    hr: newHR,
  };
}

// Assess lactate clearance - key resuscitation endpoint
export function assessLactateClearance(
  initialLactate: number,
  currentLactate: number,
  timeSinceInitial: number // minutes
): { clearing: boolean; clearancePercent: number; trend: 'improving' | 'stable' | 'worsening' } {
  const clearancePercent = ((initialLactate - currentLactate) / initialLactate) * 100;
  
  // SSC guidelines: target >10% lactate clearance per 2 hours
  const expectedClearance = (timeSinceInitial / 120) * 10; // % per 2 hours
  
  let trend: 'improving' | 'stable' | 'worsening';
  if (clearancePercent >= expectedClearance) {
    trend = 'improving';
  } else if (clearancePercent > -5) {
    trend = 'stable';
  } else {
    trend = 'worsening';
  }
  
  return {
    clearing: clearancePercent > 10,
    clearancePercent,
    trend,
  };
}

// Calculate Sequential Organ Failure Assessment (SOFA) score component
// Used to track organ dysfunction in sepsis
export function calculateSOFAComponent(
  vitals: VitalSigns,
  labs: Partial<LabValues>,
  hasVasopressors: boolean,
  vasopressorDose: number
): { cardiovascularSOFA: number; respiratorySOFA: number; renalSOFA: number } {
  // Cardiovascular SOFA (0-4)
  let cardiovascularSOFA = 0;
  if (vitals.map < 70) {
    cardiovascularSOFA = 1;
  }
  if (hasVasopressors) {
    if (vasopressorDose < 0.1) cardiovascularSOFA = 2;
    else if (vasopressorDose <= 0.5) cardiovascularSOFA = 3;
    else cardiovascularSOFA = 4; // High-dose vasopressors
  }
  
  // Respiratory SOFA (0-4)
  let respiratorySOFA = 0;
  const pO2FiO2 = labs.pO2 || 80; // Simplified - assume FiO2 = 1.0 if on O2
  if (pO2FiO2 < 400) respiratorySOFA = 1;
  if (pO2FiO2 < 300) respiratorySOFA = 2;
  if (pO2FiO2 < 200) respiratorySOFA = 3;
  if (pO2FiO2 < 100) respiratorySOFA = 4;
  
  // Renal SOFA (0-4)
  let renalSOFA = 0;
  const creatinine = labs.creatinine || 1.0;
  if (creatinine >= 1.2) renalSOFA = 1;
  if (creatinine >= 2.0) renalSOFA = 2;
  if (creatinine >= 3.5) renalSOFA = 3;
  if (creatinine >= 5.0) renalSOFA = 4;
  
  return {
    cardiovascularSOFA,
    respiratorySOFA,
    renalSOFA,
  };
}

// Track user performance and adapt difficulty
export interface UserPerformanceMetrics {
  timeToFluidInitiation: number; // minutes
  timeToVasopressorInitiation: number; // minutes  
  timeToAntibiotics: number; // minutes (if applicable)
  totalFluidGiven: number; // mL
  appropriateFluidVolume: boolean; // ~30mL/kg
  vasopressorDoseAppropriate: boolean;
  targetMAPAchieved: boolean; // MAP ≥65 mmHg
  lactateChecked: boolean;
  overallScore: number; // 0-100
}

// Evaluate user performance and provide adaptive feedback
export function evaluateUserPerformance(
  shockState: DistributiveShockState,
  vitals: VitalSigns,
  patientWeight: number,
  vasopressorDose: number
): UserPerformanceMetrics {
  const metrics: UserPerformanceMetrics = {
    timeToFluidInitiation: shockState.timeSinceOnset,
    timeToVasopressorInitiation: shockState.vasopressorStartTime || 999,
    timeToAntibiotics: shockState.antibioticsGiven ? shockState.timeSinceOnset : 999,
    totalFluidGiven: shockState.fluidVolumeGiven,
    appropriateFluidVolume: false,
    vasopressorDoseAppropriate: false,
    targetMAPAchieved: false,
    lactateChecked: false,
    overallScore: 0,
  };
  
  // Evaluate fluid resuscitation (SSC: 30mL/kg within 3 hours)
  const targetFluidVolume = patientWeight * 30;
  metrics.appropriateFluidVolume = 
    shockState.fluidVolumeGiven >= targetFluidVolume * 0.8 &&
    shockState.fluidVolumeGiven <= targetFluidVolume * 1.5;
  
  // Evaluate vasopressor dosing (typical 0.05-0.5 mcg/kg/min)
  metrics.vasopressorDoseAppropriate = 
    vasopressorDose >= 0.01 && vasopressorDose <= 2.0;
  
  // Check MAP target (≥65 mmHg)
  metrics.targetMAPAchieved = vitals.map >= 65;
  
  // Calculate overall score
  let score = 0;
  
  // Time-sensitive interventions (SSC Hour-1 bundle)
  if (metrics.timeToFluidInitiation <= 60) score += 20; // Within 1 hour
  else if (metrics.timeToFluidInitiation <= 180) score += 10; // Within 3 hours
  
  if (shockState.subtype === 'septic') {
    if (metrics.timeToAntibiotics <= 60) score += 25; // Critical - within 1 hour
    else if (metrics.timeToAntibiotics <= 180) score += 10;
  }
  
  if (metrics.timeToVasopressorInitiation <= 60) score += 15;
  else if (metrics.timeToVasopressorInitiation <= 120) score += 8;
  
  // Treatment appropriateness
  if (metrics.appropriateFluidVolume) score += 15;
  if (metrics.vasopressorDoseAppropriate) score += 10;
  
  // Outcome achievement
  if (metrics.targetMAPAchieved) score += 15;
  
  metrics.overallScore = Math.min(100, score);
  
  return metrics;
}
