const UPLOAD_API_URL =
  import.meta.env.VITE_UPLOAD_API_URL || "https://api.sdstream.tech/api/upload";

/**
 * Uploads a file to the external API
 * @param file The file to upload
 * @param path Optional folder path (ignored by the external API)
 * @returns The download URL of the uploaded file
 */
export async function uploadFile(file: File, _path: string = "uploads"): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(UPLOAD_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText} ${errorText}`);
    }

    const data = await response.json();
    const downloadUrl =
      data.url ||
      data?.data?.url ||
      (typeof data?.data === "string" ? data.data : null) ||
      data.fileUrl ||
      data.imageUrl;

    if (downloadUrl) {
      return downloadUrl;
    } else {
      throw new Error("Upload API did not return a valid URL in response");
    }
  } catch (error) {
    console.error("Error uploading file to external API:", error);
    throw error instanceof Error ? error : new Error("Failed to upload image");
  }
}
