(.venv) PS D:\chhsban\OfficeOMR> gcloud projects add-iam-policy-binding officeomr-fe542 --member="serviceAccount:601814582794-compute@developer.gserviceaccount.com" --role="roles/datastore.user"                                          
Updated IAM policy for project [officeomr-fe542].
bindings:
- members:
  - serviceAccount:service-601814582794@gcp-sa-artifactregistry.iam.gserviceaccount.com
  role: roles/artifactregistry.serviceAgent
- members:
  - serviceAccount:601814582794-compute@developer.gserviceaccount.com
  role: roles/artifactregistry.writer
- members:
  - serviceAccount:601814582794-compute@developer.gserviceaccount.com
  - serviceAccount:601814582794@cloudbuild.gserviceaccount.com
  role: roles/cloudbuild.builds.builder
- members:
  - serviceAccount:service-601814582794@gcp-sa-cloudbuild.iam.gserviceaccount.com
  role: roles/cloudbuild.serviceAgent
- members:
  - serviceAccount:github-deployer@officeomr-fe542.iam.gserviceaccount.com
  role: roles/cloudfunctions.developer
- members:
  - serviceAccount:service-601814582794@gcf-admin-robot.iam.gserviceaccount.com
  role: roles/cloudfunctions.standardServiceAgent
- members:
  - serviceAccount:service-601814582794@containerregistry.iam.gserviceaccount.com
  role: roles/containerregistry.ServiceAgent
- members:
  - serviceAccount:601814582794-compute@developer.gserviceaccount.com
  role: roles/datastore.user
- members:
  - serviceAccount:officeomr-firebase-init@officeomr-fe542.iam.gserviceaccount.com
  role: roles/firebase.admin
- members:
  - serviceAccount:service-601814582794@gcp-sa-firebase.iam.gserviceaccount.com
  role: roles/firebase.managementServiceAgent
- members:
  - serviceAccount:firebase-adminsdk-fbsvc@officeomr-fe542.iam.gserviceaccount.com
  role: roles/firebase.sdkAdminServiceAgent
- members:
  - serviceAccount:firebase-adminsdk-fbsvc@officeomr-fe542.iam.gserviceaccount.com
  role: roles/firebaseauth.admin
- members:
  - serviceAccount:service-601814582794@firebase-rules.iam.gserviceaccount.com
  role: roles/firebaserules.system
- members:
  - serviceAccount:service-601814582794@gcp-sa-firestore.iam.gserviceaccount.com
  role: roles/firestore.serviceAgent
- members:
  - serviceAccount:firebase-adminsdk-fbsvc@officeomr-fe542.iam.gserviceaccount.com
  role: roles/iam.serviceAccountTokenCreator
- members:
  - serviceAccount:github-deployer@officeomr-fe542.iam.gserviceaccount.com
  role: roles/iam.serviceAccountUser
- members:
  - serviceAccount:601814582794-compute@developer.gserviceaccount.com
  role: roles/logging.logWriter
- members:
  - user:weschen@mybazaar.my
  role: roles/owner
- members:
  - serviceAccount:github-deployer@officeomr-fe542.iam.gserviceaccount.com
  role: roles/run.admin
- members:
  - serviceAccount:service-601814582794@serverless-robot-prod.iam.gserviceaccount.com
  role: roles/run.serviceAgent
- members:
  - serviceAccount:601814582794-compute@developer.gserviceaccount.com
  role: roles/storage.objectUser
- members:
  - serviceAccount:601814582794-compute@developer.gserviceaccount.com
  role: roles/storage.objectViewer
etag: BwZfkzItr3g=
version: 1
(.venv) PS D:\chhsban\OfficeOMR> 



