{
  "textPayload": "'Memory limit of 244 MiB exceeded with 253 MiB used. Consider increasing the memory limit, see https://cloud.google.com/functions/docs/configuring/memory'",
  "insertId": "6aed3b4100005cfcf2d7dfba",
  "resource": {
    "type": "cloud_run_revision",
    "labels": {
      "configuration_name": "recognize-sheet",
      "service_name": "recognize-sheet",
      "revision_name": "recognize-sheet-00001-xaj",
      "location": "us-central1",
      "project_id": "officeomr-fe542"
    }
  },
  "timestamp": "2026-11-06T02:28:17.023804Z",
  "severity": "ERROR",
  "labels": {
    "run.googleapis.com/base_image_versions": "us-docker.pkg.dev/serverless-runtimes/google-22-full/runtimes/python311:python311_20261022_3_11_16_RC00",
    "goog-managed-by": "cloudfunctions",
    "instanceId": "00e8a408bd5e00d516a59fe7c8c55d153c9d0e7d431a68b765b482cf4e06545ddb9d973b590738204775ce6cf590691f3dd9c67a17efc672255f4e96af3409aeebd53e2070e238ab1b0576323001b77bc6c56e9428a4cc"
  },
  "logName": "projects/officeomr-fe542/logs/run.googleapis.com%2Fvarlog%2Fsystem",
  "receiveTimestamp": "2026-11-06T02:28:17.245197569Z",
  "errorGroups": [
    {
      "id": "CKnV1_TJwMrDQw"
    }
  ]
}

{
  "insertId": "6aed3b87000e90f596751b8a",
  "httpRequest": {
    "requestMethod": "POST",
    "requestUrl": "https://us-central1-officeomr-fe542.cloudfunctions.net/recognize_sheet",
    "requestSize": "3482221",
    "status": 500,
    "responseSize": "257",
    "userAgent": "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36",
    "remoteIp": "149.88.106.131",
    "referer": "https://officeomr-fe542.web.app/",
    "serverIp": "216.239.36.54",
    "latency": "1.267930936s",
    "protocol": "HTTP/1.1"
  },
  "resource": {
    "type": "cloud_run_revision",
    "labels": {
      "project_id": "officeomr-fe542",
      "configuration_name": "recognize-sheet",
      "location": "us-central1",
      "service_name": "recognize-sheet",
      "revision_name": "recognize-sheet-00001-xaj"
    }
  },
  "timestamp": "2026-11-06T02:29:26.675282Z",
  "severity": "ERROR",
  "labels": {
    "instanceId": "00e8a408bde9c2663154743e6d614c6c20f96feabb862a5478a9339cac0ee3c064dd2709ddf2f4c4529624128ecf48ecc884e32ca710f220c6f06a5aad7fcde6e89b35828380e906d384785d764c3eda93ed32c8b1b1cc",
    "goog-managed-by": "cloudfunctions"
  },
  "logName": "projects/officeomr-fe542/logs/run.googleapis.com%2Frequests",
  "trace": "projects/officeomr-fe542/traces/621ad86081f1f872e2988ebac6b9af64",
  "receiveTimestamp": "2026-11-06T02:29:28.036930550Z",
  "spanId": "2d2050298406e9df"
}

{
  "textPayload": "Warning: Could not verify user in Firestore: 403 Missing or insufficient permissions.",
  "insertId": "6aed3b870008f4dee420cc40",
  "resource": {
    "type": "cloud_run_revision",
    "labels": {
      "revision_name": "recognize-sheet-00001-xaj",
      "project_id": "officeomr-fe542",
      "service_name": "recognize-sheet",
      "location": "us-central1",
      "configuration_name": "recognize-sheet"
    }
  },
  "timestamp": "2026-11-06T02:29:27.586974Z",
  "labels": {
    "goog-managed-by": "cloudfunctions",
    "run.googleapis.com/base_image_versions": "us-docker.pkg.dev/serverless-runtimes/google-22-full/runtimes/python311:python311_20261022_3_11_16_RC00",
    "execution_id": "t0w2lWzpkbeX",
    "instanceId": "00e8a408bde9c2663154743e6d614c6c20f96feabb862a5478a9339cac0ee3c064dd2709ddf2f4c4529624128ecf48ecc884e32ca710f220c6f06a5aad7fcde6e89b35828380e906d384785d764c3eda93ed32c8b1b1cc"
  },
  "logName": "projects/officeomr-fe542/logs/run.googleapis.com%2Fstdout",
  "receiveTimestamp": "2026-11-06T02:29:27.594304644Z"
}

