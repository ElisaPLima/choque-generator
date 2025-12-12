// Comorbidity effects on shock physiology and treatment response
// Based on medical guidelines and pathophysiology

import { VitalSigns, HemodynamicState, LabValues } from './types';

export interface ComorbidityEffect {
  name: string;
  
  // Effects on initial presentation
  vitalModifiers?: {
    heartRate?: number;
    systolic?: number;
    diastolic?: number;
    spO2?: number;
    respiratoryRate?: number;
    cardiacOutput?: number;
  };
  
  hemodynamicModifiers?: {
    contractility?: number;
    preload?: number;
    afterload?: number;
    svr?: number;
    pvr?: number;
  };
  
  labModifiers?: {
    hemoglobin?: number;
    creatinine?: number;
    urea?: number;
    pH?: number;
    hco3?: number;
    potassium?: number;
    sodium?: number;
  };
  
  // Effects on treatment response
  fluidTolerance?: number; // Multiplier for fluid effectiveness/complications (1.0 = normal)
  vasopressorResponse?: number; // Multiplier for vasopressor effectiveness
  inotropeResponse?: number; // Multiplier for inotrope effectiveness
  oxygenResponse?: number; // Multiplier for oxygen therapy effectiveness
  
  // Risk modifiers
  deteriorationRate?: number; // Multiplier for how fast patient deteriorates
  complicationRisk?: number; // Multiplier for complication probability
}

// Medical guideline-based comorbidity effects
export const COMORBIDITY_EFFECTS: Record<string, ComorbidityEffect> = {
  'Insuficiência Cardíaca Prévia': {
    name: 'Insuficiência Cardíaca Prévia',
    
    // Heart failure: reduced contractility, elevated filling pressures
    vitalModifiers: {
      cardiacOutput: -1.5, // Reduced baseline CO
      systolic: -10, // Lower systolic BP
      respiratoryRate: 4, // Dyspnea/pulmonary congestion
      spO2: -3, // Reduced oxygenation
    },
    
    hemodynamicModifiers: {
      contractility: -20, // Significantly reduced contractility
      preload: 15, // Elevated filling pressures
      svr: 200, // Compensatory vasoconstriction
    },
    
    labModifiers: {
      creatinine: 0.3, // Cardiorenal syndrome
      urea: 10, // Elevated BUN
      hco3: -2, // Mild metabolic acidosis
    },
    
    // Treatment response modifiers (ACC/AHA HF Guidelines)
    fluidTolerance: 0.4, // Very poor fluid tolerance - risk of pulmonary edema
    vasopressorResponse: 0.9, // Slightly reduced response
    inotropeResponse: 1.3, // Better response to inotropes
    oxygenResponse: 0.85,
    
    deteriorationRate: 1.4, // Decompensates faster
    complicationRisk: 1.5, // Higher risk of arrhythmias, pulmonary edema
  },
  
  'Hipertensão Arterial Sistêmica': {
    name: 'Hipertensão Arterial Sistêmica',
    
    // Chronic HTN: LVH, diastolic dysfunction, higher baseline SVR
    vitalModifiers: {
      systolic: 15, // Higher baseline BP (may mask shock)
      diastolic: 10,
    },
    
    hemodynamicModifiers: {
      afterload: 15, // Increased afterload
      svr: 250, // Elevated SVR
      contractility: -8, // LV hypertrophy with reduced compliance
    },
    
    labModifiers: {
      creatinine: 0.2, // Hypertensive nephropathy
    },
    
    // JNC 8 / ESH Guidelines considerations
    fluidTolerance: 0.7, // Reduced tolerance due to diastolic dysfunction
    vasopressorResponse: 1.1, // May need higher doses but responds
    inotropeResponse: 0.95,
    oxygenResponse: 1.0,
    
    deteriorationRate: 1.1,
    complicationRisk: 1.3, // Higher stroke/MI risk
  },
  
  'DPOC': {
    name: 'DPOC',
    
    // COPD: chronic hypoxemia, CO2 retention, pulmonary hypertension
    vitalModifiers: {
      spO2: -5, // Baseline hypoxemia
      respiratoryRate: 6, // Increased RR
    },
    
    hemodynamicModifiers: {
      pvr: 1.5, // Pulmonary hypertension (Wood units)
      contractility: -5, // RV dysfunction from chronic PH
    },
    
    labModifiers: {
      pH: -0.03, // Chronic respiratory acidosis (compensated)
      hco3: 3, // Metabolic compensation
      hemoglobin: 1.5, // Chronic hypoxemia → polycythemia
    },
    
    // GOLD Guidelines considerations
    fluidTolerance: 0.85, // Risk of RV failure
    vasopressorResponse: 0.9, // May worsen V/Q mismatch
    inotropeResponse: 1.0,
    oxygenResponse: 0.6, // Limited response due to V/Q mismatch, risk of CO2 retention
    
    deteriorationRate: 1.3, // Respiratory failure risk
    complicationRisk: 1.4, // Pneumonia, acute respiratory failure
  },
  
  'Doença Renal Crônica': {
    name: 'Doença Renal Crônica',
    
    // CKD: fluid overload, electrolyte imbalance, uremia, anemia
    vitalModifiers: {
      systolic: 12, // Often hypertensive
      diastolic: 8,
    },
    
    hemodynamicModifiers: {
      preload: 10, // Volume overload
      svr: 150, // HTN from RAAS activation
    },
    
    labModifiers: {
      creatinine: 2.0, // Elevated baseline (assuming Stage 3-4)
      urea: 40, // Elevated BUN
      potassium: 0.5, // Hyperkalemia risk
      hemoglobin: -3, // Anemia of CKD
      pH: -0.05, // Metabolic acidosis
      hco3: -4, // Low bicarbonate
    },
    
    // KDIGO Guidelines
    fluidTolerance: 0.5, // Poor fluid handling, oliguria
    vasopressorResponse: 1.0,
    inotropeResponse: 0.9,
    oxygenResponse: 0.9, // Anemia limits O2 delivery
    
    deteriorationRate: 1.5, // Rapid progression to AKI/uremia
    complicationRisk: 1.6, // Hyperkalemia, metabolic acidosis, fluid overload
  },
  
  'Anemia': {
    name: 'Anemia',
    
    // Anemia: reduced O2 carrying capacity, compensatory tachycardia
    vitalModifiers: {
      heartRate: 15, // Compensatory tachycardia
      cardiacOutput: 0.8, // Increased CO to compensate
      spO2: -2, // May appear lower despite adequate saturation
    },
    
    hemodynamicModifiers: {
      contractility: 5, // Hyperdynamic state
      svr: -100, // Reduced SVR in severe anemia
    },
    
    labModifiers: {
      hemoglobin: -4, // Significantly low Hb
      hematocrit: -12, // Low Hct
    },
    
    // Transfusion Guidelines (WHO, AABB)
    fluidTolerance: 0.8, // Needs blood more than fluids
    vasopressorResponse: 0.7, // Poor response without adequate Hb
    inotropeResponse: 0.8, // Limited by O2 delivery
    oxygenResponse: 0.5, // Oxygen therapy less effective without carriers
    
    deteriorationRate: 1.3, // Limited oxygen delivery reserve
    complicationRisk: 1.2, // Myocardial ischemia, lactate accumulation
  },
};

