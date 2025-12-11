# Choque Generator - Plataforma de Treinamento Médico

Simulador interativo de choques circulatórios para treinamento médico, desenvolvido com React, TypeScript e Vite.

## 📋 Sobre o Projeto

O Choque Generator é uma plataforma educacional que simula diferentes tipos de choque circulatório com fisiologia medicamente precisa. Os estudantes podem:

- **Configurar pacientes** com diferentes tipos de choque (hipovolêmico, cardiogênico, distributivo, obstrutivo)
- **Monitorar sinais vitais** em tempo real
- **Administrar tratamentos** (fluidos, vasopressores, inotrópicos)
- **Acompanhar evolução** do paciente baseada em decisões clínicas
- **Visualizar balanço hídrico** e resultados laboratoriais

## 🚀 Tipos de Choque Implementados

- **Choque Hipovolêmico** - Perda de volume intravascular
- **Choque Cardiogênico** - Falência da bomba cardíaca
- **Choque Distributivo** - Sepse, anafilaxia, neurogênico
- **Choque Obstrutivo** - Embolia pulmonar, tamponamento cardíaco

## 🛠️ Tecnologias

- **React** 18 + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes de interface
- **Lucide React** - Ícones

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/ElisaPLima/choque-generator.git
cd choque-generator
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse no navegador: `http://localhost:3000`

## 🎮 Como Usar

1. **Selecione o tipo de choque** na tela inicial
2. **Configure o paciente** (peso, tipo de choque, severidade)
3. **Inicie a simulação** e monitore os sinais vitais
4. **Administre tratamentos**:
   - Soro Fisiológico / Ringer Lactato (42 ml/h)
   - Albumina (dose única, 30 min)
   - Concentrado de Hemácias (dose única, 30 min)
   - Noradrenalina, Vasopressina, Dobutamina, Adrenalina
5. **Observe a resposta** do paciente aos tratamentos

## 📊 Recursos

- ✅ Fisiologia cardiovascular realista
- ✅ Sistema de randomização para variabilidade
- ✅ Monitoramento hemodinâmico contínuo
- ✅ Balanço hídrico automático
- ✅ Alertas críticos e avisos
- ✅ Bombas de infusão virtuais
- ✅ Análises laboratoriais

## 🎯 Objetivos Educacionais

- Reconhecer padrões hemodinâmicos de diferentes choques
- Praticar decisões de ressuscitação
- Entender resposta a fluidos e vasopressores
- Desenvolver raciocínio clínico em situações críticas

## 📄 Licença

Este projeto está sob a licença MIT.

## 👥 Autores

Desenvolvido como ferramenta educacional para treinamento médico.

Design original disponível em: https://www.figma.com/design/FHjofJXMYSj5z6sLpTvGX8/Medical-Training-Platform-Prototype
