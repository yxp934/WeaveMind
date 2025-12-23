import { task, wait } from "@trigger.dev/sdk";

/**
 * Example task for WeaveMind Trigger.dev integration
 * This demonstrates the v4 SDK task structure
 */
export const helloWorldTask = task({
  id: "hello-world",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  retry: {
    maxAttempts: 10,
    factor: 1.8,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 30_000,
    randomize: false,
  },
  run: async (payload: { message?: string }) => {
    console.log(`Hello, world! ${payload.message || ""}`);

    await wait.for({ seconds: 5 });

    return {
      message: "Hello, world!",
    };
  },
});
