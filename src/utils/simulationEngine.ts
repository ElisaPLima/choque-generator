// Physiological Simulation Engine
// Core hemodynamic calculations and vital sign updates

import { VitalSigns, HemodynamicState, PatientData, SimulationState, ActiveIntervention, LabValues } from './types';
import { PHYSIOLOGY, NORMAL_RANGES, DIFFICULTY_SETTINGS, LAB_NORMALS } from './constants';
import { distributiveShock, progressDistributiveShock } from './shocks/distributive';
import { cardiogenicShock, progressCardiogenicShock } from './shocks/cardiogenic';
import { hypovolemicShock, progressHypovolemicShock } from './shocks/hypovolemic';
import { obstructiveShock, progressObstructiveShock } from './shocks/obstructive';
import { mixedShock, progressMixedShock } from './shocks/mixed';
import { randomizeVitalSigns, randomizeHemodynamics, randomizeLabValues } from './randomization';
import { 
  applyComorbiditiesToVitals, 
  applyComorbiditiesToHemodynamics, 
  applyComorbiditiesToLabs,
  getDeteriorationRateModifier 
} from './comorbidities';
import { calculateVentilationHemodynamicEffects } from './ventilation';

// Calculate Mean Arterial Pressure from systolic and diastolic
export function calculateMAP(systolic: number, diastolic: number): number {
  return diastolic + (systolic - diastolic) * PHYSIOLOGY.mapCalculationFactor;
}

// Calculate Cardiac Output from heart rate and stroke volume
export function calculateCO(heartRate: number, strokeVolume: number): number {
  return (heartRate * strokeVolume) / PHYSIOLOGY.mlToLiters;
}

// Calculate Systemic Vascular Resistance
export function calculateSVR(map: number, cvp: number, co: number): number {
  if (co === 0) return 2000; // Avoid division by zero
  return ((map - cvp) * PHYSIOLOGY.svrConversionFactor) / co;
}

// Calculate stroke volume from cardiac output and heart rate
export function calculateStrokeVolume(co: number, hr: number): number {
  if (hr === 0) return 0;
  return (co * PHYSIOLOGY.mlToLiters) / hr;
}

// Frank-Starling relationship: CO increases with preload up to a point
export function frankStarlingCurve(preload: number, contractility: number): number {
  // Optimal preload is around 50-70
  // Returns a factor (0-1) representing cardiac performance
  
  if (preload < 30) {
    // Underfilled: linear relationship
    return (preload / 30) * (contractility / 100) * 0.7;
  } else if (preload <= 70) {
    // Optimal range: best performance
    return (contractility / 100);
  } else {
    // Overfilled: performance decreases (pulmonary edema, overdistension)
    const overload = preload - 70;
    const penalty = Math.min(0.4, overload / 100);
    return (contractility / 100) * (1 - penalty);
  }
}

// Baroreceptor compensation: body adjusts HR and SVR in response to MAP
export function baroreceptorCompensation(
  currentMAP: number,
  currentHR: number,
  currentSVR: number
): { hrAdjustment: number; svrAdjustment: number } {
  const targetMAP = 75; // Target mean arterial pressure
  const error = targetMAP - currentMAP;
  
  // If MAP is low, increase HR and SVR
  // If MAP is high, decrease HR and SVR
  const hrAdjustment = error * 0.3; // Moderate HR response
  const svrAdjustment = error * 15; // Stronger SVR response
  
  return {
    hrAdjustment: Math.max(-20, Math.min(30, hrAdjustment)),
    svrAdjustment: Math.max(-200, Math.min(400, svrAdjustment)),
  };
}

// Respiratory compensation for acidosis
export function respiratoryCompensation(pH: number, currentRR: number): number {
  const targetPH = 7.40;
  const phError = targetPH - pH;
  
  // If pH is low (acidosis), increase RR to blow off CO2
  if (phError > 0) {
    const rrIncrease = phError * 40; // Significant RR increase with acidosis
    return Math.min(40, currentRR + rrIncrease);
  } else {
    // If pH is high (alkalosis), decrease RR
    const rrDecrease = Math.abs(phError) * 20;
    return Math.max(8, currentRR - rrDecrease);
  }
}

