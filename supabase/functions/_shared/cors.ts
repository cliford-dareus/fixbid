export const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonResponse(
    body: unknown,
    status = 200,
    extraHeaders: Record<string, string> = {},
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            ...extraHeaders,
        },
    });
}
