import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Estado do indicador. Verde é saudável, amarelo é perto do limite e vermelho é
 * estourado — a mesma escala vale para o valor e para a barra de progresso.
 */
export type KpiStatus = 'neutral' | 'good' | 'warn' | 'bad';

const STATUS_TONE: Record<KpiStatus, { chip: string; value: string; bar: string }> = {
  neutral: { chip: 'bg-neutral-02 text-neutral-10', value: 'text-neutral-11', bar: 'bg-neutral-08' },
  good: {
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    value: 'text-neutral-11',
    bar: 'bg-emerald-500',
  },
  warn: {
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    value: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  bad: {
    chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    value: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
  },
};

interface KpiCardProps {
  label: string;
  value: string;
  context?: string;
  icon: LucideIcon;
  status?: KpiStatus;
  /** 0 a 1. Quando presente, desenha a barra de progresso abaixo do valor. */
  progress?: number;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  context,
  icon: Icon,
  status = 'neutral',
  progress,
}) => {
  const tone = STATUS_TONE[status];

  return (
    <div className="card-premium p-4 flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between gap-2 text-neutral-08">
        <span className="text-[11px] font-semibold uppercase tracking-wider truncate">{label}</span>
        <div className={`p-1.5 rounded-lg flex-shrink-0 ${tone.chip}`}>
          <Icon size={15} />
        </div>
      </div>

      <div className="space-y-1.5">
        <span className={`text-xl font-bold font-albert-sans tabular-nums block truncate ${tone.value}`}>
          {value}
        </span>

        {progress !== undefined && (
          <div className="w-full h-1.5 bg-neutral-02 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        )}

        {context && <span className="text-[11px] text-neutral-08 block leading-snug">{context}</span>}
      </div>
    </div>
  );
};
