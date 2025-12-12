// Mechanical Ventilation Management Module
// Models physiological effects of positive pressure ventilation on hemodynamics

import { VitalSigns, HemodynamicState, VentilationSettings } from './types';

/**
 * Initialize default ventilation settings for spontaneous breathing
 */
export function initializeVentilation(): VentilationSettings {
  return {
    isIntubated: false,
    mode: null,
    tidalVolume: 0,
    respiratoryRate: 0,
    peep: 0,
    fio2: 0.21, // Room air
    plateauPressure: 0,
    peakPressure: 0,
  };
}

/**
 * Perform intubation and initialize mechanical ventilation
 * Default: Lung-protective ventilation strategy
 */
export function performIntubation(
  patientWeight: number,
  currentVentilation: VentilationSettings,
  currentVitals: VitalSigns
): VentilationSettings {
  // Lung-protective ventilation: 6-8 mL/kg IBW (Ideal Body Weight)
  const idealBodyWeight = patientWeight * 0.9; // Simplified IBW estimation
  const targetTidalVolume = Math.round(idealBodyWeight * 6.5); // 6.5 mL/kg IBW
  
  // Initial settings based on patient's current respiratory status
  let initialRR = 12;
  let initialPEEP = 5;
  let initialFiO2 = 0.40;
  
  // Adjust based on current SpO2
  if (currentVitals.spO2 < 88) {
    initialFiO2 = 1.0; // 100% O2 for severe hypoxemia
    initialPEEP = 8;
  } else if (currentVitals.spO2 < 92) {
    initialFiO2 = 0.60;
    initialPEEP = 8;
  }
  
  // Adjust RR based on acidosis (respiratory compensation)
  if (currentVitals.respiratoryRate > 25) {
    initialRR = 16; // Higher RR for metabolic acidosis
  }
  
  return {
    ...currentVentilation,
    isIntubated: true,
    mode: 'VCV', // Volume Control Ventilation - most common initial mode
    tidalVolume: targetTidalVolume,
    respiratoryRate: initialRR,
    peep: initialPEEP,
    fio2: initialFiO2,
    plateauPressure: 20, // Initial estimate
    peakPressure: 25, // Initial estimate
  };
}

/**
 * Calculate hemodynamic effects of positive pressure ventilation
 * 
 * KEY PHYSIOLOGICAL EFFECTS:
 * 1. ↑ Intrathoracic Pressure → ↓ Venous Return → ↓ Preload → ↓ Cardiac Output
 * 2. ↑ PEEP → ↑ RV Afterload → ↓ RV Output → ↓ LV Preload → ↓ Cardiac Output
 * 3. ↑ Lung Volume → Compression of pulmonary capillaries → ↑ PVR → ↓ RV Function
 * 4. In hypovolemic patients: Severe CO reduction (less preload reserve)
 * 5. In hypervolemic/CHF: May improve CO (↓ LV afterload, ↓ work of breathing)
 */
