// ═══════════════════════════════════════════════════════════════════════════
// OBSTRUCTIVE SHOCK ALGORITHM - Evidence-Based Medical Simulation
// ═══════════════════════════════════════════════════════════════════════════
//
// 📚 CLINICAL GUIDELINES USED:
// - American Heart Association (AHA) / American College of Cardiology (ACC) Guidelines
// - European Society of Cardiology (ESC) Acute PE Guidelines 2019
// - American College of Chest Physicians (ACCP) Antithrombotic Therapy Guidelines
// - Surviving Sepsis Campaign (for fluid management in shock)
// - World Society of Abdominal Compartment Syndrome (WSACS) Guidelines
//
// 🎯 EDUCATIONAL OBJECTIVES:
// 1. Recognize hemodynamic signature: ↑CVP + ↓CO + ↑SVR = OBSTRUCTION
// 2. Understand that MEDICAL therapy is only TEMPORIZING
// 3. Learn that PROCEDURAL intervention is the DEFINITIVE cure
// 4. Differentiate obstructive shock subtypes by clinical presentation
// 5. Apply evidence-based risk stratification (PESI for PE, Beck's triad for tamponade)
//
// ⚡ KEY CLINICAL CONCEPT:
// Obstructive shock = "MECHANICAL PROBLEM requires MECHANICAL SOLUTION"
// Vasopressors and fluids are BRIDGES to definitive procedural intervention
//
// 🏥 MAIN ETIOLOGIES (in order of frequency in critical care):
// 
// 1. PULMONARY EMBOLISM (60-70% of obstructive shock cases)
//    - Massive PE: >50% vascular obstruction → shock
//    - Pathophysiology: RV afterload ↑ → RV dilation → septal shift → LV filling ↓ → CO ↓
//    - Treatment: Thrombolysis (tPA) > Embolectomy > Anticoagulation alone
//    - Clinical pearl: "Hypoxia + tachypnea + RV strain = PE until proven otherwise"
//
// 2. CARDIAC TAMPONADE (20-25% of cases)
//    - Pericardial effusion → intrapericardial pressure ↑ → cardiac compression
//    - Beck's Triad: Hypotension + ↑JVP + muffled heart sounds
//    - Pulsus paradoxus: >10mmHg drop in SBP during inspiration
//    - Treatment: Pericardiocentesis (IMMEDIATE improvement)
//    - Clinical pearl: "Narrow pulse pressure + distended neck veins = tamponade"
//
// 3. TENSION PNEUMOTHORAX (10-15% of cases)
//    - One-way valve → air accumulation → mediastinal shift → IVC compression
//    - Clinical: Unilateral ↓breath sounds, hyperresonance, tracheal deviation
//    - Treatment: Needle decompression THEN chest tube (don't wait for X-ray!)
//    - Clinical pearl: "Don't kill patient with X-ray - decompress on clinical suspicion"
//
// 4. AUTO-PEEP / DYNAMIC HYPERINFLATION (<5% of cases)
//    - Severe asthma/COPD + mechanical ventilation → air trapping
//    - Intrathoracic pressure ↑ → venous return ↓ → CO ↓
//    - Treatment: Deep sedation, ↓respiratory rate, ↑expiratory time
//    - Clinical pearl: "Ventilated asthmatic in shock? Disconnect vent and bag slowly"
//
// 5. ABDOMINAL COMPARTMENT SYNDROME (<5% of cases)
//    - Intra-abdominal pressure >20mmHg → IVC compression + visceral ischemia
//    - Treatment: Medical decompression → surgical decompression if refractory
//
// ═══════════════════════════════════════════════════════════════════════════

import { ShockProfile, VitalSigns, HemodynamicState, LabValues } from '../types';

// Obstructive shock subtypes with distinct characteristics
export type ObstructiveSubtype = 'pulmonary_embolism' | 'cardiac_tamponade' | 'tension_pneumothorax' | 
                                  'auto_peep' | 'abdominal_compartment';

export interface ObstructiveShockState {
  subtype: ObstructiveSubtype;
  timeSinceOnset: number; // minutes
  obstructionSeverity: number; // 0-100% - how much obstruction is present
  definitiveInterventionDone: boolean; // Has obstruction been relieved?
  interventionType?: 'thrombolysis' | 'embolectomy' | 'pericardiocentesis' | 'chest_tube' | 'decompression';
  interventionTime?: number; // when intervention was performed
  
  // PE-specific
  peLocation?: 'massive' | 'submassive' | 'saddle'; // Massive = hemodynamic instability
  rightVentricularDysfunction: boolean; // RV strain on echo/CT
  troponinElevated: boolean; // Myocardial injury from RV strain
  bnpElevated: boolean; // Brain natriuretic peptide - RV stretch
  