{
  "textPayload": "Warning: Could not check quota: 403 Missing or insufficient permissions.",
  "insertId": "6aed3b870009e74ea37909a5",
  "resource": {
    "type": "cloud_run_revision",
    "labels": {
      "service_name": "recognize-sheet",
      "location": "us-central1",
      "configuration_name": "recognize-sheet",
      "project_id": "officeomr-fe542",
      "revision_name": "recognize-sheet-00001-xaj"
    }
  },
  "timestamp": "2026-11-06T02:29:27.649038Z",
  "labels": {
    "goog-managed-by": "cloudfunctions",
    "execution_id": "t0w2lWzpkbeX",
    "instanceId": "00e8a408bde9c2663154743e6d614c6c20f96feabb862a5478a9339cac0ee3c064dd2709ddf2f4c4529624128ecf48ecc884e32ca710f220c6f06a5aad7fcde6e89b35828380e906d384785d764c3eda93ed32c8b1b1cc",
    "run.googleapis.com/base_image_versions": "us-docker.pkg.dev/serverless-runtimes/google-22-full/runtimes/python311:python311_20261022_3_11_16_RC00"
  },
  "logName": "projects/officeomr-fe542/logs/run.googleapis.com%2Fstdout",
  "receiveTimestamp": "2026-11-06T02:29:27.927428789Z"
}

{
  "textPayload": "Warning: Could not load layout.json: [Errno 2] No such file or directory: '/workspace/layout.json'",
  "insertId": "6aed3b87000e8081d6b03ad6",
  "resource": {
    "type": "cloud_run_revision",
    "labels": {
      "service_name": "recognize-sheet",
      "configuration_name": "recognize-sheet",
      "revision_name": "recognize-sheet-00001-xaj",
      "location": "us-central1",
      "project_id": "officeomr-fe542"
    }
  },
  "timestamp": "2026-11-06T02:29:27.950401Z",
  "labels": {
    "instanceId": "00e8a408bde9c2663154743e6d614c6c20f96feabb862a5478a9339cac0ee3c064dd2709ddf2f4c4529624128ecf48ecc884e32ca710f220c6f06a5aad7fcde6e89b35828380e906d384785d764c3eda93ed32c8b1b1cc",
    "execution_id": "t0w2lWzpkbeX",
    "run.googleapis.com/base_image_versions": "us-docker.pkg.dev/serverless-runtimes/google-22-full/runtimes/python311:python311_20261022_3_11_16_RC00",
    "goog-managed-by": "cloudfunctions"
  },
  "logName": "projects/officeomr-fe542/logs/run.googleapis.com%2Fstdout",
  "receiveTimestamp": "2026-11-06T02:29:28.259484159Z"
}

{
  "textPayload": "Error reading user from Firestore: 403 Missing or insufficient permissions.",
  "insertId": "6aed3df400057ff6398e310a",
  "resource": {
    "type": "cloud_run_revision",
    "labels": {
      "configuration_name": "recognize-sheet",
      "revision_name": "recognize-sheet-00002-cey",
      "service_name": "recognize-sheet",
      "location": "us-central1",
      "project_id": "officeomr-fe542"
    }
  },
  "timestamp": "2026-11-06T02:39:48.360438Z",
  "labels": {
    "goog-managed-by": "cloudfunctions",
    "run.googleapis.com/base_image_versions": "us-docker.pkg.dev/serverless-runtimes/google-22-full/runtimes/python311:python311_20261022_3_11_16_RC00",
    "goog-drz-cloudfunctions-id": "recognize_sheet",
    "goog-drz-cloudfunctions-location": "us-central1",
    "instanceId": "00e8a408bd7654ed2cd87d6f9b2dca565cdbe952d63f65f286d976a16e0f3d0b5a43d5ba6d3df51608255ddf9676a741cbd33cdd325c3b736677c31bd61635874d25625608ca426d54feb63185450e30d08ae32a0fb4eb7cf8b95f",
    "execution_id": "RQZtEPAVwMT8"
  },
  "logName": "projects/officeomr-fe542/logs/run.googleapis.com%2Fstdout",
  "receiveTimestamp": "2026-11-06T02:39:48.367964890Z"
}

