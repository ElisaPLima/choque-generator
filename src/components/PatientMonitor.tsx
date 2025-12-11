// Live Patient Monitor Component - Simple HTML5 Canvas Style
// Displays real-time vital signs with waveforms like XLung

import { useEffect, useRef, useState } from 'react';
import { VitalSigns } from '@/utils/types';
import { NORMAL_RANGES, ALERT_THRESHOLDS } from '@/utils/constants';

interface MonitorProps {
  vitals: VitalSigns;
  isActive: boolean;
  muteAlerts?: boolean;
}

export function PatientMonitor({ vitals, isActive, muteAlerts = false }: MonitorProps) {
  const ecgCanvasRef = useRef<HTMLCanvasElement>(null);
  const plethCanvasRef = useRef<HTMLCanvasElement>(null);
  const [alertsActive, setAlertsActive] = useState<string[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  
  // Waveform data
  const ecgDataRef = useRef<number[]>([]);
  const plethDataRef = useRef<number[]>([]);
  const timeRef = useRef(0);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Audio not available');
      }
    }
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    };
  }, []);

  // Play beep
  const playBeep = (freq: number, dur: number) => {
    if (!audioContextRef.current || muteAlerts) return;
    try {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch (e) {}
  };

  // Check for alerts
  useEffect(() => {
    if (!isActive) return;
    
    const alerts: string[] = [];
    if (vitals.heartRate < ALERT_THRESHOLDS.criticalHR.low) {
      alerts.push('BRADYCARDIA');
      playBeep(400, 0.3);
    }
    if (vitals.heartRate > ALERT_THRESHOLDS.criticalHR.high) {
      alerts.push('TACHYCARDIA');
      playBeep(800, 0.2);
    }
    if (vitals.systolic < ALERT_THRESHOLDS.criticalBP.systolic_low) {
      alerts.push('HYPOTENSION');
      playBeep(300, 0.4);
    }
    if (vitals.spO2 < ALERT_THRESHOLDS.criticalSpO2) {
      alerts.push('LOW O2');
      playBeep(450, 0.5);
    }
    
    setAlertsActive(alerts);
    
    if (alerts.length > 0 && !muteAlerts) {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = setInterval(() => playBeep(600, 0.15), 3000);
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    }
  }, [vitals, isActive, muteAlerts]);

  // Draw waveforms
  useEffect(() => {
    if (!isActive) return;

    let frameCount = 0;
    
    const drawWaveforms = () => {
      // ECG
      const ecgCanvas = ecgCanvasRef.current;
      if (ecgCanvas) {
        const ctx = ecgCanvas.getContext('2d');
        if (ctx) {
          const width = ecgCanvas.width;
          const height = ecgCanvas.height;
          
          // Clear and draw background
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          
          // Draw grid
          ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
          ctx.lineWidth = 1;
          for (let i = 0; i < width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
          }
          for (let j = 0; j < height; j += 20) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(width, j);
            ctx.stroke();
          }
          
          // Draw ECG waveform
          const beatsPerSecond = vitals.heartRate / 60;
          const pixelsPerSecond = 50;
          const beatWidth = pixelsPerSecond / beatsPerSecond;
          
          ctx.strokeStyle = vitals.heartRate < 40 || vitals.heartRate > 140 ? '#ef4444' : '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          for (let x = 0; x < width; x += 2) {
            const phase = ((x + frameCount) % beatWidth) / beatWidth;
            let y = height / 2;
            
            if (phase < 0.1) {
              y = height / 2 - Math.sin(phase * 10 * Math.PI) * 8;
            } else if (phase >= 0.2 && phase < 0.25) {
              y = height / 2 + 10;
            } else if (phase >= 0.25 && phase < 0.35) {
              y = height / 2 - 40;
            } else if (phase >= 0.35 && phase < 0.4) {
              y = height / 2 + 10;
            } else if (phase >= 0.5 && phase < 0.7) {
              y = height / 2 - Math.sin((phase - 0.5) * 5 * Math.PI) * 20;
            }
            
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      
      // Pleth
      const plethCanvas = plethCanvasRef.current;
      if (plethCanvas) {
        const ctx = plethCanvas.getContext('2d');
        if (ctx) {
          const width = plethCanvas.width;
          const height = plethCanvas.height;
          
          // Clear and draw background
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          
          // Draw grid
          ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
          ctx.lineWidth = 1;
          for (let i = 0; i < width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
          }
          
          // Draw pleth waveform
          const beatsPerSecond = vitals.heartRate / 60;
          const pixelsPerSecond = 50;
          const beatWidth = pixelsPerSecond / beatsPerSecond;
          
          ctx.strokeStyle = vitals.spO2 < 90 ? '#ef4444' : '#06b6d4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          const amplitude = (vitals.spO2 / 100) * (height / 3);
          for (let x = 0; x < width; x += 2) {
            const phase = ((x + frameCount) % beatWidth) / beatWidth;
            const y = height / 2 - Math.sin(phase * Math.PI * 2) * amplitude;
            
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      
      frameCount = (frameCount + 2) % 1000;
    };

    const interval = setInterval(drawWaveforms, 50); // 20 fps
    return () => clearInterval(interval);
  }, [vitals, isActive]);

  const getColor = (value: number, param: keyof typeof NORMAL_RANGES): string => {
    const range = NORMAL_RANGES[param];
    if (!range) return '#22c55e';
    if (value < range.critical_low || value > range.critical_high) return '#ef4444';
    if (value < range.min || value > range.max) return '#eab308';
    return '#22c55e';
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '900px',
      backgroundColor: '#111',
      borderRadius: '8px',
      border: '2px solid #444',
      padding: '16px',
      fontFamily: 'monospace',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #444', paddingBottom: '8px' }}>
        <div style={{ fontSize: '14px', color: '#888' }}>MONITOR DE PACIENTE</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {alertsActive.length > 0 && (
            <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>
              ⚠️ {alertsActive.join(' • ')}
            </div>
          )}
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: isActive ? '#22c55e' : '#666'
          }} />
        </div>
      </div>

      {/* Waveforms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* ECG */}
        <div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>ECG</div>
          <canvas
            ref={ecgCanvasRef}
            width={400}
            height={100}
            style={{ width: '100%', height: 'auto', backgroundColor: '#000', borderRadius: '4px' }}
          />
        </div>
        
        {/* SpO2 Pleth */}
        <div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>PLETH (SpO₂)</div>
          <canvas
            ref={plethCanvasRef}
            width={400}
            height={100}
            style={{ width: '100%', height: 'auto', backgroundColor: '#000', borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Vital Signs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* HR */}
        <div style={{ backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#888' }}>FREQ. CARDÍACA</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: getColor(vitals.heartRate, 'heartRate') }}>
            {Math.round(vitals.heartRate)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>bpm</div>
        </div>

        {/* BP */}
        <div style={{ backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#888' }}>PRESSÃO ARTERIAL</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: getColor(vitals.systolic, 'systolic') }}>
            {Math.round(vitals.systolic)}<span style={{ fontSize: '20px' }}>/</span>{Math.round(vitals.diastolic)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            PAM: <span style={{ color: getColor(vitals.map, 'map'), fontWeight: 'bold' }}>{Math.round(vitals.map)}</span> mmHg
          </div>
        </div>

        {/* SpO2 */}
        <div style={{ backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#888' }}>SAT. O₂</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: getColor(vitals.spO2, 'spO2') }}>
            {Math.round(vitals.spO2)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>%</div>
        </div>

        {/* Resp Rate */}
        <div style={{ backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#888' }}>FREQ. RESP.</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: getColor(vitals.respiratoryRate, 'respiratoryRate') }}>
            {Math.round(vitals.respiratoryRate)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>rpm</div>
        </div>

        {/* Temperature */}
        <div style={{ backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#888' }}>TEMPERATURA</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: getColor(vitals.temperature, 'temperature') }}>
            {vitals.temperature.toFixed(1)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>°C</div>
        </div>

        {/* CVP */}
        <div style={{ backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#888' }}>PVC</div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: getColor(vitals.cvp, 'cvp') }}>
            {Math.round(vitals.cvp)}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>mmHg</div>
        </div>
      </div>

      {/* Hemodynamics */}
      <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
          <div>
            <span style={{ color: '#888' }}>Débito Cardíaco: </span>
            <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>{vitals.cardiacOutput.toFixed(1)}</span>
            <span style={{ color: '#666', fontSize: '11px' }}> L/min</span>
          </div>
          <div>
            <span style={{ color: '#888' }}>RVS: </span>
            <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>{Math.round(vitals.svr)}</span>
            <span style={{ color: '#666', fontSize: '11px' }}> dinas·s/cm⁵</span>
          </div>
        </div>
      </div>
    </div>
  );
}