  // Tamponade-specific
  pericardialEffusionSize?: number; // mL
  pulseParadoxus: number; // mmHg - >10mmHg is significant
  electricalAlternans: boolean; // ECG finding
  
  // Tension pneumothorax-specific
  affectedSide?: 'left' | 'right';
  mediastinalShift: boolean;
  jugularVenousDistention: boolean; // JVD from IVC compression
  
  // Hemodynamic support
  vasopressorsStarted: boolean;
  mechanicalVentilation: boolean;
  peepLevel?: number; // cmH2O - can worsen obstructive shock
}

// Base Obstructive Shock Profile - Composite of typical presentation
// Reflects PE presentation (most common) but can be modified for other etiologies
export const obstructiveShock: ShockProfile = {
  name: 'Choque obstrutivo',
  
  initialVitals: {
    heartRate: 122, // Severe tachycardia - compensatory for low CO
    systolic: 82, // Hypotension - cardinal feature
    diastolic: 54, // Narrow pulse pressure (PP <25-30 suggests tamponade)
    spO2: 84, // Severe hypoxia - especially in PE, tension pneumo
    respiratoryRate: 34, // Severe tachypnea - air hunger
    temperature: 37.2, // Usually normothermic (vs fever in sepsis)
    cvp: 19, // Markedly elevated CVP - pathognomonic of obstructive shock
    cardiacOutput: 2.6, // Severely reduced CO - mechanical obstruction
    svr: 1850, // Elevated SVR - compensatory vasoconstriction
  },
  
  initialHemodynamics: {
    preload: 78, // Paradox: CVP high but EFFECTIVE preload is low
    contractility: 68, // Initially preserved contractility (not a pump problem)
    afterload: 88, // Elevated due to compensatory vasoconstriction
    heartRate: 122,
    strokeVolume: 21, // Critically low SV - hallmark of obstruction
  },
  
  // Progression parameters - obstructive shock is time-critical
  degradationRate: 0.93, // Very rapid deterioration - "obstructive shock kills fast"
  compensationCapacity: 0.18, // Extremely limited compensation (mechanical problem)
  
  // Response to treatments - KEY CONCEPT: Only definitive intervention truly helps
  fluidResponsiveness: 0.15, // Very poor - can worsen in tamponade (↑ intrapericardial pressure)
  vasopressorResponsiveness: 0.25, // Poor - maintains MAP transiently but doesn't fix obstruction
  inotropeResponsiveness: 0.12, // Minimal - heart contractility is not the problem
  
  // Characteristic lab patterns - reflect tissue hypoperfusion
  labProfile: {
    pH: 7.18, // Severe metabolic acidosis from hypoperfusion
    pCO2: 32, // Respiratory alkalosis from tachypnea (trying to compensate)
    pO2: 54, // Critical hypoxemia - V/Q mismatch in PE
    hco3: 12, // Low bicarbonate - consumed buffering lactic acid
    lactate: 8.5, // Extremely elevated - severe tissue hypoperfusion
    hemoglobin: 13.2, // Usually normal (not bleeding unless trauma)
    hematocrit: 40,
    wbc: 13500, // Mild leukocytosis - stress response
    platelets: 185000, // Normal (unless DIC in massive PE)
    potassium: 5.8, // Hyperkalemia - cellular hypoxia, renal dysfunction
    sodium: 137, // Usually normal
    creatinine: 2.6, // Acute kidney injury - prerenal from low CO
    urea: 78, // Elevated BUN - prerenal azotemia
    magnesium: 1.8,
    chloride: 102,
  },
};

