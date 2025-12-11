// Hypovolemic Shock Algorithm - Enhanced Medical Accuracy
// Characterized by: low preload, low CO, high SVR (compensatory), hemorrhagic or non-hemorrhagic
// Pathophysiology: Absolute intravascular volume deficit → ↓preload → ↓SV → ↓CO → ↓tissue perfusion
// Compensatory mechanisms: Sympathetic activation (↑HR, ↑SVR), RAAS activation, ADH release

import { ShockProfile, VitalSigns, HemodynamicState, LabValues } from '../types';

// Hypovolemic shock classification by severity (based on blood loss)
export enum HypovolemicClass {
  CLASS_I = 1,    // <15% loss: minimal symptoms, compensated
  CLASS_II = 2,   // 15-30% loss: tachycardia, narrowed pulse pressure, anxiety
  CLASS_III = 3,  // 30-40% loss: hypotension, tachycardia, altered mental status
  CLASS_IV = 4,   // >40% loss: severe hypotension, obtundation, imminent death
}

// Etiology subtypes affecting presentation
export interface HypovolemicEtiology {
  type: 'hemorrhagic' | 'dehydration' | 'third_spacing' | 'burns';
  severity: HypovolemicClass;
  ongoingLoss: boolean; // Active bleeding/ongoing losses
  lossRate?: number; // mL/hour if ongoing
}

export const hypovolemicShock: ShockProfile = {
  name: 'Choque hipovolêmico',
  
  initialVitals: {
    heartRate: 118, // Marked tachycardia (sympathetic compensation - Class III)
    systolic: 88, // Hypotension (Class III hemorrhage)
    diastolic: 62, // Narrow pulse pressure (↓SV, ↑SVR)
    spO2: 91, // Hypoxia from ↓O2 delivery (↓CO + possible ↓Hgb)
    respiratoryRate: 28, // Tachypnea (metabolic acidosis compensation + anxiety)
    temperature: 36.2, // Hypothermia from peripheral vasoconstriction + shock
    cvp: 1.5, // Very low CVP (↓preload, empty tank)
    cardiacOutput: 3.2, // Severely reduced CO (↓preload despite compensatory ↑HR)
    svr: 1950, // Markedly elevated SVR (maximal vasoconstriction)
  },
  
  initialHemodynamics: {
    preload: 22, // Critically low preload (Class III: ~30-40% volume loss)
    contractility: 78, // Normal to slightly increased contractility (catecholamine surge)
    afterload: 92, // Very high afterload (compensatory vasoconstriction)
    heartRate: 118,
    strokeVolume: 27, // Severely reduced SV from low preload
  },
  
  // Progression parameters
  degradationRate: 0.88, // Rapid deterioration with ongoing loss or inadequate resuscitation
  compensationCapacity: 0.65, // Limited compensation capacity - exhausts quickly
  
  // Response to treatments (evidence-based)
  fluidResponsiveness: 0.96, // Highly responsive to appropriate fluid resuscitation (gold standard)
  vasopressorResponsiveness: 0.25, // Poor response - may temporarily ↑BP but worsens tissue perfusion
  inotropeResponsiveness: 0.15, // Minimal response - contractility not the primary problem
  
  // Characteristic lab patterns (Class III hypovolemic shock)
  labProfile: {
    pH: 7.28, // Metabolic acidosis (lactic acidosis from tissue hypoperfusion)
    pCO2: 28, // Respiratory compensation (Kussmaul breathing)
    pO2: 72, // Hypoxemia (↓CO, V/Q mismatch, possible pulmonary edema if overtransfused)
    hco3: 14, // Low bicarbonate (metabolic acidosis)
    lactate: 6.2, // Markedly elevated lactate (anaerobic metabolism)
    hemoglobin: 9.2, // Low if hemorrhagic (dilutional if early, actual loss if delayed)
    hematocrit: 28, // Low if hemorrhagic
    wbc: 16500, // Leukocytosis (stress response, demargination)
    platelets: 115000, // Mild thrombocytopenia (consumption in hemorrhage)
    potassium: 4.8, // May be elevated (acidosis, cell lysis) or low (GI losses)
    sodium: 148, // Hypernatremia if dehydration, variable in hemorrhage
    creatinine: 2.1, // Acute kidney injury (pre-renal azotemia from hypoperfusion)
    urea: 72, // Elevated BUN (BUN:Cr ratio >20:1 suggests pre-renal)
    magnesium: 1.6, // May be low (losses, dilution)
    chloride: 108, // May be elevated (hyperchloremic acidosis with NS resuscitation)
  },
};

