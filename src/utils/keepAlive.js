/**
 * Periodically requests a health endpoint to detect/reduce idle cold starts.
 * Configure with the service's public health URL. This is best-effort only;
 * hosting providers may ignore self-originated requests for idle accounting.
 */
const TEN_MINUTES = 10 * 60 * 1000;
let timer;
let stopKeepAlive;

export function startKeepAlive({ backendUrl }) {
  if (timer) return stopKeepAlive;

  if (!backendUrl) {
    console.info("Keep-alive disabled: BACKEND_URL is not configured");
    return () => {};
  }

  const healthUrl = `${backendUrl.replace(/\/+$/, "")}/health`;
  let requestInProgress = false;

  const ping = async () => {
    if (requestInProgress) return;
    requestInProgress = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });

      console.info(`Keep-alive health check returned HTTP ${response.status}`);
    } catch (error) {
      console.warn("Keep-alive health check failed:", error.message);
    } finally {
      clearTimeout(timeout);
      requestInProgress = false;
    }
  };

  timer = setInterval(ping, TEN_MINUTES);
  timer.unref();
  console.info("Keep-alive enabled with a 10-minute interval");

  stopKeepAlive = () => {
    clearInterval(timer);
    timer = undefined;
    stopKeepAlive = undefined;
  };
  return stopKeepAlive;
}