// Calculate vital sign progression for obstructive shock
// Evidence-based: Obstructive shock deterioration is RAPID and CATASTROPHIC without intervention
export function progressObstructiveShock(
  currentVitals: VitalSigns,
  state: ObstructiveShockState,
  hasVasopressors: boolean,
  hasFluids: boolean,
  isMechanicallyVentilated: boolean
): Partial<VitalSigns> {
  const progressionFactor = state.timeSinceOnset / 60; // hours
  
  // CRITICAL CONCEPT: Obstructive shock is a PROCEDURAL emergency
  // Medical therapy only buys time - definitive intervention is curative
  
  if (state.definitiveInterventionDone && state.interventionTime) {
    // Time since successful intervention
    const timeSinceIntervention = state.timeSinceOnset - state.interventionTime;
    
    // Different interventions have different speed of improvement
    return calculatePostInterventionRecovery(
      currentVitals, 
      state.interventionType!, 
      state.subtype,
      timeSinceIntervention
    );
  }
  
  // WITHOUT INTERVENTION: Relentless deterioration
  // Each subtype has specific deterioration pattern
  let coDelta = -0.45 * progressionFactor; // Profound CO decline
  let spo2Delta = -4 * progressionFactor; // Worsening hypoxia
  let hrDelta = 6 * progressionFactor; // Compensatory tachycardia
  let mapDelta = -3 * progressionFactor; // Progressive hypotension
  let cvpDelta = 1.5 * progressionFactor; // CVP continues rising (backup worsens)
  
  // Subtype-specific modifications
  switch (state.subtype) {
    case 'pulmonary_embolism':
      // PE: Progressive RV failure, worsening V/Q mismatch
      spo2Delta -= 2; // Severe hypoxia dominates
      if (state.rightVentricularDysfunction) {
        coDelta -= 0.3; // RV failure accelerates CO decline
      }
      break;
      
    case 'cardiac_tamponade':
      // Tamponade: Progressive restriction, pulsus paradoxus worsens
      coDelta -= 0.2; // Gradual but relentless restriction
      cvpDelta += 1; // CVP rises more in tamponade
      // Narrow pulse pressure worsens
      mapDelta -= 2;
      break;
      
    case 'tension_pneumothorax':
      // Tension pneumo: Rapid mediastinal shift, IVC compression
      spo2Delta -= 3; // Severe hypoxia from collapsed lung
      coDelta -= 0.4; // Rapid CO decline from IVC compression
      if (state.mediastinalShift) {
        hrDelta += 4; // Severe compensatory tachycardia
      }
      break;
      
    case 'auto_peep':
      // Auto-PEEP: Dynamic hyperinflation progressively worsens
      spo2Delta -= 1.5;
      coDelta -= 0.25;
      cvpDelta += 2; // Severe IVC compression from high intrathoracic pressure
      break;
      
    case 'abdominal_compartment':
      // ACS: Incremental pressure rise → IVC compression → renal/visceral ischemia
      coDelta -= 0.3;
      cvpDelta += 1.8; // Severe IVC compression
      break;
  }
  
  // Supportive treatments - TEMPORARY bridge, NOT curative
  if (hasVasopressors) {
    // Vasopressors maintain MAP transiently but DON'T improve CO
    mapDelta += 8; // Temporary MAP support
    coDelta += 0.05; // Minimal CO improvement (maybe slight ↑preload from venoconstriction)
  }
  
  if (hasFluids) {
    // Fluids: CONTROVERSIAL in obstructive shock
    // PE: May help preload (cautious fluid challenge acceptable)
    // Tamponade: Can WORSEN by increasing intrapericardial pressure
    // Tension pneumo: Minimal benefit
    
    if (state.subtype === 'pulmonary_embolism') {
      coDelta += 0.12; // Small benefit in PE
      cvpDelta += 0.5; // But increases CVP
    } else if (state.subtype === 'cardiac_tamponade') {
      coDelta -= 0.08; // Can worsen tamponade!
      cvpDelta += 1.5; // Significantly increases intrapericardial pressure
      spo2Delta -= 1; // Worsening
    } else {
      coDelta += 0.05; // Minimal benefit in other types
      cvpDelta += 1;
    }
  }
  
  if (isMechanicallyVentilated) {
    // Mechanical ventilation: DOUBLE-EDGED SWORD
    // Positive pressure worsens obstructive shock by:
    // 1. Increasing intrathoracic pressure → ↓venous return
    // 2. Compressing IVC → ↓preload
    // But improves oxygenation
    
    spo2Delta += 3; // Better oxygenation
    coDelta -= 0.15; // But worsens CO (positive pressure effect)
    cvpDelta += 1.2; // Increases CVP reading (but not effective preload)
  }
  
  // Apply changes with physiological limits
  return {
    cardiacOutput: Math.max(1.5, Math.min(12, currentVitals.cardiacOutput + coDelta)),
    spO2: Math.max(60, Math.min(100, currentVitals.spO2 + spo2Delta)),
    heartRate: Math.min(180, Math.max(40, currentVitals.heartRate + hrDelta)),
    map: Math.max(35, Math.min(140, currentVitals.map + mapDelta)),
    cvp: Math.min(30, Math.max(0, currentVitals.cvp + cvpDelta)),
    svr: Math.min(2500, currentVitals.svr + 50 * progressionFactor), // Compensatory vasoconstriction
  };
}

