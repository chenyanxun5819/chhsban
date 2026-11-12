#!/usr/bin/env python3
"""
Bootstrap script to set the super_admin claim for the first administrator.

Usage:
  python bootstrap_admin.py <firebase_project_id> <admin_email>

Example:
  python bootstrap_admin.py officeomr-fe542 wes@chhs.edu.my

Notes:
  - Uses Application Default Credentials (gcloud auth or GOOGLE_APPLICATION_CREDENTIALS)
  - Only run this once to set up the first super_admin
  - The admin email must correspond to a valid Google account in Firebase Auth
"""

import sys
import json
import firebase_admin
from firebase_admin import auth


def bootstrap_admin(project_id: str, admin_email: str) -> None:
    """
    Set super_admin custom claim for the specified email.
    
    Args:
        project_id: Google Cloud project ID (e.g., 'officeomr-fe542')
        admin_email: Email of the admin account to promote
    """
    
    # Initialize Firebase Admin SDK with default credentials
    try:
        firebase_admin.initialize_app(options={'projectId': project_id})
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")
        sys.exit(1)
    
    # Normalize email to lowercase
    admin_email = admin_email.lower().strip()
    
    # Get or create the user in Firebase Auth
    try:
        user = auth.get_user_by_email(admin_email)
        print(f"ℹ️ Found existing user: {user.uid} ({user.email})")
    except auth.UserNotFoundError:
        print(f"⚠️ User {admin_email} not found in Firebase Auth.")
        print("   Please ensure the user has logged in at least once with Google Sign-In.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error retrieving user: {e}")
        sys.exit(1)
    
    # Set custom claims: role='super_admin' (no orgId for super_admin)
    try:
        custom_claims = {
            'role': 'super_admin'
        }
        auth.set_custom_user_claims(user.uid, custom_claims)
        print(f"✅ Successfully set super_admin claim for {admin_email}")
        print(f"   User UID: {user.uid}")
        print(f"   Custom Claims: {json.dumps(custom_claims, indent=2)}")
    except Exception as e:
        print(f"❌ Error setting custom claims: {e}")
        sys.exit(1)
    
    print("\n✅ Bootstrap complete!")
    print("   The user can now log in and access the admin panel.")
    print("   Note: It may take a few minutes for the claims to propagate.")


def main():
    """Parse arguments and run bootstrap."""
    if len(sys.argv) != 3:
        print("Usage: python bootstrap_admin.py <project_id> <admin_email>")
        print("")
        print("Example:")
        print("  python bootstrap_admin.py officeomr-fe542 wes@chhs.edu.my")
        sys.exit(1)
    
    project_id = sys.argv[1]
    admin_email = sys.argv[2]
    
    print(f"🔧 Bootstrapping super_admin...")
    print(f"   Project: {project_id}")
    print(f"   Email: {admin_email}")
    print()
    
    bootstrap_admin(project_id, admin_email)


if __name__ == '__main__':
    main()
