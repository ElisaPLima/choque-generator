# Cardiogenic Shock Algorithm - Medical Documentation Report

**Date:** December 11, 2025  
**Version:** 2.0 Enhanced  
**Author:** Medical Training Platform Development Team  
**Based on:** ESC/ACC Guidelines 2023, SHOCK Trial, IABP-SHOCK II, SCAI Classification

---

## Executive Summary

This report documents the enhanced cardiogenic shock algorithm implemented in the Medical Training Platform. The algorithm has been significantly upgraded to incorporate evidence-based medicine, multiple clinical variables, and realistic physiological responses to create an accurate simulation environment for medical training.

---

## 1. Clinical Background

### 1.1 Definition
Cardiogenic shock is a state of **end-organ hypoperfusion** due to **cardiac failure**, characterized by:
- **Systolic BP** <90 mmHg or **MAP** <65 mmHg
- **Cardiac Index** <2.2 L/min/m² (with PCWP >15 mmHg)
- Signs of tissue hypoperfusion (cold extremities, oliguria, altered mental status, elevated lactate)

### 1.2 Pathophysiology
**Vicious Cycle of Cardiogenic Shock:**
```
↓ Contractility → ↓ Cardiac Output → ↓ Coronary Perfusion → ↓ Contractility
                ↓
        ↑ LVEDP → Pulmonary Edema → Hypoxia → Myocardial Ischemia
                ↓
        Sympathetic Activation → ↑ Afterload → ↓ Cardiac Output
                ↓
        Organ Hypoperfusion → Metabolic Acidosis → Myocardial Depression
```

### 1.3 SCAI Classification (2019)
- **Stage A:** At Risk - No shock yet
- **Stage B:** Beginning - Relative hypotension, ↑CVP
- **Stage C:** Classic - Hypotension + Hypoperfusion
- **Stage D:** Deteriorating - Failing support, worsening
- **Stage E:** Extremis - Cardiac arrest, VA-ECMO candidate

### 1.4 Mortality
- **Overall:** 40-50% mortality at 30 days
- **Stage C:** 30-50%
- **Stage D:** 40-60%
- **Stage E:** >80% without mechanical circulatory support (MCS)

---

## 2. Algorithm Implementation

### 2.1 Initial Hemodynamic Profile

#### Vital Signs (SCAI Stage C)
```typescript
heartRate: 105 bpm          // Compensatory tachycardia
systolic: 80 mmHg           // Hypotension (pump failure)
diastolic: 55 mmHg          // Narrow pulse pressure
MAP: 63 mmHg                // <65 mmHg (hypoperfusion threshold)
spO2: 88%                   // Hypoxemia (pulmonary edema)
respiratoryRate: 28/min     // Tachypnea (pulmonary congestion)
temperature: 36.2°C         // Cool periphery (vasoconstriction)
CVP: 16 mmHg                // Elevated (>12 mmHg - congestion)
Cardiac Output: 3.2 L/min   // Low (<4 L/min)
SVR: 1600 dyn·s/cm⁻⁵        // High (>1200 - compensatory)
```

#### Hemodynamic Parameters
```typescript
Preload: 85/100             // High (PCWP >18 mmHg)
Contractility: 25/100       // Severely reduced (LVEF <30%)
Afterload: 80/100           // High (compensatory vasoconstriction)
Stroke Volume: 30 mL        // Very low (normal ~70 mL)
LVEF: ~25%                  // Severe systolic dysfunction
Cardiac Index: ~1.8 L/min/m² // Critical (<2.2)
```

#### Laboratory Values
```typescript
pH: 7.22                    // Severe metabolic acidosis
Lactate: 6.5 mmol/L         // Tissue hypoperfusion (>4)
pO2: 62 mmHg                // Severe hypoxemia
HCO3: 16 mEq/L              // Low bicarbonate
Creatinine: 2.1 mg/dL       // Acute kidney injury (cardiorenal)
Potassium: 5.2 mEq/L        // Hyperkalemia
```

### 2.2 Etiology Classification

The algorithm supports multiple etiologies:

1. **AMI (Acute Myocardial Infarction)** - Most common (40-50%)
   - Large STEMI (>40% LV involvement)
   - Mechanical complications

2. **Acute Decompensated Heart Failure**
   - Chronic CHF exacerbation
   - Beta-receptor downregulation

3. **RV Failure**
   - RV infarction
   - Massive PE

4. **Mechanical Complications**
   - VSR (Ventricular Septal Rupture)
   - Acute MR (Mitral Regurgitation)
   - Free wall rupture
   - Tamponade