// Calculate recovery after definitive intervention
function calculatePostInterventionRecovery(
  currentVitals: VitalSigns,
  intervention: string,
  subtype: ObstructiveSubtype,
  timeSinceIntervention: number
): Partial<VitalSigns> {
  // Speed of recovery varies by intervention and etiology
  const recoveryMinutes = timeSinceIntervention;
  
  switch (intervention) {
    case 'pericardiocentesis': // Tamponade relief
      // DRAMATIC and IMMEDIATE improvement (often within seconds)
      if (recoveryMinutes < 10) {
        return {
          cardiacOutput: Math.min(6.5, currentVitals.cardiacOutput + 0.5), // Rapid CO recovery
          cvp: Math.max(6, currentVitals.cvp - 3), // CVP drops rapidly
          systolic: Math.min(115, currentVitals.systolic + 8),
          heartRate: Math.max(75, currentVitals.heartRate - 6),
        };
      } else {
        // Continued gradual improvement
        return {
          cardiacOutput: Math.min(7, currentVitals.cardiacOutput + 0.2),
          cvp: Math.max(5, currentVitals.cvp - 1),
          spO2: Math.min(97, currentVitals.spO2 + 1),
        };
      }
      
    case 'chest_tube': // Tension pneumothorax relief
      // IMMEDIATE improvement (often dramatic within 1-2 minutes)
      if (recoveryMinutes < 15) {
        return {
          spO2: Math.min(95, currentVitals.spO2 + 3), // Rapid oxygenation improvement
          respiratoryRate: Math.max(14, currentVitals.respiratoryRate - 4),
          cardiacOutput: Math.min(6, currentVitals.cardiacOutput + 0.4),
          cvp: Math.max(5, currentVitals.cvp - 2.5),
        };
      } else {
        return {
          spO2: Math.min(98, currentVitals.spO2 + 0.5),
          cardiacOutput: Math.min(6.5, currentVitals.cardiacOutput + 0.15),
        };
      }
      
    case 'thrombolysis': // Massive PE thrombolysis
      // GRADUAL improvement (hours, not minutes)
      // Peak effect at 60-90 minutes
      const thrombolysisEffect = Math.min(1, recoveryMinutes / 90);
      return {
        spO2: Math.min(94, currentVitals.spO2 + 0.8 * thrombolysisEffect),
        cardiacOutput: Math.min(5.5, currentVitals.cardiacOutput + 0.4 * thrombolysisEffect),
        svr: Math.max(900, currentVitals.svr - 100 * thrombolysisEffect),
        cvp: Math.max(8, currentVitals.cvp - 1.5 * thrombolysisEffect),
      };
      
    case 'embolectomy': // Surgical/catheter PE embolectomy
      // FASTER than thrombolysis, SLOWER than mechanical relief
      if (recoveryMinutes < 30) {
        return {
          cardiacOutput: Math.min(6, currentVitals.cardiacOutput + 0.35),
          spO2: Math.min(96, currentVitals.spO2 + 1.8),
          cvp: Math.max(7, currentVitals.cvp - 2),
        };
      } else {
        return {
          cardiacOutput: Math.min(6.5, currentVitals.cardiacOutput + 0.15),
          spO2: Math.min(98, currentVitals.spO2 + 0.5),
        };
      }
      
    case 'decompression': // Abdominal decompression, sedation for auto-PEEP
      // MODERATE speed of improvement
      return {
        cardiacOutput: Math.min(5.8, currentVitals.cardiacOutput + 0.25),
        cvp: Math.max(6, currentVitals.cvp - 1.5),
        spO2: Math.min(95, currentVitals.spO2 + 0.8),
      };
      
    default:
      return {};
  }
}