// Calculate vital sign progression for hypovolemic shock
// Uses medically accurate progression based on volume status, resuscitation adequacy, and time
export function progressHypovolemicShock(
  currentVitals: VitalSigns,
  timeSinceOnset: number,
  hasFluids: boolean,
  cumulativeFluidBalance: number, // mL
  ongoingLoss: boolean, // is there ongoing bleeding/loss?
  lossRate: number = 200, // mL/hour default ongoing loss
  patientWeight: number = 70 // kg
): Partial<VitalSigns> {
  const progressionFactor = timeSinceOnset / 60; // Convert to hours
  
  // Calculate estimated volume deficit
  const estimatedDeficit = calculateVolumeDeficit(currentVitals.cvp, currentVitals.heartRate, currentVitals.map);
  const currentDeficit = estimatedDeficit - cumulativeFluidBalance + (ongoingLoss ? lossRate * progressionFactor : 0);
  
  // Classify shock severity based on current deficit
  const shockClass = classifyHypovolemicShock(currentDeficit, patientWeight);
  
  // Physiological changes based on volume status
  let preloadDelta = 0;
  let hrDelta = 0;
  let coDelta = 0;
  let svrDelta = 0;
  let spO2Delta = 0;
  let rrDelta = 0;
  let tempDelta = 0;
  
  // Progressive worsening if inadequately resuscitated
  if (!hasFluids || cumulativeFluidBalance < estimatedDeficit * 0.5) {
    // Ongoing compensation failure and deterioration
    const deteriorationRate = ongoingLoss ? 1.5 : 0.8;
    
    preloadDelta = -4 * progressionFactor * deteriorationRate;
    hrDelta = 2.5 * progressionFactor * deteriorationRate; // Increasing tachycardia
    coDelta = -0.3 * progressionFactor * deteriorationRate; // Falling CO
    svrDelta = 80 * progressionFactor * deteriorationRate; // Maximal vasoconstriction
    spO2Delta = -1.5 * progressionFactor * deteriorationRate; // Worsening hypoxia
    rrDelta = 2 * progressionFactor * deteriorationRate; // Increasing tachypnea
    tempDelta = -0.15 * progressionFactor * deteriorationRate; // Progressive hypothermia
    
    // Severe shock: compensation begins to fail (Class IV)
    if (shockClass === HypovolemicClass.CLASS_IV) {
      hrDelta *= 0.7; // Paradoxical bradycardia in terminal shock
      svrDelta *= 0.6; // Loss of compensatory vasoconstriction
      coDelta *= 1.4; // Accelerated CO decline
    }
  }
  
  // Fluid resuscitation effects (evidence-based response)
  if (hasFluids && cumulativeFluidBalance > 0) {
    // Calculate resuscitation adequacy (goal: replace deficit)
    const resuscitationAdequacy = Math.min(1.2, cumulativeFluidBalance / estimatedDeficit);
    
    // Positive Frank-Starling response
    preloadDelta += 35 * resuscitationAdequacy;
    coDelta += 1.8 * resuscitationAdequacy; // Improved CO from better preload
    
    // Reduced compensatory mechanisms as perfusion improves
    if (resuscitationAdequacy > 0.5) {
      hrDelta -= 18 * resuscitationAdequacy; // HR normalizes
      svrDelta -= 150 * resuscitationAdequacy; // SVR decreases
      spO2Delta += 3 * resuscitationAdequacy; // Improved oxygenation
      rrDelta -= 4 * resuscitationAdequacy; // RR normalizes
      tempDelta += 0.2 * resuscitationAdequacy; // Improved perfusion → warming
    }
    
    // Over-resuscitation risks (fluid overload)
    if (resuscitationAdequacy > 1.0) {
      const overloadFactor = resuscitationAdequacy - 1.0;
      spO2Delta -= 4 * overloadFactor; // Pulmonary edema
      rrDelta += 6 * overloadFactor; // Respiratory distress
      preloadDelta += 10 * overloadFactor; // Excessive preload (past optimal Frank-Starling)
    }
  }
  
  // Calculate new CVP (highly sensitive marker of preload in hypovolemia)
  const cvpDelta = preloadDelta * 0.18; // Strong correlation with preload changes
  
  // Apply time-weighted changes
  const timeWeight = Math.min(1, progressionFactor / 2); // Gradual progression over 2 hours
  
  return {
    cvp: Math.max(0, Math.min(18, currentVitals.cvp + cvpDelta * timeWeight)),
    cardiacOutput: Math.max(2.0, Math.min(8, currentVitals.cardiacOutput + coDelta * timeWeight)),
    heartRate: Math.max(50, Math.min(170, currentVitals.heartRate + hrDelta * timeWeight)),
    svr: Math.max(800, Math.min(2400, currentVitals.svr + svrDelta * timeWeight)),
    spO2: Math.max(75, Math.min(100, currentVitals.spO2 + spO2Delta * timeWeight)),
    respiratoryRate: Math.max(10, Math.min(40, currentVitals.respiratoryRate + rrDelta * timeWeight)),
    temperature: Math.max(34.5, Math.min(38, currentVitals.temperature + tempDelta * timeWeight)),
  };
}

