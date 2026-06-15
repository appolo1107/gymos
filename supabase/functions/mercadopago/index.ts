// supabase/functions/mercadopago/index.ts
//
// Edge Function de GymOS para Mercado Pago.
// Crea un link de suscripción (preapproval) para que el admin
// del gimnasio pague la membresía mensual.
//
// El Access Token se lee de una variable de entorno secreta
// (NUNCA se expone al frontend).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // Responder preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { action, gym_id, email, back_url } = await req.json()

    if (action === "create_subscription") {
      if (!gym_id || !email) {
        return new Response(
          JSON.stringify({ error: "Faltan datos: gym_id y email son requeridos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Crear preapproval (suscripción) en Mercado Pago
      // Precio: $5 USD/mes recurrente. El primer mes a $1 se maneja
      // dando de alta manualmente el primer cobro distinto (ver nota abajo).
      const preapprovalBody = {
        reason: "GymOS - Suscripcion mensual",
        external_reference: gym_id,
        payer_email: email,
        back_url: back_url || "https://gymos.vercel.app/admin",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 5,
          currency_id: "ARS", // Ajustar segun el pais del comercio (ARS, MXN, COP, etc.)
        },
        status: "pending",
      }

      const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preapprovalBody),
      })

      const mpData = await mpRes.json()

      if (!mpRes.ok) {
        return new Response(
          JSON.stringify({ error: "Error de Mercado Pago", details: mpData }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Guardar el id de suscripcion en la tabla gyms
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      await supabase
        .from("gyms")
        .update({
          mp_subscription_id: mpData.id,
          mp_subscription_status: mpData.status,
        })
        .eq("id", gym_id)

      return new Response(
        JSON.stringify({ init_point: mpData.init_point, subscription_id: mpData.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (action === "check_status") {
      if (!gym_id) {
        return new Response(
          JSON.stringify({ error: "Falta gym_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
      const { data: gym } = await supabase
        .from("gyms")
        .select("mp_subscription_id, mp_subscription_status")
        .eq("id", gym_id)
        .single()

      if (!gym?.mp_subscription_id) {
        return new Response(
          JSON.stringify({ status: "none" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Consultar estado actual en Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${gym.mp_subscription_id}`, {
        headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` },
      })
      const mpData = await mpRes.json()

      // Actualizar estado en la base si cambio
      if (mpData.status && mpData.status !== gym.mp_subscription_status) {
        await supabase
          .from("gyms")
          .update({ mp_subscription_status: mpData.status })
          .eq("id", gym_id)
      }

      return new Response(
        JSON.stringify({ status: mpData.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Accion no reconocida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
