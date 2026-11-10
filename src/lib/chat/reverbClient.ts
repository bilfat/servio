import Pusher from "pusher-js";

let pusherInstance: Pusher | null = null;

export function getReverbClient(): Pusher | null {
  if (typeof window === "undefined") return null;

  if (!pusherInstance) {
    const key = process.env.NEXT_PUBLIC_REVERB_KEY || "servio-chat-key-2026";
    const host = process.env.NEXT_PUBLIC_REVERB_HOST || "127.0.0.1";
    const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8089);
    const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || "ws";

    pusherInstance = new Pusher(key, {
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === "wss",
      disableStats: true,
      enabledTransports: ["ws", "wss"],
      cluster: "mt1",
    });
  }

  return pusherInstance;
}
