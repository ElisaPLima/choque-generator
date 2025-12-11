// Randomization Utility for Shock Simulations
// Adds controlled variation to shock presentations while maintaining medical accuracy
// Ensures same user can practice same shock type multiple times with different presentations

/**
 * Generate controlled random variation within clinically acceptable ranges
 * @param baseValue - The baseline value from shock profile
 * @param variationPercent - Percentage of variation (e.g., 0.1 = ±10%)
 * @param seed - Optional seed for reproducibility in testing
 */
export function randomizeValue(
  baseValue: number,
  variationPercent: number = 0.08, // Default ±8% variation
  seed?: number
): number {
  const random = seed !== undefined ? seededRandom(seed) : Math.random();
  const variation = baseValue * variationPercent;
  const randomVariation = (random - 0.5) * 2 * variation; // -variation to +variation
  return baseValue + randomVariation;
}

/**
 * Seeded random number generator for reproducible randomization (testing purposes)
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Randomization profiles for different parameters
 * Defines acceptable variation ranges that maintain clinical validity
 */
export const RANDOMIZATION_PROFILES = {
  // Vital signs - can vary more without changing diagnosis
  vitalSigns: {
    heartRate: 0.12,        // ±12% (e.g., 118 → 104-132 bpm)
    systolic: 0.10,         // ±10% (maintains hypotension character)
    diastolic: 0.10,        // ±10%
    spO2: 0.05,             // ±5% (smaller range to stay clinically meaningful)
    respiratoryRate: 0.15,  // ±15% (wide normal variation)
    temperature: 0.02,      // ±2% (small changes clinically significant)
    cvp: 0.20,              // ±20% (can vary more while staying "low" or "high")
    cardiacOutput: 0.15,    // ±15%
    svr: 0.12,              // ±12%
  },
  
  // Hemodynamics - moderate variation
  hemodynamics: {
    preload: 0.15,          // ±15%
    contractility: 0.10,    // ±10%
    afterload: 0.12,        // ±12%
    strokeVolume: 0.15,     // ±15%
  },
  
  // Labs - smaller variation to maintain diagnostic patterns
  labs: {
    pH: 0.03,               // ±3% (small changes very significant)
    pCO2: 0.12,             // ±12%
    pO2: 0.15,              // ±15%
    hco3: 0.15,             // ±15%
    lactate: 0.20,          // ±20% (can vary more)
    hemoglobin: 0.15,       // ±15%
    hematocrit: 0.15,       // ±15%
    wbc: 0.25,              // ±25% (wide normal variation)
    platelets: 0.20,        // ±20%
    potassium: 0.08,        // ±8% (narrow therapeutic range)
    sodium: 0.04,           // ±4% (narrow normal range)
    magnesium: 0.12,        // ±12%
    chloride: 0.06,         // ±6%
    creatinine: 0.20,       // ±20%
    urea: 0.25,             // ±25%
  },
  
  // Progression parameters - minimal variation
  progression: {
    degradationRate: 0.08,        // ±8%
    compensationCapacity: 0.08,   // ±8%
  },
};

/**
 * Apply randomization to vital signs while maintaining shock type characteristics
 */
export function randomizeVitalSigns(
  baseVitals: Partial<{
    heartRate: number;
    systolic: number;
    diastolic: number;
    spO2: number;
    respiratoryRate: number;
    temperature: number;
    cvp: number;
    cardiacOutput: number;
    svr: number;
  }>,
  shockType: string
): typeof baseVitals {
  const profile = RANDOMIZATION_PROFILES.vitalSigns;
  
  const randomized = {
    heartRate: baseVitals.heartRate 
      ? randomizeValue(baseVitals.heartRate, profile.heartRate) 
      : undefined,
    systolic: baseVitals.systolic 
      ? randomizeValue(baseVitals.systolic, profile.systolic) 
      : undefined,
    diastolic: baseVitals.diastolic 
      ? randomizeValue(baseVitals.diastolic, profile.diastolic) 
      : undefined,
    spO2: baseVitals.spO2 
      ? randomizeValue(baseVitals.spO2, profile.spO2) 
      : undefined,
    respiratoryRate: baseVitals.respiratoryRate 
      ? randomizeValue(baseVitals.respiratoryRate, profile.respiratoryRate) 
      : undefined,
    temperature: baseVitals.temperature 
      ? randomizeValue(baseVitals.temperature, profile.temperature) 
      : undefined,
    cvp: baseVitals.cvp 
      ? randomizeValue(baseVitals.cvp, profile.cvp) 
      : undefined,
    cardiacOutput: baseVitals.cardiacOutput 
      ? randomizeValue(baseVitals.cardiacOutput, profile.cardiacOutput) 
      : undefined,
    svr: baseVitals.svr 
      ? randomizeValue(baseVitals.svr, profile.svr) 
      : undefined,
  };
  
  // Apply shock-type specific constraints to maintain diagnostic validity
  return applyShockConstraints(randomized, shockType);
}

