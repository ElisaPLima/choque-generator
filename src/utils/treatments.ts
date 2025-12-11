// Treatment Effects Module
// Models pharmacodynamic and fluid therapy responses

import { VitalSigns, HemodynamicState, ActiveIntervention, FluidBalance } from './types';
import { DRUG_DOSES, FLUID_VOLUMES, PHYSIOLOGY } from './constants';
import { distributiveFluidResponse, distributiveVasopressorResponse } from './shocks/distributive';
import { cardiogenicInotropeResponse, cardiogenicFluidRisk, calculateSCAIStage } from './shocks/cardiogenic';
import { hypovolemicFluidResponse, assessFluidResponsiveness } from './shocks/hypovolemic';

// Apply fluid bolus effects
export function applyFluidBolus(
  vitals: VitalSigns,
  hemodynamics: HemodynamicState,
  shockType: string,
  fluidType: 'crystalloid' | 'colloid' | 'blood',
  volumeMl: number,
  patientWeight: number
): { vitals: Partial<VitalSigns>; hemodynamics: Partial<HemodynamicState>; fluidAdded: number } {
  
  const newVitals: Partial<VitalSigns> = {};
  const newHemodynamics: Partial<HemodynamicState> = {};
  
  // Different shock types respond differently to fluids
  switch (shockType) {
    case 'Choque hipovolêmico':
      // Hypovolemic shock: best response
      const hypoResponse = hypovolemicFluidResponse(
        vitals.cardiacOutput,
        vitals.cvp,
        hemodynamics.strokeVolume,
        volumeMl,
        vitals.map,
        vitals.heartRate
      );
      newVitals.cardiacOutput = hypoResponse.co;
      newVitals.cvp = hypoResponse.cvp;
      newVitals.map = hypoResponse.map;
      newVitals.heartRate = hypoResponse.hr;
      newVitals.svr = Math.max(800, vitals.svr + hypoResponse.svr); // Apply SVR delta
      newHemodynamics.strokeVolume = hypoResponse.sv;
      newHemodynamics.preload = Math.min(85, hemodynamics.preload + (volumeMl / 500) * 15);
      break;
      
    case 'Choque distributivo':
      // Distributive shock: moderate response, large volumes may be needed
      const distResponse = distributiveFluidResponse(
        vitals.cardiacOutput,
        vitals.cvp,
        vitals.svr,
        volumeMl
      );
      newVitals.cardiacOutput = distResponse.co;
      newVitals.svr = distResponse.svr;
      newVitals.map = vitals.map + distResponse.map;
      newVitals.cvp = Math.min(12, vitals.cvp + (volumeMl / 500) * 1.5);
      newHemodynamics.preload = Math.min(75, hemodynamics.preload + distResponse.preload);
      break;
      
    case 'Choque cardiogênico':
      // Cardiogenic shock: poor/dangerous response
      // Calculate BSA for cardiac index
      const bsa = Math.sqrt((patientWeight * 170) / 3600); // Mosteller formula approximation
      const ci = vitals.cardiacOutput / bsa;
      const pcwp = vitals.cvp * 1.5; // Estimate PCWP from CVP (rough approximation)
      
      const cardioRisk = cardiogenicFluidRisk(
        vitals.cvp,
        pcwp,
        vitals.spO2,
        ci,
        volumeMl,
        bsa
      );
      
      newVitals.cvp = Math.min(25, vitals.cvp + cardioRisk.cvpIncrease);
      newVitals.cardiacOutput = Math.max(1.5, vitals.cardiacOutput + cardioRisk.coChange);
      
      // Risk of pulmonary edema
      if (cardioRisk.pulmonaryEdemaRisk > 0.5) {
        newVitals.spO2 = Math.max(75, vitals.spO2 - 5); // Worsening hypoxia
        newVitals.respiratoryRate = Math.min(35, vitals.respiratoryRate + 4);
      }
      
      // Log warning if high risk
      if (cardioRisk.fluidTolerance === 'contraindicated' || cardioRisk.fluidTolerance === 'high_risk') {
        console.warn(`FLUID WARNING: ${cardioRisk.recommendation}`);
      }
      break;
      
    case 'Choque obstrutivo':
      // Obstructive shock: minimal response
      newVitals.cvp = Math.min(22, vitals.cvp + (volumeMl / 500) * 2);
      newVitals.cardiacOutput = vitals.cardiacOutput + (volumeMl / 1000) * 0.03; // Very minimal
      break;
  }
  
  // Colloids are more effective volume expanders
  if (fluidType === 'colloid') {
    if (newVitals.cardiacOutput) {
      newVitals.cardiacOutput *= 1.2; // 20% more effective
    }
  }
  
  // Blood products improve oxygen carrying capacity
  if (fluidType === 'blood') {
    newVitals.spO2 = Math.min(100, vitals.spO2 + 2);
    // Each unit ~300mL improves hemoglobin by ~1 g/dL
  }
  
  return {
    vitals: newVitals,
    hemodynamics: newHemodynamics,
    fluidAdded: volumeMl,
  };
}