// Initialize vital signs based on shock type and difficulty
export function initializeVitals(patientData: PatientData): VitalSigns {
  let baseVitals: Partial<VitalSigns>;
  
  // Get base vitals from shock profile
  switch (patientData.shockType) {
    case 'Choque distributivo':
      baseVitals = distributiveShock.initialVitals;
      break;
    case 'Choque cardiogênico':
      baseVitals = cardiogenicShock.initialVitals;
      break;
    case 'Choque hipovolêmico':
      baseVitals = hypovolemicShock.initialVitals;
      break;
    case 'Choque obstrutivo':
      baseVitals = obstructiveShock.initialVitals;
      break;
    case 'Choque misto':
      baseVitals = mixedShock.initialVitals;
      break;
    default:
      baseVitals = distributiveShock.initialVitals;
  }
  
  // Apply randomization to create variation while maintaining shock characteristics
  baseVitals = randomizeVitalSigns(baseVitals, patientData.shockType);
  
  // Apply difficulty modifier
  const difficultyMod = DIFFICULTY_SETTINGS[patientData.difficulty as keyof typeof DIFFICULTY_SETTINGS];
  const severityFactor = difficultyMod?.baselineSeverity || 1.0;
  
  // More severe = vitals deviate more from normal
  const applyDifficulty = (value: number, normal: number): number => {
    const deviation = value - normal;
    return normal + (deviation * severityFactor);
  };
  
  const vitals: VitalSigns = {
    heartRate: applyDifficulty(baseVitals.heartRate || 100, 75),
    systolic: applyDifficulty(baseVitals.systolic || 90, 120),
    diastolic: applyDifficulty(baseVitals.diastolic || 50, 75),
    map: baseVitals.systolic && baseVitals.diastolic 
      ? calculateMAP(
          applyDifficulty(baseVitals.systolic, 120),
          applyDifficulty(baseVitals.diastolic, 75)
        )
      : 65,
    spO2: applyDifficulty(baseVitals.spO2 || 92, 98),
    respiratoryRate: applyDifficulty(baseVitals.respiratoryRate || 20, 16),
    temperature: applyDifficulty(baseVitals.temperature || 37, 37),
    cvp: patientData.pvc, // Use user-defined PVC (Pressão Venosa Central)
    pcwp: patientData.poap, // Use user-defined POAP (Pressão de Oclusão da Artéria Pulmonar)
    cardiacOutput: baseVitals.cardiacOutput || 5.0,
    svr: patientData.rvs, // Use user-defined RVS (Resistência Vascular Sistêmica)
    pvr: patientData.rvp, // Use user-defined RVP (Resistência Vascular Pulmonar)
  };
  
  // Recalculate MAP with adjusted values
  vitals.map = calculateMAP(vitals.systolic, vitals.diastolic);
  
  // Apply comorbidity effects
  const vitalsWithComorbidities = applyComorbiditiesToVitals(vitals, patientData.conditions);
  
  return vitalsWithComorbidities;
}

// Initialize hemodynamic state
export function initializeHemodynamics(patientData: PatientData): HemodynamicState {
  let baseHemodynamics: Partial<HemodynamicState>;
  
  switch (patientData.shockType) {
    case 'Choque distributivo':
      baseHemodynamics = distributiveShock.initialHemodynamics;
      break;
    case 'Choque cardiogênico':
      baseHemodynamics = cardiogenicShock.initialHemodynamics;
      break;
    case 'Choque hipovolêmico':
      baseHemodynamics = hypovolemicShock.initialHemodynamics;
      break;
    case 'Choque obstrutivo':
      baseHemodynamics = obstructiveShock.initialHemodynamics;
      break;
    case 'Choque misto':
      baseHemodynamics = mixedShock.initialHemodynamics;
      break;
    default:
      baseHemodynamics = distributiveShock.initialHemodynamics;
  }
  
  // Apply randomization to create variation while maintaining shock characteristics
  baseHemodynamics = randomizeHemodynamics(baseHemodynamics, patientData.shockType);
  
  // Calculate preload from volemia status
  let preloadValue = baseHemodynamics.preload || 50;
  if (patientData.volemia === 'Desidratado') {
    preloadValue = 25; // Low preload
  } else if (patientData.volemia === 'Hipervolêmico') {
    preloadValue = 85; // High preload
  } else if (patientData.volemia === 'Normal') {
    preloadValue = 55; // Normal preload
  }
  
  return {
    preload: preloadValue,
    contractility: baseHemodynamics.contractility || 65,
    afterload: baseHemodynamics.afterload || 60,
    heartRate: baseHemodynamics.heartRate || 100,
    strokeVolume: patientData.ivs, // Use user-defined IVS (Índice de Volume Sistólico)
  };
}

