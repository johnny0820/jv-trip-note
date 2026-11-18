const PUSH_WORKER = "https://trip-plan-push.johnnydx72870820.workers.dev";
const FALLBACK_URL = "/notebook";

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    // 標題固定
    const title = "有人更新了旅遊日記喔! !";

    // 預設內容/連結
    let body = "有新更新";
    let url = FALLBACK_URL;

    // 兼容：如果未來你改成 payload push，仍可吃 payload
    try {
      const data = event.data ? event.data.json() : null;
      if (data?.body) body = String(data.body);
      if (data?.url) url = String(data.url);
    } catch {}

    // no-payload 推播：用 endpoint 去 Worker 拉最新事件
    try {
      const sub = await self.registration.pushManager.getSubscription();
      if (sub?.endpoint) {
        const res = await fetch(
          `${PUSH_WORKER}/api/push/latest?endpoint=${encodeURIComponent(sub.endpoint)}`,
          { method: "GET" }
        );

        if (res.ok) {
          const latest = await res.json().catch(() => null);
          if (latest?.body) body = String(latest.body);
          if (latest?.url) url = String(latest.url);
        }
      }
    } catch {}

    await self.registration.showNotification(title, {
      body,
      data: { url },
      badge: "/icons/icon-192.png",
      icon: "/icons/icon-192.png",
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || FALLBACK_URL;

  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: "window", includeUncontrolled: true });

    const target = new URL(url, self.location.origin);
		const existed = all.find((c) => {
		  try {
		    const u = new URL(c.url);
		    return (u.pathname === target.pathname) && (u.search === target.search);
		  } catch {
		    return false;
		  }
		});

    if (existed) return existed.focus();
    return clients.openWindow(url);
  })());
});