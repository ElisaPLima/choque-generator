// Patient Outcome System - Medically Accurate Death and Survival Determination
// Based on evidence-based criteria from critical care literature

import { SimulationState, VitalSigns, LabValues, PatientData } from './types';

// Define vitals incompatible with life (prolonged duration leads to death)
export interface IncompatibleVitalsThresholds {
  map: number; // MAP < 40 mmHg
  heartRate: { min: number; max: number }; // HR < 30 or > 180 bpm
  spO2: number; // SpO2 < 70%
  pH: { min: number; max: number }; // pH < 6.8 or > 7.8
  lactate: number; // Lactate > 15 mmol/L
  cardiacOutput: number; // CO < 2.0 L/min
  potassium: { min: number; max: number }; // K < 2.0 or > 7.5 mEq/L
}

export const INCOMPATIBLE_VITALS: IncompatibleVitalsThresholds = {
  map: 40,
  heartRate: { min: 30, max: 180 },
  spO2: 70,
  pH: { min: 6.8, max: 7.8 },
  lactate: 15,
  cardiacOutput: 2.0,
  potassium: { min: 2.0, max: 7.5 },
};

// Track how long patient has been in critical state
export interface CriticalStateTracker {
  incompatibleVitalsCount: number; // Number of consecutive updates with incompatible vitals
  incompatibleVitalsDuration: number; // Cumulative simulation minutes
  reasonsForIncompatibility: string[];
  timeSinceLastRecovery: number; // Minutes since vitals were last compatible
}

// Survival criteria - shock-specific resolution markers
export interface SurvivalCriteria {
  mapTarget: number; // MAP ≥ 65 mmHg (sepsis guidelines)
  lactateNormalized: boolean; // Lactate < 2.0 mmol/L or cleared >50% from initial
  adequatePerfusion: boolean; // Combined assessment
  shockResolved: boolean; // Shock-specific resolution
  sustainedStability: number; // Minutes of sustained stability required
}

// Outcome states
export enum PatientOutcome {
  ONGOING = 'ONGOING',
  SURVIVED = 'SURVIVED',
  DIED = 'DIED',
}

export interface OutcomeResult {
  outcome: PatientOutcome;
  timeOfOutcome: number; // simulation minutes
  primaryCause?: string;
  contributingFactors: string[];
  qualityMetrics?: {
    timeToShockReversal?: number;
    lactateCleared?: boolean;
    appropriateTreatment?: boolean;
  };
}

// Initialize critical state tracker
export function initializeCriticalStateTracker(): CriticalStateTracker {
  return {
    incompatibleVitalsCount: 0,
    incompatibleVitalsDuration: 0,
    reasonsForIncompatibility: [],
    timeSinceLastRecovery: 0,
  };
}

