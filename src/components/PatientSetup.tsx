import { useState, useEffect } from 'react';
import { PatientData } from '../App';
import { ChevronDown, Copy, Check } from 'lucide-react';

interface PatientSetupProps {
  onStart: (data: PatientData) => void;
  onBack: () => void;
}

// Default hemodynamic parameters for each shock type
const shockTypeDefaults: Record<string, {
  rvs: number;
  rvp: number;
  volemia: string;
  ivs: number;
  pvc: number;
  poap: number;
}> = {
  'Choque hipovolêmico': {
    rvs: 1950,      // Very high SVR (compensatory vasoconstriction)
    rvp: 1.0,       // Normal
    volemia: 'Desidratado',
    ivs: 27,        // Very low stroke volume
    pvc: 1.5,       // Very low CVP (empty tank)
    poap: 4,        // Low PCWP
  },
  'Choque cardiogênico': {
    rvs: 1600,      // High SVR (compensatory)
    rvp: 2.5,       // May be elevated
    volemia: 'Hipervolêmico',
    ivs: 30,        // Very low stroke volume
    pvc: 16,        // High CVP (congestion)
    poap: 20,       // High PCWP (>18 diagnostic)
  },
  'Choque distributivo': {
    rvs: 480,       // Very low SVR (pathological vasodilation)
    rvp: 1.5,       // Normal to slightly low
    volemia: 'Desidratado',
    ivs: 70,        // Initially preserved
    pvc: 6,         // Variable
    poap: 10,       // Normal to low
  },
  'Choque obstrutivo': {
    rvs: 1400,      // Elevated SVR
    rvp: 3.5,       // Elevated PVR (especially in PE)
    volemia: 'Normal',
    ivs: 35,        // Reduced
    pvc: 14,        // Elevated (obstructed return)
    poap: 8,        // Normal to low
  },
  'Choque misto': {
    rvs: 1200,      // Mixed/intermediate
    rvp: 2.0,       // Mixed/intermediate
    volemia: 'Normal',
    ivs: 50,        // Mixed/intermediate
    pvc: 10,        // Mixed/intermediate
    poap: 12,       // Mixed/intermediate
  },
};

// Function to classify shock type based on current parameters
function classifyShockType(params: {
  rvs: number;
  rvp: number;
  pvc: number;
  poap: number;
  ivs: number;
  volemia: string;
}): string {
  const scores: Record<string, number> = {
    'Choque hipovolêmico': 0,
    'Choque cardiogênico': 0,
    'Choque distributivo': 0,
    'Choque obstrutivo': 0,
  };

  // Hypovolemic: Very high RVS, very low PVC, low IVS, dehydrated
  if (params.rvs > 1700) scores['Choque hipovolêmico'] += 2;
  if (params.pvc < 4) scores['Choque hipovolêmico'] += 2;
  if (params.poap < 8) scores['Choque hipovolêmico'] += 1;
  if (params.ivs < 35) scores['Choque hipovolêmico'] += 1;
  if (params.volemia === 'Desidratado') scores['Choque hipovolêmico'] += 1;

  // Cardiogenic: High PVC, very high POAP (>18), low IVS, hypervolemic
  if (params.pvc > 12) scores['Choque cardiogênico'] += 2;
  if (params.poap > 18) scores['Choque cardiogênico'] += 3; // POAP >18 is diagnostic
  if (params.ivs < 40) scores['Choque cardiogênico'] += 1;
  if (params.volemia === 'Hipervolêmico') scores['Choque cardiogênico'] += 1;
  if (params.rvs > 1400) scores['Choque cardiogênico'] += 1;

  // Distributive: Very low RVS (<800), high IVS initially, variable PVC
  if (params.rvs < 800) scores['Choque distributivo'] += 3; // Most diagnostic
  if (params.ivs > 60) scores['Choque distributivo'] += 2;
  if (params.pvc < 10 && params.pvc > 4) scores['Choque distributivo'] += 1;
  if (params.volemia === 'Desidratado') scores['Choque distributivo'] += 1;

  // Obstructive: Elevated PVR, elevated PVC, normal to high RVS
  if (params.rvp > 3.0) scores['Choque obstrutivo'] += 3;
  if (params.pvc > 12) scores['Choque obstrutivo'] += 2;
  if (params.rvs > 1200 && params.rvs < 1600) scores['Choque obstrutivo'] += 1;
  if (params.poap < 12) scores['Choque obstrutivo'] += 1;

  // Find the highest score
  const maxScore = Math.max(...Object.values(scores));
  const matches = Object.entries(scores).filter(([_, score]) => score === maxScore);

  // If no clear winner or multiple types match equally, it's mixed
  if (maxScore < 3 || matches.length > 1) {
    return 'Choque misto';
  }

  return matches[0][0];
}

