import { useState, useEffect } from 'react';
import { PatientData } from '../App';
import { Play, Pause, Volume2, VolumeX, Trophy, Skull } from 'lucide-react';
import svgPaths from "../imports/svg-9ump4o6n93";

// Import simulation utilities
import { SimulationState, ActiveIntervention, FluidBalance, VentilationSettings } from '@/utils/types';
import { 
  UPDATE_INTERVAL_MS, 
  SIM_MINUTES_PER_UPDATE,
  GASOMETRY_REFRESH_INTERVAL_SIM,
  LAB_REFRESH_INTERVAL_SIM,
  REAL_TO_SIM_RATIO 
} from '@/utils/constants';
import { 
  initializeVitals, 
  initializeHemodynamics, 
  initializeLabs,
  updateVitals,
  updateLabs,
  detectAlerts 
} from '@/utils/simulationEngine';
import { 
  applyFluidBolus, 
  calculateTreatmentEffects,
  updateFluidBalance,
  addFluidToBalance,
  addUrineOutput,
  estimateUrineOutput 
} from '@/utils/treatments';
import {
  initializeVentilation,
  performIntubation,
  updateVentilationSettings,
  checkVentilatorComplications,
  performExtubation,
  calculateVentilationHemodynamicEffects
} from '@/utils/ventilation';
import {
  initializeCriticalStateTracker,
  updateCriticalStateTracker,
  evaluateOutcome,
  generateOutcomeFeedback,
  trackStability,
  isPatientStable,
  PatientOutcome,
  CriticalStateTracker,
  OutcomeResult
} from '@/utils/outcomeSystem';

// Import new components
import { PatientMonitor } from './PatientMonitor';
import { FluidBalanceDisplay } from './FluidBalanceDisplay';

interface SimulationProps {
  patientData: PatientData;
  onBack: () => void;
}