// Classify hypovolemic shock severity (ATLS classification)
function classifyHypovolemicShock(volumeDeficit: number, patientWeight: number): HypovolemicClass {
  const bloodVolume = patientWeight * 70; // Estimated blood volume: 70 mL/kg
  const percentLoss = (volumeDeficit / bloodVolume) * 100;
  
  if (percentLoss < 15) return HypovolemicClass.CLASS_I;
  if (percentLoss < 30) return HypovolemicClass.CLASS_II;
  if (percentLoss < 40) return HypovolemicClass.CLASS_III;
  return HypovolemicClass.CLASS_IV;
}

// Estimate volume deficit from clinical parameters
function calculateVolumeDeficit(cvp: number, hr: number, map: number): number {
  // Multi-parameter estimation (CVP most reliable in hypovolemia)
  let deficitScore = 0;
  
  // CVP contribution (most sensitive)
  if (cvp < 2) deficitScore += 4;
  else if (cvp < 4) deficitScore += 3;
  else if (cvp < 6) deficitScore += 2;
  else if (cvp < 8) deficitScore += 1;
  
  // HR contribution
  if (hr > 140) deficitScore += 3;
  else if (hr > 120) deficitScore += 2;
  else if (hr > 100) deficitScore += 1;
  
  // MAP contribution
  if (map < 55) deficitScore += 3;
  else if (map < 65) deficitScore += 2;
  else if (map < 70) deficitScore += 1;
  
  // Convert score to estimated deficit (mL)
  // Score 0-2: 500-1000mL (Class I), 3-5: 1000-2000mL (Class II), 
  // 6-8: 2000-3000mL (Class III), 9-10: >3000mL (Class IV)
  return deficitScore * 350; // Approximately 350mL per point
}

// Calculate response to fluid bolus in hypovolemic shock
// Models Frank-Starling mechanism and fluid responsiveness
export function hypovolemicFluidResponse(
  currentCO: number,
  currentCVP: number,
  currentSV: number,
  bolusMl: number,
  currentMAP: number = 65,
  currentHR: number = 110
): { co: number; cvp: number; sv: number; map: number; hr: number; svr: number } {
  // Hypovolemic shock is HIGHLY responsive to fluids (optimal Frank-Starling position)
  // Response greatest when starting from low preload (steep part of curve)
  
  const bolusLiters = bolusMl / 1000;
  
  // Preload responsiveness decreases as CVP increases (Frank-Starling plateau)
  let responsivenessFactor = 1.0;
  if (currentCVP < 3) responsivenessFactor = 1.3; // Very responsive (steep curve)
  else if (currentCVP < 6) responsivenessFactor = 1.1; // Highly responsive
  else if (currentCVP < 10) responsivenessFactor = 0.8; // Moderately responsive
  else responsivenessFactor = 0.4; // Plateau of curve
  
  // Stroke volume improvement via Frank-Starling
  const svIncrease = (bolusLiters * 45) * responsivenessFactor; // Up to 45mL per liter bolus
  const newSV = Math.min(90, currentSV + svIncrease);
  
  // Cardiac output improvement (CO = HR × SV)
  const coIncrease = (newSV - currentSV) * currentHR / 1000;
  const newCO = Math.min(7.5, currentCO + coIncrease);
  
  // CVP increases with volume loading
  const cvpIncrease = (bolusLiters * 2.8) * (1 / responsivenessFactor); // Diminishing returns
  const newCVP = Math.min(12, currentCVP + cvpIncrease);
  
  // MAP improvement from increased CO
  const mapIncrease = (coIncrease / Math.max(0.1, currentCO)) * 18;
  const newMAP = Math.min(95, currentMAP + mapIncrease);
  
  // HR decreases as perfusion improves (reduced sympathetic drive)
  const hrDecrease = Math.min(15, (newMAP - currentMAP) * 0.8);
  const newHR = Math.max(60, currentHR - hrDecrease);
  
  // SVR decreases as sympathetic tone reduces (improved perfusion)
  const svrDecrease = (newMAP - currentMAP) * 25;
  
  return {
    co: newCO,
    cvp: newCVP,
    sv: newSV,
    map: newMAP,
    hr: newHR,
    svr: -svrDecrease, // Return as delta for application
  };
}