export default function PatientSetup({ onStart, onBack }: PatientSetupProps) {
  const [initials, setInitials] = useState('A.B.C');
  const [age, setAge] = useState(50);
  const [weight, setWeight] = useState(70);
  const [conditions, setConditions] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('Intensivista');
  const [resourceLevel, setResourceLevel] = useState('Máximo');
  const [shockType, setShockType] = useState('Choque distributivo');
  const [rvs, setRvs] = useState(480);
  const [rvp, setRvp] = useState(1.5);
  const [volemia, setVolemia] = useState('Desidratado');
  const [ivs, setIvs] = useState(70);
  const [pvc, setPvc] = useState(6);
  const [poap, setPoap] = useState(10);

  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [showResourceDropdown, setShowResourceDropdown] = useState(false);
  const [showShockTypeDropdown, setShowShockTypeDropdown] = useState(false);
  const [showVolemiaDropdown, setShowVolemiaDropdown] = useState(false);
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportedData, setExportedData] = useState('');
  const [importData, setImportData] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState('');
  const [parameterMismatch, setParameterMismatch] = useState<string | null>(null);

  // Update hemodynamic parameters when shock type changes
  useEffect(() => {
    const defaults = shockTypeDefaults[shockType];
    if (defaults) {
      setRvs(defaults.rvs);
      setRvp(defaults.rvp);
      setVolemia(defaults.volemia);
      setIvs(defaults.ivs);
      setPvc(defaults.pvc);
      setPoap(defaults.poap);
    }
  }, [shockType]);

  // Detect if manually adjusted parameters no longer match selected shock type
  useEffect(() => {
    // Skip auto-detection if user just selected a shock type or is in Choque misto
    if (shockType === 'Choque misto') {
      setParameterMismatch(null);
      return;
    }

    const detectedType = classifyShockType({ rvs, rvp, pvc, poap, ivs, volemia });
    
    // If parameters significantly diverge from selected type, show warning
    if (detectedType !== shockType && detectedType === 'Choque misto') {
      setParameterMismatch('Os parâmetros atuais apresentam características mistas. Considere selecionar "Choque misto".');
    } else if (detectedType !== shockType) {
      setParameterMismatch(`Os parâmetros são mais consistentes com ${detectedType}. Deseja manter ${shockType}?`);
    } else {
      setParameterMismatch(null);
    }
  }, [rvs, rvp, pvc, poap, ivs, volemia, shockType]);

  const conditionsList = [
    'Insuficiência Cardíaca Prévia',
    'Hipertensão Arterial Sistêmica',
    'DPOC',
    'Doença Renal Crônica',
    'Anemia'
  ];

  const toggleCondition = (condition: string) => {
    setConditions(prev => 
      prev.includes(condition) 
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const handleStart = () => {
    const data: PatientData = {
      initials,
      age,
      weight,
      conditions,
      difficulty,
      resourceLevel,
      shockType,
      rvs,
      rvp,
      volemia,
      ivs,
      pvc,
      poap
    };
    onStart(data);
  };

  const handleExport = () => {
    const data: PatientData = {
      initials,
      age,
      weight,
      conditions,
      difficulty,
      resourceLevel,
      shockType,
      rvs,
      rvp,
      volemia,
      ivs,
      pvc,
      poap
    };
    const jsonString = JSON.stringify(data, null, 2);
    setExportedData(jsonString);
    setShowExportModal(true);
    setCopied(false);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportedData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importData) as PatientData;
      
      // Validate the imported data has required fields
      if (!data.initials || !data.age || !data.weight || !data.shockType) {
        setImportError('Dados inválidos: campos obrigatórios ausentes');
        return;
      }

      // Set all the state values from imported data
      setInitials(data.initials);
      setAge(data.age);
      setWeight(data.weight);
      setConditions(data.conditions || []);
      setDifficulty(data.difficulty || 'Intensivista');
      setResourceLevel(data.resourceLevel || 'Máximo');
      setShockType(data.shockType);
      setRvs(data.rvs || 1200);
      setRvp(data.rvp || 2);
      setVolemia(data.volemia || 'Desidratado');
      setIvs(data.ivs || 35);
      setPvc(data.pvc || 10);
      setPoap(data.poap || 8);

      setShowImportModal(false);
      setImportData('');
      setImportError('');
    } catch (error) {
      setImportError('Erro ao importar: JSON inválido');
    }
  };

  return (
    <div className="bg-[#dfdfdf] min-h-screen w-full p-4 md:p-8">
      <div className="bg-[#ebf5ff] rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] max-w-[1240px] mx-auto p-4 md:p-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 md:mb-8 gap-4">
          <h2 className="text-[#1e2081] text-xl sm:text-2xl md:text-3xl lg:text-4xl">
            <span className="font-['Roboto:Black',sans-serif]">Modo Sandbox</span>
            <span className="font-['Roboto:Bold',sans-serif] block sm:inline"> - Crie seu próprio paciente</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full lg:w-auto">
            <span className="text-xs md:text-sm text-gray-500">
              <span className="font-bold">e.d.</span> = em desenvolvimento
            </span>
            <button 
              className="bg-[#2c2c2c] rounded-[8px] border border-[#2c2c2c] px-4 md:px-6 py-2 md:py-3 hover:bg-[#3c3c3c] transition-colors w-full sm:w-auto"
              onClick={() => setShowImportModal(true)}
            >
              <p className="font-['Inter:Bold',sans-serif] text-neutral-100 text-sm md:text-base">Importar paciente</p>
            </button>
          </div>
        </div>

        {/* Left Column - Dropdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 md:gap-8">
          <div className="space-y-4 md:space-y-6">
            {/* Difficulty Level */}
            <div>
              <p className="font-['Inter:Regular',sans-serif] text-[#757575] mb-2">
                Os parâmetros serão alterados
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                  className="w-full bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-3 flex justify-between items-center hover:border-[#1e2081] transition-colors"
                >
                  <span className="font-['Inter:Regular',sans-serif] text-[#1e1e1e]">{difficulty}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showDifficultyDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-[#d9d9d9] rounded-[8px] shadow-lg p-2">
                    <p className="font-['Inter:Semi_Bold',sans-serif] text-[#1e1e1e] px-2 py-1">Grau de dificuldade</p>
                    {['Intensivista', 'Clínico', 'Médico', 'Acadêmico'].map(level => (
                      <button
                        key={level}
                        onClick={() => {
                          setDifficulty(level);
                          setShowDifficultyDropdown(false);
                        }}
                        className="w-full text-left px-2 py-1 hover:bg-[#ebf5ff] rounded font-['Inter:Regular',sans-serif]"
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Resource Level */}
            <div>
              <p className="font-['Inter:Regular',sans-serif] text-[#757575] mb-2">
                As condutas serão alteradas <span className="text-xs text-gray-400 ml-2">(e.d.)</span>
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowResourceDropdown(!showResourceDropdown)}
                  className="w-full bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-3 flex justify-between items-center hover:border-[#1e2081] transition-colors"
                >
                  <span className="font-['Inter:Regular',sans-serif] text-[#1e1e1e]">{resourceLevel}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showResourceDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-[#d9d9d9] rounded-[8px] shadow-lg p-2">
                    <p className="font-['Inter:Semi_Bold',sans-serif] text-[#1e1e1e] px-2 py-1">Nível de recurso</p>
                    {['Máximo', 'Alto', 'Médio', 'Baixo'].map(level => (
                      <button
                        key={level}
                        onClick={() => {
                          setResourceLevel(level);
                          setShowResourceDropdown(false);
                        }}
                        className="w-full text-left px-2 py-1 hover:bg-[#ebf5ff] rounded font-['Inter:Regular',sans-serif]"
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Shock Type */}
            <div>
              <p className="font-['Inter:Regular',sans-serif] text-[#757575] mb-2">
                Os parâmetros serão alterados
              </p>
              <div className="relative">
                <button
                  onClick={() => setShowShockTypeDropdown(!showShockTypeDropdown)}
                  className="w-full bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-3 flex justify-between items-center hover:border-[#1e2081] transition-colors"
                >
                  <span className="font-['Inter:Regular',sans-serif] text-[#1e1e1e]">{shockType}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showShockTypeDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-[#d9d9d9] rounded-[8px] shadow-lg p-2">
                    <p className="font-['Inter:Semi_Bold',sans-serif] text-[#1e1e1e] px-2 py-1">Tipos de choque</p>
                    {['Choque distributivo', 'Choque cardiogênico', 'Choque hipovolêmico', 'Choque obstrutivo', 'Choque misto'].map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setShockType(type);
                          setShowShockTypeDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 hover:bg-[#ebf5ff] rounded font-['Inter:Regular',sans-serif] ${
                          type === 'Choque misto' ? 'border-t border-gray-200 italic text-gray-700' : ''
                        }`}
                      >
                        {type}
                        {type === 'Choque misto' && (
                          <span className="text-xs text-gray-500 ml-2">(Características mistas)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Parameter mismatch warning */}
              {parameterMismatch && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-md flex items-start gap-2">
                  <span className="text-yellow-600 text-sm">⚠️</span>
                  <p className="text-sm text-yellow-800 flex-1">{parameterMismatch}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Patient Info & Parameters */}
          <div className="space-y-8">
            {/* Patient Info */}
            <div>
              <h3 className="font-['Inter:Bold',sans-serif] text-[#1e1e1e] mb-4">
                1. Quem é seu paciente?
              </h3>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block font-['Inter:Regular',sans-serif] text-[#1e1e1e] mb-2">
                    Iniciais
                  </label>
                  <input
                    type="text"
                    value={initials}
                    onChange={(e) => setInitials(e.target.value)}
                    className="w-full bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-3 font-['Inter:Regular',sans-serif]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block font-['Inter:Regular',sans-serif] text-[#1e1e1e] mb-2">
                    Idade
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-3 font-['Inter:Regular',sans-serif]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block font-['Inter:Regular',sans-serif] text-[#1e1e1e] mb-2">
                    Peso
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-3 font-['Inter:Regular',sans-serif]"
                  />
                </div>
              </div>

              {/* Conditions Checkboxes */}
              <div className="space-y-3">
                {conditionsList.map(condition => (
                  <label key={condition} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conditions.includes(condition)}
                      onChange={() => toggleCondition(condition)}
                      className="w-4 h-4 rounded border-[#757575]"
                    />
                    <span className="font-['Inter:Regular',sans-serif] text-[#1e1e1e]">
                      {condition}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Hemodynamic Parameters */}
            <div>
              <h3 className="font-['Inter:Bold',sans-serif] text-[#1e1e1e] mb-4">
                2. Parâmetros hemodinâmicos iniciais
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="min-w-[320px] w-80 font-['Inter:Regular',sans-serif] flex-shrink-0">
                    Resistência Vascular Sistêmica (RVS):
                  </label>
                  <input
                    type="number"
                    value={rvs}
                    onChange={(e) => setRvs(Number(e.target.value))}
                    className="w-40 flex-shrink-0 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif] w-48 flex-shrink-0">dinas.seg/cm⁻⁵</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="min-w-[320px] w-80 font-['Inter:Regular',sans-serif] flex-shrink-0">
                    Resistência Vascular Pulmonar (RVP):
                  </label>
                  <input
                    type="number"
                    value={rvp}
                    onChange={(e) => setRvp(Number(e.target.value))}
                    className="w-40 flex-shrink-0 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif] w-48 flex-shrink-0">unidades wood</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="min-w-[320px] w-80 font-['Inter:Regular',sans-serif] flex-shrink-0">
                    Volêmia inicial:
                  </label>
                  <div className="relative w-40 flex-shrink-0">
                    <button
                      onClick={() => setShowVolemiaDropdown(!showVolemiaDropdown)}
                      className="w-full bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2 flex justify-between items-center"
                    >
                      <span>{volemia}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {showVolemiaDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-[#d9d9d9] rounded-[8px] shadow-lg">
                        {['Desidratado', 'Normal', 'Hipervolêmico'].map(v => (
                          <button
                            key={v}
                            onClick={() => {
                              setVolemia(v);
                              setShowVolemiaDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-[#ebf5ff]"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="w-48 flex-shrink-0"></span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="min-w-[320px] w-80 font-['Inter:Regular',sans-serif] flex-shrink-0">
                    Índice de Volume Sistólico (IVS):
                  </label>
                  <input
                    type="number"
                    value={ivs}
                    onChange={(e) => setIvs(Number(e.target.value))}
                    className="w-40 flex-shrink-0 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif] w-48 flex-shrink-0">mL/m²/batimento</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="min-w-[320px] w-80 font-['Inter:Regular',sans-serif] flex-shrink-0">
                    Pressão Venosa Central (PVC):
                  </label>
                  <input
                    type="number"
                    value={pvc}
                    onChange={(e) => setPvc(Number(e.target.value))}
                    className="w-40 flex-shrink-0 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif] w-48 flex-shrink-0">mmHg</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="min-w-[320px] w-80 font-['Inter:Regular',sans-serif] flex-shrink-0">
                    P. de Oclusão da A. Pulmonar (POAP):
                  </label>
                  <input
                    type="number"
                    value={poap}
                    onChange={(e) => setPoap(Number(e.target.value))}
                    className="w-40 flex-shrink-0 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif] w-48 flex-shrink-0">mmHg</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button 
            className="bg-[#1e2081] rounded-[8px] border border-[#2c2c2c] px-8 py-3 hover:bg-[#2a2c9f] transition-colors"
            onClick={handleExport}
          >
            <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Exportar paciente</p>
          </button>
          <button 
            className="bg-[#1e2081] rounded-[8px] border border-[#2c2c2c] px-8 py-3 hover:bg-[#2a2c9f] transition-colors"
            onClick={handleStart}
          >
            <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Iniciar</p>
          </button>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[19px] max-w-2xl w-full p-8 shadow-2xl">
            <h3 className="font-['Inter:Bold',sans-serif] text-[#1e2081] text-2xl mb-4">
              Exportar Paciente
            </h3>
            <p className="font-['Inter:Regular',sans-serif] text-[#757575] mb-4">
              Copie o código abaixo para compartilhar este paciente:
            </p>
            <div className="relative">
              <textarea
                readOnly
                value={exportedData}
                className="w-full h-64 bg-[#f5f5f5] border border-[#d9d9d9] rounded-[8px] p-4 font-mono text-sm resize-none"
              />
              <button
                onClick={handleCopyToClipboard}
                className="absolute top-2 right-2 bg-[#1e2081] text-white rounded-[8px] px-4 py-2 flex items-center gap-2 hover:bg-[#2a2c9f] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="font-['Inter:Semi_Bold',sans-serif]">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="font-['Inter:Semi_Bold',sans-serif]">Copiar</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="bg-[#757575] rounded-[8px] px-6 py-3 hover:bg-[#5a5a5a] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-white">Fechar</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[19px] max-w-2xl w-full p-8 shadow-2xl">
            <h3 className="font-['Inter:Bold',sans-serif] text-[#1e2081] text-2xl mb-4">
              Importar Paciente
            </h3>
            <p className="font-['Inter:Regular',sans-serif] text-[#757575] mb-4">
              Cole o código do paciente abaixo:
            </p>
            <textarea
              value={importData}
              onChange={(e) => {
                setImportData(e.target.value);
                setImportError('');
              }}
              placeholder='{"initials":"A.B.C","age":50,"weight":70,...}'
              className="w-full h-64 bg-[#f5f5f5] border border-[#d9d9d9] rounded-[8px] p-4 font-mono text-sm resize-none"
            />
            {importError && (
              <p className="text-red-600 font-['Inter:Semi_Bold',sans-serif] mt-2">
                {importError}
              </p>
            )}
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData('');
                  setImportError('');
                }}
                className="bg-[#757575] rounded-[8px] px-6 py-3 hover:bg-[#5a5a5a] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-white">Cancelar</p>
              </button>
              <button
                onClick={handleImport}
                className="bg-[#1e2081] rounded-[8px] px-6 py-3 hover:bg-[#2a2c9f] transition-colors"
              >
                <p className="font-['Inter:Bold',sans-serif] text-white">Importar</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Credits */}
      <div className="text-right text-white mt-4">
        <p className="font-['Roboto:Bold',sans-serif]">Modelo em fase de testes.</p>
        <p className="font-['Roboto:Bold',sans-serif]">Créditos: Elisa Patiño Lima e Pedro Cerqueira</p>
      </div>
    </div>
  );
}