// Apply vasopressor effects (norepinephrine, vasopressin, epinephrine)
export function applyVasopressor(
  vitals: VitalSigns,
  hemodynamics: HemodynamicState,
  shockType: string,
  drug: 'norepinephrine' | 'vasopressin' | 'epinephrine',
  doseMcgKgMin: number
): { vitals: Partial<VitalSigns>; hemodynamics: Partial<HemodynamicState> } {
  
  const newVitals: Partial<VitalSigns> = {};
  const newHemodynamics: Partial<HemodynamicState> = {};
  
  switch (drug) {
    case 'norepinephrine':
      // Alpha-1 (vasoconstriction) >> Beta-1 (inotropy)
      // Very effective in distributive shock
      if (shockType === 'Choque distributivo') {
        const response = distributiveVasopressorResponse(
          vitals.svr, 
          vitals.map, 
          vitals.cardiacOutput,
          doseMcgKgMin,
          'norepinephrine'
        );
        newVitals.svr = response.svr;
        newVitals.map = response.map;
        newVitals.cardiacOutput = response.co;
        newVitals.heartRate = vitals.heartRate + response.hr;
      } else {
        // General alpha effect
        newVitals.svr = Math.min(2000, vitals.svr + doseMcgKgMin * 150);
        newVitals.map = Math.min(110, vitals.map + doseMcgKgMin * 10);
      }
      
      // Recalculate BP from MAP
      const pulsePressure = vitals.systolic - vitals.diastolic;
      newVitals.systolic = (newVitals.map || vitals.map) + (pulsePressure * 2 / 3);
      newVitals.diastolic = (newVitals.map || vitals.map) - (pulsePressure / 3);
      
      newHemodynamics.afterload = Math.min(100, hemodynamics.afterload + doseMcgKgMin * 8);
      break;
      
    case 'vasopressin':
      // Pure vasoconstriction (V1 receptors)
      // Dose typically 0.01-0.04 units/min (not weight-based)
      const vasopressinUnits = doseMcgKgMin; // Reuse parameter for units
      newVitals.svr = Math.min(2200, vitals.svr + vasopressinUnits * 3000);
      newVitals.map = Math.min(115, vitals.map + vasopressinUnits * 250);
      newHemodynamics.afterload = Math.min(100, hemodynamics.afterload + vasopressinUnits * 600);
      break;
      
    case 'epinephrine':
      // Alpha + Beta effects (vasoconstriction + inotropy + chronotropy)
      newVitals.svr = Math.min(2000, vitals.svr + doseMcgKgMin * 120);
      newVitals.map = Math.min(120, vitals.map + doseMcgKgMin * 12);
      newVitals.heartRate = Math.min(160, vitals.heartRate + doseMcgKgMin * 15); // Significant HR increase
      newVitals.cardiacOutput = Math.min(9, vitals.cardiacOutput + doseMcgKgMin * 0.5); // Inotropic effect
      newHemodynamics.contractility = Math.min(100, hemodynamics.contractility + doseMcgKgMin * 8);
      break;
  }
  
  return { vitals: newVitals, hemodynamics: newHemodynamics };
}

