import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata segundos em formato legível HH:MM:SS ou MM:SS
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calcula pace de corrida em min/km a partir de distância em km e tempo em segundos
 */
export function calculatePace(distanceKm: number, durationSeconds: number): string {
  if (!distanceKm || distanceKm <= 0 || !durationSeconds || durationSeconds <= 0) {
    return '--:--';
  }
  const paceSecondsPerKm = durationSeconds / distanceKm;
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.floor(paceSecondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formata segundos por km diretamente no formato M:SS/km
 */
export function formatPace(paceSecondsPerKm: number): string {
  if (!paceSecondsPerKm || paceSecondsPerKm <= 0 || isNaN(paceSecondsPerKm)) return '--:--';
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.floor(paceSecondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

/**
 * Formata valor numérico com precisão decimal
 */
export function formatMetricNumber(value: number, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return Number(value).toFixed(decimals).replace(/\.00$/, '');
}

export const SPORT_LABELS: Record<string, string> = {
  running: 'Corrida',
  football: 'Futebol',
  futevolei: 'Futevôlei',
  boxing: 'Boxe',
  strength: 'Musculação',
  swimming: 'Natação',
  cycling: 'Ciclismo',
  jiujitsu: 'Jiu-Jitsu',
};

/**
 * Converte Date ou string ISO para formato local YYYY-MM-DDTHH:mm para uso em <input type="datetime-local">
 * respeitando 100% o fuso horário local do usuário.
 */
export function toLocalInputDateTime(dateInput: Date | string = new Date()): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converte Date ou string ISO para formato local YYYY-MM-DD para uso em <input type="date">
 */
export function toLocalInputDate(dateInput: Date | string = new Date()): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Formata data e hora no fuso horário local do usuário (ex: "30/08/2026 às 22:09")
 */
export function formatLocalDateTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const dateStr = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} às ${timeStr}`;
}

/**
 * Formata data no fuso horário local do usuário (ex: "30/08/2026")
 */
export function formatLocalDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Gera um UUID v4 usando a Web Crypto API (disponível em todos os browsers modernos).
 */
export function randomUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para ambientes sem crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