// Detect obstructive shock pattern - EDUCATIONAL DIAGNOSTIC TOOL
// Based on hemodynamic signatures and clinical presentation
export function detectObstructivePattern(
  vitals: VitalSigns,
  labs?: Partial<LabValues>
): { 
  suspicion: 'low' | 'moderate' | 'high' | 'very_high';
  likelyEtiology: ObstructiveSubtype | 'unknown';
  clues: string[];
  diagnosticTests: string[];
} {
  const clues: string[] = [];
  const diagnosticTests: string[] = [];
  let score = 0;
  
  // HALLMARK TRIAD of Obstructive Shock:
  // 1. Hypotension (MAP <65 or SBP <90)
  // 2. Elevated CVP (>12-15 mmHg)
  // 3. Low Cardiac Output (<4 L/min)
  
  // PRIMARY CRITERIA
  if (vitals.cvp > 15 && vitals.cardiacOutput < 3.5) {
    clues.push('⚠️ PADRÃO CLÁSSICO: CVP elevada (↑preload aparente) + CO baixo (↓ejeção efetiva)');
    clues.push('Sugere obstrução mecânica impedindo retorno venoso ou ejeção ventricular');
    score += 4;
  } else if (vitals.cvp > 12 && vitals.cardiacOutput < 4.5) {
    clues.push('CVP moderadamente elevada com débito cardíaco reduzido');
    score += 2;
  }
  
  // HIGH SVR + LOW CO = Compensatory vasoconstriction (not vasodilation like distributive)
  if (vitals.svr > 1500 && vitals.cardiacOutput < 4) {
    clues.push('RVS elevada (vasoconstrição compensatória) - distingue de choque distributivo');
    score += 2;
  }
  
  // SECONDARY CRITERIA - Help identify specific etiology
  
  // Pulmonary Embolism signs
  if (vitals.spO2 < 88 && vitals.respiratoryRate > 28) {
    clues.push('🫁 Hipoxemia grave + taquipneia severa → Considerar TEP MACIÇO');
    clues.push('PE maciço: >50% oclusão vascular pulmonar → choque obstrutivo');
    diagnosticTests.push('Angio-TC tórax (padrão-ouro para diagnóstico de TEP)');
    diagnosticTests.push('ECG: S1Q3T3, BRD, inversão onda T em V1-V4');
    diagnosticTests.push('Ecocardiograma: disfunção VD, dilatação VD, McConnell sign');
    score += 3;
  }
  
  if (labs?.lactate && labs.lactate > 6) {
    clues.push('Lactato muito elevado sugere hipoperfusão tecidual grave');
    score += 1;
  }
  
  // Cardiac Tamponade signs
  const pulsePressure = vitals.systolic - vitals.diastolic;
  if (pulsePressure < 30 && vitals.cvp > 15) {
    clues.push('🫀 Pressão de pulso estreita (<30mmHg) + CVP muito elevada → TAMPONAMENTO CARDÍACO');
    clues.push('Tríade de Beck: hipotensão + turgência jugular + bulhas abafadas');
    diagnosticTests.push('Ecocardiograma URGENTE: derrame pericárdico, colapso diastólico AD/VD');
    diagnosticTests.push('Sinais ECG: baixa voltagem, alternância elétrica');
    score += 3;
  }
  
  // Tension Pneumothorax signs
  if (vitals.spO2 < 86 && vitals.cvp > 16 && vitals.cardiacOutput < 3) {
    clues.push('🌬️ Hipoxemia + CVP muito alta + CO muito baixo → Pneumotórax hipertensivo?');
    clues.push('Desvio mediastinal → compressão VCI → ↓retorno venoso');
    diagnosticTests.push('Exame físico: hipertimpanismo, ↓MV unilateral, desvio traqueia');
    diagnosticTests.push('Rx tórax: desvio mediastinal, colapso pulmonar');
    diagnosticTests.push('⚠️ NÃO AGUARDAR IMAGEM SE SUSPEITA ALTA - descompressão urgente!');
    score += 3;
  }
  
  // Auto-PEEP signs (if mechanically ventilated)
  if (vitals.cvp > 18 && vitals.respiratoryRate > 30) {
    clues.push('CVP muito elevada → Considerar auto-PEEP/hiperinsuflação dinâmica');
    clues.push('Comum em: DPOC grave, asma status, VM com PEEP excessivo');
    diagnosticTests.push('Verificar curva fluxo-volume no ventilador');
    diagnosticTests.push('Considerar ↓FR, ↑tempo expiratório, sedação profunda');
  }
  
  // Clinical context clues
  if (vitals.heartRate > 110 && vitals.cardiacOutput < 3.5) {
    clues.push('Taquicardia compensatória + CO persistentemente baixo (tentativa falha de compensar)');
    score += 1;
  }
  
  // Determine likely etiology based on pattern
  let likelyEtiology: ObstructiveSubtype | 'unknown' = 'unknown';
  if (vitals.spO2 < 88 && vitals.respiratoryRate > 28 && vitals.cvp > 15) {
    likelyEtiology = 'pulmonary_embolism';
  } else if (pulsePressure < 30 && vitals.cvp > 16) {
    likelyEtiology = 'cardiac_tamponade';
  } else if (vitals.spO2 < 86 && vitals.cvp > 18) {
    likelyEtiology = 'tension_pneumothorax';
  }
  
  // Add general diagnostic recommendations
  if (score >= 4) {
    diagnosticTests.push('POCUS (Point-of-Care Ultrasound): VCI dilatada, derrame pericárdico, sinal do pulmão');
    diagnosticTests.push('Gasometria: acidose metabólica + lactato elevado');
    diagnosticTests.push('⚠️ URGÊNCIA PROCEDURAL: diagnóstico rápido + intervenção definitiva');
  }
  
  // Determine suspicion level
  let suspicionLevel: 'low' | 'moderate' | 'high' | 'very_high';
  if (score >= 7) {
    suspicionLevel = 'very_high';
  } else if (score >= 5) {
    suspicionLevel = 'high';
  } else if (score >= 3) {
    suspicionLevel = 'moderate';
  } else {
    suspicionLevel = 'low';
  }
  
  return {
    suspicion: suspicionLevel,
    likelyEtiology,
    clues,
    diagnosticTests,
  };
}

