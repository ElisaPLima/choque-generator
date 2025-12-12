# 🏥 Guia do Choque Generator para Médicos e Estudantes

## O que é o Choque Generator?

O Choque Generator é uma **plataforma web** (funciona no navegador) que simula pacientes em choque circulatório. Você pode fazer decisões de tratamento e ver como o paciente responde em tempo real - tudo de forma **100% segura e virtual**.

---

## 🖥️ Tecnologia Usada (em Linguagem Simples)

### Como funciona por baixo dos panos?

**Pense no Choque Generator como um videogame médico:**
- Em vez de consoles de videogame, ele roda no **navegador da internet** (Chrome, Firefox, Edge, etc.)
- Em vez de gráficos 3D, mostramos **monitores médicos** e **dados vitais**
- Em vez de controles, você usa **botões e números** para administrar tratamentos

### As "Peças" do Programa

#### 1. **React** (Interface Visual)
- **O que é**: Uma ferramenta moderna para criar sites interativos
- **O que faz aqui**: Desenha a tela, atualiza os números em tempo real, mostra os gráficos
- **Analogia**: É como o "motor gráfico" que desenha tudo que você vê na tela

#### 2. **TypeScript** (Linguagem de Programação)
- **O que é**: Uma versão mais segura do JavaScript (a linguagem da web)
- **O que faz aqui**: Escreve as "regras" da simulação
- **Analogia**: É como o "cérebro" que calcula tudo - quando você dá 500ml de soro, ele calcula como a PA vai mudar

#### 3. **Vite** (Sistema de Desenvolvimento)
- **O que é**: Ferramenta que prepara o código para rodar
- **O que faz aqui**: Compila tudo e deixa o site rápido
- **Analogia**: É como um "organizador" que pega todas as peças e monta o programa final

#### 4. **Tailwind CSS** (Visual/Aparência)
- **O que é**: Sistema de estilos pré-prontos
- **O que faz aqui**: Deixa os botões bonitos, as cores certas, tudo organizado
- **Analogia**: É o "designer de interiores" do programa

#### 5. **Netlify** (Hospedagem na Internet)
- **O que é**: Serviço que coloca o site no ar
- **O que faz aqui**: Faz o programa ficar acessível para todo mundo pela internet
- **Analogia**: É como o "servidor" ou "prédio" onde o site mora

---

## 🎮 Como Usar a Plataforma

### Passo 1: Acessar
Abra o navegador (Chrome recomendado) e acesse o link do site.

### Passo 2: Escolher o Modo

#### **Modo Sandbox** (Caixa de Areia)
- Você **cria seu próprio paciente**
- Escolhe o tipo de choque
- Define os sinais vitais iniciais
- Mais livre, ideal para **treinar cenários específicos**

#### **Modo Cenários** (em desenvolvimento)
- Casos clínicos **pré-configurados**
- Como um "case report" interativo
- Ideal para **ensino estruturado**

### Passo 3: Configurar o Paciente

Você precisa definir:
- **Peso** (kg) - importante para cálculo de doses
- **Tipo de choque**: Hipovolêmico, Cardiogênico, Distributivo ou Obstrutivo
- **Gravidade**: Leve, Moderado ou Grave
- **Sinais vitais iniciais** (PA, FC, CVP, etc.)

### Passo 4: Iniciar a Simulação

Clique em **"Iniciar Simulação"** e você verá:

#### **Monitor do Paciente** (canto superior esquerdo)
- FC (Frequência Cardíaca)
- PA (Pressão Arterial)
- SpO₂ (Saturação)
- T (Temperatura)
- FR (Frequência Respiratória)

#### **Dados Hemodinâmicos**
- DC (Débito Cardíaco)
- PVC (Pressão Venosa Central)
- RVS (Resistência Vascular Sistêmica)
- PAM (Pressão Arterial Média)

#### **Laboratório**
- Gasometria
- Lactato
- Hemograma
- Função Renal

