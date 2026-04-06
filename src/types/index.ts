export type UserRole = 'Admin' | 'Agente' | 'Cliente';

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  departmentId?: string;
}

export type TicketStatus = 'Abierto' | 'En Progreso' | 'Resuelto' | 'Cerrado';
export type TicketPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente';
export type TicketCategory = 'Hardware' | 'Software' | 'Red' | 'Seguridad' | 'Acceso' | 'Impresora' | 'Correo' | 'Servidor' | 'Respaldo' | 'General';

export interface Message {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorRole: UserRole;
  content: string;
  timestamp: string;
  isInternal?: boolean;
  imageUrl?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  departmentId?: string;
  createdById: string;
  createdByName: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  imageUrl?: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  jefe?: string;         // jefe del departamento (campo real en Supabase)
}

export interface AppSettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  primaryColor: string;
  ticketPrefix: string;
  allowClientRegistration: boolean;
  notifyOnNewTicket: boolean;
  notifyOnStatusChange: boolean;
  notifyOnNewMessage: boolean;
  maxAttachmentMB: number;
  defaultPriority: TicketPriority;
  autoCloseResolvedDays: number;
}