// Simulate response to definitive interventions - KEY TREATMENT FUNCTIONS
// Evidence-based: These are the ONLY truly effective treatments in obstructive shock
export function obstructiveDefinitiveIntervention(
  interventionType: 'pericardiocentesis' | 'chest_tube' | 'thrombolysis' | 
                    'embolectomy' | 'abdominal_decompression' | 'bronchodilator_sedation',
  currentVitals: VitalSigns,
  currentLabs?: Partial<LabValues>
): { 
  vitals: Partial<VitalSigns>; 
  success: boolean; 
  complications: string[];
  clinicalPearls: string[];
} {
  const complications: string[] = [];
  const clinicalPearls: string[] = [];
  let success = true;
  
  switch (interventionType) {
    case 'pericardiocentesis': // CARDIAC TAMPONADE
      // Success rate: >95% when performed by experienced operator
      // Complication rate: 5-10% (pneumothorax, myocardial perforation, arrhythmia)
      
      clinicalPearls.push('Pericardiocentese guiada por eco: ↑segurança, ↓complicações');
      clinicalPearls.push('Via subxifóide preferencial, agulha 16-18G');
      clinicalPearls.push('Remoção de apenas 50-100mL já melhora hemodinâmica significativamente');
      
      // Simulate procedural complications (10% chance)
      if (Math.random() < 0.1) {
        success = false;
        complications.push('Punção miocárdica com sangramento pericárdico iatrogênico');
        return {
          vitals: {
            cardiacOutput: Math.max(2.0, currentVitals.cardiacOutput - 0.5),
            cvp: Math.min(25, currentVitals.cvp + 2),
          },
          success,
          complications,
          clinicalPearls,
        };
      }
      
      // DRAMATIC improvement (often within seconds to minutes)
      return {
        vitals: {
          cardiacOutput: Math.min(6.8, currentVitals.cardiacOutput * 2.2), // Massive CO improvement
          cvp: Math.max(5, currentVitals.cvp - 12), // CVP drops dramatically
          systolic: Math.min(120, currentVitals.systolic + 38),
          diastolic: Math.min(75, currentVitals.diastolic + 18),
          heartRate: Math.max(75, currentVitals.heartRate - 35),
          spO2: Math.min(96, currentVitals.spO2 + 8),
        },
        success,
        complications,
        clinicalPearls,
      };
      
    case 'chest_tube': // TENSION PNEUMOTHORAX
      // Emergency needle decompression (2nd intercostal space, midclavicular line)
      // Followed by chest tube (5th intercostal space, midaxillary line)
      
      clinicalPearls.push('Descompressão com agulha: alívio IMEDIATO (não aguardar confirmação radiológica)');
      clinicalPearls.push('2° EIC linha hemiclavicular → depois dreno torácico definitivo');
      clinicalPearls.push('Complicação comum: reexpansão pulmonar pode causar edema de reexpansão');
      
      if (Math.random() < 0.05) {
        complications.push('Edema pulmonar de reexpansão (não reexpandir muito rápido)');
        return {
          vitals: {
            spO2: Math.min(92, currentVitals.spO2 + 4), // Limited improvement
            respiratoryRate: Math.max(18, currentVitals.respiratoryRate - 8),
            cardiacOutput: Math.min(5.5, currentVitals.cardiacOutput + 1.2),
            cvp: Math.max(6, currentVitals.cvp - 6),
          },
          success: true, // Still successful but limited
          complications,
          clinicalPearls,
        };
      }
      
      // Excellent improvement (usually immediate)
      return {
        vitals: {
          spO2: Math.min(97, currentVitals.spO2 + 13), // Major oxygenation improvement
          respiratoryRate: Math.max(14, currentVitals.respiratoryRate - 16),
          cardiacOutput: Math.min(6.2, currentVitals.cardiacOutput * 1.9),
          cvp: Math.max(5, currentVitals.cvp - 10),
          heartRate: Math.max(70, currentVitals.heartRate - 30),
        },
        success,
        complications,
        clinicalPearls,
      };
      
    case 'thrombolysis': // MASSIVE PULMONARY EMBOLISM
      // Alteplase (tPA), Tenecteplase - GOLD STANDARD for massive PE with shock
      // Success rate: 70-80% clot dissolution
      // Bleeding risk: 10-20% (major bleeding 3-5%, ICH 1-3%)
      
      clinicalPearls.push('Indicação: TEP maciço com instabilidade hemodinâmica');
      clinicalPearls.push('Alteplase 100mg em 2h OU Tenecteplase dose única baseada em peso');
      clinicalPearls.push('Contraindicações: AVC recente, cirurgia recente, sangramento ativo');
      clinicalPearls.push('Melhora gradual em 60-90min (diferente do alívio imediato de tamponade/pneumotórax)');
      
      // Bleeding complication (15% chance)
      if (Math.random() < 0.15) {
        const bleedingSeverity = Math.random();
        if (bleedingSeverity < 0.03) {
          // ICH - catastrophic
          success = false;
          complications.push('⚠️ HEMORRAGIA INTRACRANIANA - complicação catastrófica da trombólise');
          return {
            vitals: {
              cardiacOutput: currentVitals.cardiacOutput - 0.3,
              map: currentVitals.map - 15,
            },
            success,
            complications,
            clinicalPearls,
          };
        } else {
          complications.push('Sangramento maior (considerar transfusão + reversão com ácido tranexâmico)');
        }
      }
      
      // GRADUAL improvement over 60-120 minutes (slower than mechanical interventions)
      return {
        vitals: {
          spO2: Math.min(93, currentVitals.spO2 + 7),
          cardiacOutput: Math.min(5.8, currentVitals.cardiacOutput * 1.6),
          svr: Math.max(850, currentVitals.svr - 450), // Less compensatory vasoconstriction
          cvp: Math.max(7, currentVitals.cvp - 8),
          heartRate: Math.max(80, currentVitals.heartRate - 25),
          respiratoryRate: Math.max(16, currentVitals.respiratoryRate - 12),
        },
        success,
        complications,
        clinicalPearls,
      };
      
    case 'embolectomy': // Surgical/catheter-directed embolectomy for PE
      // Catheter-directed thrombolysis or surgical embolectomy
      // Reserved for: contraindication to systemic lysis, failed lysis
      
      clinicalPearls.push('Embolectomia cirúrgica: indicada se contraindicação à trombólise');
      clinicalPearls.push('Trombólise dirigida por cateter: menor dose sistêmica → ↓risco sangramento');
      clinicalPearls.push('Melhora mais rápida que trombólise sistêmica, mas mais invasivo');
      
      // 5% procedural complication rate
      if (Math.random() < 0.05) {
        complications.push('Complicação vascular no sítio de acesso ou embolia distal');
      }
      
      // FASTER improvement than systemic lysis, SLOWER than mechanical relief
      return {
        vitals: {
          cardiacOutput: Math.min(6.3, currentVitals.cardiacOutput * 1.8),
          spO2: Math.min(95, currentVitals.spO2 + 10),
          cvp: Math.max(6, currentVitals.cvp - 9),
          heartRate: Math.max(78, currentVitals.heartRate - 28),
          svr: Math.max(900, currentVitals.svr - 400),
        },
        success,
        complications,
        clinicalPearls,
      };
      
    case 'abdominal_decompression': // Abdominal Compartment Syndrome
      // Decompressive laparotomy for ACS (IAP >20-25 mmHg + organ dysfunction)
      
      clinicalPearls.push('Síndrome compartimental abdominal: PIA >20mmHg + disfunção orgânica');
      clinicalPearls.push('Laparotomia descompressiva: último recurso após falha medidas conservadoras');
      clinicalPearls.push('Medidas conservadoras: drenagem nasogástrica, procinéticos, diurese');
      
      return {
        vitals: {
          cardiacOutput: Math.min(5.5, currentVitals.cardiacOutput * 1.5),
          cvp: Math.max(6, currentVitals.cvp - 8),
          map: Math.min(85, currentVitals.map + 15),
        },
        success,
        complications,
        clinicalPearls,
      };
      
    case 'bronchodilator_sedation': // Auto-PEEP management
      // Deep sedation + paralysis to allow lung deflation
      // Bronchodilators for bronchospasm
      
      clinicalPearls.push('Auto-PEEP/hiperinsuflação dinâmica: ar preso → ↑pressão intratorácica');
      clinicalPearls.push('Tratamento: sedação profunda, ↓FR, ↑tempo expiratório, broncodilatadores');
      clinicalPearls.push('Considerar desconexão temporária do ventilador se colapso iminente');
      
      return {
        vitals: {
          cardiacOutput: Math.min(5.2, currentVitals.cardiacOutput * 1.4),
          cvp: Math.max(8, currentVitals.cvp - 6),
          spO2: Math.min(94, currentVitals.spO2 + 6),
          respiratoryRate: Math.max(12, currentVitals.respiratoryRate - 15),
        },
        success,
        complications,
        clinicalPearls,
      };
      
    default:
      return {
        vitals: {},
        success: false,
        complications: ['Intervenção não reconhecida'],
        clinicalPearls: [],
      };
  }
}

