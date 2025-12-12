interface LandingPageProps {
  onModoSandbox: () => void;
  onModoCenario: () => void;
}

export default function LandingPage({ onModoSandbox, onModoCenario }: LandingPageProps) {
  return (
    <div className="bg-white relative w-full min-h-screen flex items-center justify-center px-4" data-name="Choque Generator">
      <div className="absolute inset-0 bg-[#dfdfdf]" />
      
      <div className="relative bg-[#ebf5ff] rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-full max-w-[1234px] p-6 md:p-16">
        <div className="flex flex-col items-center gap-6 md:gap-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="font-['Roboto:Black',sans-serif] text-[#1e2081] text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-2">
              Choque Generator
            </h1>
            <p className="font-['Roboto:Light',sans-serif] text-[#b8b8b8] text-sm md:text-base">
              Alpha Test 1.0
            </p>
          </div>

          {/* Description */}
          <div className="max-w-[1151px] text-center px-2">
            <p className="font-['Roboto:Regular',sans-serif] text-sm md:text-base">
              Choque Generator é uma plataforma em fase de testes com o objetivo de ensinar estudantes da saúde sobre as repercussões hemodinâmicas do choque de forma interativa e segura. Para isso, você pode escolher um dos nossos modos para testar suas habilidades, ensinar sua turma ou apenas se divertir com o manejo do choque hemodinâmico.
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-4">
              <span className="font-bold">e.d.</span> = em desenvolvimento
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 md:gap-8 justify-center w-full max-w-md">
            <button 
              className="bg-[#1e2081] rounded-[8px] border border-[#2c2c2c] px-6 py-4 hover:bg-[#2a2c9f] transition-colors relative w-full sm:w-auto"
              onClick={onModoCenario}
            >
              <p className="font-['Roboto:Bold',sans-serif] text-neutral-100 text-sm md:text-base">
                Modo Cenários
              </p>
              <span className="text-xs text-gray-400 font-['Roboto:Regular',sans-serif] absolute -top-2 -right-2 bg-gray-600 px-2 py-1 rounded">
                e.d.
              </span>
            </button>
            
            <button 
              className="bg-[#1e2081] rounded-[8px] border border-[#2c2c2c] px-6 py-4 hover:bg-[#2a2c9f] transition-colors w-full sm:w-auto"
              onClick={onModoSandbox}
            >
              <p className="font-['Roboto:Bold',sans-serif] text-neutral-100 text-sm md:text-base">
                Modo Sandbox
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Credits */}
      <div className="absolute bottom-4 md:bottom-8 right-4 md:right-8 text-right text-white text-xs md:text-sm">
        <p className="font-['Roboto:Bold',sans-serif] mb-0">Modelo em fase de testes.</p>
        <p className="font-['Roboto:Bold',sans-serif]">Créditos: Elisa Patiño Lima e Pedro Cerqueira</p>
      </div>
    </div>
  );
}