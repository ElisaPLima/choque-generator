import { useState, useEffect } from 'react';
import { PatientData } from '../App';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import svgPaths from "../imports/svg-9ump4o6n93";

// Import simulation utilities
import { SimulationState, ActiveIntervention, FluidBalance } from '@/utils/types';
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
  const [simulationState, setSimulationState] = useState<SimulationState>(() => ({
    vitals: initializeVitals(patientData),
    labs: initializeLabs(patientData),
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
    simTimeElapsed: 0,
    realTimeElapsed: 0,
    isStable: false,
    isDeteriorating: true,
    complications: [],
    criticalAlerts: [],
    warnings: [],
  }));

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

  // Collapsed sections state
  const [isColetasCollapsed, setIsColetasCollapsed] = useState(false);
  const [isFluidosCollapsed, setIsFluidosCollapsed] = useState(false);
  const [isAminasCollapsed, setIsAminasCollapsed] = useState(false);
  const [isProcedimentosCollapsed, setIsProcedimentosCollapsed] = useState(false);
  const [isMedicamentosCollapsed, setIsMedicamentosCollapsed] = useState(false);

  // Main simulation update loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setRealTimeElapsed(prev => prev + (UPDATE_INTERVAL_MS / 1000));
        setSimTimeElapsed(prev => prev + SIM_MINUTES_PER_UPDATE);
        
        setSimulationState(prevState => {
          // Update fluid balance (insensible losses)
          const newFluidBalance = updateFluidBalance(
            prevState.fluidBalance,
            patientData.weight,
            SIM_MINUTES_PER_UPDATE
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
            prevState.simTimeElapsed
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
            SIM_MINUTES_PER_UPDATE
          );

          // Update labs
          const newLabs = updateLabs(
            prevState.labs,
            newVitals,
            SIM_MINUTES_PER_UPDATE
          );

          // Detect alerts
          const { criticalAlerts, warnings } = detectAlerts(newVitals);

          // Update hemodynamics
          const newHemodynamics = {
            ...prevState.hemodynamics,
            ...treatmentEffects.hemodynamics,
          };

          return {
            ...prevState,
            vitals: newVitals,
            labs: newLabs,
            fluidBalance: balanceWithUrine,
            hemodynamics: newHemodynamics,
            activeInterventions: updatedInterventions,
            simTimeElapsed: prevState.simTimeElapsed + SIM_MINUTES_PER_UPDATE,
            realTimeElapsed: prevState.realTimeElapsed + (UPDATE_INTERVAL_MS / 1000),
            criticalAlerts,
            warnings,
          };
        });
      }, UPDATE_INTERVAL_MS);
    }
    return () => clearInterval(interval);
  }, [isPlaying, patientData]);

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
        patientData.weight
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
        <div className="flex flex-col justify-center h-full">
          <p className="text-[#4e4e4e] text-[18px] text-center leading-tight px-2" style={{ fontFamily: 'Courier New, monospace', fontWeight: '900' }}>
            {label}
          </p>
          <p className="text-[#4e4e4e] text-[42px] text-center leading-tight mt-1" style={{ fontFamily: 'Courier New, monospace', fontWeight: '900' }}>
            {rate}
          </p>
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
              <div className="text-xs text-gray-500">Tempo Simulação (12x)</div>
              <div className="text-lg font-bold">{formatSimTime(simTimeElapsed)}</div>
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
            <div className="border border-[#d9d9d9] rounded-[9px] p-4 h-[85px] flex items-center justify-between">
              <p className="font-['Inter:Regular',sans-serif] text-[20px] text-black flex-1">
                Intubação Orotraqueal
              </p>
              <button 
                onClick={() => alert('Intubação realizada')}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Realizar</p>
              </button>
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
                onClick={() => alert('Antibióticos iniciados')}
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
                onClick={() => alert('Reposição de potássio realizada')}
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
                onClick={() => alert('Reposição de sódio realizada')}
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
                