// Calculate risk scores for PE severity stratification
export function calculatePESeverityScore(
  vitals: VitalSigns,
  labs: Partial<LabValues>,
  rightVentricularDysfunction: boolean,
  troponinElevated: boolean,
  bnpElevated: boolean
): {
  pesiScore: number; // Pulmonary Embolism Severity Index
  pesiClass: 'I' | 'II' | 'III' | 'IV' | 'V';
  riskCategory: 'low' | 'intermediate-low' | 'intermediate-high' | 'high';
  recommendedTreatment: string;
  mortalityRisk: string;
} {
  // Simplified PESI calculation (requires age, which we may not have)
  let pesiScore = 0;
  
  // Hemodynamic instability = HIGH RISK (massive PE)
  if (vitals.systolic < 90 || vitals.cardiacOutput < 3.5) {
    return {
      pesiScore: 150, // Automatically high score
      pesiClass: 'V',
      riskCategory: 'high',
      recommendedTreatment: 'Trombólise sistêmica OU embolectomia cirúrgica URGENTE',
      mortalityRisk: '15-30% mortalidade em 30 dias se não tratado agressivamente',
    };
  }
  
  // RV dysfunction + biomarker elevation = INTERMEDIATE-HIGH RISK
  if (rightVentricularDysfunction && (troponinElevated || bnpElevated)) {
    return {
      pesiScore: 100,
      pesiClass: 'III',
      riskCategory: 'intermediate-high',
      recommendedTreatment: 'Anticoagulação plena + considerar terapia de reperfusão se deteriorar',
      mortalityRisk: '3-10% mortalidade em 30 dias',
    };
  }
  
  // Either RV dysfunction OR biomarkers = INTERMEDIATE-LOW RISK
  if (rightVentricularDysfunction || troponinElevated || bnpElevated) {
    return {
      pesiScore: 80,
      pesiClass: 'II',
      riskCategory: 'intermediate-low',
      recommendedTreatment: 'Anticoagulação plena, monitorização próxima',
      mortalityRisk: '1-3% mortalidade em 30 dias',
    };
  }
  
  // No high-risk features = LOW RISK
  return {
    pesiScore: 50,
    pesiClass: 'I',
    riskCategory: 'low',
    recommendedTreatment: 'Anticoagulação, considerar alta precoce ou ambulatorial',
    mortalityRisk: '<1% mortalidade em 30 dias',
  };
}