5. **Myocarditis**
   - Fulminant myocarditis
   - Viral/autoimmune

6. **Post-Cardiotomy**
   - Post-cardiac surgery
   - Stunning/failure to wean CPB

### 2.3 Adjacent Conditions & Variables

#### Congestive Symptoms
- **Pulmonary Edema:** Crackles, ↓SpO2, ↑RR, pink frothy sputum
- **Hepatic Congestion:** ↑JVP, hepatomegaly, ↑liver enzymes
- **Peripheral Edema:** Lower extremity edema, anasarca

#### Arrhythmias
- **Ventricular Tachycardia/Fibrillation:** ↓CO, risk of arrest
- **Atrial Fibrillation:** Loss of atrial kick (-20% CO)
- **Heart Block:** Bradycardia, ↓CO
- **Compensatory Tachycardia:** ↑myocardial O2 demand

#### Organ Dysfunction
- **Cardiorenal Syndrome Type 1:** ↑Creatinine, oliguria
- **Hepatorenal Syndrome:** ↑Bilirubin, ↑transaminases
- **Cerebral Hypoperfusion:** Altered mental status, confusion
- **Gut Ischemia:** Lactate elevation, mesenteric ischemia

---

## 3. Treatment Algorithms

### 3.1 Fluid Management

#### Frank-Starling Curve Position
Cardiogenic shock patients are typically on the **flat or descending portion** of the curve.

**Fluid Risk Assessment:**
```typescript
CVP >18 mmHg  → Risk: 90%  → CONTRAINDICATED
CVP 15-18     → Risk: 70%  → HIGH RISK
CVP 12-15     → Risk: 50%  → MODERATE RISK
CVP 8-12      → Risk: 30%  → MILD RISK
CVP <8        → Risk: 20%  → May benefit (rare)
```

**Expected Response to 500mL Bolus:**
- **CVP increase:** +2.5 mmHg (steep pressure-volume curve)
- **PCWP increase:** +3 mmHg
- **CO change:** Usually minimal or negative (-0.08 to +0.05 L/min)
- **SpO2:** May decrease 3-5% if fluid overload occurs

**Recommendations:**
- CVP >15: **AVOID FLUIDS** - Use diuretics
- CVP 12-15: Small bolus (250mL) with careful monitoring
- CVP 8-12: May tolerate 500mL with close monitoring
- Consider **passive leg raise (PLR) test** before fluid bolus

### 3.2 Inotropes (First-Line for Cardiogenic Shock)

#### Dobutamine (Preferred)
**Mechanism:** Beta-1 > Beta-2 > Alpha-1
```typescript
Dose: 2.5-20 mcg/kg/min (start low, titrate)
Effects per mcg/kg/min:
  - Contractility: +8%
  - Heart Rate: +2 bpm
  - SVR: -20 dyn·s/cm⁻⁵ (mild vasodilation)
  - CO: +12%
```
**Advantages:** Improves contractility, moderate chronotropy
**Disadvantages:** ↑O2 demand, may cause tachycardia/arrhythmias
**Note:** Less effective if LVEF <20% or chronic beta-blocker use

#### Milrinone (Alternative)
**Mechanism:** PDE-3 Inhibitor (catecholamine-independent)
```typescript
Bolus: 50 mcg/kg over 10 min
Infusion: 0.375-0.75 mcg/kg/min
Effects per mcg/kg/min:
  - Contractility: +15%
  - Heart Rate: +1 bpm
  - SVR: -80 dyn·s/cm⁻⁵ (significant vasodilation)
  - CO: +18%
```
**Advantages:** Inodilator (↑contractility + ↓afterload), effective in beta-receptor downregulation
**Disadvantages:** Hypotension risk (requires adequate MAP >65), long half-life

#### Epinephrine (High-Dose/Refractory)
**Mechanism:** Alpha + Beta (dose-dependent)
```typescript
Low dose (<0.05): Beta > Alpha (inotropy)
High dose (>0.1): Alpha ≥ Beta (vasoconstriction + inotropy)
Effects:
  - Contractility: +20-25%
  - Heart Rate: +20-25 bpm
  - SVR: Variable (-30 to +150)
  - CO: +20-25%
```
**Advantages:** Strong inotrope + vasopressor
**Disadvantages:** ↑↑O2 demand, tachycardia, arrhythmias, lactic acidosis