// Apply comorbidity effects to initial vitals
export function applyComorbiditiesToVitals(
  baseVitals: VitalSigns,
  conditions: string[]
): VitalSigns {
  let modifiedVitals = { ...baseVitals };
  
  conditions.forEach(condition => {
    const effect = COMORBIDITY_EFFECTS[condition];
    if (effect?.vitalModifiers) {
      const mods = effect.vitalModifiers;
      
      if (mods.heartRate) modifiedVitals.heartRate += mods.heartRate;
      if (mods.systolic) modifiedVitals.systolic += mods.systolic;
      if (mods.diastolic) modifiedVitals.diastolic += mods.diastolic;
      if (mods.spO2) modifiedVitals.spO2 += mods.spO2;
      if (mods.respiratoryRate) modifiedVitals.respiratoryRate += mods.respiratoryRate;
      if (mods.cardiacOutput) modifiedVitals.cardiacOutput += mods.cardiacOutput;
    }
    
    if (effect?.hemodynamicModifiers) {
      const mods = effect.hemodynamicModifiers;
      if (mods.svr) modifiedVitals.svr += mods.svr;
      if (mods.pvr) modifiedVitals.pvr += mods.pvr;
    }
  });
  
  // Ensure values stay within physiological limits
  modifiedVitals.heartRate = Math.max(30, Math.min(200, modifiedVitals.heartRate));
  modifiedVitals.systolic = Math.max(50, Math.min(250, modifiedVitals.systolic));
  modifiedVitals.diastolic = Math.max(30, Math.min(150, modifiedVitals.diastolic));
  modifiedVitals.spO2 = Math.max(60, Math.min(100, modifiedVitals.spO2));
  modifiedVitals.respiratoryRate = Math.max(6, Math.min(50, modifiedVitals.respiratoryRate));
  modifiedVitals.cardiacOutput = Math.max(1.5, Math.min(12, modifiedVitals.cardiacOutput));
  
  return modifiedVitals;
}