```
(.venv) PS D:\chhsban\OfficeOMR> gcloud functions logs read recognize_sheet --gen2 --region us-central1 --project officeomr-fe542 --limit 30
LEVEL  NAME             EXECUTION_ID  TIME_UTC                 LOG
       recognize-sheet  RQZtEPAVwMT8  2026-11-06 02:39:48.360  Error reading user from Firestore: 403 Missing or insufficient permissions.
E      recognize-sheet                2026-11-06 02:39:46.781
I      recognize-sheet                2026-11-06 02:39:44.902
I      recognize-sheet                2026-11-06 02:39:00.180  Default STARTUP TCP probe succeeded after 1 attempt for container "worker" on port 8080.
I      recognize-sheet                2026-11-06 02:38:57.430  Starting new instance. Reason: DEPLOYMENT_ROLLOUT - Instance started due to traffic shifting between revisions due to deployment, traffic split adjustment, or deployment health check.
E      recognize-sheet                2026-11-06 02:29:30.026  'Memory limit of 244 MiB exceeded with 252 MiB used. Consider increasing the memory limit, see https://cloud.google.com/functions/docs/configuring/memory'
       recognize-sheet  t0w2lWzpkbeX  2026-11-06 02:29:27.950  Warning: Could not load layout.json: [Errno 2] No such file or directory: '/workspace/layout.json'
       recognize-sheet  t0w2lWzpkbeX  2026-11-06 02:29:27.649  Warning: Could not check quota: 403 Missing or insufficient permissions.
       recognize-sheet  t0w2lWzpkbeX  2026-11-06 02:29:27.586  Warning: Could not verify user in Firestore: 403 Missing or insufficient permissions.
E      recognize-sheet                2026-11-06 02:29:26.675
I      recognize-sheet                2026-11-06 02:29:24.624  Default STARTUP TCP probe succeeded after 1 attempt for container "worker" on port 8080.
I      recognize-sheet                2026-11-06 02:29:22.481  Starting new instance. Reason: AUTOSCALING - Instance started due to configured scaling factors (e.g. CPU utilization, request throughput, etc.) or no existing capacity for current traffic.
I      recognize-sheet                2026-11-06 02:29:22.465
E      recognize-sheet                2026-11-06 02:28:17.023  'Memory limit of 244 MiB exceeded with 253 MiB used. Consider increasing the memory limit, see https://cloud.google.com/functions/docs/configuring/memory'
       recognize-sheet  GhRW75P3Yss2  2026-11-06 02:28:14.423  Warning: Could not load layout.json: [Errno 2] No such file or directory: '/workspace/layout.json'
       recognize-sheet  GhRW75P3Yss2  2026-11-06 02:28:14.080  Warning: Could not check quota: 403 Missing or insufficient permissions.
       recognize-sheet  GhRW75P3Yss2  2026-11-06 02:28:14.008  Warning: Could not verify user in Firestore: 403 Missing or insufficient permissions.
E      recognize-sheet                2026-11-06 02:28:12.437
I      recognize-sheet                2026-11-06 02:28:10.105  Default STARTUP TCP probe succeeded after 1 attempt for container "worker" on port 8080.
I      recognize-sheet                2026-11-06 02:28:06.911  Starting new instance. Reason: AUTOSCALING - Instance started due to configured scaling factors (e.g. CPU utilization, request throughput, etc.) or no existing capacity for current traffic.
I      recognize-sheet                2026-11-06 02:28:06.877
I      recognize-sheet                2026-11-06 02:03:55.203  Default STARTUP TCP probe succeeded after 1 attempt for container "worker" on port 8080.
I      recognize-sheet                2026-11-06 02:03:53.134  Starting new instance. Reason: AUTOSCALING - Instance started due to configured scaling factors (e.g. CPU utilization, request throughput, etc.) or no existing capacity for current traffic.
E      recognize-sheet                2026-11-06 02:03:52.962  'Memory limit of 244 MiB exceeded with 278 MiB used. Consider increasing the memory limit, see https://cloud.google.com/functions/docs/configuring/memory'
       recognize-sheet  GvKKmOCzCWPD  2026-11-06 02:03:52.817  Warning: Could not load layout.json: [Errno 2] No such file or directory: '/workspace/layout.json'
       recognize-sheet  GvKKmOCzCWPD  2026-11-06 02:03:50.712  Warning: Could not check quota: 403 Missing or insufficient permissions.
       recognize-sheet  GvKKmOCzCWPD  2026-11-06 02:03:50.436  Warning: Could not verify user in Firestore: 403 Missing or insufficient permissions.
E      recognize-sheet                2026-11-06 02:03:45.448
I      recognize-sheet                2026-11-06 02:03:43.300
I      recognize-sheet                2026-11-06 01:57:50.004  Default STARTUP TCP probe succeeded after 1 attempt for container "worker" on port 8080.
```

```
(.venv) PS D:\chhsban\OfficeOMR> gcloud functions describe recognize_sheet --gen2 --region us-central1 --project officeomr-fe542 --format="value(serviceConfig.serviceAccountEmail)"
601814582794-compute@developer.gserviceaccount.com
(.venv) PS D:\chhsban\OfficeOMR> gcloud firestore databases list --project officeomr-fe542                                     
---                                                  
appEngineIntegrationMode: DISABLED
concurrencyMode: PESSIMISTIC
createTime: '2026-11-04T07:37:10.370086Z'
databaseEdition: STANDARD
deleteProtectionState: DELETE_PROTECTION_DISABLED
earliestVersionTime: '2026-11-06T01:47:49.939197Z'
etag: IKuwppqq8pcDMPSs+pbn7ZcD
freeTier: true
keyPrefix: s
locationId: nam5
name: projects/officeomr-fe542/databases/(default)
pointInTimeRecoveryEnablement: POINT_IN_TIME_RECOVERY_DISABLED
realtimeUpdatesMode: REALTIME_UPDATES_MODE_ENABLED
type: FIRESTORE_NATIVE
uid: d65b2940-3163-4196-bec5-76aecf00f614
updateTime: '2026-11-04T07:37:10.370086Z'
versionRetentionPeriod: 3600s
(.venv) PS D:\chhsban\OfficeOMR> gcloud services list --enabled --project officeomr-fe542 --filter="firestore"
NAME                      TITLE
firestore.googleapis.com  Cloud Firestore API
(.venv) PS D:\chhsban\OfficeOMR> 
```