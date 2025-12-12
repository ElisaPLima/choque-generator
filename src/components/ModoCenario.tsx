import imgImage2 from "figma:asset/2ce8d6af1d8181e4e3c7cf4e1d23ba7ff9da6dc3.png";
import imgImage3 from "figma:asset/7da8229338d931ced29aa8c57d3eddfabb2471fc.png";
import imgImage4 from "figma:asset/2b38b8dfd2e4aed0b1b4a0f555997c4af268231f.png";

interface ModoCenarioProps {
  onSelectScenario: (patientName: string) => void;
  onRandomScenario: () => void;
  onBack: () => void;
}

export default function ModoCenario({ onSelectScenario, onRandomScenario, onBack }: ModoCenarioProps) {
  const scenarios = [
    { name: 'Sergio, 76 anos.', image: imgImage2 },
    { name: 'Celina, 87 anos.', image: imgImage3 },
    { name: 'Claudia, 34 anos.', image: imgImage4 }
  ];

  return (
    <div className="bg-[#dfdfdf] relative w-full min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-[#ebf5ff] rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-full max-w-[1234px] p-6 md:p-16 relative">
        
        {/* Title */}
        <div className="mb-6 md:mb-8">
          <h1 className="font-['Roboto_Condensed:Bold',sans-serif] text-[#1e2081] text-3xl md:text-4xl lg:text-5xl mb-6 md:mb-8">
            Modo Cenário
          </h1>
          
          {/* Random Scenario Button */}
          <button 
            className="bg-[#1e2081] rounded-[8px] border border-[#2c2c2c] px-6 py-3 hover:bg-[#2a2c9f] transition-colors w-full sm:w-auto"
            onClick={onRandomScenario}
          >
            <p className="font-['Inter:Bold',sans-serif] text-neutral-100 text-sm md:text-base">
              Iniciar cenário aleatório
            </p>
          </button>
        </div>

        {/* Scenario Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mt-8 md:mt-12">
          {scenarios.map((scenario, index) => (
            <button
              key={index}
              onClick={() => onSelectScenario(scenario.name)}
              className="bg-[#1e2081] rounded-[17px] overflow-hidden hover:scale-105 transition-transform cursor-pointer"
            >
              {/* Patient Name Header */}
              <div className="py-4 md:py-6 px-4">
                <h3 className="font-['Inter:Bold',sans-serif] text-xl md:text-[25px] text-center text-white">
                  {scenario.name}
                </h3>
              </div>
              
              {/* Patient Image */}
              <div className="bg-white rounded-t-[14px] h-[150px] md:h-[196px] overflow-hidden">
                <img 
                  src={scenario.image} 
                  alt={scenario.name}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </button>
          ))}
        </div>

        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mt-6 md:mt-8 bg-[#2c2c2c] rounded-[8px] px-6 py-3 hover:bg-[#3c3c3c] transition-colors w-full sm:w-auto"
        >
          <p className="font-['Inter:Bold',sans-serif] text-neutral-100 text-sm md:text-base">Voltar</p>
        </button>
      </div>

      {/* Footer Credits */}
      <div className="absolute bottom-4 md:bottom-8 right-4 md:right-8 text-right text-white text-xs md:text-sm">
        <p className="font-['Roboto:Bold',sans-serif] mb-0">Modelo em fase de testes.</p>
        <p className="font-['Roboto:Bold',sans-serif]">Créditos: Elisa Patiño Lima e Pedro Cerqueira</p>
      </div>
    </div>
  );
}
