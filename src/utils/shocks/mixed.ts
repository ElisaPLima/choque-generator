// Mixed Shock Profile - Multiple shock types coexisting
// Characterized by: Features of 2+ shock types simultaneously
// Common combinations: Septic + Cardiogenic, Hypovolemic + Distributive, etc.
// Pathophysiology: Complex interplay of multiple pathological processes

import { ShockProfile, VitalSigns, HemodynamicState, LabValues } from '../types';

export const mixedShock: ShockProfile = {
  name: 'Choque misto',
  
  initialVitals: {
    heartRate: 105, // Moderate tachycardia
    systolic: 92, // Moderate hypotension
    diastolic: 58, // Mixed pressure characteristics
    spO2: 90, // Moderate hypoxia
    respiratoryRate: 24, // Moderate tachypnea
    temperature: 37.2, // Variable
    cvp: 10, // Intermediate CVP
    cardiacOutput: 4.5, // Variable cardiac output
    svr: 1200, // Intermediate SVR
  },
  
  initialHemodynamics: {
    preload: 50, // Variable preload
    contractility: 60, // Moderately reduced contractility
    afterload: 70, // Intermediate afterload
    heartRate: 105,
    strokeVolume: 50, // Moderately reduced stroke volume
  },
  
  // Progression parameters - highly variable
  degradationRate: 0.75, // Variable deterioration
  compensationCapacity: 0.55, // Mixed compensation capacity
  
  // Response to treatments - unpredictable, depends on dominant shock type
  fluidResponsiveness: 0.50, // Variable response
  vasopressorResponsiveness: 0.50, // Variable response
  inotropeResponsiveness: 0.45, // Variable response
  
  // Mixed lab patterns
  labProfile: {
    pH: 7.32, // Metabolic acidosis
    pCO2: 32, // Respiratory compensation
    pO2: 75, // Moderate hypoxemia
    hco3: 18, // Low bicarbonate
    lactate: 4.5, // Elevated lactate
    hemoglobin: 10.5, // Moderately reduced
    hematocrit: 32, // Moderately reduced
    wbc: 13000, // Moderate leukocytosis
    platelets: 150000, // Moderate thrombocytopenia
    potassium: 4.5, // Variable
    sodium: 138, // Near normal
    creatinine: 1.8, // Moderate AKI
    urea: 55, // Elevated
    magnesium: 1.7, // Slightly low
    chloride: 105, // Slightly elevated
  },
};

// Progress function for mixed shock - highly individualized
export function progressMixedShock(
  currentVitals: VitalSigns,
  timeSinceOnset: number,
  interventions: {
    hasVasopressors: boolean;
    hasInotropes: boolean;
    hasFluids: boolean;
    fluidBalance: number;
  }
): Partial<VitalSigns> {
  const updates: Partial<VitalSigns> = {};
  
  // Mixed shock requires individualized assessment
  // Treatment response depends on which shock components are dominant
  
  // If fluids given, assess volume status component
  if (interventions.hasFluids) {
    if (currentVitals.cvp < 8) {
      // Hypovolemic component - may respond to fluids
      updates.cardiacOutput = currentVitals.cardiacOutput + 0.3;
      updates.cvp = Math.min(12, currentVitals.cvp + 1.5);
    } else if (currentVitals.cvp > 14) {
      // Cardiogenic component - fluids may worsen
      updates.spO2 = Math.max(75, currentVitals.spO2 - 2);
    }
  }
  
  // If vasopressors given, assess distributive component
  if (interventions.hasVasopressors) {
    if (currentVitals.svr < 800) {
      // Distributive component - respond to vasopressors
      updates.svr = currentVitals.svr + 150;
      updates.systolic = currentVitals.systolic + 8;
    }
  }
  
  // If inotropes given, assess contractility
  if (interventions.hasInotropes) {
    updates.cardiacOutput = currentVitals.cardiacOutput + 0.4;
  }
  
  // Progressive deterioration without appropriate treatment
  if (!interventions.hasVasopressors && !interventions.hasFluids && !interventions.hasInotropes) {
    updates.map = currentVitals.map - 2;
    updates.lactate = (currentVitals as any).lactate ? (currentVitals as any).lactate + 0.3 : undefined;
  }
  
  return updates;
}

// Helper function to identify dominant shock component in mixed shock
export function identifyDominantComponent(vitals: VitalSigns): string[] {
  const components: string[] = [];
  
  if (vitals.cvp < 4 && vitals.svr > 1600) {
    components.push('Hipovolêmico');
  }
  
  if (vitals.cvp > 14 && (vitals.pcwp || 0) > 18) {
    components.push('Cardiogênico');
  }
  
  if (vitals.svr < 800) {
    components.push('Distributivo');
  }
  
  if ((vitals.pvr || 0) > 3.0) {
    components.push('Obstrutivo');
  }
  
  return components.length > 0 ? components : ['Indeterminado'];
}
