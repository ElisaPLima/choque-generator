// Cardiogenic Shock Algorithm - Enhanced Medical Accuracy
// Characterized by: pump failure, low CO, high PCWP, high SVR (compensatory), cold/clammy
// Based on ESC/ACC Guidelines for Cardiogenic Shock Management (2023)
// SCAI Classification: Stage C-D (Classic to Deteriorating)

import { ShockProfile, VitalSigns, HemodynamicState, LabValues } from '../types';

// Additional cardiogenic shock subtypes and conditions
export interface CardiogenicShockSubtype {
  etiology: 'AMI' | 'Acute_Decompensated_HF' | 'RV_Failure' | 'Mechanical_Complication' | 'Myocarditis' | 'Post_Cardiotomy';
  rvInvolvement: boolean; // Right ventricular involvement
  mechanicalComplications: ('VSR' | 'Acute_MR' | 'Free_Wall_Rupture' | 'Tamponade')[];
  congestiveSymptoms: ('Pulmonary_Edema' | 'Hepatic_Congestion' | 'Peripheral_Edema')[];
  arrhythmias: ('VT' | 'VF' | 'AF' | 'Heart_Block' | 'Bradycardia')[];
}

// Enhanced hemodynamic parameters for cardiogenic shock
export interface CardiogenicHemodynamics extends HemodynamicState {
  pcwp: number; // Pulmonary Capillary Wedge Pressure (mmHg) - key in cardiogenic shock
  papi: number; // Pulmonary Artery Pulsatility Index: (PA systolic - PA diastolic) / CVP
  cardiacIndex: number; // CI = CO / BSA (L/min/m²)
  lvef: number; // Left Ventricular Ejection Fraction (%)
  rvef?: number; // Right Ventricular Ejection Fraction (%)
  svri: number; // Systemic Vascular Resistance Index
  lvedp: number; // Left Ventricular End-Diastolic Pressure (mmHg)
}

export const cardiogenicShock: ShockProfile = {
  name: 'Choque cardiogênico',
  
  initialVitals: {
    heartRate: 105, // Compensatory tachycardia (sympathetic activation)
    systolic: 80, // Hypotension from low CO (<90 mmHg or MAP <65)
    diastolic: 55, // Narrow pulse pressure (poor SV)
    spO2: 88, // Significant hypoxia (pulmonary edema, V/Q mismatch)
    respiratoryRate: 28, // Severe tachypnea (pulmonary congestion)
    temperature: 36.2, // Cool periphery (peripheral vasoconstriction)
    cvp: 16, // Elevated CVP (>12 mmHg - congestion)
    cardiacOutput: 3.2, // Low CO (<2.2 L/min/m² CI)
    svr: 1600, // High SVR (>1200 - compensatory vasoconstriction)
  },
  
  initialHemodynamics: {
    preload: 85, // High preload (congestion, PCWP >18 mmHg)
    contractility: 25, // Severely reduced contractility (LVEF <30-40%)
    afterload: 80, // High afterload (compensatory vasoconstriction)
    heartRate: 105,
    strokeVolume: 30, // Very low stroke volume (<40 mL - normal ~70 mL)
  },
  
  // Progression parameters - based on SHOCK trial and IABP-SHOCK II
  degradationRate: 0.9, // Fast deterioration (mortality >40% at 30 days without intervention)
  compensationCapacity: 0.3, // Poor compensation (heart can't compensate for itself - vicious cycle)
  
  // Response to treatments - Evidence-based
  fluidResponsiveness: 0.1, // Very poor response to fluids (may worsen pulmonary edema!)
  vasopressorResponsiveness: 0.5, // Moderate response (can help MAP but increases afterload - mixed effect)
  inotropeResponsiveness: 0.85, // Good response to inotropes (dobutamine improves contractility)
  
  // Characteristic lab patterns - reflecting hypoperfusion and organ dysfunction
  labProfile: {
    pH: 7.22, // Severe metabolic acidosis (lactic acidosis)
    pCO2: 38, // Normal to slightly low (respiratory compensation)
    pO2: 62, // Severe hypoxemia (pulmonary edema, alveolar flooding)
    hco3: 16, // Low bicarbonate (metabolic acidosis)
    lactate: 6.5, // High lactate (>4 mmol/L - tissue hypoperfusion)
    hemoglobin: 11.2, // Mild anemia (hemodilution or chronic disease)
    hematocrit: 34,
    wbc: 11000, // Mild leukocytosis (stress response)
    platelets: 180000,
    potassium: 5.2, // Hyperkalemia (poor renal perfusion + cellular release)
    sodium: 135, // Normal to low (neurohormonal activation)
    creatinine: 2.1, // Acute kidney injury (cardiorenal syndrome type 1)
    urea: 72, // Elevated (prerenal azotemia)
    magnesium: 1.8, // Often low in heart failure
    chloride: 98, // Hypochloremia common in CHF
  },
};