// Apply inotrope effects (dobutamine, milrinone, etc.)
export function applyInotrope(
  vitals: VitalSigns,
  hemodynamics: HemodynamicState,
  shockType: string,
  drug: 'dobutamine' | 'milrinone' | 'epinephrine' | 'dopamine',
  doseMcgKgMin: number
): { vitals: Partial<VitalSigns>; hemodynamics: Partial<HemodynamicState> } {
  
  const newVitals: Partial<VitalSigns> = {};
  const newHemodynamics: Partial<HemodynamicState> = {};
  
  // Estimate LVEF from contractility (rough approximation)
  const estimatedLVEF = hemodynamics.contractility * 0.6; // Scale to 0-60%
  
  if (shockType === 'Choque cardiogênico') {
    const response = cardiogenicInotropeResponse(
      vitals.cardiacOutput,
      hemodynamics.strokeVolume,
      vitals.svr,
      estimatedLVEF,
      drug,
      doseMcgKgMin
    );
    newVitals.cardiacOutput = response.co;
    newVitals.heartRate = response.hr;
    newVitals.svr = response.svr;
    newHemodynamics.strokeVolume = response.sv;
    newHemodynamics.contractility = (response.lvef / 0.6); // Convert back to 0-100 scale
  } else {
    // General inotropic effect for other shock types
    switch (drug) {
      case 'dobutamine':
        newVitals.cardiacOutput = Math.min(10, vitals.cardiacOutput + doseMcgKgMin * 0.12);
        newVitals.heartRate = Math.min(150, vitals.heartRate + doseMcgKgMin * 3);
        newVitals.svr = Math.max(600, vitals.svr - doseMcgKgMin * 20);
        newHemodynamics.strokeVolume = Math.min(100, hemodynamics.strokeVolume + doseMcgKgMin * 2);
        newHemodynamics.contractility = Math.min(95, hemodynamics.contractility + doseMcgKgMin * 4);
        break;
        
      case 'milrinone':
        newVitals.cardiacOutput = Math.min(10, vitals.cardiacOutput + doseMcgKgMin * 0.18);
        newVitals.heartRate = Math.min(150, vitals.heartRate + doseMcgKgMin * 1.5);
        newVitals.svr = Math.max(500, vitals.svr - doseMcgKgMin * 80);
        newHemodynamics.strokeVolume = Math.min(100, hemodynamics.strokeVolume + doseMcgKgMin * 3);
        newHemodynamics.contractility = Math.min(95, hemodynamics.contractility + doseMcgKgMin * 6);
        break;
        
      case 'epinephrine':
        if (doseMcgKgMin < 0.05) {
          newVitals.cardiacOutput = Math.min(10, vitals.cardiacOutput + doseMcgKgMin * 0.25);
          newVitals.heartRate = Math.min(160, vitals.heartRate + doseMcgKgMin * 25);
          newVitals.svr = Math.max(600, vitals.svr - doseMcgKgMin * 30);
        } else {
          newVitals.cardiacOutput = Math.min(10, vitals.cardiacOutput + doseMcgKgMin * 0.20);
          newVitals.heartRate = Math.min(160, vitals.heartRate + doseMcgKgMin * 20);
          newVitals.svr = Math.min(2200, vitals.svr + doseMcgKgMin * 150);
        }
        newHemodynamics.contractility = Math.min(95, hemodynamics.contractility + doseMcgKgMin * 10);
        break;
        
      case 'dopamine':
        if (doseMcgKgMin < 5) {
          newVitals.cardiacOutput = Math.min(10, vitals.cardiacOutput + doseMcgKgMin * 0.03);
          newVitals.svr = Math.max(700, vitals.svr - doseMcgKgMin * 10);
        } else if (doseMcgKgMin < 10) {
          newVitals.cardiacOutput = Math.min(10, vitals.cardiacOutput + doseMcgKgMin * 0.06);
          newHemodynamics.contractility = Math.min(95, hemodynamics.contractility + doseMcgKgMin * 3);
        } else {
          newVitals.cardiacOutput = Math.min(10, vitals.cardiacOutput + doseMcgKgMin * 0.05);
          newVitals.svr = Math.min(2000, vitals.svr + doseMcgKgMin * 50);
        }
        newVitals.heartRate = Math.min(150, vitals.heartRate + doseMcgKgMin * 2);
        break;
    }
  }
  
  // Improved CO leads to better MAP (if contractility was the issue)
  const mapImprovement = ((newVitals.cardiacOutput || vitals.cardiacOutput) - vitals.cardiacOutput) * 8;
  newVitals.map = Math.min(105, vitals.map + mapImprovement);
  
  return { vitals: newVitals, hemodynamics: newHemodynamics };
}

