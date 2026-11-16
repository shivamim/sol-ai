const base = process.env.APP_BASE_URL;
const secret = process.env.CRON_SECRET;
if (!base || !secret)
  throw new Error("APP_BASE_URL and CRON_SECRET are required");
let stopped = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stopped = true;
  });
while (!stopped) {
  try {
    const response = await fetch(new URL("/api/worker", base), {
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(55000),
    });
    if (!response.ok)
      console.error(`SOL Ai worker returned HTTP ${response.status}`);
    else
      console.log(
        `SOL Ai worker cycle completed at ${new Date().toISOString()}`,
      );
  } catch {
    console.error(
      "SOL Ai worker request failed; queued work remains persisted",
    );
  }
  if (!stopped)
    await new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        process.off("SIGINT", finish);
        process.off("SIGTERM", finish);
        resolve();
      };
      const timer = setTimeout(finish, 60000);
      process.once("SIGINT", finish);
      process.once("SIGTERM", finish);
    });
}