#### Dopamine
**Mechanism:** Dose-dependent receptor activation
```typescript
Low (2-5): Dopaminergic (renal vasodilation)
Medium (5-10): Beta-1 (inotropy)
High (>10): Alpha-1 (vasoconstriction)
```
**Note:** Less preferred due to more arrhythmias vs. norepinephrine

### 3.3 Vasopressors (Adjunct Therapy)

#### Norepinephrine
**Use:** MAP <60-65 mmHg despite inotropes
```typescript
Dose: 0.05-0.3 mcg/kg/min
Effects:
  - MAP: +10-15 mmHg
  - SVR: +150-200 dyn·s/cm⁻⁵
  - CO: -0.15 L/min (↑afterload effect)
```
**Strategy:** Low-dose to maintain perfusion pressure while optimizing contractility

**⚠️ Caution:** Excessive vasopressors worsen afterload → ↓CO (detrimental in cardiogenic shock)

### 3.4 Afterload Reduction

#### Vasodilators (When MAP Adequate)
**Indications:** MAP >70-75 mmHg + High SVR (>1500)
- **Nitroglycerin:** Preload > Afterload reduction
- **Nitroprusside:** Balanced vasodilation
- **Nesiritide:** BNP analog

**Effects:**
```typescript
SVR: -250 dyn·s/cm⁻⁵
CO: +0.3 L/min (improved via ↓afterload)
PCWP: -3-5 mmHg
```

### 3.5 Diuretics

#### Furosemide (Loop Diuretic)
**Indications:** Pulmonary edema, CVP >12-15
```typescript
Effects:
  - CVP: -1.5 mmHg
  - SpO2: +2% (improved pulmonary congestion)
  - RR: -1 breath/min
```
**⚠️ Caution:** Excessive diuresis → ↓preload → ↓CO (careful titration needed)

---

## 4. Mechanical Circulatory Support (MCS)

### 4.1 IABP (Intra-Aortic Balloon Pump)
**Mechanism:** Diastolic augmentation + Systolic unloading
```typescript
Indications (SCAI Stage C):
  - CI <2.2 L/min/m²
  - MAP <65 mmHg
  - Mechanical complications (VSR, acute MR)

Effects:
  - ↑ Coronary perfusion (diastolic augmentation)
  - ↓ Afterload (systolic unloading)
  - CO improvement: +0.5-0.8 L/min
```
**Note:** IABP-SHOCK II trial showed no mortality benefit, but may bridge to recovery/definitive therapy

### 4.2 Impella (Percutaneous LV Assist Device)
**Mechanism:** Direct LV unloading + CO augmentation
```typescript
Indications (SCAI Stage D):
  - CI <2.0 L/min/m²
  - Refractory shock (vasopressor >0.3 mcg/kg/min)

Effects:
  - CO augmentation: +1.2-1.5 L/min
  - LV unloading (↓LVEDP, ↓PCWP)
  - ↓ Myocardial O2 demand
```
**Devices:**
- Impella 2.5: +2.5 L/min
- Impella CP: +3.5-4 L/min
- Impella 5.0: +5 L/min

### 4.3 VA-ECMO (Venoarterial Extracorporeal Membrane Oxygenation)
**Mechanism:** Full cardiopulmonary support
```typescript
Indications (SCAI Stage E):
  - MAP <50 mmHg
  - CI <1.8 L/min/m²
  - Cardiac arrest/impending arrest
  - Refractory to all therapies

Effects:
  - Complete circulatory support
  - CO improvement: +2-5 L/min (full support)
  - Oxygenation support
```
**⚠️ Complications:** LV distension (may need venting), limb ischemia, bleeding

### 4.4 MCS Decision Algorithm
```
SCAI Stage E (MAP <50, CI <1.8)
  → EMERGENT VA-ECMO

SCAI Stage D (CI <2.0, High vasopressor dose)
  → URGENT Impella

SCAI Stage C (CI <2.2, MAP <65)
  → CONSIDER IABP

SCAI Stage B-C + Medical optimization
  → Continue inotropes/vasopressors
```

---

## 5. Progression Algorithm

### 5.1 Natural History (Untreated)
**Vicious Cycle Acceleration:**
```typescript
Time progression (per hour):
  - CO: -0.3 L/min (progressive deterioration)
  - SpO2: -2% (worsening pulmonary edema)
  - CVP: +1 mmHg (increasing congestion)
  - HR: +5 bpm (compensatory tachycardia)
  - SVR: +100 dyn·s/cm⁻⁵ (vasoconstriction)
  - Lactate: +0.3 mmol/L (tissue hypoperfusion)
```

### 5.2 Response to Interventions

