"""
Divine Energy Hub — AWS Cloud Utilities (2026)
Handles:
1. Amazon S3 presigned upload & download URLs for guest face photos.
2. Direct S3 photo upload & delete helpers.
3. Amazon SES (Simple Email Service) notification delivery.
"""

import os
import logging
from typing import Optional, Dict, Any
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config

logger = logging.getLogger("aws_utils")

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET = os.getenv("AWS_S3_PHOTO_BUCKET", "divine-event-photos-2026")
SES_SENDER = os.getenv("AWS_SES_SENDER_EMAIL", "noreply@divineenergyhub.org")

# Configure boto3 client with retries and timeout
boto_config = Config(
    region_name=AWS_REGION,
    retries={"max_attempts": 3, "mode": "standard"},
    connect_timeout=5,
    read_timeout=10,
)

def get_s3_client():
    """Initializes and returns boto3 S3 client using environment or IAM instance role."""
    try:
        return boto3.client("s3", config=boto_config)
    except Exception as e:
        logger.error(f"Failed to initialize S3 client: {e}")
        return None

def get_ses_client():
    """Initializes and returns boto3 SES client."""
    try:
        return boto3.client("ses", config=boto_config)
    except Exception as e:
        logger.error(f"Failed to initialize SES client: {e}")
        return None

def generate_presigned_upload_url(
    object_name: str,
    content_type: str = "image/jpeg",
    expiration: int = 3600
) -> Optional[Dict[str, Any]]:
    """
    Generate a presigned S3 URL for direct client-side photo uploads.
    Prevents large images from congesting the Flask API server during gate scans.
    """
    s3_client = get_s3_client()
    if not s3_client:
        return None

    try:
        response = s3_client.generate_presigned_post(
            Bucket=S3_BUCKET,
            Key=object_name,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 100, 10485760],  # 100B to 10MB
            ],
            ExpiresIn=expiration,
        )
        return response
    except ClientError as e:
        logger.error(f"Error generating presigned post URL for {object_name}: {e}")
        return None

def generate_presigned_download_url(
    object_name: str,
    expiration: int = 3600
) -> Optional[str]:
    """
    Generate a presigned GET URL to view/download a private guest photo from S3.
    """
    s3_client = get_s3_client()
    if not s3_client:
        return None

    try:
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": object_name},
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        logger.error(f"Error generating download URL for {object_name}: {e}")
        return None

def upload_bytes_to_s3(
    file_bytes: bytes,
    object_name: str,
    content_type: str = "image/jpeg"
) -> bool:
    """Uploads in-memory byte buffer directly to S3."""
    s3_client = get_s3_client()
    if not s3_client:
        return False

    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=object_name,
            Body=file_bytes,
            ContentType=content_type,
        )
        return True
    except ClientError as e:
        logger.error(f"Failed to upload {object_name} to S3: {e}")
        return False

def send_ses_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
    """Sends a transactional email (password reset, notification) via Amazon SES."""
    ses_client = get_ses_client()
    if not ses_client:
        return False

    if not text_body:
        text_body = subject

    try:
        response = ses_client.send_email(
            Source=SES_SENDER,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                    "Text": {"Data": text_body, "Charset": "UTF-8"},
                },
            },
        )
        logger.info(f"SES email sent to {to_email}, MessageId: {response.get('MessageId')}")
        return True
    except ClientError as e:
        logger.error(f"Failed to send SES email to {to_email}: {e}")
        return False
