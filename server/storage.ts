import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

const s3Client = new S3Client({
  endpoint: ENV.s3Endpoint,
  region: "us-east-1", // MinIO doesn't care about region
  credentials: {
    accessKeyId: ENV.s3AccessKey,
    secretAccessKey: ENV.s3SecretKey,
  },
  forcePathStyle: true, // Required for MinIO
});

export async function ensureBucket() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: ENV.s3Bucket }));
  } catch (error) {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: ENV.s3Bucket }));
      console.log(`Bucket "${ENV.s3Bucket}" created successfully.`);
    } catch (err) {
      console.error("Error creating bucket:", err);
    }
  }
}

export async function getPresignedUploadUrl(filename: string, contentType: string) {
  await ensureBucket();
  const key = `${Date.now()}-${filename}`;
  const command = new PutObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  
  // Return the public URL and the key
  // For MinIO, the public URL might need to be reachable from the browser
  // If we are in Docker, "minio:9000" won't work for the browser.
  // We need to replace the hostname with the server IP or a public domain.
  const publicUrl = url.replace("http://minio:9000", window_location_origin_placeholder(url));
  
  return { url, publicUrl, key };
}

function window_location_origin_placeholder(url: string) {
    // This is tricky. The signed URL contains the host it was generated for.
    // If generated inside Docker, it will have "minio:9000".
    // We want the browser to use the VPS IP.
    return "/api/storage/proxy"; // We will create a proxy route to handle this
}

export async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