// Educational function: Adjacent conditions with similar presentations
export function getAdjacentConditions(): {
  condition: string;
  presentation: string;
  keyDifferentiator: string;
}[] {
  return [
    {
      condition: 'Choque Cardiogênico',
      presentation: 'CVP elevada + CO baixo (semelhante a obstrutivo)',
      keyDifferentiator: 'História de IAM/IC, troponina muito elevada, eco mostra ↓contratilidade global',
    },
    {
      condition: 'Embolia Pulmonar Submaciça',
      presentation: 'Dispneia + taquicardia sem choque',
      keyDifferentiator: 'Hemodinamicamente ESTÁVEL (PA normal, sem necessidade de vasopressor)',
    },
    {
      condition: 'Pneumotórax Simples',
      presentation: 'Dispneia + hipoxemia',
      keyDifferentiator: 'Sem desvio mediastinal, PA normal, não há instabilidade hemodinâmica',
    },
    {
      condition: 'DPOC Descompensado (sem auto-PEEP)',
      presentation: 'Dispneia + taquipneia',
      keyDifferentiator: 'PA normal, CO normal, responde bem a broncodilatadores',
    },
    {
      condition: 'Derrame Pericárdico (sem tamponamento)',
      presentation: 'Derrame no eco',
      keyDifferentiator: 'Sem sinais de Beck, sem colapso diastólico, hemodinâmica normal',
    },
  ];
}
