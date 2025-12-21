import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const userId = user.id;

    if (stripeSecretKey) {
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", userId)
        .eq("status", "active");

      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          if (sub.stripe_subscription_id) {
            try {
              const cancelResponse = await fetch(
                `https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`,
                {
                  method: "DELETE",
                  headers: {
                    "Authorization": `Bearer ${stripeSecretKey}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                }
              );

              if (!cancelResponse.ok) {
                console.error("Failed to cancel Stripe subscription:", await cancelResponse.text());
              }
            } catch (error) {
              console.error("Error canceling Stripe subscription:", error);
            }
          }
        }
      }
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error deleting account:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete account" }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});