### Passo 5: Administrar Tratamentos

#### **Fluidos**
- **Soro Fisiológico** (SF 0,9%) - padrão: 42 ml/h
- **Ringer Lactato** (RL) - padrão: 42 ml/h
- **Albumina** - dose única (infunde por 30 min)
- **Concentrado de Hemácias** - dose única (infunde por 30 min)

#### **Vasopressores**
- **Noradrenalina** - dose em mcg/kg/min
- **Vasopressina** - dose em U/min
- **Adrenalina** - dose em mcg/kg/min

#### **Inotrópicos**
- **Dobutamina** - dose em mcg/kg/min

### Passo 6: Controlar o Tempo

#### **Velocidade da Simulação**
- **Padrão**: 12x (1 minuto real = 12 minutos na simulação)
- **Ajustável**: 1x a 100x
- **Como ajustar**: Use o controle deslizante ou botões +/-

**Por que mudar a velocidade?**
- **1x-5x**: Para ver mudanças sutis e aprender
- **12x-24x**: Velocidade ideal para treino
- **50x-100x**: Para "pular" para eventos importantes

#### **Botões de Controle**
- ▶️ **Iniciar/Pausar**: Começa ou pausa o tempo
- 🔙 **Voltar**: Volta para configuração (perde o progresso!)
- 🔇 **Mudo**: Silencia alertas sonoros

---

## 📊 Como a Simulação Funciona (A Ciência Por Trás)

### Sistema de Cálculo Fisiológico

O programa usa **equações médicas reais**:

#### 1. **Hemodinâmica**
```
PAM = PAD + (PAS - PAD)/3
DC = FC × VS
RVS = (PAM - PVC) × 80 / DC
```

#### 2. **Resposta a Fluidos**
- Usa a **Curva de Frank-Starling**
- Calcula **responsividade a fluidos** baseado em CVP, SVV, perfusão
- Implementa **diminishing returns** (retorno decrescente)

#### 3. **Progressão do Choque**
Cada tipo de choque tem **padrões fisiológicos específicos**:

**Hipovolêmico:**
- ↓ Pré-carga → ↓ DC → ↑ RVS (compensatório)
- ↑ FC, ↓ PA, ↓ CVP, ↑ Lactato
- **Responde bem a volume**

**Cardiogênico:**
- ↓ Contratilidade → ↓ DC → ↑ RVS
- ↑ PVC (congestão), ↓ PA, ↑ Lactato
- **Responde a inotrópicos, piora com muito volume**

**Distributivo:**
- ↓↓ RVS → ↓ PAM (apesar de DC alto)
- ↑ DC, ↓ PA, pele quente (exceto anafilaxia)
- **Responde a vasopressores + volume**

**Obstrutivo:**
- ↓ Retorno venoso → ↓ DC
- ↑ PVC (se tamponamento/TEP), ↓ PA
- **Responde pouco; precisa correção mecânica**

#### 4. **Compensação Fisiológica**
O programa simula:
- **Barorreceptores**: ↓ PA → ↑ FC + ↑ RVS
- **Sistema RAA**: retenção de volume (longo prazo)
- **Respiração**: taquipneia compensatória na acidose

#### 5. **Laboratório Dinâmico**
- **Lactato**: aumenta com hipoperfusão (PAM < 65)
- **pH**: acidose metabólica (lactato ↑)
- **Creatinina**: sobe com hipoperfusão renal
- **Hemograma**: anemia dilucional (muito volume), hemoconcentração (hipovolemia)

---

## 🎯 Objetivos Educacionais

### O que você vai aprender usando o simulador?

1. **Reconhecer Padrões Hemodinâmicos**
   - Diferenciar tipos de choque pelos sinais vitais
   - Interpretar CVP, DC, RVS em conjunto

2. **Responsividade a Fluidos**
   - Quando dar volume funciona (e quando não)
   - Evitar sobrecarga hídrica

