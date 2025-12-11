function Button() {
  return (
    <div className="absolute bg-[#1e2081] h-[80px] left-[795px] rounded-[8px] top-[578px] w-[281px]" data-name="Button">
      <div className="content-stretch flex gap-[8px] items-center justify-center overflow-clip p-[12px] relative rounded-[inherit] size-full">
        <p className="font-['Roboto:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[32px] text-neutral-100 text-nowrap whitespace-pre" style={{ fontVariationSettings: "'wdth' 100" }}>
          Modo Sandbox
        </p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#2c2c2c] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Button1() {
  return (
    <div className="absolute bg-[#1e2081] h-[80px] left-[363px] rounded-[8px] top-[578px] w-[281px]" data-name="Button">
      <div className="content-stretch flex gap-[8px] items-center justify-center overflow-clip p-[12px] relative rounded-[inherit] size-full">
        <p className="font-['Roboto:Bold',sans-serif] font-bold leading-[40px] relative shrink-0 text-[32px] text-neutral-100 text-nowrap whitespace-pre" style={{ fontVariationSettings: "'wdth' 100" }}>
          Modo Cenários
        </p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#2c2c2c] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

export default function ChoqueGenerator() {
  return (
    <div className="bg-white relative size-full" data-name="Choque Generator">
      <div className="absolute bg-[#dfdfdf] h-[1024px] left-0 top-0 w-[1440px]" />
      <div className="absolute bg-[#ebf5ff] h-[634px] left-[93px] rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] top-[93px] w-[1234px]" />
      <div className="absolute flex flex-col font-['Roboto:Regular',sans-serif] font-normal h-[240px] justify-center leading-[0] left-[719.5px] text-[30px] text-black text-center top-[404px] translate-x-[-50%] translate-y-[-50%] w-[1151px]" style={{ fontVariationSettings: "'wdth' 100" }}>
        <p className="leading-[normal]">Choque Generator é uma plataforma em fase de testes com o objetivo de ensinar estudantes da saúde sobre as repercussões hemodinâmicas do choque de forma interativa e segura. Para isso, você pode escolher um dos nossos modos para testar suas habilidades, ensinar sua turma ou apenas se divertir com o manejo do choque hemodinâmico.</p>
      </div>
      <div className="absolute flex flex-col font-['Roboto_Condensed:Bold',sans-serif] font-bold h-[73px] justify-center leading-[0] left-[720px] text-[#1e2081] text-[50px] text-center top-[167.5px] translate-x-[-50%] translate-y-[-50%] w-[822px]">
        <p className="leading-[normal]">Choque Generator</p>
      </div>
      <div className="absolute flex flex-col font-['Roboto_Condensed:Bold',sans-serif] font-bold h-[73px] justify-center leading-[0] left-[720px] text-[#1e2081] text-[50px] text-center top-[167.5px] translate-x-[-50%] translate-y-[-50%] w-[822px]">
        <p className="leading-[normal]">Choque Generator</p>
      </div>
      <div className="absolute flex flex-col font-['Roboto:Light',sans-serif] font-light h-[73px] justify-center leading-[0] left-[720px] text-[#b8b8b8] text-[30px] text-center top-[221.5px] translate-x-[-50%] translate-y-[-50%] w-[822px]" style={{ fontVariationSettings: "'wdth' 100" }}>
        <p className="leading-[normal]">Alpha Test 1.0</p>
      </div>
      <Button />
      <Button1 />
      <div className="absolute flex flex-col font-['Roboto:Bold',sans-serif] font-bold h-[56px] justify-center leading-[normal] left-[1429px] text-[25px] text-right text-white top-[984px] translate-x-[-100%] translate-y-[-50%] w-[652px]" style={{ fontVariationSettings: "'wdth' 100" }}>
        <p className="mb-0">Modelo em fase de testes.</p>
        <p>Créditos: Elisa Patiño Lima e Pedro Cerqueira</p>
      </div>
    </div>
  );
}