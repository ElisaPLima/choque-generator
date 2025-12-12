# Adaptações Mobile - Choque Generator

## Resumo das Mudanças

A plataforma Choque Generator foi adaptada para proporcionar uma boa experiência em dispositivos móveis. As seguintes mudanças foram implementadas:

### 1. **LandingPage.tsx**
- ✅ Layout responsivo com breakpoints mobile-first
- ✅ Título com tamanhos adaptativos: `text-4xl sm:text-5xl md:text-6xl lg:text-7xl`
- ✅ Botões empilhados verticalmente em mobile (`flex-col sm:flex-row`)
- ✅ Padding responsivo: `p-6 md:p-16`
- ✅ Width adaptativo: `w-full max-w-[1234px]`
- ✅ Footer com texto menor em mobile (`text-xs md:text-sm`)

### 2. **ModoCenario.tsx**
- ✅ Grid responsivo de cenários: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
- ✅ Imagens de pacientes com altura adaptativa: `h-[150px] md:h-[196px]`
- ✅ Botões full-width em mobile: `w-full sm:w-auto`
- ✅ Título com tamanhos progressivos: `text-3xl md:text-4xl lg:text-5xl`
- ✅ Padding e gaps responsivos

### 3. **PatientSetup.tsx**
- ✅ Header responsivo com quebra de linha em mobile: `flex-col lg:flex-row`
- ✅ Grid de formulário: `grid-cols-1 lg:grid-cols-[300px_1fr]`
- ✅ Botões adaptativos: `w-full sm:w-auto`
- ✅ Texto responsivo: `text-xl sm:text-2xl md:text-3xl lg:text-4xl`
- ✅ Espaçamentos otimizados: `gap-6 md:gap-8`

### 4. **Simulation.tsx** (Principal)
- ✅ Modal de outcome responsivo: `p-4 md:p-8`, `max-h-[90vh] overflow-y-auto`
- ✅ Layout flexível: `flex-col lg:flex-row` para colunas esquerda/direita
- ✅ Tamanhos de ícones adaptativos: `w-16 h-16 md:w-24 md:h-24`
- ✅ Botões em coluna no mobile: `flex-col sm:flex-row`
- ✅ Controles de tempo responsivos com wrap: `flex-wrap gap-2 md:gap-4`
- ✅ Controle de velocidade oculto em telas pequenas: `hidden sm:block`
- ✅ Tamanhos de texto progressivos: `text-xs md:text-base`
- ✅ Container principal: `max-w-[1580px] w-full`

### 5. **PatientMonitor.tsx**
- ✅ Grid de ondas adaptativo: `gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr'`
- ✅ Grid de sinais vitais: `window.innerWidth < 640 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'`
- ✅ Fontes responsivas: `fontSize: window.innerWidth < 640 ? '24px' : '36px'`
- ✅ Hemodinâmica em coluna única no mobile
- ✅ Padding reduzido: `padding: '8px'` vs `'16px'`
- ✅ Header em coluna: `flexDirection: 'column'` em mobile

### 6. **index.html**
- ✅ Meta tag viewport otimizada: `maximum-scale=5.0, user-scalable=yes`
- ✅ Meta tags PWA: `mobile-web-app-capable`, `apple-mobile-web-app-capable`
- ✅ Status bar configurada: `black-translucent`

## Breakpoints Utilizados

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 768px (md)
- **Desktop**: 768px - 1024px (lg)
- **Large Desktop**: > 1024px

## Características Mobile-First

1. **Touch-friendly**: Botões com padding adequado (`px-4 py-2` mínimo)
2. **Leitura otimizada**: Textos com tamanho mínimo legível em mobile
3. **Navegação simplificada**: Elementos empilhados verticalmente
4. **Performance**: Componentes otimizados para renderização mobile
5. **Scrolling**: Overflow adequado com `overflow-y-auto` onde necessário
6. **Responsividade visual**: Fontes, espaçamentos e imagens escaláveis

## Testes Recomendados

Para testar a experiência mobile:

1. **Chrome DevTools**: Abrir DevTools (F12) → Device Toolbar (Ctrl+Shift+M)
2. **Dispositivos sugeridos**:
   - iPhone SE (375x667)
   - iPhone 12/13 (390x844)
   - Samsung Galaxy S20 (360x800)
   - iPad (768x1024)
   - iPad Pro (1024x1366)

3. **Verificar**:
   - ✅ Todos os botões são clicáveis sem zoom
   - ✅ Texto é legível sem zoom
   - ✅ Formulários funcionam corretamente
   - ✅ Monitor de paciente é visualizável
   - ✅ Modais não excedem altura da tela
   - ✅ Navegação entre telas fluida

## Comandos para Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## Notas Técnicas

- Tailwind CSS breakpoints são mobile-first por padrão
- Classes sem prefixo aplicam-se a todos os tamanhos
- Classes com `sm:`, `md:`, `lg:` sobrescrevem em telas maiores
- O PatientMonitor usa inline styles com `window.innerWidth` para maior controle

## Melhorias Futuras Sugeridas

1. Implementar gestos touch (swipe) para navegação
2. Adicionar modo landscape otimizado para tablets
3. Implementar PWA completo com service worker
4. Otimizar imagens com lazy loading
5. Adicionar haptic feedback em dispositivos compatíveis
