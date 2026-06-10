/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppViewMode } from '../types';

interface SimulationHeaderProps {
  currentView: AppViewMode;
  selectedSessionId: string;
  selectedDesignerId: string;
  onViewChange: (view: AppViewMode, sessionId?: string, designerId?: string) => void;
}

export default function SimulationHeader({
  currentView,
  selectedSessionId,
  selectedDesignerId,
  onViewChange
}: SimulationHeaderProps) {
  return (
    <div id="sim-header" className="bg-white text-slate-800 border-b border-slate-200 text-xs">
      {/* Interactive Switchers */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-center gap-4">
        {/* Persona Selectors */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            id="sim-btn-lead"
            onClick={() => onViewChange('lead')}
            className={`px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === 'lead'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            👑 Лид-кабинет (Управление)
          </button>

          <button
            id="sim-btn-designer"
            onClick={() => onViewChange('designer', selectedSessionId || 'sess-summer-2026')}
            className={`px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === 'designer'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            📝 Самооценка дизайнера
          </button>

          <button
            id="sim-btn-profile"
            onClick={() => onViewChange('designer-profile', undefined, selectedDesignerId || 'eval-designer-ivan')}
            className={`px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === 'designer-profile'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            📊 Кабинет калибровки & ИПР
          </button>

          <button
            id="sim-btn-director"
            onClick={() => onViewChange('director-report')}
            className={`px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === 'director-report'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            👁️ Отчет HR / C-Level
          </button>
        </div>
      </div>
    </div>
  );
}