// Apply comorbidity effects to hemodynamics
function applyComorbidityEffectsToHemodynamics(
  hemodynamics: HemodynamicState,
  conditions: string[]
): HemodynamicState {
  return applyComorbiditiesToHemodynamics(hemodynamics, conditions);
}

// Initialize lab values based on shock type
export function initializeLabs(patientData: PatientData): LabValues {
  let baseLabProfile: Partial<LabValues>;
  
  switch (patientData.shockType) {
    case 'Choque distributivo':
      baseLabProfile = distributiveShock.labProfile;
      break;
    case 'Choque cardiogênico':
      baseLabProfile = cardiogenicShock.labProfile;
      break;
    case 'Choque hipovolêmico':
      baseLabProfile = hypovolemicShock.labProfile;
      break;
    case 'Choque obstrutivo':
      baseLabProfile = obstructiveShock.labProfile;
      break;
    case 'Choque misto':
      baseLabProfile = mixedShock.labProfile;
      break;
    default:
      baseLabProfile = distributiveShock.labProfile;
  }
  
  // Apply randomization to create variation while maintaining diagnostic patterns
  baseLabProfile = randomizeLabValues(baseLabProfile, patientData.shockType);
  
  const labs: LabValues = {
    pH: baseLabProfile.pH || 7.35,
    pCO2: baseLabProfile.pCO2 || 40,
    pO2: baseLabProfile.pO2 || 80,
    hco3: baseLabProfile.hco3 || 24,
    lactate: baseLabProfile.lactate || 2.0,
    lastGasometryTime: 0,
    
    hemoglobin: baseLabProfile.hemoglobin || 12,
    hematocrit: baseLabProfile.hematocrit || 36,
    wbc: baseLabProfile.wbc || 10000,
    platelets: baseLabProfile.platelets || 200000,
    
    potassium: baseLabProfile.potassium || 4.0,
    sodium: baseLabProfile.sodium || 140,
    magnesium: baseLabProfile.magnesium || 1.9,
    chloride: baseLabProfile.chloride || 100,
    creatinine: baseLabProfile.creatinine || 1.0,
    urea: baseLabProfile.urea || 30,
    lastLabTime: 0,
    
    // Sepsis biomarkers (for distributive shock)
    procalcitoninLevel: patientData.shockType === 'Choque distributivo' ? 
      baseLabProfile.procalcitoninLevel || (Math.random() * 20 + 5) : undefined,
    crp: patientData.shockType === 'Choque distributivo' ? 
      baseLabProfile.crp || (Math.random() * 150 + 50) : undefined,
    initialLactate: baseLabProfile.lactate || 2.0,
  };
  
  // Apply comorbidity effects to labs
  const labsWithComorbidities = applyComorbiditiesToLabs(labs, patientData.conditions);
  
  return labsWithComorbidities;
}

