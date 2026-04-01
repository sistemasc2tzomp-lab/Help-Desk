import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Ticket, Department, TicketStatus, TicketPriority, TicketCategory, Message } from '../types';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { getAdminSupabase } from '../lib/supabaseAdmin';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  tickets: Ticket[];
  users: User[];
  departments: Department[];
  loading: boolean;
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>) => Promise<Ticket>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  updateTicketPriority: (ticketId: string, priority: TicketPriority) => Promise<void>;
  assignTicket: (ticketId: string, userId: string) => Promise<void>;
  addMessage: (ticketId: string, content: string, isInternal?: boolean, imageUrl?: string) => Promise<void>;
  getTicketById: (id: string) => Ticket | undefined;
  addDepartment: (dept: Omit<Department, 'id' | 'createdAt'>) => Promise<void>;
  updateDepartment: (id: string, dept: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  page: string;
  setPage: (page: string) => void;
  selectedTicketId: string | null;
  setSelectedTicketId: (id: string | null) => void;
  supabaseReady: boolean;
  sbStatus: 'connected' | 'disconnected' | 'checking';
  lastPing: string | null;
  loginWithSupabase: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  createUser: (userData: { name: string; email: string; role: User['role']; departmentId?: string }) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | null>(null);

// ── helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
const COLORS = ['#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#0891B2'];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

// Normalize role regardless of case or spelling
function normalizeRole(raw: unknown): User['role'] {
  const r = String(raw || '').toLowerCase().trim();
  if (r === 'admin' || r === 'administrador') return 'Admin';
  if (r === 'agente' || r === 'agent') return 'Agente';
  return 'Cliente';
}

// ── DB row → app types ───────────────────────────────────────────────────────
// Maps tabla "perfiles": id, nombre, email, avatar, rol, departamento_id, activo, creado_en
function rowToUser(r: Record<string, unknown>): User {
  const name = String(r.nombre || r.name || r.full_name || r.email || 'Usuario');
  return {
    id: String(r.id),
    name,
    initials: getInitials(name),
    email: String(r.email || ''),
    role: normalizeRole(r.rol || r.role),
    avatarColor: colorFor(String(r.id)),
    departmentId: r.departamento_id ? String(r.departamento_id) : undefined,
  };
}

// Maps tabla "messages": id, ticket_id, author_id, content, is_internal, image_url, created_at
function rowToMessage(r: Record<string, unknown>, usersMap: Record<string, User> = {}): Message {
  const userId = String(r.usuario_id || r.author_id || '');
  const author = usersMap[userId];
  const authorName = author?.name || String(r.author_name || 'Usuario');
  return {
    id: String(r.id),
    ticketId: String(r.ticket_id || ''),
    authorId: userId,
    authorName,
    authorInitials: getInitials(authorName),
    authorColor: author?.avatarColor || colorFor(userId),
    authorRole: author?.role || 'Cliente',
    content: String(r.contenido || r.content || ''),
    timestamp: String(r.creado_en || r.created_at || new Date().toISOString()),
    isInternal: Boolean(r.es_interno || r.is_internal),
    // imagenes is jsonb array, take first element's url if present
    imageUrl: (() => {
      const imgs = r.imagenes as unknown;
      if (Array.isArray(imgs) && imgs.length > 0) {
        return String(imgs[0].url || imgs[0] || '');
      }
      return r.image_url ? String(r.image_url) : undefined;
    })(),
  };
}

// Maps tabla "tickets": id, titulo, descripcion, estado, prioridad, departamento_id,
//   creado_por_id, asignado_a_id, etiquetas, imagenes(jsonb), creado_en, actualizado_en
function rowToTicket(r: Record<string, unknown>, msgs: Message[] = [], usersMap: Record<string, User> = {}): Ticket {
  const creatorId = String(r.creado_por_id || r.created_by_id || '');
  const assigneeId = r.asignado_a_id || r.assigned_to_id ? String(r.asignado_a_id || r.assigned_to_id) : undefined;
  const creator = usersMap[creatorId];
  const assignee = assigneeId ? usersMap[assigneeId] : undefined;

  // imagenes is jsonb — get first image url
  const imageUrl = (() => {
    const imgs = r.imagenes as unknown;
    if (Array.isArray(imgs) && imgs.length > 0) return String(imgs[0].url || imgs[0] || '');
    return (r.image_url || r.attachment_url) ? String(r.image_url || r.attachment_url) : undefined;
  })();

  return {
    id: String(r.id),
    title: String(r.titulo || r.title || ''),
    description: String(r.descripcion || r.description || ''),
    status: (r.estado || r.status || 'Abierto') as TicketStatus,
    priority: (r.prioridad || r.priority || 'Media') as TicketPriority,
    category: (r.categoria || r.category || 'General') as TicketCategory,
    departmentId: r.departamento_id ? String(r.departamento_id) : undefined,
    createdById: creatorId,
    createdByName: creator?.name || String(r.creado_por_nombre || r.created_by_name || 'Usuario'),
    assignedToId: assigneeId,
    assignedToName: assignee?.name || String(r.asignado_a_nombre || r.assigned_to_name || 'Pendiente'),
    createdAt: String(r.creado_en || r.created_at || new Date().toISOString()),
    updatedAt: String(r.actualizado_en || r.updated_at || new Date().toISOString()),
    messages: msgs,
    imageUrl,
  };
}

// Maps tabla "departamentos": id, nombre, descripcion, jefe, color, creado_en
function rowToDept(r: Record<string, unknown>): Department {
  return {
    id: String(r.id),
    name: String(r.nombre || r.name || ''),
    description: String(r.descripcion || r.description || ''),
    color: String(r.color || '#7C3AED'),
    createdAt: String(r.creado_en || r.created_at || new Date().toISOString()),
    jefe: r.jefe ? String(r.jefe) : undefined,
  };
}

// ── Provider ─────────────────────────────────────────────────────────────────
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<string>('login');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(isSupabaseConfigured());
  const [sbStatus, setSbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastPing, setLastPing] = useState<string | null>(null);

  const checkSupabase = useCallback(async () => {
    const ready = isSupabaseConfigured();
    setSupabaseReady(ready);
    if (!ready) {
      setSbStatus('disconnected');
      return;
    }
    try {
      const { error } = await getSupabase().from('perfiles').select('id').limit(1);
      if (error && error.code !== 'PGRST116') throw error;
      setSbStatus('connected');
      setLastPing(new Date().toISOString());
    } catch {
      setSbStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkSupabase();
    const interval = setInterval(checkSupabase, 30000);
    return () => clearInterval(interval);
  }, [checkSupabase]);

  // ── fetch all data ──────────────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const sb = getSupabase();
    setLoading(true);
    try {
      // 1. Usuarios (perfiles & usuarios)
      try {
        const { data: perfilesData } = await sb.from('perfiles').select('*');
        const usersFromPerfiles: User[] = (perfilesData as Record<string, unknown>[] || []).map(rowToUser);
        let allUsers = [...usersFromPerfiles];
        try {
          const { data: usuariosData } = await sb.from('usuarios').select('*');
          if (usuariosData && usuariosData.length > 0) {
            const usersFromUsuarios: User[] = (usuariosData as Record<string, unknown>[]).map(r => {
              const name = String(r.nombre || r.name || r.email || 'Usuario');
              return {
                id: String(r.id),
                name,
                initials: getInitials(name),
                email: String(r.email || ''),
                role: normalizeRole(r.rol || r.role),
                avatarColor: colorFor(String(r.id)),
                departmentId: undefined,
              };
            });
            const perfilIds = new Set(usersFromPerfiles.map(u => u.id));
            allUsers = [...usersFromPerfiles, ...usersFromUsuarios.filter(u => !perfilIds.has(u.id))];
          }
        } catch (_) {}
        setUsers(allUsers);
      } catch (e) { console.error('refreshData: perfiles error', e); }

      // 2. Departamentos
      try {
        const { data: deptsData } = await sb.from('departamentos').select('*').order('creado_en', { ascending: true });
        if (deptsData) setDepartments((deptsData as Record<string, unknown>[]).map(rowToDept));
      } catch (e) { console.error('refreshData: departments error', e); }

      // 3. Comentarios
      const msgsByTicket: Record<string, Message[]> = {};
      try {
        const { data: comentariosData } = await sb.from('ticket_comentarios').select('*').order('creado_en', { ascending: true });
        if (comentariosData) {
          const uMap: Record<string, User> = {};
          users.forEach(u => uMap[u.id] = u);
          (comentariosData as Record<string, unknown>[]).forEach(r => {
            const m = rowToMessage(r, uMap);
            if (!msgsByTicket[m.ticketId]) msgsByTicket[m.ticketId] = [];
            msgsByTicket[m.ticketId].push(m);
          });
        }
      } catch (e) { console.error('refreshData: comentarios error', e); }

      // 4. Tickets
      try {
        const { data: tktData } = await sb.from('tickets').select('*').order('creado_en', { ascending: false });
        if (tktData) {
          const uMap: Record<string, User> = {};
          users.forEach(u => uMap[u.id] = u);
          setTickets((tktData as Record<string, unknown>[]).map(r =>
            rowToTicket(r, msgsByTicket[String(r.id)] || [], uMap)
          ));
        }
      } catch (e) { console.error('refreshData: tickets error', e); }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    const sb = getSupabase();
    sb.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.warn('Sesión expirada o token inválido, cerrando sesión...', error.message);
        sb.auth.signOut().catch(() => {});
        setCurrentUser(null);
        return;
      }
      const sessionUser = data.session?.user;
      if (sessionUser) {
        sb.from('perfiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single()
          .then(({ data: perfil }) => {
            if (perfil) {
              const dbUser = rowToUser(perfil as Record<string, unknown>);
              const metaRole = normalizeRole(
                sessionUser.user_metadata?.role ||
                sessionUser.app_metadata?.role || ''
              );
              const resolvedRole: User['role'] = metaRole !== 'Cliente' ? metaRole : dbUser.role;
              setCurrentUser({ ...dbUser, role: resolvedRole });
              setPage('dashboard');
            }
          });
      }
    });
    refreshData();
  }, [supabaseReady, refreshData]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__sbRecheck = () => {
      checkSupabase();
    };
  }, [checkSupabase]);

  // ── auth ────────────────────────────────────────────────────────────────
  const loginWithSupabase = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!isSupabaseConfigured()) return 'Supabase no está configurado.';
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    if (!data.user) return 'Error al iniciar sesión';

    const authUser = data.user;
    const metaRole = normalizeRole(
      authUser.user_metadata?.role || authUser.app_metadata?.role || ''
    );

    // fetch from perfiles table
    const { data: perfil, error: perfilErr } = await sb
      .from('perfiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (perfil && !perfilErr) {
      const dbUser = rowToUser(perfil as Record<string, unknown>);
      const resolvedRole: User['role'] = metaRole !== 'Cliente' ? metaRole : dbUser.role;

      // Sync role back to DB if different
      if (resolvedRole !== dbUser.role) {
        await sb.from('perfiles').update({ rol: resolvedRole }).eq('id', authUser.id);
      }

      const user: User = { ...dbUser, role: resolvedRole };
      setCurrentUser(user);
      await refreshData();
      setPage('dashboard');
    } else {
      // Create new profile in perfiles
      const name = authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] || 'Usuario';
      const roleToSave: User['role'] = metaRole !== 'Cliente' ? metaRole : 'Cliente';

      await sb.from('perfiles').upsert({
        id: authUser.id,
        nombre: name,
        email: authUser.email,
        rol: roleToSave,
        activo: true,
      });

      const user: User = {
        id: authUser.id,
        name,
        initials: getInitials(name),
        email: authUser.email || '',
        role: roleToSave,
        avatarColor: colorFor(authUser.id),
      };
      setCurrentUser(user);
      await refreshData();
      setPage('dashboard');
    }
    return null;
  }, [refreshData]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await getSupabase().auth.signOut();
    }
    setCurrentUser(null);
    setTickets([]);
    setUsers([]);
    setDepartments([]);
    setPage('login');
  }, []);

  // ── tickets ─────────────────────────────────────────────────────────────
  const addTicket = useCallback(async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>): Promise<Ticket> => {
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      
      // Get the count of existing tickets to generate the next TZH-XXXX folio
      const { count } = await sb.from('tickets').select('*', { count: 'exact', head: true });
      const nextFolioNumber = (count || 0) + 1;
      const customFolio = `TZH-${String(nextFolioNumber).padStart(4, '0')}`;

      const { data, error } = await sb.from('tickets').insert({
        id: customFolio,
        titulo: ticketData.title,
        descripcion: ticketData.description,
        estado: 'Abierto', // Using literal to satisfy check constraint if sensitive
        prioridad: ticketData.priority,
        departamento_id: ticketData.departmentId || null,
        creado_por_id: ticketData.createdById,
        asignado_a_id: ticketData.assignedToId || null,
      }).select().single();

      if (data && !error) {
        const t = rowToTicket(data as Record<string, unknown>);
        setTickets(prev => [t, ...prev]);
        return t;
      }
      if (error) console.error('addTicket error:', error);
    }
    const newTicket: Ticket = {
      ...ticketData,
      id: `TKT-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setTickets(prev => [newTicket, ...prev]);
    return newTicket;
  }, []);

  const updateTicketStatus = useCallback(async (ticketId: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    if (isSupabaseConfigured()) {
      await getSupabase().from('tickets').update({
        estado: status,
        actualizado_en: new Date().toISOString(),
      }).eq('id', ticketId);
    }
  }, []);

  const updateTicketPriority = useCallback(async (ticketId: string, priority: TicketPriority) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority, updatedAt: new Date().toISOString() } : t));
    if (isSupabaseConfigured()) {
      await getSupabase().from('tickets').update({
        prioridad: priority,
        actualizado_en: new Date().toISOString(),
      }).eq('id', ticketId);
    }
  }, []);

  const assignTicket = useCallback(async (ticketId: string, userId: string) => {
    const user = users.find(u => u.id === userId);
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, assignedToId: userId, assignedToName: user?.name, updatedAt: new Date().toISOString() }
        : t
    ));
    if (isSupabaseConfigured()) {
      await getSupabase().from('tickets').update({
        asignado_a_id: userId,
        asignado_a_nombre: user?.name,
        actualizado_en: new Date().toISOString(),
      }).eq('id', ticketId);
    }
  }, [users]);

  const addMessage = useCallback(async (ticketId: string, content: string, isInternal = false, imageUrl?: string) => {
    if (!currentUser) return;
    const message: Message = {
      id: `msg-${Date.now()}`,
      ticketId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorInitials: currentUser.initials,
      authorColor: currentUser.avatarColor,
      authorRole: currentUser.role,
      content,
      timestamp: new Date().toISOString(),
      isInternal,
      imageUrl,
    };
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, messages: [...t.messages, message], updatedAt: new Date().toISOString() }
        : t
    ));
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      // imagenes stored as jsonb array in ticket_comentarios or just image_url
      await sb.from('ticket_comentarios').insert({
        ticket_id: ticketId,
        usuario_id: currentUser.id,
        contenido: content,
        es_interno: isInternal,
      });
      await sb.from('tickets').update({
        actualizado_en: new Date().toISOString(),
      }).eq('id', ticketId);
    }
  }, [currentUser]);

  const getTicketById = useCallback((id: string) => tickets.find(t => t.id === id), [tickets]);

  // ── departments ─────────────────────────────────────────────────────────
  const addDepartment = useCallback(async (dept: Omit<Department, 'id' | 'createdAt'>) => {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabase().from('departamentos').insert({
        nombre: dept.name,
        descripcion: dept.description,
        color: dept.color,
        jefe: dept.jefe || null,
      }).select().single();
      if (data) {
        setDepartments(prev => [...prev, rowToDept(data as Record<string, unknown>)]);
        return;
      }
    }
    const d: Department = { ...dept, id: `dept-${Date.now()}`, createdAt: new Date().toISOString() };
    setDepartments(prev => [...prev, d]);
  }, []);

  const updateDepartment = useCallback(async (id: string, dept: Partial<Department>) => {
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...dept } : d));
    if (isSupabaseConfigured()) {
      await getSupabase().from('departamentos').update({
        nombre: dept.name,
        descripcion: dept.description,
        color: dept.color,
        jefe: dept.jefe || null,
      }).eq('id', id);
    }
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    if (isSupabaseConfigured()) {
      await getSupabase().from('departamentos').delete().eq('id', id);
    }
  }, []);

  const createUser = useCallback(async (userData: { name: string; email: string; role: User['role']; departmentId?: string }) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase no configurado' };
    
    // Create the user in Auth with our secondary non-persisting client
    const adminSb = getAdminSupabase();
    if (!adminSb) return { success: false, error: 'Carga de cliente falló' };
    
    const { data: authData, error: authError } = await adminSb.auth.signUp({
      email: userData.email,
      password: 'ITFlowPasswordGen1', // A simple generic password for new users
      options: {
        data: {
          full_name: userData.name,
          role: userData.role === 'Admin' ? 'Admin' : userData.role === 'Agente' ? 'Agente' : 'Cliente'
        }
      }
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return { success: false, error: authError?.message || 'Error en autenticación' };
    }

    const sb = getSupabase();
    const { error: profileError } = await sb.from('perfiles').insert({
      id: authData.user.id,
      nombre: userData.name,
      email: userData.email,
      rol: userData.role === 'Admin' ? 'Admin' : userData.role === 'Agente' ? 'Agente' : 'Cliente',
      departamento_id: userData.departmentId || null,
      activo: true
    });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Fallback: If 'perfiles' still uses spanish column names, let's catch and retry or just return
      return { success: false, error: profileError.message };
    }
    
    await refreshData();
    return { success: true };
  }, [refreshData]);

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      tickets,
      users,
      departments,
      loading,
      addTicket,
      updateTicketStatus,
      updateTicketPriority,
      assignTicket,
      addMessage,
      getTicketById,
      addDepartment,
      updateDepartment,
      deleteDepartment,
      refreshData,
      page,
      setPage,
      selectedTicketId,
      setSelectedTicketId,
      supabaseReady,
      sbStatus,
      lastPing,
      loginWithSupabase,
      logout,
      createUser,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