// Assess fluid responsiveness using dynamic and static parameters
// Evidence-based approach: CVP, PPV, SVV, passive leg raise equivalent
export function assessFluidResponsiveness(
  cvp: number,
  svr: number,
  co: number,
  sv: number,
  map: number,
  lactate: number = 2.0
): { 
  isFluidResponsive: boolean; 
  confidence: number;
  predictors: {
    cvp: { value: number; interpretation: string; score: number };
    svVariation: { estimated: number; interpretation: string; score: number };
    perfusionMarkers: { interpretation: string; score: number };
    frankStarlingPosition: { interpretation: string; score: number };
  };
  recommendation: string;
} {
  // Multi-parameter assessment (more reliable than CVP alone)
  let totalScore = 0;
  const maxScore = 12;
  
  // 1. CVP (static parameter, less reliable but widely used)
  let cvpScore = 0;
  let cvpInterpretation = '';
  if (cvp < 5) {
    cvpScore = 3;
    cvpInterpretation = 'Very low - highly suggests hypovolemia';
  } else if (cvp < 8) {
    cvpScore = 2;
    cvpInterpretation = 'Low - suggests fluid responsiveness';
  } else if (cvp < 12) {
    cvpScore = 1;
    cvpInterpretation = 'Normal - uncertain fluid responsiveness';
  } else {
    cvpScore = 0;
    cvpInterpretation = 'Elevated - suggests fluid overload risk';
  }
  totalScore += cvpScore;
  
  // 2. Stroke Volume Variation (estimated from SVR and CO relationship)
  // In hypovolemia: high SVR + low CO suggests high SVV
  const estimatedSVV = ((svr - 800) / 1600) * ((5 - co) / 3) * 100; // Rough estimation
  let svvScore = 0;
  let svvInterpretation = '';
  if (estimatedSVV > 13) {
    svvScore = 3;
    svvInterpretation = 'High variability - highly fluid responsive';
  } else if (estimatedSVV > 10) {
    svvScore = 2;
    svvInterpretation = 'Moderate variability - likely responsive';
  } else {
    svvScore = 1;
    svvInterpretation = 'Low variability - may not be responsive';
  }
  totalScore += svvScore;
  
  // 3. Tissue perfusion markers (lactate, MAP, CO)
  let perfusionScore = 0;
  let perfusionInterpretation = '';
  const hypoperfused = (map < 65 || lactate > 2.0 || co < 4.0);
  const severelyHypoperfused = (map < 60 || lactate > 4.0 || co < 3.5);
  
  if (severelyHypoperfused && svr > 1400) {
    perfusionScore = 3;
    perfusionInterpretation = 'Severe hypoperfusion with compensation - needs fluids';
  } else if (hypoperfused && svr > 1200) {
    perfusionScore = 2;
    perfusionInterpretation = 'Hypoperfusion with compensation - likely needs fluids';
  } else if (hypoperfused) {
    perfusionScore = 1;
    perfusionInterpretation = 'Hypoperfusion without compensation - assess carefully';
  } else {
    perfusionScore = 0;
    perfusionInterpretation = 'Adequate perfusion - fluids may not be needed';
  }
  totalScore += perfusionScore;
  
  // 4. Frank-Starling position estimate
  let fsScore = 0;
  let fsInterpretation = '';
  // Low SV + low CO + high SVR = ascending limb (very responsive)
  if (sv < 50 && co < 4.5 && svr > 1400) {
    fsScore = 3;
    fsInterpretation = 'Ascending limb - highly responsive';
  } else if (sv < 60 && co < 5.0) {
    fsScore = 2;
    fsInterpretation = 'Lower portion - responsive';
  } else if (sv < 70) {
    fsScore = 1;
    fsInterpretation = 'Mid-curve - moderately responsive';
  } else {
    fsScore = 0;
    fsInterpretation = 'Plateau region - may not respond';
  }
  totalScore += fsScore;
  
  // Overall assessment
  const confidence = totalScore / maxScore;
  const isResponsive = totalScore >= 6; // 50% threshold
  
  let recommendation = '';
  if (totalScore >= 9) {
    recommendation = 'STRONGLY recommend fluid bolus (500-1000mL crystalloid). Monitor response.';
  } else if (totalScore >= 6) {
    recommendation = 'Recommend fluid challenge (250-500mL). Reassess after bolus.';
  } else if (totalScore >= 3) {
    recommendation = 'Uncertain benefit. Consider small fluid challenge (250mL) with close monitoring.';
  } else {
    recommendation = 'AVOID fluids - risk of overload. Consider other interventions.';
  }
  
  return {
    isFluidResponsive: isResponsive,
    confidence,
    predictors: {
      cvp: { value: cvp, interpretation: cvpInterpretation, score: cvpScore },
      svVariation: { estimated: Math.round(estimatedSVV), interpretation: svvInterpretation, score: svvScore },
      perfusionMarkers: { interpretation: perfusionInterpretation, score: perfusionScore },
      frankStarlingPosition: { interpretation: fsInterpretation, score: fsScore },
    },
    recommendation,
  };
}

