import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

export const uploadThingFileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      try {
        const { userId } = await auth();

        console.log("UploadThing Auth - userId:", userId);

        if (!userId) throw new UploadThingError("Unauthorized");

        return { userId };
      } catch (error) {
        console.error("UploadThing Auth Error:", error);
        throw new UploadThingError("Authentication failed");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);

      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type UploadThingFileRouter = typeof uploadThingFileRouter;