// Apply comorbidity effects to hemodynamics
export function applyComorbiditiesToHemodynamics(
  baseHemodynamics: HemodynamicState,
  conditions: string[]
): HemodynamicState {
  let modifiedHemo = { ...baseHemodynamics };
  
  conditions.forEach(condition => {
    const effect = COMORBIDITY_EFFECTS[condition];
    if (effect?.hemodynamicModifiers) {
      const mods = effect.hemodynamicModifiers;
      
      if (mods.contractility) modifiedHemo.contractility += mods.contractility;
      if (mods.preload) modifiedHemo.preload += mods.preload;
      if (mods.afterload) modifiedHemo.afterload += mods.afterload;
    }
  });
  
  // Ensure values stay within limits
  modifiedHemo.contractility = Math.max(10, Math.min(100, modifiedHemo.contractility));
  modifiedHemo.preload = Math.max(10, Math.min(100, modifiedHemo.preload));
  modifiedHemo.afterload = Math.max(20, Math.min(100, modifiedHemo.afterload));
  
  return modifiedHemo;
}

// Apply comorbidity effects to lab values
export function applyComorbiditiesToLabs(
  baseLabs: LabValues,
  conditions: string[]
): LabValues {
  let modifiedLabs = { ...baseLabs };
  
  conditions.forEach(condition => {
    const effect = COMORBIDITY_EFFECTS[condition];
    if (effect?.labModifiers) {
      const mods = effect.labModifiers;
      
      if (mods.hemoglobin) modifiedLabs.hemoglobin += mods.hemoglobin;
      if (mods.creatinine) modifiedLabs.creatinine += mods.creatinine;
      if (mods.urea) modifiedLabs.urea += mods.urea;
      if (mods.pH) modifiedLabs.pH += mods.pH;
      if (mods.hco3) modifiedLabs.hco3 += mods.hco3;
      if (mods.potassium) modifiedLabs.potassium += mods.potassium;
      if (mods.sodium) modifiedLabs.sodium += mods.sodium;
      
      // Update hematocrit based on hemoglobin (Hct ≈ Hb × 3)
      if (mods.hemoglobin) {
        modifiedLabs.hematocrit = modifiedLabs.hemoglobin * 3;
      }
    }
  });
  
  // Ensure values stay within physiological limits
  modifiedLabs.hemoglobin = Math.max(4, Math.min(20, modifiedLabs.hemoglobin));
  modifiedLabs.hematocrit = Math.max(12, Math.min(60, modifiedLabs.hematocrit));
  modifiedLabs.creatinine = Math.max(0.3, Math.min(15, modifiedLabs.creatinine));
  modifiedLabs.urea = Math.max(5, Math.min(200, modifiedLabs.urea));
  modifiedLabs.pH = Math.max(6.8, Math.min(7.8, modifiedLabs.pH));
  modifiedLabs.hco3 = Math.max(5, Math.min(45, modifiedLabs.hco3));
  modifiedLabs.potassium = Math.max(2.0, Math.min(8.0, modifiedLabs.potassium));
  modifiedLabs.sodium = Math.max(115, Math.min(160, modifiedLabs.sodium));
  
  return modifiedLabs;
}

// Get combined treatment response modifier
export function getTreatmentResponseModifier(
  conditions: string[],
  treatmentType: 'fluid' | 'vasopressor' | 'inotrope' | 'oxygen'
): number {
  let modifier = 1.0;
  
  conditions.forEach(condition => {
    const effect = COMORBIDITY_EFFECTS[condition];
    if (!effect) return;
    
    switch (treatmentType) {
      case 'fluid':
        if (effect.fluidTolerance) {
          modifier *= effect.fluidTolerance;
        }
        break;
      case 'vasopressor':
        if (effect.vasopressorResponse) {
          modifier *= effect.vasopressorResponse;
        }
        break;
      case 'inotrope':
        if (effect.inotropeResponse) {
          modifier *= effect.inotropeResponse;
        }
        break;
      case 'oxygen':
        if (effect.oxygenResponse) {
          modifier *= effect.oxygenResponse;
        }
        break;
    }
  });
  
  return modifier;
}

// Get combined deterioration rate
export function getDeteriorationRateModifier(conditions: string[]): number {
  let modifier = 1.0;
  
  conditions.forEach(condition => {
    const effect = COMORBIDITY_EFFECTS[condition];
    if (effect?.deteriorationRate) {
      modifier *= effect.deteriorationRate;
    }
  });
  
  return modifier;
}

// Get combined complication risk
export function getComplicationRiskModifier(conditions: string[]): number {
  let modifier = 1.0;
  
  conditions.forEach(condition => {
    const effect = COMORBIDITY_EFFECTS[condition];
    if (effect?.complicationRisk) {
      modifier *= effect.complicationRisk;
    }
  });
  
  return modifier;
}