// Check if current vitals are incompatible with life
export function checkIncompatibleVitals(
  vitals: VitalSigns,
  labs: LabValues
): { isIncompatible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Critical MAP
  if (vitals.map < INCOMPATIBLE_VITALS.map) {
    reasons.push(`PAM crítica (${vitals.map.toFixed(0)} < 40 mmHg)`);
  }

  // Critical heart rate
  if (vitals.heartRate < INCOMPATIBLE_VITALS.heartRate.min) {
    reasons.push(`Bradicardia extrema (FC ${vitals.heartRate.toFixed(0)} < 30 bpm)`);
  } else if (vitals.heartRate > INCOMPATIBLE_VITALS.heartRate.max) {
    reasons.push(`Taquicardia extrema (FC ${vitals.heartRate.toFixed(0)} > 180 bpm)`);
  }

  // Critical SpO2
  if (vitals.spO2 < INCOMPATIBLE_VITALS.spO2) {
    reasons.push(`Hipoxemia severa (SpO2 ${vitals.spO2.toFixed(0)}% < 70%)`);
  }

  // Critical pH
  if (labs.pH < INCOMPATIBLE_VITALS.pH.min) {
    reasons.push(`Acidemia severa (pH ${labs.pH.toFixed(2)} < 6.8)`);
  } else if (labs.pH > INCOMPATIBLE_VITALS.pH.max) {
    reasons.push(`Alcalemia severa (pH ${labs.pH.toFixed(2)} > 7.8)`);
  }

  // Critical lactate
  if (labs.lactate > INCOMPATIBLE_VITALS.lactate) {
    reasons.push(`Lactato extremo (${labs.lactate.toFixed(1)} > 15 mmol/L)`);
  }

  // Critical cardiac output
  if (vitals.cardiacOutput < INCOMPATIBLE_VITALS.cardiacOutput) {
    reasons.push(`Débito cardíaco crítico (${vitals.cardiacOutput.toFixed(1)} < 2.0 L/min)`);
  }

  // Critical potassium
  if (labs.potassium < INCOMPATIBLE_VITALS.potassium.min) {
    reasons.push(`Hipocalemia severa (K ${labs.potassium.toFixed(1)} < 2.0 mEq/L)`);
  } else if (labs.potassium > INCOMPATIBLE_VITALS.potassium.max) {
    reasons.push(`Hipercalemia severa (K ${labs.potassium.toFixed(1)} > 7.5 mEq/L)`);
  }

  return {
    isIncompatible: reasons.length > 0,
    reasons,
  };
}

// Update critical state tracker
export function updateCriticalStateTracker(
  tracker: CriticalStateTracker,
  vitals: VitalSigns,
  labs: LabValues,
  deltaTimeMinutes: number
): CriticalStateTracker {
  const { isIncompatible, reasons } = checkIncompatibleVitals(vitals, labs);

  if (isIncompatible) {
    return {
      incompatibleVitalsCount: tracker.incompatibleVitalsCount + 1,
      incompatibleVitalsDuration: tracker.incompatibleVitalsDuration + deltaTimeMinutes,
      reasonsForIncompatibility: reasons,
      timeSinceLastRecovery: tracker.timeSinceLastRecovery + deltaTimeMinutes,
    };
  } else {
    // Patient has recovered to compatible vitals
    return {
      incompatibleVitalsCount: 0,
      incompatibleVitalsDuration: tracker.incompatibleVitalsDuration, // Keep cumulative
      reasonsForIncompatibility: [],
      timeSinceLastRecovery: 0, // Reset recovery timer
    };
  }
}

// Determine if patient has died based on critical state duration
// Medical literature: Sustained MAP < 40 for >30 min, severe acidosis, refractory shock
export function checkForDeath(
  tracker: CriticalStateTracker,
  simTimeElapsed: number,
  patientData: PatientData
): { isDead: boolean; cause?: string; factors: string[] } {
  const factors: string[] = [...tracker.reasonsForIncompatibility];

  // Death criteria 1: Sustained incompatible vitals for > 30 simulation minutes
  if (tracker.timeSinceLastRecovery >= 30) {
    return {
      isDead: true,
      cause: 'Choque refratário com falência circulatória irreversível',
      factors: [
        ...factors,
        `Sinais vitais incompatíveis com a vida por ${tracker.timeSinceLastRecovery.toFixed(0)} minutos`,
      ],
    };
  }

  // Death criteria 2: Multiple episodes (>5) of incompatible vitals within short period
  if (tracker.incompatibleVitalsCount >= 5 && tracker.incompatibleVitalsDuration >= 15) {
    return {
      isDead: true,
      cause: 'Deterioração cardiovascular progressiva e refratária',
      factors: [
        ...factors,
        `${tracker.incompatibleVitalsCount} episódios de instabilidade crítica`,
      ],
    };
  }

  // Death criteria 3: Prolonged cumulative time in critical state (>60 min total)
  if (tracker.incompatibleVitalsDuration >= 60) {
    return {
      isDead: true,
      cause: 'Falência de múltiplos órgãos por hipoperfusão prolongada',
      factors: [
        ...factors,
        `Tempo cumulativo de ${tracker.incompatibleVitalsDuration.toFixed(0)} min com sinais vitais críticos`,
      ],
    };
  }

  return { isDead: false, factors };
}