export default function Simulation({ patientData, onBack }: SimulationProps) {
  // Time tracking
  const [realTimeElapsed, setRealTimeElapsed] = useState(0); // seconds
  const [simTimeElapsed, setSimTimeElapsed] = useState(0); // simulation minutes
  const [isPlaying, setIsPlaying] = useState(false);
  const [muteAlerts, setMuteAlerts] = useState(false);

  // Initialize simulation state
  const [simulationState, setSimulationState] = useState<SimulationState>(() => {
    const initialLabs = initializeLabs(patientData);
    return {
      vitals: initializeVitals(patientData),
      labs: initialLabs,
      fluidBalance: {
        totalInput: 0,
        totalOutput: 0,
        netBalance: 0,
        crystalloids: 0,
        colloids: 0,
        blood: 0,
        urine: 0,
        insensibleLoss: 0,
      },
      hemodynamics: initializeHemodynamics(patientData),
      activeInterventions: [],
      ventilation: initializeVentilation(),
      simTimeElapsed: 0,
      realTimeElapsed: 0,
      isStable: false,
      isDeteriorating: true,
      complications: [],
      criticalAlerts: [],
      warnings: [],
      stabilityDuration: 0,
      initialLactate: initialLabs.lactate || 2.0,
    };
  });

  // Critical state tracker for death determination
  const [criticalTracker, setCriticalTracker] = useState<CriticalStateTracker>(
    initializeCriticalStateTracker()
  );

  // Outcome state
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);

  // Fluid inputs
  const [salineAmount, setSalineAmount] = useState('42');
  const [ringerAmount, setRingerAmount] = useState('42');
  const [albuminAmount, setAlbuminAmount] = useState('100');
  const [bloodAmount, setBloodAmount] = useState('300');

  // Amine inputs
  const [noradrenalineAmount, setNoradrenalineAmount] = useState('0.1');
  const [vasopressinAmount, setVasopressinAmount] = useState('0.03');
  const [dobutamineAmount, setDobutamineAmount] = useState('5');
  const [adrenalineAmount, setAdrenalineAmount] = useState('0.1');

  // POCUS and Urine Output state
  const [lastPocusCheck, setLastPocusCheck] = useState<{
    time: number;
    vci: string;
    bLines: string;
  } | null>(null);
  const [lastUrineCheck, setLastUrineCheck] = useState<{
    time: number;
    rate: number;
    volume: number;
    newVolume?: number;
  } | null>(null);

  // Speed control
  const [speedMultiplier, setSpeedMultiplier] = useState(12); // Start at 12x speed

  // Intervention log - track all interventions with timestamps
  const [interventionLog, setInterventionLog] = useState<Array<{
    id: string;
    time: number;
    name: string;
    type: 'fluid' | 'vasopressor' | 'inotrope' | 'medication' | 'procedure';
    dose?: number;
    rate?: number;
    volume?: number;
    status: 'iniciado' | 'finalizado' | 'ativo';
  }>>([]);

  // Collapsed sections state
  const [isColetasCollapsed, setIsColetasCollapsed] = useState(false);
  const [isFluidosCollapsed, setIsFluidosCollapsed] = useState(false);
  const [isAminasCollapsed, setIsAminasCollapsed] = useState(false);
  const [isProcedimentosCollapsed, setIsProcedimentosCollapsed] = useState(false);
  const [isMedicamentosCollapsed, setIsMedicamentosCollapsed] = useState(false);

  // Main simulation update loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && outcomeResult?.outcome === PatientOutcome.ONGOING || !outcomeResult) {
      interval = setInterval(() => {
        const simMinutesThisUpdate = SIM_MINUTES_PER_UPDATE * speedMultiplier;
        setRealTimeElapsed(prev => prev + (UPDATE_INTERVAL_MS / 1000));
        setSimTimeElapsed(prev => prev + simMinutesThisUpdate);
        
        setSimulationState(prevState => {
          // Update fluid balance (insensible losses)
          const newFluidBalance = updateFluidBalance(
            prevState.fluidBalance,
            patientData.weight,
            simMinutesThisUpdate
          );

          // Calculate urine output
          const urineProduced = estimateUrineOutput(
            prevState.vitals.map,
            prevState.vitals.cardiacOutput,
            patientData.weight,
            SIM_MINUTES_PER_UPDATE
          );
          const balanceWithUrine = addUrineOutput(newFluidBalance, urineProduced);

          // Update active interventions - mark completed ones
          const updatedInterventions = prevState.activeInterventions.map(intervention => {
            if (intervention.duration && !intervention.isCompleted) {
              const elapsedTime = prevState.simTimeElapsed - intervention.startTime;
              if (elapsedTime >= intervention.duration) {
                return { ...intervention, isCompleted: true, isActive: true }; // Keep active to show "Finished"
              }
            }
            return intervention;
          });

          // Calculate treatment effects
          const treatmentEffects = calculateTreatmentEffects(
            prevState.vitals,
            prevState.hemodynamics,
            updatedInterventions,
            patientData.shockType,
            patientData.weight,
            prevState.simTimeElapsed,
            patientData.conditions // Pass patient conditions for comorbidity effects
          );

          // Apply treatment effects to current vitals
          const vitalsWithTreatments = {
            ...prevState.vitals,
            ...treatmentEffects.vitals,
          };

          // Update vitals with shock progression
          const newVitals = updateVitals(
            { ...prevState, vitals: vitalsWithTreatments, fluidBalance: balanceWithUrine },
            patientData,
            simMinutesThisUpdate
          );

          // Update labs
          const newLabs = updateLabs(
            prevState.labs,
            newVitals,
            simMinutesThisUpdate,
            patientData.shockType
          );

          // Detect alerts
          const { criticalAlerts, warnings } = detectAlerts(newVitals);
          
          // Add ventilator warnings if intubated
          const ventWarnings = checkVentilatorComplications(
            prevState.ventilation,
            newVitals,
            patientData.weight
          );

          // Update hemodynamics (including ventilation effects)
          let newHemodynamics = {
            ...prevState.hemodynamics,
            ...treatmentEffects.hemodynamics,
          };
          
          if (prevState.ventilation.isIntubated) {
            const ventEffects = calculateVentilationHemodynamicEffects(
              prevState.ventilation,
              newVitals,
              newHemodynamics,
              patientData.shockType
            );
            newHemodynamics = { ...newHemodynamics, ...ventEffects.hemodynamics };
          }

          // Check patient stability
          const currentlyStable = isPatientStable(newVitals, newLabs, patientData.shockType);
          const newStabilityDuration = trackStability(
            prevState.stabilityDuration,
            currentlyStable,
            simMinutesThisUpdate
          );

          return {
            ...prevState,
            vitals: newVitals,
            labs: newLabs,
            fluidBalance: balanceWithUrine,
            hemodynamics: newHemodynamics,
            activeInterventions: updatedInterventions,
            simTimeElapsed: prevState.simTimeElapsed + simMinutesThisUpdate,
            realTimeElapsed: prevState.realTimeElapsed + (UPDATE_INTERVAL_MS / 1000),
            criticalAlerts,
            warnings: [...warnings, ...ventWarnings],
            isStable: currentlyStable,
            stabilityDuration: newStabilityDuration,
          };
        });

        // Update critical state tracker
        setCriticalTracker(prevTracker => 
          updateCriticalStateTracker(
            prevTracker,
            simulationState.vitals,
            simulationState.labs,
            simMinutesThisUpdate
          )
        );

        // Evaluate outcome
        const outcome = evaluateOutcome(
          simulationState,
          patientData,
          criticalTracker,
          simulationState.stabilityDuration,
          simulationState.initialLactate
        );

        if (outcome.outcome !== PatientOutcome.ONGOING) {
          setOutcomeResult(outcome);
          setIsPlaying(false); // Stop simulation
        }
      }, UPDATE_INTERVAL_MS);
    }
    return () => clearInterval(interval);
  }, [isPlaying, patientData, speedMultiplier, simulationState, criticalTracker, outcomeResult]);

  const formatSimTime = (simMinutes: number) => {
    const hours = Math.floor(simMinutes / 60);
    const mins = Math.floor(simMinutes % 60);
    return `${hours}h${mins.toString().padStart(2, '0')}m`;
  };

  const formatRealTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handler for fluid bolus
  const handleFluidBolus = (fluidType: 'crystalloid' | 'colloid' | 'blood', volumeMl: number, name: string) => {
    setSimulationState(prevState => {
      const result = applyFluidBolus(
        prevState.vitals,
        prevState.hemodynamics,
        patientData.shockType,
        fluidType,
        volumeMl,
        patientData.weight,
        patientData.conditions // Pass patient conditions for comorbidity effects
      );

      // Add to fluid balance
      const newFluidBalance = addFluidToBalance(
        prevState.fluidBalance,
        fluidType,
        volumeMl
      );

      // Determine if this is a single-dose intervention (Albumina or Hemácias)
      const isSingleDose = name === 'Albumina' || name === 'Concentrado de Hemácias';
      const infusionDuration = isSingleDose ? 30 : undefined; // 30 minutes for single doses

      // Create intervention record
      const intervention: ActiveIntervention = {
        id: `fluid-${Date.now()}`,
        type: 'fluid',
        name: name,
        volume: volumeMl,
        startTime: prevState.simTimeElapsed,
        duration: infusionDuration,
        isActive: true,
        isCompleted: false,
      };

      return {
        ...prevState,
        vitals: { ...prevState.vitals, ...result.vitals },
        hemodynamics: { ...prevState.hemodynamics, ...result.hemodynamics },
        fluidBalance: newFluidBalance,
        activeInterventions: [...prevState.activeInterventions, intervention],
      };
    });

    // Add to intervention log
    const isSingleDoseForLog = name === 'Albumina' || name === 'Concentrado de Hemácias';
    setInterventionLog(prev => [...prev, {
      id: `fluid-${Date.now()}`,
      time: simTimeElapsed,
      name: name,
      type: 'fluid',
      volume: volumeMl,
      status: isSingleDoseForLog ? 'iniciado' : 'ativo'
    }]);
  };

  // Handler for vasopressor/inotrope
  const handleDrugStart = (drugType: 'vasopressor' | 'inotrope', drugName: string, dose: number) => {
    setSimulationState(prevState => {
      const intervention: ActiveIntervention = {
        id: `drug-${Date.now()}`,
        type: drugType,
        name: drugName,
        dose: dose,
        startTime: prevState.simTimeElapsed,
        isActive: true,
      };

      return {
        ...prevState,
        activeInterventions: [...prevState.activeInterventions, intervention],
      };
    });

    // Add to intervention log
    setInterventionLog(prev => [...prev, {
      id: `drug-${Date.now()}`,
      time: simTimeElapsed,
      name: drugName,
      type: drugType,
      dose: dose,
      status: 'iniciado'
    }]);
  };

  // Handler for stopping an intervention
  const handleStopIntervention = (interventionId: string) => {
    setSimulationState(prevState => ({
      ...prevState,
      activeInterventions: prevState.activeInterventions.map(i =>
        i.id === interventionId ? { ...i, isActive: false } : i
      ),
    }));
  };

  // Handler for adjusting infusion rate
  const handleAdjustRate = (interventionId: string, direction: 'up' | 'down') => {
    setSimulationState(prevState => ({
      ...prevState,
      activeInterventions: prevState.activeInterventions.map(i => {
        if (i.id === interventionId) {
          // For noradrenalin, use 0.1 increments instead of multiplier
          if (i.name === 'Noradrenalina') {
            const increment = direction === 'up' ? 0.1 : -0.1;
            return {
              ...i,
              dose: i.dose ? Math.max(0.1, parseFloat((i.dose + increment).toFixed(1))) : i.dose,
            };
          }
          // For other drugs and fluids, use multiplier
          const multiplier = direction === 'up' ? 1.25 : 0.8;
          return {
            ...i,
            volume: i.volume ? Math.round(i.volume * multiplier) : i.volume,
            dose: i.dose ? parseFloat((i.dose * multiplier).toFixed(2)) : i.dose,
          };
        }
        return i;
      }),
    }));
  };

  // Handler for refreshing labs
  const handleRefreshLabs = () => {
    const timeSinceLastLab = simTimeElapsed - simulationState.labs.lastLabTime;
    if (timeSinceLastLab >= LAB_REFRESH_INTERVAL_SIM || simulationState.labs.lastLabTime === 0) {
      setSimulationState(prevState => ({
        ...prevState,
        labs: { ...prevState.labs, lastLabTime: prevState.simTimeElapsed },
      }));
    }
  };

  // Handler for refreshing gasometry
  const handleRefreshGasometry = () => {
    const timeSinceLastGas = simTimeElapsed - simulationState.labs.lastGasometryTime;
    if (timeSinceLastGas >= GASOMETRY_REFRESH_INTERVAL_SIM || simulationState.labs.lastGasometryTime === 0) {
      setSimulationState(prevState => ({
        ...prevState,
        labs: { ...prevState.labs, lastGasometryTime: prevState.simTimeElapsed },
      }));
    }
  };
  // Handler for POCUS check
  const handlePocusCheck = () => {
    const vci = simulationState.vitals.cvp < 5 
      ? 'colapsável (<8mm)' 
      : simulationState.vitals.cvp > 12 
      ? 'dilatada (>20mm)' 
      : 'normal (8-20mm)';
    
    const bLines = simulationState.vitals.spO2 < 90 && simulationState.fluidBalance.netBalance > 2000 
      ? 'Presentes (edema pulmonar)' 
      : 'Ausentes';
    
    setLastPocusCheck({
      time: simTimeElapsed,
      vci,
      bLines,
    });
  };

  // Handler for intubation
  const handleIntubation = () => {
    if (simulationState.ventilation.isIntubated) {
      alert('Paciente já está intubado');
      return;
    }
    
    setSimulationState(prevState => {
      const newVentilation = performIntubation(
        patientData.weight,
        prevState.ventilation,
        prevState.vitals
      );
      
      return {
        ...prevState,
        ventilation: newVentilation,
      };
    });
  };

  // Handler for ventilation settings update
  const handleVentilationUpdate = (changes: Partial<VentilationSettings>) => {
    setSimulationState(prevState => ({
      ...prevState,
      ventilation: updateVentilationSettings(prevState.ventilation, changes),
    }));
  };

  // Handler for extubation
  const handleExtubation = () => {
    const result = performExtubation(
      simulationState.ventilation,
      simulationState.vitals
    );
    
    if (result.success) {
      setSimulationState(prevState => ({
        ...prevState,
        ventilation: result.ventilation,
      }));
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  // Handler for urine output check
  const handleUrineCheck = () => {
    const currentVolume = simulationState.fluidBalance.urine;
    const previousVolume = lastUrineCheck?.volume || 0;
    const newVolume = currentVolume - previousVolume;
    const rate = simulationState.fluidBalance.urine / patientData.weight / (simTimeElapsed / 60 || 1);
    setLastUrineCheck({
      time: simTimeElapsed,
      rate,
      volume: currentVolume,
      newVolume,
    });
  };
  // Get active infusions for display
  const getActiveInfusions = () => {
    const activeInterventions = simulationState.activeInterventions.filter(i => i.isActive);
    
    // Group by name to combine duplicates (especially "Soro Fisiológico")
    const grouped = activeInterventions.reduce((acc, intervention) => {
      const key = intervention.name;
      if (!acc[key]) {
        acc[key] = { ...intervention, totalVolume: 0, totalDose: 0 };
      }
      
      // Sum volumes for fluids
      if (intervention.volume) {
        acc[key].totalVolume += intervention.volume;
      }
      
      // Sum doses for drugs
      if (intervention.dose) {
        acc[key].totalDose += intervention.dose;
      }
      
      return acc;
    }, {} as Record<string, ActiveIntervention & { totalVolume: number; totalDose: number }>);
    
    // Convert back to array with combined values
    return Object.values(grouped).map(item => ({
      ...item,
      volume: item.totalVolume || undefined,
      dose: item.totalDose || undefined,
    }));
  };

  // Infusion pump component
  const InfusionPump = ({ 
    label, 
    rate, 
    interventionId, 
    onStop, 
    onAdjustRate 
  }: { 
    label: string; 
    rate: string; 
    interventionId: string; 
    onStop: (id: string) => void;
    onAdjustRate: (id: string, direction: 'up' | 'down') => void;
  }) => (
    <div className="relative bg-[#cac8c8] border-4 border-black h-[145px] w-[437px]">
      {/* Top corner X button (clickable) */}
      <button
        onClick={() => onStop(interventionId)}
        className="absolute right-[24px] top-[6px] flex items-center justify-center w-[17.678px] h-[17.678px] cursor-pointer hover:opacity-70 transition-opacity"
        title="Parar infusão"
      >
        <div className="absolute" style={{ transform: 'rotate(135deg)' }}>
          <div className="bg-[#0c0c0c] h-[20px] rounded-[4px] w-[5px]" />
        </div>
        <div className="absolute" style={{ transform: 'rotate(45deg)' }}>
          <div className="bg-[#0c0c0c] h-[20px] rounded-[4px] w-[5px]" />
        </div>
      </button>
      
      {/* Blue display screen */}
      <div className="absolute bg-[#9ee2ff] border border-black h-[103px] left-[27px] top-[19px] w-[296px]">
        <div className="flex flex-col justify-center h-full px-3">
          <p className="text-[#4e4e4e] text-[14px] text-left leading-tight mb-2" style={{ fontFamily: 'Courier New, monospace', fontWeight: '700' }}>
            {label}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[#4e4e4e] text-[38px] leading-none" style={{ fontFamily: 'Courier New, monospace', fontWeight: '900' }}>
              {rate.split(' ')[0]}
            </p>
            <p className="text-[#4e4e4e] text-[11px] leading-tight" style={{ fontFamily: 'Courier New, monospace', fontWeight: '600' }}>
              {rate.split(' ').slice(1).join(' ')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Control buttons */}
      <button
        onClick={() => onAdjustRate(interventionId, 'up')}
        className="absolute right-[27px] top-[30px] size-[37px] flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
        title="Aumentar taxa"
      >
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 37 37">
          <circle cx="18.5" cy="18.5" fill="#58FF5E" r="18" stroke="black" />
        </svg>
        <span className="absolute font-bold text-black text-[20px]">↑</span>
      </button>
      <button
        onClick={() => onAdjustRate(interventionId, 'down')}
        className="absolute right-[27px] top-[79px] size-[37px] flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
        title="Diminuir taxa"
      >
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 37 37">
          <circle cx="18.5" cy="18.5" fill="#FF5858" r="18" stroke="black" />
        </svg>
        <span className="absolute font-bold text-black text-[20px]">↓</span>
      </button>
    </div>
  );

  // Input box with border (matching Figma design)
  const InputBox = ({ value, onChange, className = "" }: { value: string; onChange: (val: string) => void; className?: string }) => (
    <div className={`relative h-[40px] w-[165px] ${className}`}>
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 165 40">
        <path d={svgPaths.p3ffde180} fill="white" stroke="#D9D9D9" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 bg-transparent border-none text-center font-['Inter:Regular',sans-serif] text-[#1e1e1e] text-[16px] px-2"
      />
    </div>
  );

  return (
    <div className="bg-[#dfdfdf] min-h-screen w-full overflow-x-auto pb-20 pt-0 m-0">
      {/* Outcome Modal */}
      {outcomeResult && outcomeResult.outcome !== PatientOutcome.ONGOING && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-[19px] shadow-2xl p-8 max-w-2xl w-full mx-4">
            <div className="text-center mb-6">
              {outcomeResult.outcome === PatientOutcome.SURVIVED ? (
                <>
                  <Trophy className="w-24 h-24 text-green-500 mx-auto mb-4" />
                  <h2 className="text-4xl font-bold text-green-600">PACIENTE SOBREVIVEU!</h2>
                </>
              ) : (
                <>
                  <Skull className="w-24 h-24 text-red-500 mx-auto mb-4" />
                  <h2 className="text-4xl font-bold text-red-600">PACIENTE FOI A ÓBITO</h2>
                </>
              )}
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {generateOutcomeFeedback(outcomeResult, simulationState, patientData)}
              </pre>
            </div>

            {/* Critical state summary if patient died */}
            {outcomeResult.outcome === PatientOutcome.DIED && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-red-800 mb-2">Estado Crítico:</h3>
                <p className="text-sm text-red-700">
                  • Episódios críticos: {criticalTracker.incompatibleVitalsCount}<br/>
                  • Tempo total em estado crítico: {criticalTracker.incompatibleVitalsDuration.toFixed(0)} min<br/>
                  • Tempo desde última recuperação: {criticalTracker.timeSinceLastRecovery.toFixed(0)} min
                </p>
              </div>
            )}

            {/* Stability metrics if patient survived */}
            {outcomeResult.outcome === PatientOutcome.SURVIVED && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-green-800 mb-2">Estabilidade Alcançada:</h3>
                <p className="text-sm text-green-700">
                  • Duração da estabilidade: {simulationState.stabilityDuration.toFixed(0)} min<br/>
                  • PAM final: {simulationState.vitals.map.toFixed(0)} mmHg<br/>
                  • Lactato final: {simulationState.labs.lactate.toFixed(1)} mmol/L<br/>
                  • Débito cardíaco: {simulationState.vitals.cardiacOutput.toFixed(1)} L/min
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={onBack}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold shadow-lg transition-colors"
              >
                Voltar ao Menu
              </button>
              <button
                onClick={() => {
                  setOutcomeResult(null);
                  window.location.reload();
                }}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-colors"
              >
                Novo Caso
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#ebf5ff] rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] min-h-[2000px] mx-auto mt-0 mb-[45px] w-[1580px] flex gap-8 p-8 pt-20">
        
        {/* LEFT COLUMN */}
        <div className="flex-shrink-0 w-[920px]">
          {/* Live Patient Monitor */}
          <PatientMonitor
            vitals={simulationState.vitals}
            isActive={isPlaying}
            muteAlerts={muteAlerts}
          />
          
          {/* Time displays below monitor */}
          <div className="flex gap-4 mt-4 items-center">
            <div className="bg-white px-4 py-2 rounded-lg shadow font-mono">
              <div className="text-xs text-gray-500">Tempo Real</div>
              <div className="text-lg font-bold">{formatRealTime(realTimeElapsed)}</div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow font-mono">
              <div className="text-xs text-gray-500">Tempo Simulação ({speedMultiplier}x)</div>
              <div className="text-lg font-bold">{formatSimTime(simTimeElapsed)}</div>
            </div>

            {/* Patient Status Indicator */}
            {criticalTracker.reasonsForIncompatibility.length > 0 ? (
              <div className="bg-red-100 border-2 border-red-500 px-4 py-2 rounded-lg shadow animate-pulse">
                <div className="text-xs font-bold text-red-700">⚠️ ESTADO CRÍTICO</div>
                <div className="text-sm text-red-600">{criticalTracker.timeSinceLastRecovery.toFixed(0)} min</div>
              </div>
            ) : simulationState.stabilityDuration >= 30 ? (
              <div className="bg-green-100 border-2 border-green-500 px-4 py-2 rounded-lg shadow">
                <div className="text-xs font-bold text-green-700">✓ ESTÁVEL</div>
                <div className="text-sm text-green-600">{simulationState.stabilityDuration.toFixed(0)} min</div>
              </div>
            ) : (
              <div className="bg-yellow-100 border-2 border-yellow-500 px-4 py-2 rounded-lg shadow">
                <div className="text-xs font-bold text-yellow-700">⚡ INSTÁVEL</div>
                <div className="text-sm text-yellow-600">Monitorar</div>
              </div>
            )}
            
            {/* Speed Control */}
            <div className="bg-white px-4 py-2 rounded-lg shadow">
              <div className="text-xs text-gray-500 mb-1">Velocidade</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSpeedMultiplier(Math.max(1, speedMultiplier - 1))}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold"
                >
                  -
                </button>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={speedMultiplier}
                  onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
                  className="w-24"
                />
                <button
                  onClick={() => setSpeedMultiplier(Math.min(100, speedMultiplier + 1))}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold"
                >
                  +
                </button>
                <span className="text-sm font-bold w-12 text-center">{speedMultiplier}x</span>
              </div>
            </div>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold shadow-lg transition-colors ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              style={{ backgroundColor: isPlaying ? '#ef4444' : '#22c55e' }}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Iniciar</span>
                </>
              )}
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold shadow-lg transition-colors"
              style={{ backgroundColor: '#4b5563' }}
            >
              Voltar
            </button>
            <button
              onClick={() => setMuteAlerts(!muteAlerts)}
              className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              style={{ minWidth: '56px', minHeight: '56px' }}
            >
              {muteAlerts ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>
          
          {/* Current Infusions Section */}
          <div className="mt-8">
            <h3 className="font-['Inter:Bold',sans-serif] text-[25px] text-black mb-4">
              Infusões atuais:
            </h3>
            
            {/* Dynamic Infusion Pumps */}
            <div className="space-y-[23px]">
              {getActiveInfusions().slice(0, 5).map((intervention, idx) => {
                // Convert all to ml/h display
                let rateDisplay = '-';
                
                // Check if completed
                if (intervention.isCompleted) {
                  rateDisplay = 'Finalizado';
                } else if (intervention.volume) {
                  // For fluids, assume running over 1 hour
                  rateDisplay = `${intervention.volume} ml/h`;
                } else if (intervention.dose) {
                  // For drugs, show in original units
                  if (intervention.name === 'Vasopressina') {
                    rateDisplay = `${intervention.dose.toFixed(2)} U/min`;
                  } else {
                    rateDisplay = `${intervention.dose.toFixed(2)} mcg/kg/min`;
                  }
                }
                
                return (
                  <InfusionPump
                    key={intervention.id}
                    label={intervention.name}
                    rate={rateDisplay}
                    interventionId={intervention.id}
                    onStop={handleStopIntervention}
                    onAdjustRate={handleAdjustRate}
                  />
                );
              })}
              {getActiveInfusions().length === 0 && (
                <div className="text-gray-500 italic">Nenhuma infusão ativa</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 space-y-6">
          {/* Collections & Analyses */}
          <div className="bg-white rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Inter:Bold',sans-serif] text-[25px] text-black">
                Coletas & Análises
              </h3>
              <button 
                onClick={() => setIsColetasCollapsed(!isColetasCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-transform"
                style={{ transform: isColetasCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
              >
                <div className="bg-[#0c0c0c] h-[20px] rounded-[4px] w-[5px]" />
              </button>
            </div>

          {!isColetasCollapsed && (<>
          {/* Gas Results */}
          <div className="mb-6">
            <button 
              onClick={handleRefreshGasometry}
              className="bg-[#1e2081] rounded-[8px] px-6 py-3 mb-2 hover:bg-[#2a2c9f] transition-colors"
            >
              <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Nova Gasometria</p>
            </button>
            <p className="font-['Inter:Light',sans-serif] text-[16px] text-black">
              pH: {simulationState.labs.pH.toFixed(2)} | pCO2: {simulationState.labs.pCO2.toFixed(0)} | 
              pO2: {simulationState.labs.pO2.toFixed(0)} | HCO3: {simulationState.labs.hco3.toFixed(1)} | 
              Lac: {simulationState.labs.lactate.toFixed(1)}
            </p>
            <p className="font-['Inter:Light',sans-serif] text-[12px] text-gray-500 mt-1">
              Última: {formatSimTime(simulationState.labs.lastGasometryTime)}
            </p>
          </div>

          {/* Lab Results */}
          <div className="mb-6">
            <button 
              onClick={handleRefreshLabs}
              className="bg-[#1e2081] rounded-[8px] px-6 py-3 mb-2 hover:bg-[#2a2c9f] transition-colors"
            >
              <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Novo Laboratório</p>
            </button>
            <p className="font-['Inter:Light',sans-serif] text-[16px] text-black">
              Hb: {simulationState.labs.hemoglobin.toFixed(1)} | Hct: {simulationState.labs.hematocrit.toFixed(0)}% | 
              Leuco: {simulationState.labs.wbc.toFixed(0)} | Plaq: {(simulationState.labs.platelets/1000).toFixed(0)}k |
            </p>
            <p className="font-['Inter:Light',sans-serif] text-[16px] text-black">
              K: {simulationState.labs.potassium.toFixed(1)} | Cr: {simulationState.labs.creatinine.toFixed(2)} | 
              U: {simulationState.labs.urea.toFixed(0)} | Na: {simulationState.labs.sodium.toFixed(0)} | 
              Mg: {simulationState.labs.magnesium.toFixed(2)}
            </p>
            <p className="font-['Inter:Light',sans-serif] text-[12px] text-gray-500 mt-1">
              Última: {formatSimTime(simulationState.labs.lastLabTime)}
            </p>
          </div>

          {/* Urinary Output */}
          <div className="mb-6">
            <button 
              onClick={handleUrineCheck}
              className="bg-[#1e2081] rounded-[8px] px-6 py-3 mb-2 hover:bg-[#2a2c9f] transition-colors"
            >
              <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Verificar Débito Urinário</p>
            </button>
            {lastUrineCheck ? (
              <>
                <p className="font-['Inter:Light',sans-serif] text-[16px] text-black">
                  {lastUrineCheck.rate.toFixed(2)} mL/kg/h
                </p>
                <p className="font-['Inter:Light',sans-serif] text-[12px] text-gray-500 mt-1">
                  Verificado em: {formatSimTime(lastUrineCheck.time)} (Volume: {Math.round(lastUrineCheck.newVolume || 0)} mL)
                </p>
              </>
            ) : (
              <p className="font-['Inter:Light',sans-serif] text-[14px] text-gray-500 italic">
                Clique para verificar
              </p>
            )}
          </div>

          {/* POCUS */}
          <div>
            <button 
              onClick={handlePocusCheck}
              className="bg-[#1e2081] rounded-[8px] px-6 py-3 mb-2 hover:bg-[#2a2c9f] transition-colors"
            >
              <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Realizar POCUS</p>
            </button>
            {lastPocusCheck ? (
              <>
                <p className="font-['Inter:Light',sans-serif] text-[16px] text-black">
                  VCI: {lastPocusCheck.vci}
                </p>
                <p className="font-['Inter:Light',sans-serif] text-[14px] text-gray-600">
                  Linhas B: {lastPocusCheck.bLines}
                </p>
                <p className="font-['Inter:Light',sans-serif] text-[12px] text-gray-500 mt-1">
                  Realizado em: {formatSimTime(lastPocusCheck.time)}
                </p>
              </>
            ) : (
              <p className="font-['Inter:Light',sans-serif] text-[14px] text-gray-500 italic">
                Clique para realizar
              </p>
            )}
          </div>
        </>)}
        </div>

          {/* Fluids Section */}
          <div className="bg-white rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Inter:Bold',sans-serif] text-[25px] text-black">
                Fluidos
              </h3>
              <button 
                onClick={() => setIsFluidosCollapsed(!isFluidosCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-transform"
                style={{ transform: isFluidosCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
              >
                <div className="bg-[#0c0c0c] h-[20px] rounded-[4px] w-[5px]" />
              </button>
            </div>

          {!isFluidosCollapsed && (
          <div className="space-y-4">
            {/* Soro Fisiológico */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Soro Fisiológico a 0,9% (mL):
              </p>
              <InputBox value={salineAmount} onChange={setSalineAmount} className="mx-4" />
              <button 
                onClick={() => handleFluidBolus('crystalloid', parseFloat(salineAmount) || 500, 'Soro Fisiológico')}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Iniciar</p>
              </button>
            </div>

            {/* Ringer Lactato */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Ringer Lactato (mL):
              </p>
              <InputBox value={ringerAmount} onChange={setRingerAmount} className="mx-4" />
              <button 
                onClick={() => handleFluidBolus('crystalloid', parseFloat(ringerAmount) || 500, 'Ringer Lactato')}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Iniciar</p>
              </button>
            </div>

            {/* Albumina */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Albumina (mL):
              </p>
              <div className="flex items-center gap-3 mx-4">
                <button
                  onClick={() => setAlbuminAmount((prev) => Math.max(0, parseFloat(prev) - 100).toString())}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg w-10 h-10 flex items-center justify-center text-xl"
                >
                  −
                </button>
                <span className="font-['Courier New',monospace] font-bold text-[20px] w-20 text-center">{albuminAmount}</span>
                <button
                  onClick={() => setAlbuminAmount((prev) => (parseFloat(prev) + 100).toString())}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg w-10 h-10 flex items-center justify-center text-xl"
                >
                  +
                </button>
              </div>
              <button 
                onClick={() => handleFluidBolus('colloid', parseFloat(albuminAmount) || 100, 'Albumina')}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Iniciar</p>
              </button>
            </div>

            {/* Hemácias */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Hemácias (mL):
              </p>
              <div className="flex items-center gap-3 mx-4">
                <button
                  onClick={() => setBloodAmount((prev) => Math.max(0, parseFloat(prev) - 300).toString())}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg w-10 h-10 flex items-center justify-center text-xl"
                >
                  −
                </button>
                <span className="font-['Courier New',monospace] font-bold text-[20px] w-20 text-center">{bloodAmount}</span>
                <button
                  onClick={() => setBloodAmount((prev) => (parseFloat(prev) + 300).toString())}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg w-10 h-10 flex items-center justify-center text-xl"
                >
                  +
                </button>
              </div>
              <button 
                onClick={() => handleFluidBolus('blood', parseFloat(bloodAmount) || 300, 'Concentrado de Hemácias')}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Iniciar</p>
              </button>
            </div>
          </div>
          )}
          </div>

          {/* Aminas Section */}
          <div className="bg-white rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Inter:Bold',sans-serif] text-[25px] text-black">
                Aminas
              </h3>
              <button 
                onClick={() => setIsAminasCollapsed(!isAminasCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-transform"
                style={{ transform: isAminasCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
              >
                <div className="bg-[#0c0c0c] h-[20px] rounded-[4px] w-[5px]" />
              </button>
            </div>

          {!isAminasCollapsed && (
          <div className="space-y-4">
            {/* Noradrenalina */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Noradrenalina (mcg/kg/min)
              </p>
              <InputBox value={noradrenalineAmount} onChange={setNoradrenalineAmount} className="mx-4" />
              <button 
                onClick={() => handleDrugStart('vasopressor', 'Noradrenalina', parseFloat(noradrenalineAmount) || 0.1)}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Iniciar</p>
              </button>
            </div>

            {/* Vasopressina */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Vasopressina (U/min)
              </p>
              <InputBox value={vasopressinAmount} onChange={setVasopressinAmount} className="mx-4" />
              <button 
                onClick={() => handleDrugStart('vasopressor', 'Vasopressina', parseFloat(vasopressinAmount) || 0.03)}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Iniciar</p>
              </button>
            </div>

            {/* Dobutamina */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Dobutamina (mcg/kg/min):
              </p>
              <InputBox value={dobutamineAmount} onChange={setDobutamineAmount} className="mx-4" />
              <button 
                onClick={() => handleDrugStart('inotrope', 'Dobutamina', parseFloat(dobutamineAmount) || 5)}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Iniciar</p>
              </button>
            </div>

            {/* Adrenalina */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Adrenalina (mcg/kg/min)
              </p>
              <InputBox value={adrenalineAmount} onChange={setAdrenalineAmount} className="mx-4" />
              <button 
                onClick={() => handleDrugStart('vasopressor', 'Adrenalina', parseFloat(adrenalineAmount) || 0.1)}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Iniciar</p>
              </button>
            </div>
          </div>
          )}
          </div>

          {/* Procedimentos & Ações Section */}
          <div className="bg-white rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Inter:Bold',sans-serif] text-[25px] text-black">
                Procedimentos & Ações
              </h3>
              <button 
                onClick={() => setIsProcedimentosCollapsed(!isProcedimentosCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-transform"
                style={{ transform: isProcedimentosCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
              >
                <div className="bg-[#0c0c0c] h-[20px] rounded-[4px] w-[5px]" />
              </button>
            </div>

          {!isProcedimentosCollapsed && (
          <div className="space-y-4">
            {/* Intubação Orotraqueal */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 min-h-[85px] flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between">
                <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                  Intubação Orotraqueal (IOT)
                </p>
                <button 
                  onClick={handleIntubation}
                  disabled={simulationState.ventilation.isIntubated}
                  className={`rounded-[8px] px-6 py-3 transition-colors ${
                    simulationState.ventilation.isIntubated
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#1e2081] hover:bg-[#2a2c9f]'
                  }`}
                >
                  <p className="font-['Inter:Bold',sans-serif] text-neutral-100">
                    {simulationState.ventilation.isIntubated ? 'Intubado' : 'Realizar'}
                  </p>
                </button>
              </div>
              
              {/* Ventilation Settings - Only show if intubated */}
              {simulationState.ventilation.isIntubated && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="block text-gray-600 mb-1">Modo:</label>
                      <select 
                        value={simulationState.ventilation.mode || 'VCV'}
                        onChange={(e) => handleVentilationUpdate({ mode: e.target.value as any })}
                        className="w-full border rounded px-2 py-1"
                      >
                        <option value="VCV">VCV</option>
                        <option value="PCV">PCV</option>
                        <option value="PSV">PSV</option>
                        <option value="SIMV">SIMV</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">VC (mL): {simulationState.ventilation.tidalVolume}</label>
                      <input 
                        type="range"
                        min="200"
                        max="600"
                        step="50"
                        value={simulationState.ventilation.tidalVolume}
                        onChange={(e) => handleVentilationUpdate({ tidalVolume: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">FR (rpm): {simulationState.ventilation.respiratoryRate}</label>
                      <input 
                        type="range"
                        min="8"
                        max="24"
                        step="2"
                        value={simulationState.ventilation.respiratoryRate}
                        onChange={(e) => handleVentilationUpdate({ respiratoryRate: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">PEEP (cmH₂O): {simulationState.ventilation.peep}</label>
                      <input 
                        type="range"
                        min="0"
                        max="15"
                        step="1"
                        value={simulationState.ventilation.peep}
                        onChange={(e) => handleVentilationUpdate({ peep: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">FiO₂ (%): {Math.round(simulationState.ventilation.fio2 * 100)}</label>
                      <input 
                        type="range"
                        min="21"
                        max="100"
                        step="5"
                        value={Math.round(simulationState.ventilation.fio2 * 100)}
                        onChange={(e) => handleVentilationUpdate({ fio2: Number(e.target.value) / 100 })}
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <button 
                        onClick={handleExtubation}
                        className="bg-orange-600 hover:bg-orange-700 text-white rounded px-3 py-1 text-sm"
                      >
                        Extubar
                      </button>
                    </div>
                  </div>
                  
                  {/* Ventilator Readings */}
                  <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                    <p><strong>Ppico:</strong> {simulationState.ventilation.peakPressure} cmH₂O</p>
                    <p><strong>Pplatô:</strong> {simulationState.ventilation.plateauPressure} cmH₂O</p>
                    <p><strong>Driving Pressure:</strong> {(simulationState.ventilation.plateauPressure || 0) - simulationState.ventilation.peep} cmH₂O</p>
                    <p className="text-gray-600 italic">
                      ⚠️ IOT ↓ Retorno Venoso → ↓ DC (especialmente em hipovolemia)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Passive Leg-Raise */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Passive Leg-Raise
              </p>
              <button 
                onClick={() => alert('Passive Leg-Raise realizado')}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Realizar</p>
              </button>
            </div>
          </div>
          )}
          </div>

          {/* Medicamentos Section */}
          <div className="bg-white rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-['Inter:Bold',sans-serif] text-[25px] text-black">
                Medicamentos
              </h3>
              <button 
                onClick={() => setIsMedicamentosCollapsed(!isMedicamentosCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-transform"
                style={{ transform: isMedicamentosCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
              >
                <div className="bg-[#0c0c0c] h-[20px] rounded-[4px] w-[5px]" />
              </button>
            </div>

          {!isMedicamentosCollapsed && (
          <div className="space-y-4">
            {/* Iniciar antibióticos */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Iniciar antibióticos
              </p>
              <button 
                onClick={() => {
                  setInterventionLog(prev => [...prev, {
                    id: `med-${Date.now()}`,
                    time: simTimeElapsed,
                    name: 'Antibióticos',
                    type: 'medication',
                    status: 'iniciado'
                  }]);
                  alert('Antibióticos iniciados');
                }}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Realizar</p>
              </button>
            </div>

            {/* Reposição de potássio */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Reposição de potássio
              </p>
              <button 
                onClick={() => {
                  setInterventionLog(prev => [...prev, {
                    id: `med-${Date.now()}`,
                    time: simTimeElapsed,
                    name: 'Reposição de K+',
                    type: 'medication',
                    status: 'iniciado'
                  }]);
                  alert('Reposição de potássio realizada');
                }}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Realizar</p>
              </button>
            </div>

            {/* Reposição de sódio */}
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Reposição de sódio
              </p>
              <button 
                onClick={() => {
                  setInterventionLog(prev => [...prev, {
                    id: `med-${Date.now()}`,
                    time: simTimeElapsed,
                    name: 'Reposição de Na+',
                    type: 'medication',
                    status: 'iniciado'
                  }]);
                  alert('Reposição de sódio realizada');
                }}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Realizar</p>
              </button>
            </div>
          </div>
          )}
          </div>
        </div>

        {/* Footer Credits */}
        <div className="absolute bottom-4 left-4 text-left">
          <p className="font-['Roboto:Bold',sans-serif] text-sm text-gray-600">Modelo em fase de testes.</p>
          <p className="font-['Roboto:Bold',sans-serif] text-sm text-gray-600">Créditos: Elisa Patiño Lima e Pedro Cerqueira</p>
        </div>
      </div>
    </div>
  );
}
                