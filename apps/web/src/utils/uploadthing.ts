import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";

import type { UploadThingFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<UploadThingFileRouter>();
export const UploadDropzone = generateUploadDropzone<UploadThingFileRouter>();

export const { useUploadThing, uploadFiles } = generateReactHelpers<UploadThingFileRouter>();