/**
 * Send Expo push notifications to one or more tokens.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  channelId?: string;
  priority?: "default" | "normal" | "high";
};

export async function sendExpoPush(
  messages: ExpoPushMessage | ExpoPushMessage[],
): Promise<{ ok: boolean; detail?: string }> {
  const list = (Array.isArray(messages) ? messages : [messages]).filter(
    (m) => m.to && String(m.to).startsWith("ExponentPushToken"),
  );

  if (list.length === 0) {
    return { ok: false, detail: "no valid Expo push tokens" };
  }

  const payload = list.map((m) => ({
    to: m.to,
    title: m.title,
    body: m.body,
    data: m.data ?? {},
    sound: m.sound === null ? null : m.sound ?? "default",
    channelId: m.channelId ?? "quotes",
    priority: m.priority ?? "high",
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload.length === 1 ? payload[0] : payload),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Expo push HTTP error", res.status, text);
      return { ok: false, detail: text };
    }

    console.log("Expo push sent", text.slice(0, 300));
    return { ok: true, detail: text };
  } catch (err) {
    console.error("Expo push failed", err);
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "push failed",
    };
  }
}

/** Load handyman expo_push_token and send a notification. Soft-fails. */
export async function notifyHandymanPush(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  handymanId: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!handymanId) return;

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .eq("id", handymanId)
      .maybeSingle();

    if (error) {
      console.warn("notifyHandymanPush profile", error.message);
      return;
    }

    const token = profile?.expo_push_token as string | undefined;
    if (!token) {
      console.log("No expo_push_token for handyman", handymanId);
      return;
    }

    await sendExpoPush({
      to: token,
      title,
      body,
      data: data ?? {},
    });
  } catch (e) {
    console.warn("notifyHandymanPush", e);
  }
}