export function calculateVentilationHemodynamicEffects(
  ventilation: VentilationSettings,
  vitals: VitalSigns,
  hemodynamics: HemodynamicState,
  shockType: string
): { vitals: Partial<VitalSigns>; hemodynamics: Partial<HemodynamicState> } {
  
  if (!ventilation.isIntubated) {
    return { vitals: {}, hemodynamics: {} };
  }
  
  const newVitals: Partial<VitalSigns> = {};
  const newHemodynamics: Partial<HemodynamicState> = {};
  
  // Calculate mean airway pressure (simplified)
  // Paw_mean ≈ PEEP + (PIP - PEEP) × (Ti / Ttot)
  // Assuming I:E ratio of 1:2 → Ti/Ttot ≈ 0.33
  const peakPressure = ventilation.peakPressure || estimatePeakPressure(ventilation);
  const meanAirwayPressure = ventilation.peep + (peakPressure - ventilation.peep) * 0.33;
  
  // 1. PRELOAD REDUCTION (proportional to mean airway pressure)
  // Normal CVP: 5-8 mmHg. Each 5 cmH2O increase in Paw ≈ 3-4 mmHg increase in measured CVP
  // But TRUE preload (transmural pressure) DECREASES
  const intrathoracicPressureEffect = meanAirwayPressure / 7.5; // Convert cmH2O to mmHg approximation
  
  // Preload reduction: Higher airway pressure → Lower venous return
  const preloadReduction = (meanAirwayPressure / 20) * 15; // Up to -15 points with high pressures
  newHemodynamics.preload = Math.max(10, hemodynamics.preload - preloadReduction);
  
  // CVP appears higher (intrathoracic pressure transmitted to vessels)
  // But this doesn't mean better filling - it's artifactual!
  const apparentCVPIncrease = intrathoracicPressureEffect * 0.5;
  newVitals.cvp = Math.min(20, vitals.cvp + apparentCVPIncrease);
  
  // 2. CARDIAC OUTPUT REDUCTION
  // CO reduction depends on:
  // - Mean airway pressure (higher = more reduction)
  // - Patient's volume status (hypovolemic = worse effect)
  // - Lung compliance (stiff lungs transmit less pressure to mediastinum)
  
  let coReductionPercent = 0;
  
  if (shockType === 'Choque hipovolêmico') {
    // HYPOVOLEMIC: WORST case - no preload reserve
    // CO can drop 25-40% with initiation of PPV
    coReductionPercent = 0.15 + (meanAirwayPressure / 20) * 0.25; // 15-40% reduction
  } else if (shockType === 'Choque cardiogênico') {
    // CARDIOGENIC: Variable effect
    // If fluid overloaded: May improve (↓ afterload, ↓ work of breathing)
    // If not overloaded: Worsen (↓ preload)
    if (vitals.cvp > 12 || hemodynamics.preload > 70) {
      // Overloaded: NET BENEFIT from PPV
      coReductionPercent = -0.05; // Actually improves CO by 5%
    } else {
      // Not overloaded: Harmful
      coReductionPercent = 0.10 + (meanAirwayPressure / 20) * 0.15; // 10-25% reduction
    }
  } else if (shockType === 'Choque distributivo') {
    // DISTRIBUTIVE: Moderate effect (usually adequate filling)
    coReductionPercent = 0.05 + (meanAirwayPressure / 20) * 0.15; // 5-20% reduction
  } else if (shockType === 'Choque obstrutivo') {
    // OBSTRUCTIVE: Can be CATASTROPHIC
    // Especially with tamponade, PE, or tension pneumo
    coReductionPercent = 0.20 + (meanAirwayPressure / 20) * 0.30; // 20-50% reduction
  } else {
    // Default
    coReductionPercent = 0.10 + (meanAirwayPressure / 20) * 0.20; // 10-30% reduction
  }
  
  const coChange = vitals.cardiacOutput * coReductionPercent;
  newVitals.cardiacOutput = Math.max(1.5, vitals.cardiacOutput - coChange);
  
  // 3. BLOOD PRESSURE EFFECTS
  // MAP = CO × SVR (simplified)
  // CO ↓ → MAP ↓ (if SVR doesn't compensate)
  
  // Baroreceptor response: Body tries to maintain MAP by increasing SVR
  const compensatorySVRIncrease = coChange * 100; // Proportional compensation
  newVitals.svr = Math.min(2500, vitals.svr + compensatorySVRIncrease);
  
  // Net MAP change depends on balance
  const mapChange = -coChange * 8; // Negative impact, partially compensated by SVR
  newVitals.map = Math.max(40, vitals.map + mapChange);
  
  // Recalculate systolic/diastolic from new MAP
  const currentPulsePressure = vitals.systolic - vitals.diastolic;
  const newPulsePressure = Math.max(20, currentPulsePressure * (newVitals.cardiacOutput! / vitals.cardiacOutput));
  newVitals.systolic = newVitals.map! + (newPulsePressure * 2 / 3);
  newVitals.diastolic = newVitals.map! - (newPulsePressure / 3);
  
  // 4. HEART RATE RESPONSE
  // Reflex tachycardia to maintain CO (CO = HR × SV)
  // Since SV decreases, HR tries to compensate
  if (coReductionPercent > 0.10) {
    const reflexTachycardia = coReductionPercent * 30; // Up to +30 bpm
    newVitals.heartRate = Math.min(160, vitals.heartRate + reflexTachycardia);
  }
  
  // 5. OXYGENATION IMPROVEMENT
  // This is the BENEFIT of mechanical ventilation!
  const fio2Effect = (ventilation.fio2 - 0.21) * 20; // Up to +16 points with 100% O2
  const peepEffect = Math.min(10, ventilation.peep / 2); // PEEP recruits alveoli
  
  newVitals.spO2 = Math.min(100, vitals.spO2 + fio2Effect + peepEffect);
  
  // Update pO2 based on new SpO2
  // Rough conversion: SpO2 90% ≈ pO2 60, SpO2 95% ≈ pO2 80, SpO2 100% ≈ pO2 >100
  
  // 6. VENTILATION EFFECTS ON CO2 (affects pH)
  // Minute Ventilation = TV × RR
  const minuteVentilation = (ventilation.tidalVolume / 1000) * ventilation.respiratoryRate; // L/min
  // Normal MV: 5-8 L/min
  // Higher MV → Lower pCO2 → Higher pH (respiratory alkalosis)
  
  // 7. PULMONARY VASCULAR RESISTANCE
  // Excessive PEEP or high tidal volumes → ↑ PVR → RV strain
  if (ventilation.peep > 10 || ventilation.tidalVolume > 500) {
    const pvrIncrease = ((ventilation.peep - 10) * 20) + ((ventilation.tidalVolume - 500) / 10);
    newVitals.pvr = Math.min(500, (vitals.pvr || 100) + Math.max(0, pvrIncrease));
  }
  
  return { vitals: newVitals, hemodynamics: newHemodynamics };
}

