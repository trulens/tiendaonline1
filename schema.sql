-- Habilitar extensión pgcrypto para gen_random_uuid si no está habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabla de Usuarios (Administradores/Staff)
CREATE TABLE usuarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dni varchar UNIQUE NOT NULL,
  pin varchar NOT NULL,
  nombres varchar NOT NULL,
  apellidos varchar NOT NULL,
  rol varchar DEFAULT 'usuario',
  activo boolean DEFAULT true,
  is_active boolean DEFAULT true,
  bloqueado_hasta timestamp with time zone,
  creado_en timestamp with time zone DEFAULT now()
);

-- Insertar un usuario administrador por defecto (DNI: 12345678, PIN: 1234)
INSERT INTO usuarios (dni, pin, nombres, apellidos, rol) 
VALUES ('12345678', '1234', 'Admin', 'Sistema', 'admin');

-- 2. Tabla de Pacientes
CREATE TABLE pacientes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  dni varchar UNIQUE NOT NULL,
  nombres varchar NOT NULL,
  apellido_paterno varchar NOT NULL,
  apellido_materno varchar NOT NULL,
  celular varchar,
  fecha_nacimiento date,
  genero varchar,
  ocupacion varchar,
  registrado_por uuid REFERENCES usuarios(id),
  creado_en timestamp with time zone DEFAULT now()
);

-- 3. Tabla de Ventas (Pedidos)
CREATE TABLE ventas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_ticket varchar UNIQUE NOT NULL,
  paciente_id uuid REFERENCES pacientes(id),
  vendedor_id uuid REFERENCES usuarios(id),
  sucursal_id uuid,
  montura_descripcion text,
  luna_descripcion text,
  tipo_pedido varchar,
  estado_entrega varchar DEFAULT 'Por Entregar',
  fecha_entrega timestamp with time zone,
  creado_en timestamp with time zone DEFAULT now()
);

-- 4. Tabla de Órdenes de Laboratorio
CREATE TABLE ordenes_laboratorio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  venta_id uuid REFERENCES ventas(id),
  numero_ticket varchar NOT NULL,
  estado varchar DEFAULT 'En Cola',
  urgente boolean DEFAULT false,
  notas_taller text,
  creado_en timestamp with time zone DEFAULT now(),
  iniciado_en timestamp with time zone,
  completado_en timestamp with time zone
);

-- 5. Tabla de Marcas de Mercadería (Para el catálogo)
CREATE TABLE marcas_mercaderia (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre varchar NOT NULL UNIQUE
);

-- Insertar algunas marcas por defecto
INSERT INTO marcas_mercaderia (nombre) VALUES ('Lens Group'), ('Ray-Ban'), ('Oakley');

-- 6. Tabla del Catálogo de Mercadería (Productos)
CREATE TABLE catalogo_mercaderia (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_sistema varchar UNIQUE NOT NULL,
  nombre_autogenerado varchar,
  modelo varchar,
  categoria varchar,
  material varchar,
  marca_id uuid REFERENCES marcas_mercaderia(id),
  etiquetas_publico jsonb,
  etiquetas_tecnicas jsonb,
  precio_venta numeric DEFAULT 0,
  activo boolean DEFAULT true,
  imagen text,
  creado_en timestamp with time zone DEFAULT now()
);

-- 7. Tabla de Stock de Mercadería
CREATE TABLE stock_mercaderia (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id uuid REFERENCES catalogo_mercaderia(id) ON DELETE CASCADE,
  cantidad int DEFAULT 0
);

-- 8. Tabla de Inventario de Monturas (Físico)
CREATE TABLE inventario_monturas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo varchar UNIQUE NOT NULL,
  marca varchar,
  modelo varchar,
  color varchar,
  tipo varchar,
  cantidad int DEFAULT 0,
  precio_venta numeric DEFAULT 0,
  activo boolean DEFAULT true,
  sucursal_id uuid,
  actualizado_en timestamp with time zone DEFAULT now()
);

-- 9. Tabla del Banco de Lunas
CREATE TABLE banco_lunas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  catalogo_luna_id uuid,
  cantidad int DEFAULT 0,
  cantidad_minima int DEFAULT 0,
  grado varchar,
  esfera numeric,
  cilindro numeric,
  sucursal_id uuid,
  actualizado_en timestamp with time zone DEFAULT now()
);
