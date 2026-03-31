export function formatDistanceToNow(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } else if (diffDay > 1) {
    return `hace ${diffDay} días`;
  } else if (diffDay === 1) {
    return 'hace 1 día';
  } else if (diffHour > 1) {
    return `hace ${diffHour} horas`;
  } else if (diffHour === 1) {
    return 'hace 1 hora';
  } else if (diffMin > 1) {
    return `hace ${diffMin} minutos`;
  } else if (diffMin === 1) {
    return 'hace 1 minuto';
  } else {
    return 'hace un momento';
  }
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