/**
 * Estimate peak inspiratory pressure based on ventilator settings
 * PIP = Compliance^-1 × TV + Resistance × Flow + PEEP
 */
function estimatePeakPressure(ventilation: VentilationSettings): number {
  // Simplified model
  // Assume normal compliance ~50 mL/cmH2O
  // Assume normal resistance ~5 cmH2O/L/s
  
  const compliance = 50; // mL/cmH2O
  const resistance = 5; // cmH2O/L/s
  const flow = 40; // L/min typical inspiratory flow
  
  const drivingPressure = ventilation.tidalVolume / compliance;
  const resistivePressure = (resistance * flow) / 60;
  
  return Math.round(drivingPressure + resistivePressure + ventilation.peep);
}

/**
 * Estimate plateau pressure (end-inspiratory hold)
 * Pplat = TV / Compliance + PEEP
 * Target: <30 cmH2O for lung protection
 */
export function estimatePlateauPressure(ventilation: VentilationSettings): number {
  const compliance = 50; // mL/cmH2O - assumes normal-ish lungs
  const drivingPressure = ventilation.tidalVolume / compliance;
  return Math.round(drivingPressure + ventilation.peep);
}

/**
 * Update ventilation settings (user adjusts vent parameters)
 */
export function updateVentilationSettings(
  current: VentilationSettings,
  changes: Partial<VentilationSettings>
): VentilationSettings {
  const updated = { ...current, ...changes };
  
  // Recalculate pressures when settings change
  updated.peakPressure = estimatePeakPressure(updated);
  updated.plateauPressure = estimatePlateauPressure(updated);
  
  return updated;
}

/**
 * Calculate driving pressure (Pplat - PEEP)
 * Target: <15 cmH2O for lung protection
 */
export function calculateDrivingPressure(ventilation: VentilationSettings): number {
  return (ventilation.plateauPressure || 0) - ventilation.peep;
}

/**
 * Check for ventilator-associated complications
 */
export function checkVentilatorComplications(
  ventilation: VentilationSettings,
  vitals: VitalSigns,
  patientWeight: number
): string[] {
  const warnings: string[] = [];
  
  if (!ventilation.isIntubated) return warnings;
  
  // 1. Barotrauma risk (high pressures)
  const plateauPressure = ventilation.plateauPressure || 0;
  if (plateauPressure > 30) {
    warnings.push('⚠️ RISCO DE BAROTRAUMA: Pressão de Platô >30 cmH2O');
  }
  
  const peakPressure = ventilation.peakPressure || 0;
  if (peakPressure > 40) {
    warnings.push('⚠️ PRESSÃO DE PICO MUITO ALTA: Risco de pneumotórax');
  }
  
  // 2. Volutrauma risk (excessive tidal volume)
  const idealBodyWeight = patientWeight * 0.9;
  const tvPerKg = ventilation.tidalVolume / idealBodyWeight;
  if (tvPerKg > 8) {
    warnings.push('⚠️ RISCO DE VOLUTRAUMA: Volume corrente >8 mL/kg');
  }
  
  // 3. Driving pressure risk
  const drivingPressure = calculateDrivingPressure(ventilation);
  if (drivingPressure > 15) {
    warnings.push('⚠️ DRIVING PRESSURE ELEVADA: Risco de lesão pulmonar');
  }
  
  // 4. Hemodynamic instability from excessive PEEP
  if (ventilation.peep > 12 && vitals.map < 65) {
    warnings.push('⚠️ PEEP ALTA com HIPOTENSÃO: Considerar reduzir PEEP');
  }
  
  // 5. Auto-PEEP risk (high RR with short expiratory time)
  if (ventilation.respiratoryRate > 20 && ventilation.peep > 8) {
    warnings.push('⚠️ RISCO DE AUTO-PEEP: FR alta + PEEP alta');
  }
  
  return warnings;
}

/**
 * Perform extubation (if patient meets criteria)
 */
export function performExtubation(
  ventilation: VentilationSettings,
  vitals: VitalSigns
): { success: boolean; ventilation: VentilationSettings; message: string } {
  
  // Check extubation criteria
  const canExtubate = 
    vitals.spO2 >= 92 &&
    vitals.respiratoryRate < 30 &&
    vitals.map >= 65 &&
    ventilation.fio2 <= 0.4 &&
    ventilation.peep <= 8;
  
  if (!canExtubate) {
    return {
      success: false,
      ventilation: ventilation,
      message: 'Paciente não preenche critérios para extubação'
    };
  }
  
  return {
    success: true,
    ventilation: {
      ...initializeVentilation(),
      fio2: 0.30, // Supplemental O2 via mask post-extubation
    },
    message: 'Extubação realizada com sucesso'
  };
}
