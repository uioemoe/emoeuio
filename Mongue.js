rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /videos/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /votes/{id} {
      allow read, write: if request.auth != null;
    }
  }
}