// Calculate cumulative effect of all active interventions
export function calculateTreatmentEffects(
  vitals: VitalSigns,
  hemodynamics: HemodynamicState,
  activeInterventions: ActiveIntervention[],
  shockType: string,
  patientWeight: number,
  currentTime: number
): { vitals: Partial<VitalSigns>; hemodynamics: Partial<HemodynamicState> } {
  
  let cumulativeVitals: Partial<VitalSigns> = {};
  let cumulativeHemodynamics: Partial<HemodynamicState> = {};
  
  // Process each active intervention
  for (const intervention of activeInterventions) {
    if (!intervention.isActive) continue;
    
    const timeSinceStart = currentTime - intervention.startTime;
    
    // Skip if not yet started or expired
    if (timeSinceStart < 0) continue;
    if (intervention.duration && timeSinceStart > intervention.duration) {
      intervention.isActive = false;
      continue;
    }
    
    // Apply intervention based on type
    switch (intervention.type) {
      case 'vasopressor':
        const vasopressorEffect = applyVasopressor(
          { ...vitals, ...cumulativeVitals },
          { ...hemodynamics, ...cumulativeHemodynamics },
          shockType,
          intervention.name.toLowerCase().includes('noradrenalina') ? 'norepinephrine' :
          intervention.name.toLowerCase().includes('vasopressina') ? 'vasopressin' :
          'epinephrine',
          intervention.dose || 0.1
        );
        cumulativeVitals = { ...cumulativeVitals, ...vasopressorEffect.vitals };
        cumulativeHemodynamics = { ...cumulativeHemodynamics, ...vasopressorEffect.hemodynamics };
        break;
        
      case 'inotrope':
        const inotropeEffect = applyInotrope(
          { ...vitals, ...cumulativeVitals },
          { ...hemodynamics, ...cumulativeHemodynamics },
          shockType,
          intervention.name.toLowerCase().includes('dobutamina') ? 'dobutamine' :
          intervention.name.toLowerCase().includes('milrinone') ? 'milrinone' :
          intervention.name.toLowerCase().includes('epinefrina') ? 'epinephrine' :
          intervention.name.toLowerCase().includes('dopamina') ? 'dopamine' :
          'dobutamine',
          intervention.dose || 5
        );
        cumulativeVitals = { ...cumulativeVitals, ...inotropeEffect.vitals };
        cumulativeHemodynamics = { ...cumulativeHemodynamics, ...inotropeEffect.hemodynamics };
        break;
    }
  }
  
  return {
    vitals: cumulativeVitals,
    hemodynamics: cumulativeHemodynamics,
  };
}

// Update fluid balance tracking
export function updateFluidBalance(
  currentBalance: FluidBalance,
  patientWeight: number,
  deltaTime: number // simulation minutes
): FluidBalance {
  const newBalance = { ...currentBalance };
  
  // Calculate insensible losses (0.5 mL/kg/hour)
  const insensibleLossPerHour = patientWeight * PHYSIOLOGY.insensibleLossRate;
  const insensibleLossThisInterval = insensibleLossPerHour * (deltaTime / 60);
  
  newBalance.insensibleLoss += insensibleLossThisInterval;
  newBalance.totalOutput += insensibleLossThisInterval;
  
  // Recalculate net balance
  newBalance.netBalance = newBalance.totalInput - newBalance.totalOutput;
  
  return newBalance;
}

// Add fluid to balance tracking
export function addFluidToBalance(
  currentBalance: FluidBalance,
  fluidType: 'crystalloid' | 'colloid' | 'blood',
  volumeMl: number
): FluidBalance {
  const newBalance = { ...currentBalance };
  
  newBalance.totalInput += volumeMl;
  
  switch (fluidType) {
    case 'crystalloid':
      newBalance.crystalloids += volumeMl;
      break;
    case 'colloid':
      newBalance.colloids += volumeMl;
      break;
    case 'blood':
      newBalance.blood += volumeMl;
      break;
  }
  
  newBalance.netBalance = newBalance.totalInput - newBalance.totalOutput;
  
  return newBalance;
}

// Add urine output
export function addUrineOutput(
  currentBalance: FluidBalance,
  volumeMl: number
): FluidBalance {
  const newBalance = { ...currentBalance };
  
  newBalance.urine += volumeMl;
  newBalance.totalOutput += volumeMl;
  newBalance.netBalance = newBalance.totalInput - newBalance.totalOutput;
  
  return newBalance;
}

// Estimate urine output based on renal perfusion
export function estimateUrineOutput(
  map: number,
  cardiacOutput: number,
  patientWeight: number,
  deltaTime: number // simulation minutes
): number {
  // Normal urine output: 0.5-1 mL/kg/hour
  // Reduced with poor renal perfusion (MAP < 65, low CO)
  
  let urineRate = 0.75; // mL/kg/hour baseline
  
  if (map < 55) {
    urineRate *= 0.2; // Severe oliguria
  } else if (map < 65) {
    urineRate *= 0.5; // Oliguria
  }
  
  if (cardiacOutput < 3.5) {
    urineRate *= 0.6;
  }
  
  const urineThisInterval = urineRate * patientWeight * (deltaTime / 60);
  return urineThisInterval;
}
