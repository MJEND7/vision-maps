import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileUrl } = await request.json();
    
    if (!fileUrl) {
      return NextResponse.json({ error: "File URL is required" }, { status: 400 });
    }

    // Extract file key from UploadThing URL
    // UploadThing URLs are typically in format: https://utfs.io/f/{fileKey}
    const fileKey = fileUrl.split('/').pop();
    
    if (!fileKey) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
    }

    // Delete from UploadThing
    await utapi.deleteFiles([fileKey]);
    
    console.log("File deleted from UploadThing:", fileKey);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}