// Update vitals based on current state, interventions, and time
export function updateVitals(
  currentState: SimulationState,
  patientData: PatientData,
  deltaTime: number // simulation minutes since last update
): VitalSigns {
  const { vitals, hemodynamics, activeInterventions, fluidBalance, ventilation } = currentState;
  
  // Start with current vitals
  let newVitals = { ...vitals };
  
  // Check for active interventions
  const hasVasopressors = activeInterventions.some(i => i.type === 'vasopressor' && i.isActive);
  const hasInotropes = activeInterventions.some(i => i.type === 'inotrope' && i.isActive);
  const hasFluids = activeInterventions.some(i => i.type === 'fluid' && i.isActive);
  
  // Apply shock-specific progression
  let shockProgression: Partial<VitalSigns> = {};
  
  // Get comorbidity deterioration rate modifier
  const deteriorationModifier = getDeteriorationRateModifier(patientData.conditions);
  
  switch (patientData.shockType) {
    case 'Choque distributivo':
      shockProgression = progressDistributiveShock(
        newVitals,
        currentState.simTimeElapsed * deteriorationModifier, // Accelerate/decelerate based on comorbidities
        hasVasopressors,
        hasFluids,
        currentState.distributiveShockState
      );
      break;
      
    case 'Choque cardiogênico':
      shockProgression = progressCardiogenicShock(
        newVitals,
        currentState.simTimeElapsed * deteriorationModifier,
        hasInotropes,
        hasVasopressors,
        fluidBalance.netBalance
      );
      break;
      
    case 'Choque hipovolêmico':
      shockProgression = progressHypovolemicShock(
        newVitals,
        currentState.simTimeElapsed * deteriorationModifier,
        hasFluids,
        fluidBalance.netBalance,
        false, // TODO: track ongoing blood loss
        200, // default ongoing loss rate mL/hr if active
        patientData.weight // patient weight in kg
      );
      break;
      
    case 'Choque obstrutivo':
      shockProgression = progressObstructiveShock(
        newVitals,
        currentState.simTimeElapsed * deteriorationModifier,
        false, // TODO: track if obstruction resolved
        hasVasopressors || hasFluids
      );
      break;
  }
  
  // Merge shock progression
  newVitals = { ...newVitals, ...shockProgression };
  
  // Apply ventilation hemodynamic effects (if intubated)
  if (ventilation.isIntubated) {
    const ventEffects = calculateVentilationHemodynamicEffects(
      ventilation,
      newVitals,
      hemodynamics,
      patientData.shockType
    );
    newVitals = { ...newVitals, ...ventEffects.vitals };
    // Hemodynamics will be updated in the component
  }
  
  // Apply baroreceptor compensation
  const compensation = baroreceptorCompensation(newVitals.map, newVitals.heartRate, newVitals.svr);
  newVitals.heartRate = Math.max(40, Math.min(180, newVitals.heartRate + compensation.hrAdjustment * (deltaTime / 60)));
  newVitals.svr = Math.max(300, Math.min(2500, newVitals.svr + compensation.svrAdjustment * (deltaTime / 60)));
  
  // Recalculate dependent values
  const strokeVolume = calculateStrokeVolume(newVitals.cardiacOutput, newVitals.heartRate);
  newVitals.map = calculateMAP(newVitals.systolic, newVitals.diastolic);
  
  // Calculate BP from CO and SVR (simplified model)
  const mapFromHemodynamics = (newVitals.cardiacOutput * newVitals.svr / PHYSIOLOGY.svrConversionFactor) + newVitals.cvp;
  newVitals.map = (newVitals.map + mapFromHemodynamics) / 2; // Blend calculated and progressed MAP
  
  // Derive systolic and diastolic from MAP (approximate)
  const pulsePressure = Math.max(20, strokeVolume * 0.8); // Approximation
  newVitals.systolic = newVitals.map + (pulsePressure * 2 / 3);
  newVitals.diastolic = newVitals.map - (pulsePressure / 3);
  
  return newVitals;
}

