import { defineApp } from "convex/server";
import presence from "@convex-dev/presence/convex.config";
import persistentTextStreaming from "@convex-dev/persistent-text-streaming/convex.config";

const app = defineApp();
app.use(presence);
app.use(persistentTextStreaming);
export default app;
