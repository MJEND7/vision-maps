import { createRouteHandler } from "uploadthing/next";

import { uploadThingFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: uploadThingFileRouter,
});