#### With Inotropes
```typescript
CO: +0.8 L/min
SpO2: +3%
CVP: -0.5 mmHg
Contractility: Significant improvement
```

#### With Vasopressors (Mixed Effect)
```typescript
SVR: +150 dyn·s/cm⁻⁵
CO: -0.15 L/min (afterload ↑)
MAP: +10-15 mmHg (perfusion pressure ↑)
```

#### With Diuretics
```typescript
SpO2: +2%
CVP: -1.5 mmHg
RR: -1 breath/min
Pulmonary congestion: Improved
```

#### With Mechanical Support
```typescript
CO: +1.2 L/min (Impella) or Full support (ECMO)
SpO2: +4%
CVP: -2 mmHg
SVR: -200 dyn·s/cm⁻⁵ (unloading)
```

#### With RV Failure
```typescript
CVP: +1.5 mmHg (RV congestion)
SpO2: -1% (V/Q mismatch)
Special considerations: Avoid preload reduction
```

#### With Active Arrhythmia
```typescript
CO: -0.4 L/min (loss of atrial kick/irregular rhythm)
HR: +10 bpm (tachyarrhythmia)
```

---

## 6. User Adaptability Features

### 6.1 Difficulty Modifiers
The algorithm adapts to user competence level:

**Intensivista (Expert):**
- Baseline Severity: 1.3x (more severe)
- Treatment Efficacy: 0.8x (harder to treat)
- Degradation Speed: 2.0x (faster deterioration)
- Complications: More frequent

**Clínico (Intermediate):**
- Baseline Severity: 1.0x
- Treatment Efficacy: 1.0x
- Degradation Speed: 1.0x
- Complications: Moderate

**Médico/Acadêmico (Beginner):**
- Baseline Severity: 0.7x (less severe)
- Treatment Efficacy: 1.5x (better response)
- Degradation Speed: 0.5x (slower)
- Complications: Fewer, with hints

### 6.2 Real-Time Feedback
- **Critical Alerts:** MAP <50, SpO2 <75, HR <40 or >160
- **Warnings:** Suboptimal parameters
- **Recommendations:** Treatment suggestions (fluid risk warnings, MCS indications)
- **Educational Hints:** Pathophysiology explanations (beginner mode)

---

## 7. Medical Accuracy & Evidence Base

### 7.1 Guidelines Referenced
1. **ESC Guidelines on Acute Heart Failure (2023)**
2. **ACC/AHA Heart Failure Guidelines (2022)**
3. **SCAI Classification of Cardiogenic Shock (2019)**
4. **Surviving Sepsis Campaign (hemodynamic monitoring)**

### 7.2 Clinical Trials
1. **SHOCK Trial (1999):** Early revascularization in AMI-CS
2. **IABP-SHOCK II (2012):** IABP in cardiogenic shock
3. **ESCAPE Trial (2005):** PAC-guided therapy in CHF
4. **DanGer Shock (2024):** Impella vs. standard care

### 7.3 Hemodynamic Formulas
```typescript
MAP = Diastolic + (Systolic - Diastolic) / 3

Cardiac Output = HR × Stroke Volume / 1000

Cardiac Index = CO / BSA

SVR = (MAP - CVP) × 80 / CO

BSA = √[(Height × Weight) / 3600] (Mosteller)
```

### 7.4 Normal Ranges vs. Cardiogenic Shock
| Parameter | Normal | Cardiogenic Shock |
|-----------|--------|-------------------|
| CI | 2.5-4 L/min/m² | <2.2 L/min/m² |
| CVP | 2-8 mmHg | >12-15 mmHg |
| PCWP | 6-12 mmHg | >18-20 mmHg |
| LVEF | 55-70% | <30-40% |
| SVR | 800-1200 dyn·s/cm⁻⁵ | >1500 dyn·s/cm⁻⁵ |
| MAP | 70-100 mmHg | <65 mmHg |
| Lactate | 0.5-2 mmol/L | >4 mmol/L |

---

## 8. Interface Compatibility

### 8.1 Data Structures
All enhanced features maintain **full backward compatibility** with existing interfaces:
```typescript
VitalSigns: Standard interface
HemodynamicState: Extended with optional fields
LabValues: Extended with magnesium, chloride
```

### 8.2 Optional Parameters
Advanced features use optional parameters:
```typescript
progressCardiogenicShock(
  currentVitals,
  timeSinceOnset,
  hasInotropes,
  hasVasopressors,
  fluidOverload,
  additionalParams?: {  // OPTIONAL
    hasDiuretics?: boolean;
    hasMechanicalSupport?: boolean;
    hasVasodilators?: boolean;
    rvFailure?: boolean;
    activeArrhythmia?: boolean;
  }
)
```