/**
 * Apply randomization to hemodynamic parameters
 */
export function randomizeHemodynamics(
  baseHemodynamics: Partial<{
    preload: number;
    contractility: number;
    afterload: number;
    heartRate: number;
    strokeVolume: number;
  }>,
  shockType: string
): typeof baseHemodynamics {
  const profile = RANDOMIZATION_PROFILES.hemodynamics;
  
  const randomized = {
    preload: baseHemodynamics.preload 
      ? randomizeValue(baseHemodynamics.preload, profile.preload) 
      : undefined,
    contractility: baseHemodynamics.contractility 
      ? randomizeValue(baseHemodynamics.contractility, profile.contractility) 
      : undefined,
    afterload: baseHemodynamics.afterload 
      ? randomizeValue(baseHemodynamics.afterload, profile.afterload) 
      : undefined,
    heartRate: baseHemodynamics.heartRate 
      ? randomizeValue(baseHemodynamics.heartRate, RANDOMIZATION_PROFILES.vitalSigns.heartRate) 
      : undefined,
    strokeVolume: baseHemodynamics.strokeVolume 
      ? randomizeValue(baseHemodynamics.strokeVolume, profile.strokeVolume) 
      : undefined,
  };
  
  return randomized;
}

/**
 * Apply randomization to lab values while maintaining diagnostic patterns
 */
export function randomizeLabValues(
  baseLabValues: Partial<{
    pH: number;
    pCO2: number;
    pO2: number;
    hco3: number;
    lactate: number;
    hemoglobin: number;
    hematocrit: number;
    wbc: number;
    platelets: number;
    potassium: number;
    sodium: number;
    magnesium: number;
    chloride: number;
    creatinine: number;
    urea: number;
  }>,
  shockType: string
): typeof baseLabValues {
  const profile = RANDOMIZATION_PROFILES.labs;
  
  const randomized = {
    pH: baseLabValues.pH 
      ? randomizeValue(baseLabValues.pH, profile.pH) 
      : undefined,
    pCO2: baseLabValues.pCO2 
      ? randomizeValue(baseLabValues.pCO2, profile.pCO2) 
      : undefined,
    pO2: baseLabValues.pO2 
      ? randomizeValue(baseLabValues.pO2, profile.pO2) 
      : undefined,
    hco3: baseLabValues.hco3 
      ? randomizeValue(baseLabValues.hco3, profile.hco3) 
      : undefined,
    lactate: baseLabValues.lactate 
      ? randomizeValue(baseLabValues.lactate, profile.lactate) 
      : undefined,
    hemoglobin: baseLabValues.hemoglobin 
      ? randomizeValue(baseLabValues.hemoglobin, profile.hemoglobin) 
      : undefined,
    hematocrit: baseLabValues.hematocrit 
      ? randomizeValue(baseLabValues.hematocrit, profile.hematocrit) 
      : undefined,
    wbc: baseLabValues.wbc 
      ? randomizeValue(baseLabValues.wbc, profile.wbc) 
      : undefined,
    platelets: baseLabValues.platelets 
      ? randomizeValue(baseLabValues.platelets, profile.platelets) 
      : undefined,
    potassium: baseLabValues.potassium 
      ? randomizeValue(baseLabValues.potassium, profile.potassium) 
      : undefined,
    sodium: baseLabValues.sodium 
      ? randomizeValue(baseLabValues.sodium, profile.sodium) 
      : undefined,
    magnesium: baseLabValues.magnesium 
      ? randomizeValue(baseLabValues.magnesium, profile.magnesium) 
      : undefined,
    chloride: baseLabValues.chloride 
      ? randomizeValue(baseLabValues.chloride, profile.chloride) 
      : undefined,
    creatinine: baseLabValues.creatinine 
      ? randomizeValue(baseLabValues.creatinine, profile.creatinine) 
      : undefined,
    urea: baseLabValues.urea 
      ? randomizeValue(baseLabValues.urea, profile.urea) 
      : undefined,
  };
  
  // Maintain key diagnostic relationships (e.g., BUN:Cr ratio in hypovolemic)
  return maintainLabRelationships(randomized, shockType);
}

/**
 * Apply shock-specific constraints to ensure diagnostic validity
 */