// Calculate vital sign progression for cardiogenic shock - Enhanced Algorithm
// Based on SCAI staging and hemodynamic profiles
export function progressCardiogenicShock(
  currentVitals: VitalSigns,
  timeSinceOnset: number,
  hasInotropes: boolean,
  hasVasopressors: boolean,
  fluidOverload: number, // net fluid balance in mL
  additionalParams?: {
    hasDiuretics?: boolean;
    hasMechanicalSupport?: boolean; // IABP, Impella, ECMO
    hasVasodilators?: boolean; // Nitroprusside, nitroglycerin
    rvFailure?: boolean;
    activeArrhythmia?: boolean;
  }
): Partial<VitalSigns> {
  const progressionFactor = timeSinceOnset / 60;
  
  // Without treatment, cardiogenic shock spirals (vicious cycle):
  // - Reduced CO → reduced coronary perfusion → worse contractility
  // - Increased LVEDP → pulmonary edema → hypoxia → myocardial ischemia
  // - Sympathetic activation → increased afterload → worse CO
  // - Organ hypoperfusion → metabolic acidosis → myocardial depression
  
  let coDelta = -0.3 * progressionFactor; // CO drops (progressive myocardial dysfunction)
  let spo2Delta = -2 * progressionFactor; // Hypoxia worsens (pulmonary edema)
  let cvpDelta = 1 * progressionFactor; // Congestion worsens (backward failure)
  let hrDelta = 5 * progressionFactor; // HR increases (sympathetic compensation)
  let svrDelta = 100 * progressionFactor; // SVR increases (compensatory vasoconstriction)
  let rrDelta = 2 * progressionFactor; // RR increases (hypoxia + pulmonary congestion)
  
  // Fluid overload is dangerous in cardiogenic shock (worsens pulmonary edema)
  if (fluidOverload > 500) {
    const overloadFactor = Math.min((fluidOverload - 500) / 1000, 2);
    spo2Delta -= 3 * overloadFactor; // Pulmonary edema worsens significantly
    cvpDelta += 2 * overloadFactor; // CVP/PCWP rises
    rrDelta += 3 * overloadFactor; // Respiratory distress worsens
    coDelta -= 0.1 * overloadFactor; // CO may worsen (overdistension)
  }
  
  // Inotropes are key treatment (dobutamine, milrinone)
  // Improve contractility via beta-1 receptors or PDE-3 inhibition
  if (hasInotropes) {
    coDelta += 0.8; // Improve contractility and CO (increase SV)
    spo2Delta += 3; // Better perfusion improves oxygenation
    cvpDelta -= 0.5; // Reduced backward pressure
    // Note: Inotropes increase myocardial O2 demand - monitor for ischemia
  }
  
  // Vasopressors in cardiogenic shock - complex effects
  if (hasVasopressors) {
    // Vasopressors can help MAP but increase afterload (double-edged sword)
    svrDelta += 150; // Increase SVR (alpha effect)
    coDelta -= 0.15; // CO may decrease from increased afterload
    // Low-dose norepinephrine can be beneficial if MAP <60-65 mmHg
  }
  
  // Diuretics help reduce pulmonary congestion
  if (additionalParams?.hasDiuretics) {
    spo2Delta += 2; // Improved oxygenation (reduced pulmonary edema)
    cvpDelta -= 1.5; // Reduced preload
    rrDelta -= 1; // Easier breathing
    // Note: Excessive diuresis can reduce preload too much and worsen CO
  }
  
  // Mechanical circulatory support (MCS) - game changer
  if (additionalParams?.hasMechanicalSupport) {
    coDelta += 1.2; // Significant CO improvement
    spo2Delta += 4; // Better perfusion
    cvpDelta -= 2; // Reduced congestion
    svrDelta -= 200; // Reduced afterload (unloading)
    // IABP: ↑ coronary perfusion, ↓ afterload
    // Impella: Direct CO augmentation
    // ECMO: Full cardiopulmonary support
  }
  
  // Vasodilators reduce afterload (for high SVR)
  if (additionalParams?.hasVasodilators) {
    svrDelta -= 250; // Reduce afterload
    coDelta += 0.3; // CO improves from reduced afterload
    // Caution: Need adequate MAP (>65) before vasodilators
  }
  
  // Right ventricular failure - special considerations
  if (additionalParams?.rvFailure) {
    cvpDelta += 1.5; // Elevated CVP (RV congestion)
    spo2Delta -= 1; // Worse V/Q mismatch
    // RV failure requires different management: avoid excessive preload reduction
  }
  
  // Arrhythmias worsen hemodynamics
  if (additionalParams?.activeArrhythmia) {
    coDelta -= 0.4; // Loss of atrial kick (AF) or irregular rhythm
    hrDelta += 10; // Tachyarrhythmias
  }
  
  return {
    cardiacOutput: Math.max(1.5, currentVitals.cardiacOutput + coDelta),
    spO2: Math.max(70, Math.min(100, currentVitals.spO2 + spo2Delta)),
    cvp: Math.max(4, Math.min(25, currentVitals.cvp + cvpDelta)),
    heartRate: Math.max(50, Math.min(160, currentVitals.heartRate + hrDelta)),
    svr: Math.max(800, Math.min(2500, currentVitals.svr + svrDelta)),
    respiratoryRate: Math.max(12, Math.min(40, currentVitals.respiratoryRate + rrDelta)),
  };
}

