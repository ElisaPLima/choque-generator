import { useState } from 'react';
import { PatientData } from '../App';
import { ChevronDown } from 'lucide-react';

interface PatientSetupProps {
  onStart: (data: PatientData) => void;
  onBack: () => void;
}

export default function PatientSetup({ onStart, onBack }: PatientSetupProps) {
  const [initials, setInitials] = useState('A.B.C');
  const [age, setAge] = useState(50);
  const [weight, setWeight] = useState(70);
  const [conditions, setConditions] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('Intensivista');
  const [resourceLevel, setResourceLevel] = useState('Máximo');
  const [shockType, setShockType] = useState('Choque distributivo');
  const [rvs, setRvs] = useState(1200);
  const [rvp, setRvp] = useState(2);
  const [volemia, setVolemia] = useState('Desidratado');
  const [ivs, setIvs] = useState(35);
  const [pvc, setPvc] = useState(10);
  const [poap, setPoap] = useState(8);

  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [showResourceDropdown, setShowResourceDropdown] = useState(false);
  const [showShockTypeDropdown, setShowShockTypeDropdown] = useState(false);
  const [showVolemiaDropdown, setShowVolemiaDropdown] = useState(false);

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

  return (
    <div className="bg-[#dfdfdf] min-h-screen w-full p-4 md:p-8">
      <div className="bg-[#ebf5ff] rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] max-w-[1240px] mx-auto p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-['Inter:Bold',sans-serif] text-[#1e2081]">
            Modo Sandbox - Crie seu próprio paciente
          </h2>
          <button 
            className="bg-[#2c2c2c] rounded-[8px] border border-[#2c2c2c] px-6 py-3 hover:bg-[#3c3c3c] transition-colors"
            onClick={() => alert('Importar paciente em desenvolvimento')}
          >
            <p className="font-['Inter:Bold',sans-serif] text-neutral-100">Importar paciente</p>
          </button>
        </div>

        {/* Left Column - Dropdowns */}
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div className="space-y-6">
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
                As condutas serão alteradas
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
                    {['Choque distributivo', 'Choque cardiogênico', 'Choque hipovolêmico', 'Choque obstrutivo'].map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setShockType(type);
                          setShowShockTypeDropdown(false);
                        }}
                        className="w-full text-left px-2 py-1 hover:bg-[#ebf5ff] rounded font-['Inter:Regular',sans-serif]"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                  <label className="flex-1 font-['Inter:Regular',sans-serif]">
                    Resistência Vascular Sistêmica (RVS):
                  </label>
                  <input
                    type="number"
                    value={rvs}
                    onChange={(e) => setRvs(Number(e.target.value))}
                    className="w-40 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif]">dinas.seg/cm⁻⁵</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex-1 font-['Inter:Regular',sans-serif]">
                    Resistência Vascular Pulmonar (RVP):
                  </label>
                  <input
                    type="number"
                    value={rvp}
                    onChange={(e) => setRvp(Number(e.target.value))}
                    className="w-40 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif]">unidades wood</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex-1 font-['Inter:Regular',sans-serif]">
                    Volêmia inicial:
                  </label>
                  <div className="relative w-40">
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
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex-1 font-['Inter:Regular',sans-serif]">
                    Índice de Volume Sistólico (IVS):
                  </label>
                  <input
                    type="number"
                    value={ivs}
                    onChange={(e) => setIvs(Number(e.target.value))}
                    className="w-40 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif]">mL/m²/batimento</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex-1 font-['Inter:Regular',sans-serif]">
                    Pressão Venosa Central (PVC):
                  </label>
                  <input
                    type="number"
                    value={pvc}
                    onChange={(e) => setPvc(Number(e.target.value))}
                    className="w-40 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif]">mmHg</span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex-1 font-['Inter:Regular',sans-serif]">
                    P. de Oclusão da A. Pulmonar (POAP):
                  </label>
                  <input
                    type="number"
                    value={poap}
                    onChange={(e) => setPoap(Number(e.target.value))}
                    className="w-40 bg-white border border-[#d9d9d9] rounded-[8px] px-4 py-2"
                  />
                  <span className="text-[#757575] font-['Inter:Regular',sans-serif]">mmHg</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-8">
          <button 
            className="bg-[#1e2081] rounded-[8px] border border-[#2c2c2c] px-8 py-3 hover:bg-[#2a2c9f] transition-colors"
            onClick={() => alert('Exportar paciente em desenvolvimento')}
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

      {/* Footer Credits */}
      <div className="text-right text-white mt-4">
        <p className="font-['Roboto:Bold',sans-serif]">Modelo em fase de testes.</p>
        <p className="font-['Roboto:Bold',sans-serif]">Créditos: Elisa Patiño Lima e Pedro Cerqueira</p>
      </div>
    </div>
  );
}
