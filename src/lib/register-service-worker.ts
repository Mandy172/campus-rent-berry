const delegatedPreviewHost = new URL("https://id-preview--dc7b4181-186d-45b9-bd9e-47b7a24d063b.lovable.app").hostname;

function isLovablePreview(hostname: string) {
  const labels = hostname.split(".");
  const firstLabel = labels[0] ?? "";
  const isPreviewDomain = labels.some((_, index) => index > 0 && ["lovable.app", "gpt-eng.com", "gptengineer.run"].includes(labels.slice(index).join(".")));
  const isGeneratedPreviewHost = isPreviewDomain && /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(firstLabel);
  const isDevelopmentProjectHost = /^(?:project--.+-dev)\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(hostname);
  const isPlatformDomain = hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com") || hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com") || hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev");
  return isGeneratedPreviewHost || isDevelopmentProjectHost || isPlatformDomain || hostname === delegatedPreviewHost;
}

export async function registerBorrowBeeWorker() {
  const hostname = window.location.hostname.toLowerCase();
  const isDevelopment = import.meta.env.DEV;
  const isEmbedded = window.self !== window.top;
  const disabled = new URLSearchParams(window.location.search).get("sw") === "off";
  const shouldRegister = import.meta.env.PROD && !isDevelopment && !isEmbedded && !isLovablePreview(hostname) && !disabled;
  if (!shouldRegister) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => new URL(registration.scope).origin === window.location.origin && new URL(registration.scope).pathname === "/").map((registration) => registration.unregister()));
    return;
  }
  await navigator.serviceWorker.register("/sw.js");
}