function applyShockConstraints(
  vitals: any,
  shockType: string
): any {
  const constrained = { ...vitals };
  
  switch (shockType) {
    case 'Choque hipovolêmico':
      // MUST maintain: low CVP, high SVR, narrow pulse pressure
      if (constrained.cvp !== undefined) {
        constrained.cvp = Math.min(constrained.cvp, 5); // Keep CVP low (<5)
      }
      if (constrained.svr !== undefined) {
        constrained.svr = Math.max(constrained.svr, 1600); // Keep SVR high (>1600)
      }
      // Ensure narrow pulse pressure
      if (constrained.systolic !== undefined && constrained.diastolic !== undefined) {
        const pulsePressure = constrained.systolic - constrained.diastolic;
        if (pulsePressure > 35) {
          // Adjust diastolic to maintain narrow PP
          constrained.diastolic = constrained.systolic - 30;
        }
      }
      break;
      
    case 'Choque distributivo':
      // MUST maintain: low SVR, high/normal CO
      if (constrained.svr !== undefined) {
        constrained.svr = Math.min(constrained.svr, 800); // Keep SVR low (<800)
      }
      if (constrained.cardiacOutput !== undefined) {
        constrained.cardiacOutput = Math.max(constrained.cardiacOutput, 4.5); // Keep CO normal/high
      }
      break;
      
    case 'Choque cardiogênico':
      // MUST maintain: high CVP, low CO, high SVR (compensation)
      if (constrained.cvp !== undefined) {
        constrained.cvp = Math.max(constrained.cvp, 12); // Keep CVP high (>12)
      }
      if (constrained.cardiacOutput !== undefined) {
        constrained.cardiacOutput = Math.min(constrained.cardiacOutput, 4.0); // Keep CO low (<4)
      }
      if (constrained.svr !== undefined) {
        constrained.svr = Math.max(constrained.svr, 1400); // Keep SVR high
      }
      break;
      
    case 'Choque obstrutivo':
      // MUST maintain: high CVP, low CO, variable SVR
      if (constrained.cvp !== undefined) {
        constrained.cvp = Math.max(constrained.cvp, 14); // Keep CVP very high (>14)
      }
      if (constrained.cardiacOutput !== undefined) {
        constrained.cardiacOutput = Math.min(constrained.cardiacOutput, 3.5); // Keep CO very low
      }
      break;
  }
  
  return constrained;
}

/**
 * Maintain important lab value relationships for diagnostic validity
 */
function maintainLabRelationships(
  labs: any,
  shockType: string
): any {
  const adjusted = { ...labs };
  
  // Hypovolemic: maintain BUN:Cr ratio >20:1 (pre-renal)
  if (shockType === 'Choque hipovolêmico') {
    if (adjusted.creatinine !== undefined && adjusted.urea !== undefined) {
      const bunCrRatio = adjusted.urea / adjusted.creatinine;
      if (bunCrRatio < 20) {
        // Adjust BUN to maintain pre-renal pattern
        adjusted.urea = adjusted.creatinine * (22 + Math.random() * 8); // 22-30:1 ratio
      }
    }
  }
  
  // All shocks: maintain Henderson-Hasselbalch relationships
  if (adjusted.pH !== undefined && adjusted.hco3 !== undefined) {
    // pCO2 should compensate for pH changes
    const expectedPCO2 = 40 - (adjusted.pH - 7.4) * 30;
    if (adjusted.pCO2 !== undefined) {
      // Allow some variation but keep relationship
      adjusted.pCO2 = expectedPCO2 + (adjusted.pCO2 - 40) * 0.3;
    }
  }
  
  // Maintain Hct ≈ 3 × Hgb
  if (adjusted.hemoglobin !== undefined && adjusted.hematocrit !== undefined) {
    adjusted.hematocrit = adjusted.hemoglobin * 3;
  }
  
  return adjusted;
}

/**
 * Generate randomization seed from patient data for consistency
 * Same patient setup will get same randomization (useful for debugging)
 */
export function generateSeed(patientData: {
  initials?: string;
  age?: number;
  weight?: number;
  shockType?: string;
}): number {
  const str = `${patientData.initials}-${patientData.age}-${patientData.weight}-${patientData.shockType}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get variation description for educational purposes
 */
export function getVariationDescription(shockType: string): string {
  switch (shockType) {
    case 'Choque hipovolêmico':
      return 'Vital signs vary ±8-12% while maintaining characteristic low CVP (<5 mmHg), ' +
             'high SVR (>1600 dyn·s/cm⁻⁵), and narrow pulse pressure. ' +
             'Lab values vary ±15-20% while maintaining BUN:Cr ratio >20:1 (pre-renal pattern).';
    
    case 'Choque distributivo':
      return 'Vital signs vary ±8-12% while maintaining characteristic low SVR (<800 dyn·s/cm⁻⁵), ' +
             'high/normal CO (>4.5 L/min), and wide pulse pressure. ' +
             'Lab values vary ±15-20% while maintaining lactic acidosis pattern.';
    
    case 'Choque cardiogênico':
      return 'Vital signs vary ±8-12% while maintaining characteristic high CVP (>12 mmHg), ' +
             'low CO (<4.0 L/min), and signs of pulmonary congestion. ' +
             'Lab values vary ±15-20% with BNP elevation pattern.';
    
    case 'Choque obstrutivo':
      return 'Vital signs vary ±8-12% while maintaining characteristic very high CVP (>14 mmHg), ' +
             'very low CO (<3.5 L/min), and obstruction-specific findings. ' +
             'Lab values vary ±15-20% based on etiology.';
    
    default:
      return 'Vital signs and lab values vary ±8-15% while maintaining shock type characteristics.';
  }
}
