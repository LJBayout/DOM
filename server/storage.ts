import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
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

  try {
    // Set CORS policy so browser can upload directly
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: ENV.s3Bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }));
  } catch (err) {
    console.error("Error configuring CORS:", err);
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
  
  if (url.includes("minio:9000")) {
    url = url.replace("minio:9000", "localhost:9000");
  }

  // The public URL used by the frontend should point to our proxy
  const publicUrl = `/api/storage/${key}`;
  
  return { url, publicUrl, key };
}

export async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
