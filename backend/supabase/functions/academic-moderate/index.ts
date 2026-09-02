import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing server environment variables");
    }

    // Create an admin client to bypass RLS for updating and logging
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Validate user auth via authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const actorId = user.id;

    // Parse request body
    // Expected: { materialId: string, action: 'approve' | 'reject' | 'unpublish', reason?: string }
    const payload = await req.json();
    const { materialId, action, reason } = payload;

    if (!materialId || !['approve', 'reject', 'unpublish'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid payload: missing materialId or valid action' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get the user's role and verify they are a maintainer or admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', actorId)
      .single();

    const allowedRoles = ['admin', 'maintainer', 'academic_maintainer'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get the material
    const { data: material } = await supabaseAdmin
      .from('academic_materials')
      .select('id, status, uploaded_by')
      .eq('id', materialId)
      .single();

    if (!material) {
      return new Response(JSON.stringify({ error: 'Material not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Prevent self-approval
    if (material.uploaded_by === actorId && action === 'approve') {
       return new Response(JSON.stringify({ error: 'Cannot approve your own material' }), { 
         status: 403, 
         headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
       });
    }

    // Prepare update
    let newStatus = material.status;
    let updatePayload: any = {};
    
    if (action === 'approve') {
      newStatus = 'approved';
      updatePayload = {
        status: newStatus,
        approved_by: actorId,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
        updated_at: new Date().toISOString()
      };
    } else if (action === 'reject') {
      newStatus = 'rejected';
      updatePayload = {
        status: newStatus,
        rejection_reason: reason || 'Rejected by maintainer',
        approved_by: null,
        approved_at: null,
        updated_at: new Date().toISOString()
      };
    } else if (action === 'unpublish') {
      newStatus = 'unpublished';
      updatePayload = {
        status: newStatus,
        rejection_reason: reason || 'Unpublished by maintainer',
        updated_at: new Date().toISOString()
      };
    }

    // Update material
    const { error: updateError } = await supabaseAdmin
      .from('academic_materials')
      .update(updatePayload)
      .eq('id', materialId);

    if (updateError) {
      throw updateError;
    }

    // Log the moderation action
    await supabaseAdmin
      .from('academic_moderation_logs')
      .insert({
        material_id: materialId,
        actor_id: actorId,
        action: action,
        old_status: material.status,
        new_status: newStatus,
        reason: reason || null
      });

    return new Response(JSON.stringify({ ok: true, materialId, status: newStatus }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Moderation error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