// Calculate response to inotrope in cardiogenic shock - Enhanced Model
// Dobutamine: Beta-1 > Beta-2 > Alpha-1 (dose-dependent)
// Milrinone: PDE-3 inhibitor (inodilator - increases contractility + vasodilation)
export function cardiogenicInotropeResponse(
  currentCO: number,
  currentSV: number,
  currentSVR: number,
  currentLVEF: number, // LVEF estimation (0-100%)
  inotropeType: 'dobutamine' | 'milrinone' | 'epinephrine' | 'dopamine',
  dose: number // mcg/kg/min for catecholamines, mcg/kg/min for milrinone
): { co: number; sv: number; hr: number; svr: number; lvef: number } {
  
  let contractilityBoost = 0;
  let hrIncrease = 0;
  let svrChange = 0;
  
  switch (inotropeType) {
    case 'dobutamine':
      // Dobutamine is highly effective in cardiogenic shock
      // Dose: 2.5-20 mcg/kg/min (typically start 2.5-5, titrate up)
      // Beta-1 (inotropy + chronotropy) > Beta-2 (vasodilation)
      contractilityBoost = dose * 0.08; // 8% per mcg/kg/min (beta-1 effect)
      hrIncrease = dose * 2; // Moderate HR increase (beta effect)
      svrChange = -dose * 20; // Mild vasodilation (beta-2 effect at higher doses)
      
      // Effectiveness decreases with severe LV dysfunction
      if (currentLVEF < 20) {
        contractilityBoost *= 0.7; // Less effective in severe dysfunction
      }
      break;
      
    case 'milrinone':
      // PDE-3 inhibitor - inodilator (catecholamine-independent)
      // Bolus: 50 mcg/kg over 10 min, then 0.375-0.75 mcg/kg/min
      // Good for beta-receptor downregulation (chronic CHF)
      contractilityBoost = dose * 0.15; // 15% per mcg/kg/min (strong inodilator)
      hrIncrease = dose * 1; // Mild HR increase
      svrChange = -dose * 80; // Significant vasodilation (afterload reduction)
      
      // More effective in beta-receptor downregulation
      // Caution: Can cause hypotension (monitor MAP)
      break;
      
    case 'epinephrine':
      // High-dose inotrope for refractory shock
      // Alpha + Beta effects (dose-dependent)
      // Low dose (<0.05): Beta > Alpha (inotropy)
      // High dose (>0.1): Alpha ≥ Beta (vasoconstriction + inotropy)
      if (dose < 0.05) {
        contractilityBoost = dose * 0.25; // Strong beta-1 effect
        hrIncrease = dose * 25; // Significant tachycardia
        svrChange = -dose * 30; // Mild vasodilation (beta-2)
      } else {
        contractilityBoost = dose * 0.20;
        hrIncrease = dose * 20;
        svrChange = dose * 150; // Vasoconstriction (alpha-1)
      }
      // Note: Increases myocardial O2 demand significantly
      break;
      
    case 'dopamine':
      // Dose-dependent receptor activation
      // Low (2-5): Dopaminergic (renal/splanchnic vasodilation)
      // Medium (5-10): Beta-1 (inotropy)
      // High (>10): Alpha-1 (vasoconstriction)
      if (dose < 5) {
        contractilityBoost = dose * 0.03;
        hrIncrease = dose * 1;
        svrChange = -dose * 10; // Mild vasodilation
      } else if (dose < 10) {
        contractilityBoost = dose * 0.06; // Beta-1 effect
        hrIncrease = dose * 2;
        svrChange = 0;
      } else {
        contractilityBoost = dose * 0.05;
        hrIncrease = dose * 3;
        svrChange = dose * 50; // Alpha-1 vasoconstriction
      }
      break;
  }
  
  // Calculate new values
  const lvefImprovement = contractilityBoost * 100;
  const newLVEF = Math.min(55, currentLVEF + lvefImprovement);
  
  const svIncrease = currentSV * contractilityBoost;
  const newSV = Math.min(90, currentSV + svIncrease);
  
  const newHR = Math.max(60, Math.min(140, 105 + hrIncrease));
  
  const newCO = (newHR * newSV) / 1000;
  
  const newSVR = Math.max(600, Math.min(2200, currentSVR + svrChange));
  
  return {
    co: Math.min(8, newCO),
    sv: newSV,
    hr: newHR,
    svr: newSVR,
    lvef: newLVEF,
  };
}

