#!/bin/bash
set -e

# Configuration
PROJECT_ID="gen-lang-client-0865075597"
SERVICE_NAME="stratamind-agent"
REGION="us-west1"

echo "🚀 Deploying $SERVICE_NAME to Cloud Run..."

# Set project
/opt/homebrew/share/google-cloud-sdk/bin/gcloud config set project $PROJECT_ID

# Build and Deploy
/opt/homebrew/share/google-cloud-sdk/bin/gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --platform managed \
  --port 8080

echo "✅ Deployment complete!"
