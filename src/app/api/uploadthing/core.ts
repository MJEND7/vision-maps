import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

export const uploadThingFileRouter = {
    // Define a route for uploading audio files
    mediaUploader: f({
        audio: { maxFileCount: 1, maxFileSize: "4MB" },
        video: { maxFileCount: 1, maxFileSize: "4MB" },
        image: { maxFileCount: 1, maxFileSize: "4MB" },
        pdf: { maxFileCount: 1, maxFileSize: "4MB" }
    })
        .middleware(async () => {
            try {
                const { userId } = await auth();

                if (!userId) throw new UploadThingError("Unauthorized");

                return { userId };
            } catch (error) {
                console.error("UploadThing Auth Error:", error);
                throw new UploadThingError("Authentication failed");
            }
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("file url", file.ufsUrl);

            return { uploadedBy: metadata.userId };
        }),
} satisfies FileRouter;

export type UploadThingFileRouter = typeof uploadThingFileRouter;
