# 🎫 Tickets Tzompantepec — Help Desk

> Sistema de gestión de tickets de soporte técnico para el Municipio de Tzompantepec.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2-3ECF8E?logo=supabase&logoColor=white)

---

## 📋 Características

### 🔐 Autenticación
- Login seguro con Supabase Auth
- Roles: **Admin**, **Agente**, **Cliente**
- Sesión persistente

### 🎫 Gestión de Tickets
- Crear tickets con título, descripción, categoría, prioridad y departamento
- **Adjuntar imágenes** del problema (hasta 5 MB)
- Conversación en hilo con soporte de imágenes
- Notas internas (solo visibles para Admins y Agentes)
- Estados: Abierto, En Progreso, Resuelto, Cerrado
- Prioridades: Urgente, Alta, Media, Baja

### 🏢 Departamentos (Admin)
- CRUD completo de departamentos
- Campo de responsable/jefe por departamento
- Colores personalizables
- Estadísticas de tickets por departamento

### 📊 Reportes (Admin)
- Dashboard con KPIs en tiempo real
- Reportes por estado, prioridad, categoría y agente
- **Exportar a PDF** con jsPDF
- **Exportar a Excel** con SheetJS (xlsx)
- Filtros por rango de fechas

### 👥 Gestión de Usuarios (Admin)
- Ver todos los usuarios del sistema
- Cambiar roles directamente desde la interfaz

### ⚙️ Configuración (Admin)
- Información general del sistema
- Parámetros de tickets
- Preferencias de notificaciones
- Apariencia (color principal)
- Configuración de base de datos

### 📱 Responsive
- Diseño adaptable para **móvil, tableta y escritorio**
- Sidebar con hamburger menu en móvil
- Tarjetas adaptables en lugar de tablas en pantallas pequeñas

---

## 🚀 Instalación

### Requisitos
- Node.js 18+
- npm o yarn
- Cuenta en [Supabase](https://supabase.com)

### 1. Clonar el repositorio

```bash
git clone https://github.com/sistemasc2tzomp-lab/Help-Desk.git
cd Help-Desk
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 4. Configurar base de datos en Supabase

Ejecuta el siguiente SQL en **Supabase → SQL Editor**:

```sql
-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS perfiles (
  id uuid references auth.users primary key,
  nombre text,
  email text,
  avatar text,
  rol text default 'Cliente',
  departamento_id uuid,
  activo boolean default true,
  creado_en timestamptz default now()
);

-- Tabla de departamentos
CREATE TABLE IF NOT EXISTS departamentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  jefe text,
  color text default '#6366f1',
  creado_en timestamptz default now()
);

-- Tabla de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id text primary key default gen_random_uuid()::text,
  titulo text not null,
  descripcion text,
  estado text default 'Abierto',
  prioridad text default 'Media',
  departamento_id uuid references departamentos(id),
  creado_por_id uuid references perfiles(id),
  asignado_a_id uuid references perfiles(id),
  etiquetas text[],
  imagenes jsonb,
  attachment_url text,
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);

-- Tabla de comentarios de tickets
CREATE TABLE IF NOT EXISTS ticket_comentarios (
  id uuid primary key default gen_random_uuid(),
  ticket_id text references tickets(id) on delete cascade,
  usuario_id uuid references perfiles(id),
  contenido text,
  es_interno boolean default false,
  imagenes jsonb,
  creado_en timestamptz default now()
);

-- Políticas de acceso (RLS)
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_perfiles" ON perfiles FOR ALL USING (true);
CREATE POLICY "acceso_departamentos" ON departamentos FOR ALL USING (true);
CREATE POLICY "acceso_tickets" ON tickets FOR ALL USING (true);
CREATE POLICY "acceso_comentarios" ON ticket_comentarios FOR ALL USING (true);

-- Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO perfiles (id, email, nombre, rol)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'Cliente')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

### 5. Configurar Storage (para imágenes)

En **Supabase → Storage**:
1. Crear bucket llamado `attachments`
2. Marcarlo como **público**
3. Agregar política: Allow all para insert y select

### 6. Hacer Admin al primer usuario

```sql
UPDATE perfiles 
SET rol = 'Admin' 
WHERE email = 'tu-email@ejemplo.com';
```

### 7. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## 🏗️ Estructura del Proyecto

```
Help-Desk/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx        # Panel principal con estadísticas
│   │   ├── DepartmentsPage.tsx  # CRUD de departamentos (Admin)
│   │   ├── LoginPage.tsx        # Pantalla de inicio de sesión
│   │   ├── NewTicket.tsx        # Formulario de nuevo ticket
│   │   ├── ReportsPage.tsx      # Reportes con exportación (Admin)
│   │   ├── SettingsPage.tsx     # Configuración del sistema (Admin)
│   │   ├── SetupPage.tsx        # Configuración de Supabase
│   │   ├── Sidebar.tsx          # Navegación lateral responsive
│   │   ├── TicketDetail.tsx     # Detalle y conversación de ticket
│   │   ├── TicketList.tsx       # Lista de tickets con filtros
│   │   └── UsersPage.tsx        # Gestión de usuarios (Admin)
│   ├── context/
│   │   └── AppContext.tsx       # Estado global y llamadas a Supabase
│   ├── lib/
│   │   └── supabase.ts          # Cliente Supabase (lazy initialization)
│   ├── types/
│   │   └── index.ts             # Tipos TypeScript
│   ├── utils/
│   │   ├── cn.ts                # Utility para clases CSS
│   │   └── date.ts              # Formateo de fechas
│   ├── App.tsx                  # Componente raíz y routing
│   ├── main.tsx                 # Punto de entrada
│   └── index.css                # Estilos globales (Tailwind)
├── .env.example                 # Plantilla de variables de entorno
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🗄️ Esquema de Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `perfiles` | Perfiles de usuario vinculados a Supabase Auth |
| `departamentos` | Departamentos del municipio |
| `tickets` | Tickets de soporte |
| `ticket_comentarios` | Mensajes/respuestas de cada ticket |
| `ticket_fotos` | Registro de archivos subidos |
| `ticket_historial` | Historial de cambios de estado |

---

## 📦 Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Linter
```

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| React 18 | UI Framework |
| TypeScript | Tipado estático |
| Vite 5 | Bundler y dev server |
| Tailwind CSS 3 | Estilos utility-first |
| Supabase | Auth + Base de datos + Storage |
| jsPDF + autotable | Exportación a PDF |
| SheetJS (xlsx) | Exportación a Excel |

---

## 👤 Roles del Sistema

| Rol | Permisos |
|-----|---------|
| **Admin** | Acceso total: tickets, usuarios, departamentos, reportes, configuración |
| **Agente** | Ver y gestionar tickets, agregar notas internas, responder |
| **Cliente** | Crear tickets, ver solo sus tickets, responder en sus tickets |

---

## 📄 Licencia

Municipio de Tzompantepec — Todos los derechos reservados © 2025

---

*Desarrollado para el Sistema de Soporte Técnico Municipal de Tzompantepec*
