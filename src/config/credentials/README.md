# Google Cloud Storage Credentials

This directory is for storing Google Cloud Service Account credentials used for accessing Google Cloud Storage.

## Setup Instructions

1. **Create a Google Cloud Service Account**:

    - Go to the [Google Cloud Console](https://console.cloud.google.com/)
    - Navigate to "IAM & Admin" > "Service Accounts"
    - Click "Create Service Account"
    - Name your service account (e.g., "scoretrend-cms-storage")
    - Grant the following roles:
        - Storage Object Admin
        - Storage Object Creator
        - Storage Object Viewer

2. **Create and Download Credentials**:

    - After creating the service account, click on it
    - Go to the "Keys" tab
    - Click "Add Key" > "Create new key"
    - Choose JSON format
    - Download the JSON key file

3. **Place Credentials in This Directory**:
    - Save the downloaded JSON file in this directory
    - Update your `.env` file to point to this file:
        ```
        GOOGLE_CLOUD_CREDENTIALS_FILE=your-downloaded-file-name.json
        ```

## Security Notes

-   **NEVER commit these credentials to version control**
-   This directory is included in `.gitignore` to prevent accidental commits
-   Each developer should create their own service account for development
-   Production credentials should be managed separately and securely

## Troubleshooting

If you encounter permission issues:

1. Verify that your service account has the correct roles
2. Check that the `GOOGLE_CLOUD_PROJECT_ID` and `GOOGLE_CLOUD_STORAGE_BUCKET` in your `.env` file match your Google Cloud configuration
3. Ensure the credentials file path in your `.env` file is correct