// Calculate danger of fluid bolus in cardiogenic shock - Enhanced Risk Assessment
// Based on ESCAPE trial findings and ESC guidelines
export function cardiogenicFluidRisk(
  currentCVP: number,
  currentPCWP: number, // Pulmonary Capillary Wedge Pressure (if available)
  currentSpO2: number,
  currentCI: number, // Cardiac Index (L/min/m²)
  bolusMl: number,
  patientBSA: number // Body Surface Area (m²)
): { 
  pulmonaryEdemaRisk: number; 
  cvpIncrease: number; 
  pcwpIncrease: number;
  coChange: number;
  recommendation: string;
  fluidTolerance: 'contraindicated' | 'high_risk' | 'moderate_risk' | 'acceptable';
} {
  
  // High preload + fluid = pulmonary edema risk
  // CVP >12-15 mmHg or PCWP >18-20 mmHg indicates congestion
  
  let baseRisk = 0.2;
  
  // CVP-based risk assessment
  if (currentCVP > 18) {
    baseRisk = 0.9; // Very high risk
  } else if (currentCVP > 15) {
    baseRisk = 0.7; // High risk
  } else if (currentCVP > 12) {
    baseRisk = 0.5; // Moderate risk
  } else if (currentCVP > 8) {
    baseRisk = 0.3; // Mild risk
  }
  
  // PCWP-based risk (more accurate if available)
  if (currentPCWP > 0) {
    if (currentPCWP > 25) {
      baseRisk = Math.max(baseRisk, 0.95);
    } else if (currentPCWP > 20) {
      baseRisk = Math.max(baseRisk, 0.75);
    } else if (currentPCWP > 18) {
      baseRisk = Math.max(baseRisk, 0.55);
    }
  }
  
  // Volume-based risk
  const volumeRisk = (bolusMl / 500) * 0.2;
  
  // SpO2 already compromised increases risk
  const hypoxiaRisk = currentSpO2 < 90 ? 0.15 : 0;
  
  // Low cardiac index increases risk (stiff, non-compliant ventricle)
  const ciRisk = currentCI < 2.0 ? 0.15 : currentCI < 2.2 ? 0.1 : 0;
  
  const totalRisk = Math.min(1, baseRisk + volumeRisk + hypoxiaRisk + ciRisk);
  
  // Estimate hemodynamic changes
  // Cardiogenic shock: very steep pressure-volume curve
  const preloadSensitivity = 2.5; // mmHg increase per 500mL (much higher than normal)
  const cvpIncrease = (bolusMl / 500) * preloadSensitivity;
  const pcwpIncrease = (bolusMl / 500) * (preloadSensitivity * 1.2); // PCWP increases more
  
  // CO change with fluid - minimal benefit, often negative
  // Frank-Starling curve: already on flat/descending portion
  let coChange = 0;
  if (currentCVP < 8 && currentPCWP < 15) {
    // May benefit from fluid (still on ascending limb)
    coChange = (bolusMl / 1000) * 0.15;
  } else if (currentCVP >= 8 && currentCVP <= 12) {
    // Minimal benefit
    coChange = (bolusMl / 1000) * 0.05;
  } else {
    // Likely harmful (descending limb - overdistension)
    coChange = -(bolusMl / 1000) * 0.08;
  }
  
  // Generate recommendation
  let recommendation = '';
  let fluidTolerance: 'contraindicated' | 'high_risk' | 'moderate_risk' | 'acceptable' = 'acceptable';
  
  if (totalRisk > 0.8) {
    recommendation = 'CONTRAINDICADO: Alto risco de edema pulmonar. Considere diuréticos.';
    fluidTolerance = 'contraindicated';
  } else if (totalRisk > 0.6) {
    recommendation = 'ALTO RISCO: Fluidos provavelmente prejudiciais. Preferir inotrópicos.';
    fluidTolerance = 'high_risk';
  } else if (totalRisk > 0.4) {
    recommendation = 'RISCO MODERADO: Monitore cuidadosamente. Considere pequenos bolus (250mL).';
    fluidTolerance = 'moderate_risk';
  } else {
    recommendation = 'Fluidos podem ser tolerados, mas monitorar congestão pulmonar.';
    fluidTolerance = 'acceptable';
  }
  
  return {
    pulmonaryEdemaRisk: totalRisk,
    cvpIncrease,
    pcwpIncrease,
    coChange,
    recommendation,
    fluidTolerance,
  };
}

