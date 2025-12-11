interface LandingPageProps {
  onModoSandbox: () => void;
  onModoCenario: () => void;
}

export default function LandingPage({ onModoSandbox, onModoCenario }: LandingPageProps) {
  return (
    <div className="bg-white relative w-full min-h-screen flex items-center justify-center" data-name="Choque Generator">
      <div className="absolute inset-0 bg-[#dfdfdf]" />
      
      <div className="relative bg-[#ebf5ff] rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-[min(1234px,90vw)] p-8 md:p-16">
        <div className="flex flex-col items-center gap-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="font-['Roboto_Condensed:Bold',sans-serif] text-[#1e2081] mb-2">
              Choque Generator
            </h1>
            <p className="font-['Roboto:Light',sans-serif] text-[#b8b8b8]">
              Alpha Test 1.0
            </p>
          </div>

          {/* Description */}
          <div className="max-w-[1151px] text-center">
            <p className="font-['Roboto:Regular',sans-serif]">
              Choque Generator é uma plataforma em fase de testes com o objetivo de ensinar estudantes da saúde sobre as repercussões hemodinâmicas do choque de forma interativa e segura. Para isso, você pode escolher um dos nossos modos para testar suas habilidades, ensinar sua turma ou apenas se divertir com o manejo do choque hemodinâmico.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-8 justify-center">
            <button 
              className="bg-[#1e2081] rounded-[8px] border border-[#2c2c2c] px-6 py-4 hover:bg-[#2a2c9f] transition-colors"
              onClick={onModoCenario}
            >
              <p className="font-['Roboto:Bold',sans-serif] text-neutral-100">
                Modo Cenários
              </p>
            </button>
            
            <button 
              className="bg-[#1e2081] rounded-[8px] border border-[#2c2c2c] px-6 py-4 hover:bg-[#2a2c9f] transition-colors"
              onClick={onModoSandbox}
            >
              <p className="font-['Roboto:Bold',sans-serif] text-neutral-100">
                Modo Sandbox
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Credits */}
      <div className="absolute bottom-8 right-8 text-right text-white">
        <p className="font-['Roboto:Bold',sans-serif] mb-0">Modelo em fase de testes.</p>
        <p className="font-['Roboto:Bold',sans-serif]">Créditos: Elisa Patiño Lima e Pedro Cerqueira</p>
      </div>
    </div>
  );
}