// Update lab values over time
export function updateLabs(
  currentLabs: LabValues,
  vitals: VitalSigns,
  deltaTime: number,
  shockType: string = ''
): LabValues {
  const newLabs = { ...currentLabs };
  
  // Lactate increases with poor perfusion (low MAP, low CO)
  const perfusionFactor = vitals.map < 65 ? 1.5 : vitals.map < 70 ? 1.1 : 0.9;
  const lactateDelta = (perfusionFactor - 1) * 0.3 * (deltaTime / 60); // Change per hour
  newLabs.lactate = Math.max(0.5, Math.min(15, newLabs.lactate + lactateDelta));
  
  // pH changes with lactate (metabolic acidosis)
  const acidosisDelta = -lactateDelta * 0.02;
  newLabs.pH = Math.max(6.9, Math.min(7.6, newLabs.pH + acidosisDelta));
  
  // HCO3 decreases with metabolic acidosis
  newLabs.hco3 = Math.max(8, Math.min(32, 24 + (newLabs.pH - 7.4) * 20));
  
  // pCO2 adjusts via respiratory compensation
  const compensatoryPCO2 = 40 - (newLabs.pH - 7.4) * 30;
  newLabs.pCO2 = Math.max(20, Math.min(60, compensatoryPCO2));
  
  // pO2 relates to SpO2
  newLabs.pO2 = vitals.spO2 < 90 ? 60 : vitals.spO2 < 95 ? 75 : 90;
  
  // Creatinine increases with poor renal perfusion
  const renalPerfusionFactor = vitals.map < 65 ? 1.3 : vitals.map < 70 ? 1.05 : 0.98;
  newLabs.creatinine = Math.max(0.5, Math.min(10, newLabs.creatinine * Math.pow(renalPerfusionFactor, deltaTime / 360))); // Slow change
  
  // Hypovolemic shock specific lab changes
  if (shockType === 'Choque hipovolêmico') {
    // BUN increases faster than creatinine in pre-renal AKI (BUN:Cr ratio >20:1)
    const bunIncrease = vitals.map < 65 ? 0.8 * (deltaTime / 60) : 0.2 * (deltaTime / 60);
    newLabs.urea = Math.max(10, Math.min(150, newLabs.urea + bunIncrease));
    
    // Hemoconcentration in early hemorrhage (before dilution)
    // Later: dilutional anemia from resuscitation
    // This is simplified - in reality depends on timing and fluid administration
  }
  
  return newLabs;
}

// Detect critical alerts
export function detectAlerts(vitals: VitalSigns): { criticalAlerts: string[]; warnings: string[] } {
  const criticalAlerts: string[] = [];
  const warnings: string[] = [];
  
  // Critical HR
  if (vitals.heartRate < NORMAL_RANGES.heartRate.critical_low) {
    criticalAlerts.push('BRADICARDIA CRÍTICA');
  } else if (vitals.heartRate > NORMAL_RANGES.heartRate.critical_high) {
    criticalAlerts.push('TAQUICARDIA CRÍTICA');
  }
  
  // Critical BP
  if (vitals.systolic < NORMAL_RANGES.systolic.critical_low) {
    criticalAlerts.push('HIPOTENSÃO SEVERA');
  }
  if (vitals.map < NORMAL_RANGES.map.critical_low) {
    criticalAlerts.push('PAM CRÍTICA');
  }
  
  // Critical SpO2
  if (vitals.spO2 < NORMAL_RANGES.spO2.critical_low) {
    criticalAlerts.push('HIPOXEMIA CRÍTICA');
  }
  
  // Critical temperature
  if (vitals.temperature < NORMAL_RANGES.temperature.critical_low) {
    criticalAlerts.push('HIPOTERMIA');
  } else if (vitals.temperature > NORMAL_RANGES.temperature.critical_high) {
    criticalAlerts.push('HIPERTERMIA SEVERA');
  }
  
  // Warnings
  if (vitals.heartRate < NORMAL_RANGES.heartRate.min || vitals.heartRate > NORMAL_RANGES.heartRate.max) {
    warnings.push('Frequência cardíaca anormal');
  }
  if (vitals.spO2 < NORMAL_RANGES.spO2.min) {
    warnings.push('Saturação de O2 baixa');
  }
  if (vitals.map < NORMAL_RANGES.map.min) {
    warnings.push('PAM abaixo do alvo');
  }
  
  return { criticalAlerts, warnings };
}
