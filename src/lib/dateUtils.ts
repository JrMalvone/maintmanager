import { differenceInMinutes, differenceInHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatElapsedTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const minutes = differenceInMinutes(now, date);
  const hours = differenceInHours(now, date);

  if (minutes < 60) {
    return `${minutes}min`;
  } else if (hours < 24) {
    return `${hours}h`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
}

export function getElapsedClass(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const hours = differenceInHours(now, date);

  if (hours < 4) {
    return "elapsed-normal";
  } else if (hours < 24) {
    return "elapsed-warning";
  } else {
    return "elapsed-critical";
  }
}

export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatDate(dateString: string): string {
  return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
}

export function calculateDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const minutes = differenceInMinutes(endDate, startDate);
  
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }
}
