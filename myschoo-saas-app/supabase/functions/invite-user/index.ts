import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Invite User Edge Function initializing.");

interface InvitePayload {
  email: string;
  role: string; // e.g., 'teacher', 'support_staff', 'admin'
  full_name?: string;
  redirect_to?: string; // Optional client-side redirect URL after confirmation
}

serve(async (req: Request) => {
  console.log("Invite User function invoked.");
  try {
    // 1. Check method and authorization
    if (req.method !== "POST") {
      console.log("Invalid request method:", req.method);
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Create Supabase client with the authorization header from the request
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Use service role for admin actions
    );
    
    // Get inviting admin's details from their JWT to extract tenant_id
    // This requires the Edge Function to be called with the admin's auth token.
    // The Supabase client on the frontend automatically includes this.
    // We need to parse the JWT to get the admin's claims.
    // For simplicity, this step is often done by trusting the `auth.uid()` and then fetching admin's profile.
    // However, a more direct way if the function is called by an authenticated admin,
    // is to get their user data which includes app_metadata.
    
    // The requestor's JWT should be implicitly passed by the client when calling the function.
    // We need to get the current user to extract their tenant_id.
    const { data: { user: inviterUser }, error: inviterError } = await supabaseAdmin.auth.getUser(
      req.headers.get("Authorization")!.replace("Bearer ", "")
    );

    if (inviterError || !inviterUser) {
      console.error("Error getting inviter user or inviter not found:", inviterError);
      return new Response("Unauthorized: Could not identify inviting admin.", { status: 401 });
    }

    const inviterTenantId = inviterUser.app_metadata?.tenant_id;
    const inviterRole = inviterUser.app_metadata?.role;

    if (inviterRole !== 'admin') {
        console.error("Inviter is not an admin. Role:", inviterRole);
        return new Response("Forbidden: Only admins can invite users.", { status: 403 });
    }

    if (!inviterTenantId) {
      console.error("Inviter tenant ID not found in JWT app_metadata.");
      return new Response("Forbidden: Inviter tenant not identified.", { status: 403 });
    }
    
    console.log(`Invite initiated by admin ${inviterUser.email} from tenant ${inviterTenantId}`);


    // 2. Parse the incoming request body
    const payload = (await req.json()) as InvitePayload;
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    if (!payload.email || !payload.role) {
      return new Response("Bad Request: Missing email or role in payload.", { status: 400 });
    }
    
    // Validate role if necessary (e.g. ensure it's a valid role string)
    const validRoles = ['teacher', 'admin', 'support_staff']; // Example roles
    if (!validRoles.includes(payload.role)) {
        return new Response(`Bad Request: Invalid role specified. Valid roles are: ${validRoles.join(', ')}.`, { status: 400 });
    }


    // 3. Invite the user using the Admin client
    // Pass tenant_id and role in the `data` field, which gets stored in `raw_app_meta_data`
    // The `handle_new_user` trigger will then use this.
    const inviteOptions: any = {
      data: {
        invited_tenant_id: inviterTenantId,
        invited_role: payload.role,
        invited_full_name: payload.full_name || '', // Pass full_name if provided
      },
    };
    if (payload.redirect_to) {
      inviteOptions.redirectTo = payload.redirect_to;
    }
    
    console.log("Attempting to invite user with options:", JSON.stringify(inviteOptions, null, 2));

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      payload.email,
      inviteOptions
    );

    if (inviteError) {
      console.error("Error inviting user:", inviteError);
      // Check for specific errors, e.g., user already registered
      if (inviteError.message.includes("User already registered")) {
        // Check if user profile exists for this tenant. If so, maybe they were already invited.
        // If not, an admin could "re-invite" by updating their role/status if they exist in auth.users but not user_profiles for this tenant.
        // This logic can be complex and depends on desired UX for re-invites.
        // For now, return a specific error.
        return new Response("Conflict: User already registered. If they are not part of your organization, they need to sign up with a different email. If they are, an admin may need to manually adjust their profile.", { status: 409 });
      }
      return new Response(`Internal Server Error: ${inviteError.message}`, { status: 500 });
    }

    console.log("User invited successfully:", JSON.stringify(inviteData, null, 2));
    // The inviteData contains the invited user object from auth.users.
    // The handle_new_user trigger will take care of creating the user_profile.

    return new Response(JSON.stringify({ message: "Invitation sent successfully.", user: inviteData.user }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Unhandled error in Invite User Function:", error);
    return new Response(`Internal Server Error: ${error.message || String(error)}`, { status: 500 });
  }
});

/*
To deploy (example commands, adjust as needed):
1. Ensure Supabase CLI is installed and you are logged in.
2. Navigate to your Supabase project root in the CLI (e.g., `cd myschoo-saas-app`).
3. Run: supabase functions deploy invite-user --no-verify-jwt 
   (Or `supabase functions deploy invite-user --project-ref YOUR_PROJECT_REF --no-verify-jwt` if not in linked dir)

Required Environment Variables in Supabase Edge Function settings:
- SUPABASE_URL: Your project's Supabase URL.
- SUPABASE_SERVICE_ROLE_KEY: Your project's service_role key.
*/
