import React, { useState, useEffect } from 'react';
import { X, Calculator, ArrowRightLeft, Sparkles } from 'lucide-react';

interface UnitConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: number;
  initialUnit?: 'Gunta' | 'Acre' | 'Sqft' | 'Hectare' | 'Sqm' | 'Are';
}

export const UnitConverterModal: React.FC<UnitConverterModalProps> = ({
  isOpen,
  onClose,
  initialValue = 1,
  initialUnit = 'Acre'
}) => {
  const [value, setValue] = useState<number>(initialValue);
  const [sourceUnit, setSourceUnit] = useState<'Acre' | 'Gunta' | 'Are' | 'Hectare' | 'Sqm' | 'Sqft'>('Acre');

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue || 1);
      const safeUnit = (initialUnit === 'Are' || initialUnit === 'Gunta' || initialUnit === 'Acre' || initialUnit === 'Hectare' || initialUnit === 'Sqm' || initialUnit === 'Sqft')
        ? initialUnit
        : 'Acre';
      setSourceUnit(safeUnit);
    }
  }, [isOpen, initialValue, initialUnit]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toSqft = (val: number, unit: string): number => {
    if (!Number.isFinite(val) || val <= 0) return 0;
    switch (unit) {
      case 'Acre': return val * 43560;
      case 'Gunta': return val * 1089;
      case 'Are': return val * 1076.391;
      case 'Hectare': return val * 107639.1;
      case 'Sqm': return val * 10.76391;
      case 'Sqft': return val;
      default: return val;
    }
  };

  const sqftVal = toSqft(value || 0, sourceUnit);

  const conversions = [
    {
      name: 'Gunta (Guntha)',
      value: (sqftVal / 1089).toFixed(2),
      description: '1 Gunta = 1,089 sq. ft. (40 Gunta = 1 Acre)',
      badge: 'Maharashtra Standard'
    },
    {
      name: 'Are (R)',
      value: (sqftVal / 1076.391).toFixed(3),
      description: '1 Are = 100 sq. meters (~1,076.39 sq. ft.)',
      badge: '7/12 Land Record'
    },
    {
      name: 'Acre',
      value: (sqftVal / 43560).toFixed(4),
      description: '1 Acre = 40 Gunta = 43,560 sq. ft.',
      badge: 'Agricultural Standard'
    },
    {
      name: 'Hectare (Hect.)',
      value: (sqftVal / 107639.1).toFixed(4),
      description: '1 Hectare = 100 Are = 2.471 Acres (10,000 m²)',
      badge: 'Revenue Cadastral'
    },
    {
      name: 'Square Feet (Sq. ft.)',
      value: Math.round(sqftVal).toLocaleString('en-IN'),
      description: 'Standard urban & layout plot measurement',
      badge: 'Layout Standard'
    },
    {
      name: 'Square Meters (Sq. m.)',
      value: (sqftVal / 10.76391).toFixed(2),
      description: 'International metric land measurement',
      badge: 'Metric SI'
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="converter-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.15)] p-6 text-slate-800 overflow-hidden">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 id="converter-modal-title" className="text-lg font-bold text-slate-900 font-heading">
                Maharashtra Land Unit Converter
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                Standard Gunta, Are, Acre, Hectare & Sqft parity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close land converter"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Input Area Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                value={value || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setValue(isNaN(val) ? 0 : val);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Source Unit</label>
              <select
                value={sourceUnit}
                onChange={(e) => setSourceUnit(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              >
                <option value="Gunta">Gunta</option>
                <option value="Are">Are (R)</option>
                <option value="Acre">Acre</option>
                <option value="Hectare">Hectare</option>
                <option value="Sqft">Square Feet (Sqft)</option>
                <option value="Sqm">Square Meters (Sqm)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" /> Standard Maharashtra Equivalent Breakdown
            </span>

            <div className="grid gap-2">
              {conversions.map((conv) => (
                <div
                  key={conv.name}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/80 hover:border-emerald-200 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{conv.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-emerald-700 font-semibold border border-emerald-100 shadow-2xs">
                        {conv.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal">{conv.description}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900 font-heading">
                      {conv.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-medium">Standard Mahabhumi Cadastral Metric Parity</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