3. **Uso de Vasopressores**
   - Quando iniciar
   - Qual droga escolher
   - Como ajustar dose

4. **Tomada de Decisão em Tempo Real**
   - Priorizar intervenções
   - Monitorar resposta ao tratamento
   - Adaptar conduta conforme evolução

---

## ⚠️ Limitações e Avisos

### O que o simulador NÃO faz:

❌ **Não substitui o conhecimento médico**
- É uma ferramenta de treino, não de diagnóstico real

❌ **Não cobre todas as variáveis**
- Simplifica algumas condições complexas
- Não simula comorbidades múltiplas em detalhe

❌ **Não é validado para uso clínico**
- Use apenas para **educação e treinamento**

### O que o simulador faz MUITO BEM:

✅ Ensinar **padrões hemodinâmicos**
✅ Treinar **raciocínio clínico**
✅ Praticar **manejo de choque** em ambiente seguro
✅ Visualizar **causa e efeito** das intervenções

---

## 🐛 Problemas Comuns e Soluções

### "O site não carrega"
- Verifique sua conexão com a internet
- Tente outro navegador (Chrome recomendado)
- Limpe o cache do navegador

### "Os números não mudam"
- Clique no botão ▶️ **Iniciar**
- Verifique se a velocidade não está em 1x (muito lento)

### "O paciente não responde ao tratamento"
- Pode ser fisiologicamente correto! (ex: volume em choque cardiogênico)
- Verifique se escolheu o tratamento certo para o tipo de choque
- Aumente a velocidade para ver efeitos de longo prazo

### "Perdi meu progresso"
- Infelizmente não há sistema de "save" ainda
- Evite apertar "Voltar" durante a simulação

---

## 📚 Recursos Adicionais

### Para Aprender Mais:

**Sobre Choque:**
- Surviving Sepsis Campaign Guidelines
- ATLS - Advanced Trauma Life Support
- ACC/AHA Guidelines (Choque Cardiogênico)

**Sobre a Plataforma:**
- Repositório GitHub: https://github.com/ElisaPLima/choque-generator
- Reportar bugs ou sugerir melhorias: Issues no GitHub

---

## 🆘 Suporte

**Problemas técnicos?**
- Abra uma "Issue" no GitHub
- Descreva o problema em detalhes
- Inclua prints se possível

**Dúvidas sobre o conteúdo médico?**
- Consulte a literatura de referência
- Discuta com preceptores/professores
- Lembre-se: é um simulador educacional

---

## 🎓 Dicas para Aproveitamento Máximo

1. **Comece devagar**: Use velocidade 1x-5x para aprender
2. **Teste hipóteses**: "E se eu der muito volume?" "E se não der vasopressor?"
3. **Compare padrões**: Rode o mesmo cenário com tratamentos diferentes
4. **Use em grupo**: Discuta decisões com colegas
5. **Anote achados**: Quais padrões você observou?

---

## 📝 Changelog e Versões

**Alpha Test 1.0** (Atual)
- ✅ 4 tipos de choque implementados
- ✅ Fisiologia cardiovascular realista
- ✅ Sistema de fluidos e drogas
- ✅ Controle de velocidade (1x-100x)
- ✅ Monitoramento em tempo real

**Próximas Features** (Planejado)
- 🔄 Modo Cenários com casos prontos
- 🔄 Sistema de salvamento de progresso
- 🔄 Exportação de relatórios
- 🔄 Modo multiplayer (ensino em grupo)

---

## ✨ Conclusão

O Choque Generator é uma ferramenta **gratuita, open-source e educacional** para treinar o manejo de choque circulatório. Ele combina **fisiologia médica real** com **tecnologia web moderna** para criar uma experiência de aprendizado **interativa e segura**.

**Use, abuse, aprenda e ensine!** 🚀

---

*Desenvolvido com ❤️ para educação médica*
*Versão: Alpha Test 1.0*
*Data: Dezembro 2025*
