import { useState } from 'react';
import LandingPage from './components/LandingPage';
import PatientSetup from './components/PatientSetup';
import Simulation from './components/Simulation';
import ModoCenario from './components/ModoCenario';

export type Screen = 'landing' | 'patient-setup' | 'simulation' | 'modo-cenario';

export interface PatientData {
  initials: string;
  age: number;
  weight: number;
  conditions: string[];
  difficulty: string;
  resourceLevel: string;
  shockType: string;
  rvs: number;
  rvp: number;
  volemia: string;
  ivs: number;
  pvc: number;
  poap: number;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [patientData, setPatientData] = useState<PatientData | null>(null);

  const navigateToSetup = () => {
    setCurrentScreen('patient-setup');
  };

  const navigateToModoCenario = () => {
    setCurrentScreen('modo-cenario');
  };

  const navigateToSimulation = (data: PatientData) => {
    setPatientData(data);
    setCurrentScreen('simulation');
  };

  const navigateToLanding = () => {
    setCurrentScreen('landing');
    setPatientData(null);
  };

  const handleSelectScenario = (patientName: string) => {
    // For now, create a dummy patient based on scenario
    const scenarioData: PatientData = {
      initials: patientName.split(',')[0],
      age: parseInt(patientName.match(/\d+/)?.[0] || '50'),
      weight: 70,
      conditions: [],
      difficulty: 'Clínico',
      resourceLevel: 'Alto',
      shockType: 'Choque distributivo',
      rvs: 1200,
      rvp: 2,
      volemia: 'Desidratado',
      ivs: 35,
      pvc: 10,
      poap: 8
    };
    navigateToSimulation(scenarioData);
  };

  const handleRandomScenario = () => {
    const randomPatients = ['Sergio, 76 anos', 'Celina, 87 anos', 'Claudia, 34 anos'];
    const randomName = randomPatients[Math.floor(Math.random() * randomPatients.length)];
    handleSelectScenario(randomName);
  };

  return (
    <div className="w-full h-screen overflow-auto">
      {currentScreen === 'landing' && (
        <LandingPage 
          onModoSandbox={navigateToSetup}
          onModoCenario={navigateToModoCenario}
        />
      )}
      {currentScreen === 'modo-cenario' && (
        <ModoCenario 
          onSelectScenario={handleSelectScenario}
          onRandomScenario={handleRandomScenario}
          onBack={navigateToLanding}
        />
      )}
      {currentScreen === 'patient-setup' && (
        <PatientSetup 
          onStart={navigateToSimulation} 
          onBack={navigateToLanding}
        />
      )}
      {currentScreen === 'simulation' && patientData && (
        <Simulation 
          patientData={patientData}
          onBack={navigateToLanding}
        />
      )}
    </div>
  );
}