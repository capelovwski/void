import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { formatBRL, parseAmount, round2 } from '../../core';
import { useIsMobile } from '../../hooks/useBreakpoint';

export interface SetupAnswers {
  initialBalance: number;
  monthlyIncome: number;
  dailySpend: number;
}

interface SetupWizardProps {
  onFinish: (answers: SetupAnswers) => void;
  onSkip: () => void;
}

interface Step {
  key: keyof SetupAnswers;
  question: string;
  help: string;
  /** Sugere um valor a partir do que já foi respondido, ou null se não der. */
  suggest?: (answers: SetupAnswers) => number | null;
  suggestLabel?: string;
}

/**
 * Três perguntas, uma por tela.
 *
 * O app não produz nada até saber estes três números, e antes deles ficarem
 * preenchidos a tela inicial é uma parede de "R$ 0" com um aviso que manda o
 * usuário caçar telas de configuração. Perguntar de uma vez, em linguagem
 * direta, troca esse labirinto por um caminho de trinta segundos.
 *
 * Nenhuma pergunta é obrigatória: dá para pular tudo e configurar depois.
 */
const STEPS: Step[] = [
  {
    key: 'initialBalance',
    question: 'Quanto você tem hoje?',
    help: 'O dinheiro que está na sua conta agora. É daqui que o app começa a contar.',
  },
  {
    key: 'monthlyIncome',
    question: 'Quanto entra por mês?',
    help: 'Salário, aposentadoria, o que for mais ou menos fixo. Dá para ajustar depois.',
  },
  {
    key: 'dailySpend',
    question: 'Quanto quer gastar por dia?',
    help: 'Uma média para o dia a dia: comida, transporte, besteira. O app usa isso para adivinhar como vai ficar seu saldo nos próximos meses.',
    // Metade do que entra, dividido pelos dias do mês: um ponto de partida
    // razoável, que a pessoa ajusta em vez de ter que inventar do zero.
    suggest: (a) => (a.monthlyIncome > 0 ? round2((a.monthlyIncome * 0.5) / 30) : null),
    suggestLabel: 'metade da sua renda',
  },
];

const EMPTY: SetupAnswers = { initialBalance: 0, monthlyIncome: 0, dailySpend: 0 };

export const SetupWizard: React.FC<SetupWizardProps> = ({ onFinish, onSkip }) => {
  const isMobile = useIsMobile();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<SetupAnswers>(EMPTY);
  const [input, setInput] = useState('');
  /** -1 ao voltar, 1 ao avançar: define de que lado a tela entra. */
  const [direction, setDirection] = useState(1);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const suggestion = step.suggest ? step.suggest(answers) : null;

  const commit = (): SetupAnswers => {
    const parsed = parseAmount(input);
    const next = { ...answers, [step.key]: parsed !== null && parsed > 0 ? round2(parsed) : 0 };
    setAnswers(next);
    return next;
  };

  const goNext = () => {
    const next = commit();
    if (isLast) {
      onFinish(next);
      return;
    }
    setDirection(1);
    setStepIndex((i) => i + 1);
    setInput('');
  };

  const goBack = () => {
    commit();
    setDirection(-1);
    setStepIndex((i) => i - 1);
    // Reexibe o que já tinha sido respondido no passo anterior.
    const previous = STEPS[stepIndex - 1];
    const saved = answers[previous.key];
    setInput(saved > 0 ? String(saved) : '');
  };

  /**
   * A troca de passo remonta o bloco pela `key` em vez de usar AnimatePresence.
   * Com `mode="wait"` o painel que saía bloqueava a montagem do próximo, e a
   * pergunta ficava congelada no passo anterior enquanto o rodapé já avançava.
   * Remontar dispensa a coreografia de saída e não tem esse estado intermediário.
   */
  const slideIn = {
    initial: { x: direction * 36, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { type: 'spring', stiffness: 400, damping: 34 },
  } as const;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay-02 p-0 backdrop-blur-sm tablet:items-center tablet:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glass-edge relative flex w-full max-w-md flex-col rounded-t-3xl border-t border-neutral-03 bg-neutral-00 shadow-2xl tablet:rounded-3xl tablet:border"
        initial={{ y: isMobile ? '100%' : 20, opacity: isMobile ? 1 : 0 }}
        animate={{ y: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 340 } }}
        exit={{ y: isMobile ? '100%' : 20, opacity: isMobile ? 1 : 0, transition: { duration: 0.2 } }}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-6">
          {/* Pontos de progresso: mostram que são poucas perguntas e que isso acaba. */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex ? 'w-5 bg-main' : i < stepIndex ? 'w-1.5 bg-main/50' : 'w-1.5 bg-neutral-03'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium text-neutral-08 transition-colors hover:text-neutral-11"
          >
            Pular
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">
          <motion.div key={step.key} {...slideIn}>
              <h2 className="font-albert-sans text-2xl font-semibold leading-tight text-neutral-11">
                {step.question}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-08">{step.help}</p>

              <div className="mt-6 flex items-baseline gap-2 border-b border-neutral-03 pb-3">
                <span className="text-2xl font-light text-neutral-08">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  autoFocus
                  placeholder="0,00"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goNext();
                  }}
                  className="min-w-0 flex-1 bg-transparent font-albert-sans text-4xl font-semibold tabular-nums tracking-tight text-neutral-11 placeholder-neutral-05 focus:outline-none"
                />
                {isLast && <span className="flex-shrink-0 text-sm text-neutral-08">/dia</span>}
              </div>

              {suggestion !== null && suggestion > 0 && (
                <button
                  type="button"
                  onClick={() => setInput(String(suggestion))}
                  className="mt-3 rounded-full border border-neutral-03 px-3 py-1.5 text-[11px] font-medium text-neutral-10 transition-colors hover:border-neutral-05 hover:text-neutral-11"
                >
                  Usar {formatBRL(suggestion)} · {step.suggestLabel}
                </button>
              )}
          </motion.div>
        </div>

        <div
          className="flex items-center gap-3 border-t border-neutral-02 px-6 pt-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-neutral-03 text-neutral-10 transition-colors hover:bg-neutral-01"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={goNext}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-main text-sm font-semibold text-zinc-950 shadow-sm transition-all active:scale-[0.98]"
          >
            {isLast ? 'Tudo pronto' : 'Continuar'}
            {isLast ? <Check size={18} /> : <ArrowRight size={18} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