### 8.3 Export Functions
```typescript
// Core algorithm
export const cardiogenicShock: ShockProfile

// Progression
export function progressCardiogenicShock(...)

// Inotrope response
export function cardiogenicInotropeResponse(...)

// Fluid risk assessment
export function cardiogenicFluidRisk(...)

// SCAI staging
export function calculateSCAIStage(...)

// MCS assessment
export function assessMCSIndication(...)

// Type definitions
export interface CardiogenicShockSubtype {...}
export interface CardiogenicHemodynamics extends HemodynamicState {...}
```

---

## 9. Clinical Pearls & Warnings

### 9.1 Key Management Principles
1. **Identify and treat the cause** (revascularization for AMI-CS)
2. **Optimize hemodynamics:** MAP >65, CI >2.2, Lactate ↓
3. **Avoid fluid overload** (worsens pulmonary edema)
4. **Inotropes first, vasopressors second** (contractility is the problem)
5. **Early MCS consideration** (don't wait too long)
6. **Multidisciplinary approach** (cardiology, cardiac surgery, ICU)

### 9.2 Common Errors (Simulated)
- ❌ **Excessive fluids:** Worsens pulmonary edema
- ❌ **High-dose vasopressors without inotropes:** ↑Afterload → ↓CO
- ❌ **Delayed MCS:** Irreversible organ damage
- ❌ **Ignoring arrhythmias:** Significant hemodynamic impact
- ❌ **Under-treating pain/anxiety:** ↑Sympathetic tone → ↑afterload

### 9.3 Goals of Therapy
**Initial (First 6 hours):**
- MAP >65 mmHg
- Urine output >0.5 mL/kg/hr
- Lactate clearance >10%/hr
- Improved mental status

**Sustained (24-48 hours):**
- CI >2.2 L/min/m²
- Lactate <2 mmol/L
- Weaning vasopressors/inotropes
- Organ function recovery

---

## 10. Future Enhancements

### 10.1 Planned Features
- [ ] **Biomarker tracking:** Troponin, BNP, proBNP
- [ ] **Echocardiography integration:** Real-time LVEF, wall motion
- [ ] **Coronary intervention simulation:** PCI, CABG effects
- [ ] **Arrhythmia management:** Cardioversion, pacing
- [ ] **Advanced MCS:** BiVAD, Total Artificial Heart
- [ ] **Weaning protocols:** MCS weaning strategies

### 10.2 Research Integration
- Continuous updates based on latest trials
- Machine learning for outcome prediction
- Personalized treatment algorithms

---

## 11. Conclusion

The enhanced cardiogenic shock algorithm provides a **medically accurate, evidence-based simulation** that:

✅ **Reflects real pathophysiology** (vicious cycle, Frank-Starling curve)  
✅ **Includes multiple treatment modalities** (inotropes, vasopressors, MCS)  
✅ **Adapts to adjacent conditions** (RV failure, arrhythmias, fluid overload)  
✅ **Provides educational value** (SCAI staging, treatment recommendations)  
✅ **Maintains interface compatibility** (backward compatible)  
✅ **Supports multiple difficulty levels** (beginner to expert)

This creates an **immersive training environment** where users learn the complex decision-making required in managing critically ill cardiogenic shock patients.

---

## 12. References

1. Thiele H, et al. Management of cardiogenic shock. Eur Heart J. 2023.
2. Hochman JS, et al. Early revascularization in acute myocardial infarction complicated by cardiogenic shock. NEJM. 1999.
3. Thiele H, et al. Intraaortic balloon support for myocardial infarction with cardiogenic shock. NEJM. 2012.
4. Baran DA, et al. SCAI clinical expert consensus statement on the classification of cardiogenic shock. Catheter Cardiovasc Interv. 2019.
5. van Diepen S, et al. Contemporary management of cardiogenic shock. Circulation. 2017.
6. Vallabhajosyula S, et al. Cardiogenic shock in takotsubo cardiomyopathy. J Am Coll Cardiol. 2019.
7. Basir MB, et al. Improved outcomes associated with the use of shock protocols. Catheter Cardiovasc Interv. 2019.

---

**Document Control:**
- Version: 2.0
- Last Updated: December 11, 2025
- Next Review: March 2026
- Classification: Educational/Training Use

---

*This algorithm is designed for medical education and simulation purposes. Always follow institutional protocols and current guidelines in clinical practice.*
