/**
 * AWS S3 Storage Utilities (2026 Edition)
 * Handles direct photo uploads to AWS S3 using presigned POST data from backend.
 */

import { API_BASE_URL } from './apiUtils';

const S3_BUCKET = process.env.REACT_APP_AWS_S3_BUCKET_NAME || 'divine-event-photos-2026';
const AWS_REGION = process.env.REACT_APP_AWS_REGION || 'us-east-1';

/**
 * Construct public / CloudFront S3 photo URL if bucket is configured for public read
 */
export function getS3PhotoUrl(objectKey) {
  if (!objectKey) return '';
  if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
    return objectKey;
  }
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${objectKey}`;
}

/**
 * Upload photo directly to AWS S3 using presigned upload parameters.
 * @param {Blob|File} imageBlob - Image blob to upload
 * @param {string} token - Guest token identifier
 * @param {string} fileName - Destination filename in S3
 * @returns {Promise<string>} Uploaded S3 object key or URL
 */
export async function uploadPhotoToS3(imageBlob, token, fileName) {
  try {
    // 1. Request presigned upload credentials from backend
    const presignRes = await fetch(`${API_BASE_URL}/api/aws/presigned-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, fileName }),
    });

    if (!presignRes.ok) {
      throw new Error(`Failed to get presigned upload URL: ${presignRes.statusText}`);
    }

    const { url, fields, key, photoUrl } = await presignRes.json();

    // 2. Direct POST to S3
    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
    formData.append('file', imageBlob);

    const uploadRes = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`S3 upload failed with status ${uploadRes.status}`);
    }

    return photoUrl || `${url}${key}`;
  } catch (err) {
    console.error('AWS S3 upload error:', err);
    throw err;
  }
}
