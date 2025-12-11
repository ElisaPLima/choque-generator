import imgImage2 from "figma:asset/2ce8d6af1d8181e4e3c7cf4e1d23ba7ff9da6dc3.png";
import imgRectangle34 from "figma:asset/2aac1d13a2860458d7c20e86fbeb31301e7a4225.png";
import imgImage3 from "figma:asset/7da8229338d931ced29aa8c57d3eddfabb2471fc.png";
import imgImage4 from "figma:asset/2b38b8dfd2e4aed0b1b4a0f555997c4af268231f.png";

function Button() {
  return (
    <div className="absolute bg-[#1e2081] left-[190px] rounded-[8px] top-[238px] w-[221px]" data-name="Button">
      <div className="content-stretch flex gap-[8px] items-center justify-center overflow-clip p-[12px] relative rounded-[inherit] w-full">
        <p className="font-['Inter:Bold',sans-serif] font-bold leading-none not-italic relative shrink-0 text-[16px] text-neutral-100 text-nowrap whitespace-pre">Iniciar cenário aleatório</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[#2c2c2c] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents left-[190px] top-[322px]">
      <div className="absolute bg-[#1e2081] h-[272px] left-[190px] rounded-[17px] top-[322px] w-[318px]" />
      <div className="absolute h-[196px] left-[190px] rounded-[14px] top-[398px] w-[318px]" data-name="image 2">
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none rounded-[14px] size-full" src={imgImage2} />
      </div>
      <div className="absolute flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[70px] justify-center leading-[0] left-[350.5px] not-italic text-[25px] text-center text-white top-[363px] translate-x-[-50%] translate-y-[-50%] w-[283px]">
        <p className="leading-[normal]">Sergio, 76 anos.</p>
      </div>
    </div>
  );
}

function MaskGroup() {
  return (
    <div className="absolute contents left-[582px] top-[398px]" data-name="Mask group">
      <div className="absolute bg-white h-[196px] left-[582px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0px] mask-size-[318px_196px] rounded-[17px] top-[398px] w-[318px]" style={{ maskImage: `url('${imgRectangle34}')` }} />
      <div className="absolute h-[210px] left-[624px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-42px_14px] mask-size-[318px_196px] top-[384px] w-[251px]" data-name="image 3" style={{ maskImage: `url('${imgRectangle34}')` }}>
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full" src={imgImage3} />
      </div>
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute contents left-[582px] top-[322px]">
      <div className="absolute bg-[#1e2081] h-[272px] left-[582px] rounded-[17px] top-[322px] w-[318px]" />
      <div className="absolute flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[70px] justify-center leading-[0] left-[742.5px] not-italic text-[25px] text-center text-white top-[363px] translate-x-[-50%] translate-y-[-50%] w-[283px]">
        <p className="leading-[normal]">Celina, 87 anos.</p>
      </div>
      <MaskGroup />
    </div>
  );
}

function MaskGroup1() {
  return (
    <div className="absolute contents left-[974px] top-[398px]" data-name="Mask group">
      <div className="absolute bg-white h-[196px] left-[974px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[0px] mask-size-[318px_196px] rounded-[17px] top-[398px] w-[318px]" style={{ maskImage: `url('${imgRectangle34}')` }} />
      <div className="absolute h-[192px] left-[979px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-5px_0px] mask-size-[318px_196px] rounded-[24px] top-[398px] w-[307px]" data-name="image 4" style={{ maskImage: `url('${imgRectangle34}')` }}>
        <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none rounded-[24px] size-full" src={imgImage4} />
      </div>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute contents left-[974px] top-[322px]">
      <div className="absolute bg-[#1e2081] h-[272px] left-[974px] rounded-[17px] top-[322px] w-[318px]" />
      <div className="absolute flex flex-col font-['Inter:Bold',sans-serif] font-bold h-[70px] justify-center leading-[0] left-[1134.5px] not-italic text-[25px] text-center text-white top-[363px] translate-x-[-50%] translate-y-[-50%] w-[283px]">
        <p className="leading-[normal]">Claudia, 34 anos.</p>
      </div>
      <MaskGroup1 />
    </div>
  );
}

export default function ModoCenario() {
  return (
    <div className="bg-white relative size-full" data-name="Modo Cenário">
      <div className="absolute bg-[#dfdfdf] h-[1024px] left-0 top-0 w-[1440px]" />
      <div className="absolute bg-[#ebf5ff] h-[634px] left-[93px] rounded-[19px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] top-[93px] w-[1234px]" />
      <div className="absolute flex flex-col font-['Roboto_Condensed:Bold',sans-serif] font-bold h-[73px] justify-center leading-[0] left-[132px] text-[#1e2081] text-[30px] top-[157.5px] translate-y-[-50%] w-[822px]">
        <p className="leading-[normal]">Modo Cenário</p>
      </div>
      <div className="absolute flex flex-col font-['Roboto:Bold',sans-serif] font-bold h-[56px] justify-center leading-[normal] left-[1429px] text-[25px] text-right text-white top-[984px] translate-x-[-100%] translate-y-[-50%] w-[652px]" style={{ fontVariationSettings: "'wdth' 100" }}>
        <p className="mb-0">Modelo em fase de testes.</p>
        <p>Créditos: Elisa Patiño Lima e Pedro Cerqueira</p>
      </div>
      <Button />
      <Group />
      <Group1 />
      <Group2 />
    </div>
  );
}