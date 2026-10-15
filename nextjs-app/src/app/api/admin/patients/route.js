import { NextResponse } from "next/server";
import { requireAdminSession, supabaseAdminRequest } from "../../../../lib/supabase-admin";

export async function POST(request) {
  const session = requireAdminSession(request);
  if (!session) return NextResponse.json({ error: "Sesión administrativa requerida." }, { status: 401 });

  const data = await request.json().catch(() => ({}));
  if (!/^\d{8}$/.test(String(data.dni || "")) || !data.nombres || !data.apellido_paterno) {
    return NextResponse.json({ error: "DNI de 8 dígitos y nombres completos son obligatorios." }, { status: 400 });
  }

  try {
    const result = await supabaseAdminRequest("pacientes", {
      method: "POST",
      body: {
        dni: data.dni,
        nombres: data.nombres,
        apellido_paterno: data.apellido_paterno,
        apellido_materno: data.apellido_materno || "",
        celular: data.celular || null,
        fecha_nacimiento: data.fecha_nacimiento || null,
        genero: data.genero || null,
        ocupacion: data.edad ? `Edad: ${data.edad} años` : (data.ocupacion || null),
        registrado_por: session.id,
      },
    });

    const patientObj = result?.[0] || {
      id: "pac-" + Date.now(),
      dni: data.dni,
      nombres: data.nombres,
      apellido_paterno: data.apellido_paterno,
      apellido_materno: data.apellido_materno || "",
      celular: data.celular
    };

    let createdTicket = data.codigo_ticket || `LGT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    if (createdTicket) {
      try {
        const sale = await supabaseAdminRequest("ventas", {
          method: "POST",
          body: {
            numero_ticket: createdTicket,
            paciente_id: patientObj.id,
            vendedor_id: session.id,
            montura_descripcion: data.servicio || "Montura Oficial Lens Group",
            luna_descripcion: data.servicio || "Cristales Blue Protect UV400",
            tipo_pedido: "taller",
            estado_entrega: "en_laboratorio"
          }
        });

        const saleObj = sale?.[0];
        if (saleObj) {
          await supabaseAdminRequest("ordenes_laboratorio", {
            method: "POST",
            body: {
              venta_id: saleObj.id,
              numero_ticket: createdTicket,
              estado: "cola",
              urgente: Boolean(data.urgente)
            }
          });
        }
      } catch (errOrder) {
        console.warn("Aviso al registrar orden vinculada:", errOrder.message);
      }
    }

    return NextResponse.json({ ...patientObj, codigo_ticket: createdTicket }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
