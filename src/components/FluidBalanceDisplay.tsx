// Fluid Balance Tracking Component
// Displays cumulative fluid input/output with real-time totals

import { FluidBalance } from '@/utils/types';

interface FluidBalanceDisplayProps {
  fluidBalance: FluidBalance;
  patientWeight: number;
}

export function FluidBalanceDisplay({ fluidBalance, patientWeight }: FluidBalanceDisplayProps) {
  // Calculate mL/kg for clinical context
  const netBalancePerKg = fluidBalance.netBalance / patientWeight;
  
  // Determine if balance is concerning
  const getBalanceColor = (balance: number): string => {
    const balancePerKg = balance / patientWeight;
    if (Math.abs(balancePerKg) > 30) return 'text-red-400'; // >30 mL/kg is concerning
    if (Math.abs(balancePerKg) > 20) return 'text-yellow-400'; // >20 mL/kg is warning
    return 'text-green-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 font-mono text-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-600">
        <h3 className="text-gray-300 font-bold">BALANÇO HÍDRICO</h3>
        <div className="text-xs text-gray-500">Peso: {patientWeight} kg</div>
      </div>

      {/* Net Balance - Prominently Displayed */}
      <div className="bg-gray-900 rounded p-3 mb-3">
        <div className="text-xs text-gray-400 mb-1">BALANÇO TOTAL</div>
        <div className="flex items-baseline gap-3">
          <span className={`text-3xl font-bold ${getBalanceColor(fluidBalance.netBalance)}`}>
            {fluidBalance.netBalance >= 0 ? '+' : ''}{Math.round(fluidBalance.netBalance)}
          </span>
          <span className="text-gray-500">mL</span>
          <span className={`text-lg ${getBalanceColor(fluidBalance.netBalance)}`}>
            ({netBalancePerKg >= 0 ? '+' : ''}{netBalancePerKg.toFixed(1)} mL/kg)
          </span>
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-3">
        <div className="text-xs text-cyan-400 font-bold mb-2">ENTRADA (Input)</div>
        <div className="grid grid-cols-2 gap-2 pl-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Cristaloides:</span>
            <span className="text-cyan-300">{Math.round(fluidBalance.crystalloids)} mL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Coloides:</span>
            <span className="text-cyan-300">{Math.round(fluidBalance.colloids)} mL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Hemoderivados:</span>
            <span className="text-cyan-300">{Math.round(fluidBalance.blood)} mL</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-700">
            <span className="text-cyan-400 font-bold">Total Entrada:</span>
            <span className="text-cyan-400 font-bold">{Math.round(fluidBalance.totalInput)} mL</span>
          </div>
        </div>
      </div>

      {/* Output Section */}
      <div>
        <div className="text-xs text-orange-400 font-bold mb-2">SAÍDA (Output)</div>
        <div className="grid grid-cols-2 gap-2 pl-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Diurese:</span>
            <span className="text-orange-300">{Math.round(fluidBalance.urine)} mL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Perdas insensíveis:</span>
            <span className="text-orange-300">{Math.round(fluidBalance.insensibleLoss)} mL</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-700">
            <span className="text-orange-400 font-bold">Total Saída:</span>
            <span className="text-orange-400 font-bold">{Math.round(fluidBalance.totalOutput)} mL</span>
          </div>
        </div>
      </div>

      {/* Clinical Interpretation */}
      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="text-xs">
          {netBalancePerKg > 30 && (
            <div className="text-red-400">⚠️ Sobrecarga volêmica significativa</div>
          )}
          {netBalancePerKg > 20 && netBalancePerKg <= 30 && (
            <div className="text-yellow-400">⚠️ Balanço positivo moderado</div>
          )}
          {netBalancePerKg >= -10 && netBalancePerKg <= 20 && (
            <div className="text-green-400">✓ Balanço adequado</div>
          )}
          {netBalancePerKg < -10 && netBalancePerKg >= -20 && (
            <div className="text-yellow-400">⚠️ Balanço negativo</div>
          )}
          {netBalancePerKg < -20 && (
            <div className="text-red-400">⚠️ Depleção volêmica significativa</div>
          )}
        </div>
      </div>

      {/* Urine Output Rate */}
      <div className="mt-2 text-xs text-gray-400">
        <div>Débito urinário: {(fluidBalance.urine / patientWeight).toFixed(1)} mL/kg (total)</div>
        {fluidBalance.urine / patientWeight < 0.5 && (
          <div className="text-orange-400 mt-1">⚠️ Oligúria (meta: &gt;0.5 mL/kg/h)</div>
        )}
      </div>
    </div>
  );
}