// Monitor for complications of hypovolemic shock and resuscitation
export function assessHypovolemicComplications(
  vitals: VitalSigns,
  labs: Partial<LabValues>,
  fluidBalance: number,
  timeSinceOnset: number
): {
  complications: string[];
  risks: string[];
  interventions: string[];
} {
  const complications: string[] = [];
  const risks: string[] = [];
  const interventions: string[] = [];
  
  // Acute kidney injury (pre-renal → ATN)
  if (labs.creatinine && labs.creatinine > 1.5) {
    if (vitals.map < 65) {
      complications.push('Acute Kidney Injury (pre-renal)');
      interventions.push('Maintain MAP >65 mmHg for renal perfusion');
    }
  }
  
  // Lactic acidosis
  if (labs.lactate && labs.lactate > 4.0) {
    complications.push('Severe lactic acidosis (Type A)');
    interventions.push('Aggressive resuscitation to improve tissue perfusion');
    interventions.push('Target lactate clearance >10% per hour');
  }
  
  // ARDS risk (from massive transfusion or prolonged shock)
  if (fluidBalance > 5000 || timeSinceOnset > 360) {
    risks.push('ARDS/TRALI risk');
    interventions.push('Lung-protective ventilation if intubated');
    interventions.push('Monitor for pulmonary edema');
  }
  
  // Abdominal compartment syndrome (over-resuscitation)
  if (fluidBalance > 8000) {
    risks.push('Abdominal compartment syndrome');
    interventions.push('Monitor bladder pressures if available');
    interventions.push('Consider balanced resuscitation strategy');
  }
  
  // Hypothermia
  if (vitals.temperature < 35) {
    complications.push('Hypothermia');
    interventions.push('Active warming measures');
    interventions.push('Warm all IV fluids and blood products');
  }
  
  // Coagulopathy (dilutional or consumptive)
  if (labs.platelets && labs.platelets < 50000) {
    complications.push('Thrombocytopenia/Coagulopathy');
    interventions.push('Consider platelet transfusion if platelets <50k');
    interventions.push('Assess for ongoing hemorrhage');
  }
  
  // Hyperchloremic acidosis (from excessive NS)
  if (labs.chloride && labs.chloride > 110 && labs.pH && labs.pH < 7.30) {
    complications.push('Hyperchloremic metabolic acidosis');
    interventions.push('Consider balanced crystalloids (LR) instead of NS');
  }
  
  return { complications, risks, interventions };
}