// Calculate SCAI shock stage based on hemodynamics
// SCAI Classification: A (At Risk) → E (Extremis)
export function calculateSCAIStage(
  map: number,
  ci: number, // Cardiac Index
  lactate: number,
  cvp: number,
  hasHypoperfusion: boolean,
  requiresEscalatingSupport: boolean
): {
  stage: 'A' | 'B' | 'C' | 'D' | 'E';
  description: string;
  mortality: string;
} {
  
  // Stage E: Extremis (cardiac arrest, ECMO)
  if (map < 50 || ci < 1.8 || lactate > 10) {
    return {
      stage: 'E',
      description: 'Extremis - Colapso circulatório',
      mortality: '>80% sem suporte mecânico',
    };
  }
  
  // Stage D: Deteriorating (failing single pressors, worsening)
  if ((map < 60 && requiresEscalatingSupport) || ci < 2.0 || lactate > 6) {
    return {
      stage: 'D',
      description: 'Deteriorando - Falha terapêutica',
      mortality: '40-60%',
    };
  }
  
  // Stage C: Classic (hypotension + hypoperfusion)
  if (map < 65 && hasHypoperfusion && ci < 2.2) {
    return {
      stage: 'C',
      description: 'Clássico - Hipoperfusão presente',
      mortality: '30-50%',
    };
  }
  
  // Stage B: Beginning (relative hypotension, no hypoperfusion yet)
  if (map < 70 || cvp > 12) {
    return {
      stage: 'B',
      description: 'Início - Hemodinâmica comprometida',
      mortality: '10-20%',
    };
  }
  
  // Stage A: At Risk
  return {
    stage: 'A',
    description: 'Em risco - Sem choque ainda',
    mortality: '<5%',
  };
}

// Assess need for mechanical circulatory support (MCS)
export function assessMCSIndication(
  map: number,
  ci: number,
  lactate: number,
  scaiStage: 'A' | 'B' | 'C' | 'D' | 'E',
  vasopressorDose: number, // Norepinephrine equivalent (mcg/kg/min)
  inotropeDose: number,
  hasOrganFailure: boolean
): {
  indicated: boolean;
  urgency: 'emergent' | 'urgent' | 'consider' | 'not_indicated';
  deviceSuggestion: 'ECMO' | 'Impella' | 'IABP' | 'none';
  reasoning: string;
} {
  
  // ECMO indications (VA-ECMO for cardiogenic shock)
  if (scaiStage === 'E' || (map < 55 && ci < 1.8)) {
    return {
      indicated: true,
      urgency: 'emergent',
      deviceSuggestion: 'ECMO',
      reasoning: 'Colapso circulatório iminente/presente. ECMO para suporte total.',
    };
  }
  
  // Impella indications (LV unloading + support)
  if (scaiStage === 'D' || (ci < 2.0 && vasopressorDose > 0.3)) {
    return {
      indicated: true,
      urgency: 'urgent',
      deviceSuggestion: 'Impella',
      reasoning: 'Choque refratário a vasopressores. Impella para suporte direto de CO.',
    };
  }
  
  // IABP indications (augmentation + afterload reduction)
  if (scaiStage === 'C' || (ci < 2.2 && map < 65)) {
    return {
      indicated: true,
      urgency: 'consider',
      deviceSuggestion: 'IABP',
      reasoning: 'Choque cardiogênico clássico. IABP para perfusão coronária.',
    };
  }
  
  // Medical management still appropriate
  return {
    indicated: false,
    urgency: 'not_indicated',
    deviceSuggestion: 'none',
    reasoning: 'Continuar manejo clínico com otimização de vasopressores/inotrópicos.',
  };
}
