import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

export const s3Client = new S3Client({
  endpoint: ENV.s3Endpoint,
  region: "us-east-1", // MinIO doesn't care about region
  credentials: {
    accessKeyId: ENV.s3AccessKey,
    secretAccessKey: ENV.s3SecretKey,
  },
  forcePathStyle: ENV.s3ForcePathStyle, // MinIO local on, S3-compatible VPS buckets can disable it
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

  try {
    // Set simplified CORS policy for MinIO
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: ENV.s3Bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
          },
        ],
      },
    }));
  } catch (err) {
    // MinIO sometimes returns 501 NotImplemented for CORS via SDK, 
    // but often it's already configured or handled globally.
    console.log("Note: CORS configuration via SDK skipped or not supported by this MinIO version.");
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

  let url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  
  // If we are inside Docker, the URL might have the service name 'minio'
  // but the browser needs 'localhost' or the server's IP.
  const host = ENV.s3Endpoint.split("//")[1]?.split(":")[0];
  if (host && url.includes(host)) {
    // If the endpoint was 'minio:9000', replace it with 'localhost:9000' for the browser
    // unless the browser is already hitting the app via a different hostname.
    url = url.replace(host, "localhost");
  }

  console.log(`[Storage] Generated Presigned URL: ${url}`);

  // The public URL used by the frontend for downloading
  const publicUrl = `/api/storage/${key}`;
  
  // A local proxy URL for uploading if the presigned one fails
  const proxyUploadUrl = `/api/storage/upload/${key}`;
  
  return { url, publicUrl, proxyUploadUrl, key };
}

export async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function storagePut(key: string, body: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  await ensureBucket();
  await s3Client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return { key, url: `/api/storage/${key}` };
}