// Check for shock resolution - type-specific criteria
export function checkShockResolution(
  vitals: VitalSigns,
  labs: LabValues,
  shockType: string,
  initialLactate: number,
  activeInterventions: any[]
): boolean {
  // Universal criteria (apply to all shock types)
  const mapAdequate = vitals.map >= 65; // Surviving Sepsis Campaign / Shock guidelines
  const lactateCleared = labs.lactate < 2.0 || (labs.lactate <= initialLactate * 0.5);
  const perfusionAdequate = vitals.spO2 >= 92 && vitals.cardiacOutput >= 4.0;

  switch (shockType) {
    case 'Choque distributivo':
      // Distributive shock resolution: MAP ≥65, lactate clearing, SVR normalizing
      const svrNormalizing = vitals.svr >= 800 && vitals.svr <= 1400;
      return mapAdequate && lactateCleared && perfusionAdequate && svrNormalizing;

    case 'Choque cardiogênico':
      // Cardiogenic shock resolution: CO improved, PCWP controlled, adequate MAP
      const coImproved = vitals.cardiacOutput >= 4.0;
      const pcwpControlled = vitals.pcwp ? vitals.pcwp <= 18 : true;
      return mapAdequate && coImproved && perfusionAdequate && pcwpControlled;

    case 'Choque hipovolêmico':
      // Hypovolemic shock resolution: Preload restored, CO normalized, lactate cleared
      const preloadRestored = vitals.cvp >= 5 && vitals.cvp <= 12;
      const hrNormalized = vitals.heartRate >= 60 && vitals.heartRate <= 100;
      return mapAdequate && lactateCleared && preloadRestored && hrNormalized && perfusionAdequate;

    case 'Choque obstrutivo':
      // Obstructive shock resolution: Obstruction relieved, hemodynamics improved
      const hemodynamicsImproved = vitals.cardiacOutput >= 4.5 && vitals.cvp <= 12;
      return mapAdequate && hemodynamicsImproved && perfusionAdequate;

    case 'Choque misto':
      // Mixed shock: Multiple components must resolve
      const basicResolution = mapAdequate && lactateCleared && perfusionAdequate;
      const coAdequate = vitals.cardiacOutput >= 4.0;
      return basicResolution && coAdequate;

    default:
      return mapAdequate && lactateCleared && perfusionAdequate;
  }
}

// Assess survival - requires sustained stability
export function assessSurvival(
  state: SimulationState,
  patientData: PatientData,
  stabilityDuration: number, // minutes of sustained stability
  initialLactate: number
): { hasSurvived: boolean; metrics?: any } {
  const shockResolved = checkShockResolution(
    state.vitals,
    state.labs,
    patientData.shockType,
    initialLactate,
    state.activeInterventions
  );

  // Require sustained stability for ≥60 simulation minutes (5 real-time minutes at 12x)
  const requiredStabilityDuration = 60; // simulation minutes

  if (shockResolved && stabilityDuration >= requiredStabilityDuration) {
    return {
      hasSurvived: true,
      metrics: {
        timeToShockReversal: state.simTimeElapsed,
        lactateCleared: state.labs.lactate < 2.0,
        finalMAP: state.vitals.map,
        finalLactate: state.labs.lactate,
        finalCO: state.vitals.cardiacOutput,
      },
    };
  }

  return { hasSurvived: false };
}

// Track stability duration
export function trackStability(
  currentStabilityDuration: number,
  isCurrentlyStable: boolean,
  deltaTimeMinutes: number
): number {
  if (isCurrentlyStable) {
    return currentStabilityDuration + deltaTimeMinutes;
  } else {
    return 0; // Reset counter if not stable
  }
}

// Determine if patient is currently stable (for tracking purposes)
export function isPatientStable(
  vitals: VitalSigns,
  labs: LabValues,
  shockType: string
): boolean {
  // Basic stability criteria
  const mapStable = vitals.map >= 65 && vitals.map <= 110;
  const hrStable = vitals.heartRate >= 50 && vitals.heartRate <= 120;
  const spO2Stable = vitals.spO2 >= 92;
  const lactateImproving = labs.lactate <= 4.0;
  const phAcceptable = labs.pH >= 7.25 && labs.pH <= 7.55;

  return mapStable && hrStable && spO2Stable && lactateImproving && phAcceptable;
}

// Main outcome evaluation function
export function evaluateOutcome(
  state: SimulationState,
  patientData: PatientData,
  criticalTracker: CriticalStateTracker,
  stabilityDuration: number,
  initialLactate: number
): OutcomeResult {
  // Check for death first
  const deathCheck = checkForDeath(criticalTracker, state.simTimeElapsed, patientData);
  if (deathCheck.isDead) {
    return {
      outcome: PatientOutcome.DIED,
      timeOfOutcome: state.simTimeElapsed,
      primaryCause: deathCheck.cause,
      contributingFactors: deathCheck.factors,
    };
  }

  // Check for survival
  const survivalCheck = assessSurvival(state, patientData, stabilityDuration, initialLactate);
  if (survivalCheck.hasSurvived) {
    return {
      outcome: PatientOutcome.SURVIVED,
      timeOfOutcome: state.simTimeElapsed,
      primaryCause: 'Resolução completa do choque com estabilidade hemodinâmica sustentada',
      contributingFactors: [
        `PAM mantida ≥ 65 mmHg`,
        `Lactato normalizado (${state.labs.lactate.toFixed(1)} mmol/L)`,
        `Débito cardíaco adequado (${state.vitals.cardiacOutput.toFixed(1)} L/min)`,
      ],
      qualityMetrics: survivalCheck.metrics,
    };
  }

  // Still ongoing
  return {
    outcome: PatientOutcome.ONGOING,
    timeOfOutcome: state.simTimeElapsed,
    contributingFactors: [],
  };
}

// Educational feedback based on outcome
export function generateOutcomeFeedback(
  outcome: OutcomeResult,
  state: SimulationState,
  patientData: PatientData
): string {
  if (outcome.outcome === PatientOutcome.DIED) {
    let feedback = `❌ **PACIENTE FOI A ÓBITO** (${outcome.timeOfOutcome.toFixed(0)} min)\n\n`;
    feedback += `**Causa primária:** ${outcome.primaryCause}\n\n`;
    feedback += `**Fatores contribuintes:**\n`;
    outcome.contributingFactors.forEach((factor) => {
      feedback += `  • ${factor}\n`;
    });
    feedback += `\n**Lições aprendidas:**\n`;
    feedback += `  • Choque não tratado ou refratário leva à falência multiorgânica\n`;
    feedback += `  • PAM < 40 mmHg sustentada é incompatível com a vida\n`;
    feedback += `  • Reconhecimento precoce e tratamento agressivo são essenciais\n`;
    return feedback;
  }

  if (outcome.outcome === PatientOutcome.SURVIVED) {
    let feedback = `✅ **PACIENTE SOBREVIVEU** (${outcome.timeOfOutcome.toFixed(0)} min)\n\n`;
    feedback += `**Status:** ${outcome.primaryCause}\n\n`;
    feedback += `**Parâmetros finais:**\n`;
    outcome.contributingFactors.forEach((factor) => {
      feedback += `  • ${factor}\n`;
    });
    if (outcome.qualityMetrics) {
      feedback += `\n**Métricas de qualidade:**\n`;
      feedback += `  • Tempo até reversão do choque: ${outcome.qualityMetrics.timeToShockReversal.toFixed(0)} min\n`;
      feedback += `  • Depuração de lactato: ${outcome.qualityMetrics.lactateCleared ? 'Sim' : 'Não'}\n`;
    }
    return feedback;
  }

  return '⏳ **Tratamento em andamento...**\n\nContinue monitorando e ajustando a terapia.';
}
