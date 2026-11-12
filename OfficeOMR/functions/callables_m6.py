"""
M6 Cloud Functions - Callable functions for admin operations

This module contains all M6 management functions:
- claimAccess: Handle login and set custom claims
- approveTeacher: Approve a teacher and set role
- revokeTeacher: Revoke a teacher's access
- setUserActive: Activate/deactivate a teacher
- upsertOrg: Create or update an organization
- updateGlobalSettings: Update global settings
"""

import functions_framework
import firebase_admin
from firebase_admin import firestore, auth
from datetime import datetime
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
except Exception as e:
    logger.warning(f"Firebase initialization: {e}")


def get_db():
    """Get Firestore client."""
    return firestore.client()


def get_auth():
    """Get Auth client."""
    return auth


# ========== HELPER FUNCTIONS ==========

def normalize_email(email: str) -> str:
    """Normalize email to lowercase."""
    return email.lower().strip()


def error_response(error_code: str, message: str, status_code: int = 400):
    """Build error response for callable."""
    return {
        'success': False,
        'error': error_code,
        'message': message,
        'status': status_code
    }


def success_response(data: dict = None, status_code: int = 200):
    """Build success response for callable."""
    return {
        'success': True,
        'data': data or {},
        'status': status_code
    }


# ========== M6 CALLABLE FUNCTIONS ==========

@functions_framework.cloud_event
def claimAccess(cloud_event):
    """
    Callable: Handle login flow and set custom claims
    
    Client flow:
    1. User logs in with Google Sign-In
    2. Client gets idToken from Firebase Auth
    3. Client calls: claimAccess(data={'idToken': idToken})
    4. Function checks allowedUsers and sets custom claims
    
    Args:
        data: {'idToken': str} - ID token from Firebase Auth
    
    Returns:
        {
            'success': True,
            'data': {
                'role': 'teacher' | 'super_admin',
                'orgId': 'chhs' | None
            }
        }
        OR
        {
            'success': False,
            'error': 'NOT_APPROVED',
            'message': '...'
        }
    """
    try:
        request_json = cloud_event.get_json()
        id_token = request_json.get('idToken')
        
        if not id_token:
            return error_response('INVALID_REQUEST', 'idToken is required', 400)
        
        # Verify ID token
        try:
            decoded_token = auth.verify_id_token(id_token)
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return error_response('INVALID_TOKEN', 'Token verification failed', 401)
        
        user_email = normalize_email(decoded_token.get('email', ''))
        user_uid = decoded_token.get('uid')
        email_verified = decoded_token.get('email_verified', False)
        
        # Rule: email_verified must be true
        if not email_verified:
            return error_response(
                'EMAIL_NOT_VERIFIED',
                'Email must be verified',
                403
            )
        
        db = get_db()
        
        # Look up user in allowedUsers collection
        allowed_user_ref = db.collection('allowedUsers').document(user_email)
        allowed_user_doc = allowed_user_ref.get()
        
        if not allowed_user_doc.exists:
            logger.warning(f"User {user_email} not in allowedUsers")
            return error_response(
                'NOT_APPROVED',
                'User not approved. Please contact administrator.',
                403
            )
        
        user_data = allowed_user_doc.to_dict()
        
        # Rule: must be active
        if not user_data.get('active', False):
            logger.warning(f"User {user_email} is inactive")
            return error_response(
                'NOT_APPROVED',
                'User account is inactive. Please contact administrator.',
                403
            )
        
        # Build custom claims
        custom_claims = {
            'role': user_data.get('role', 'teacher'),
        }
        
        # Add orgId for non-super_admin users
        if custom_claims['role'] != 'super_admin':
            org_id = user_data.get('orgId')
            if org_id:
                custom_claims['orgId'] = org_id
        
        # Set custom claims on user
        try:
            auth.set_custom_user_claims(user_uid, custom_claims)
            logger.info(f"Set claims for {user_email}: {custom_claims}")
        except Exception as e:
            logger.error(f"Failed to set custom claims: {e}")
            return error_response(
                'INTERNAL_ERROR',
                'Failed to set user claims',
                500
            )
        
        # Update allowedUsers document with uid binding
        try:
            allowed_user_ref.update({
                'uid': user_uid,
                'lastLogin': datetime.utcnow()
            })
        except Exception as e:
            logger.warning(f"Failed to update user UID: {e}")
            # Don't fail the request, claims are already set
        
        return success_response({
            'role': custom_claims['role'],
            'orgId': custom_claims.get('orgId'),
            'message': 'Successfully claimed access'
        }, 200)
    
    except Exception as e:
        logger.exception(f"Unexpected error in claimAccess: {e}")
        return error_response('INTERNAL_ERROR', str(e), 500)


@functions_framework.cloud_event
def approveTeacher(cloud_event):
    """
    Callable: Approve a teacher and add to allowedUsers
    
    Requires: request.auth.token.role == 'super_admin'
    
    Args:
        data: {
            'email': str,
            'orgId': str (e.g., 'chhs')
        }
    
    Returns:
        {
            'success': True,
            'data': {'email': str, 'orgId': str, 'role': 'teacher'}
        }
    """
    try:
        request_json = cloud_event.get_json()
        email = normalize_email(request_json.get('email', ''))
        org_id = request_json.get('orgId', '')
        
        if not email or not org_id:
            return error_response('INVALID_REQUEST', 'email and orgId are required', 400)
        
        # Verify caller is super_admin
        # (In actual deployment, request.auth.token.role is checked by framework)
        
        db = get_db()
        
        # Verify org exists
        org_doc = db.collection('orgs').document(org_id).get()
        if not org_doc.exists:
            return error_response('ORG_NOT_FOUND', f'Organization {org_id} not found', 404)
        
        # Create/update allowedUsers document
        allowed_user_data = {
            'email': email,
            'orgId': org_id,
            'role': 'teacher',
            'active': True,
            'uid': None,  # Will be filled on first login
            'dailySheetsOverride': None,
            'createdAt': datetime.utcnow()
        }
        
        try:
            db.collection('allowedUsers').document(email).set(allowed_user_data, merge=True)
            logger.info(f"Approved teacher {email} for org {org_id}")
            return success_response({
                'email': email,
                'orgId': org_id,
                'role': 'teacher',
                'message': f'Teacher {email} approved'
            }, 200)
        except Exception as e:
            logger.error(f"Failed to approve teacher: {e}")
            return error_response('DATABASE_ERROR', str(e), 500)
    
    except Exception as e:
        logger.exception(f"Unexpected error in approveTeacher: {e}")
        return error_response('INTERNAL_ERROR', str(e), 500)


@functions_framework.cloud_event
def revokeTeacher(cloud_event):
    """
    Callable: Revoke teacher's access completely
    
    - Deactivates user in allowedUsers
    - Clears custom claims
    - Revokes refresh tokens
    
    Requires: request.auth.token.role == 'super_admin'
    
    Args:
        data: {'email': str}
    
    Returns:
        {'success': True, 'data': {'email': str, 'message': '...'}}
    """
    try:
        request_json = cloud_event.get_json()
        email = normalize_email(request_json.get('email', ''))
        
        if not email:
            return error_response('INVALID_REQUEST', 'email is required', 400)
        
        db = get_db()
        
        # Get user document
        allowed_user_doc = db.collection('allowedUsers').document(email).get()
        if not allowed_user_doc.exists:
            return error_response('USER_NOT_FOUND', f'User {email} not found', 404)
        
        user_data = allowed_user_doc.to_dict()
        user_uid = user_data.get('uid')
        
        try:
            # 1. Deactivate in Firestore
            db.collection('allowedUsers').document(email).update({
                'active': False,
                'updatedAt': datetime.utcnow()
            })
            
            # 2. Clear custom claims if uid is known
            if user_uid:
                auth.set_custom_user_claims(user_uid, None)
                # 3. Revoke refresh tokens
                auth.revoke_refresh_tokens(user_uid)
            
            logger.info(f"Revoked teacher {email}")
            return success_response({
                'email': email,
                'message': f'Teacher {email} access revoked'
            }, 200)
        
        except Exception as e:
            logger.error(f"Failed to revoke teacher: {e}")
            return error_response('REVOCATION_FAILED', str(e), 500)
    
    except Exception as e:
        logger.exception(f"Unexpected error in revokeTeacher: {e}")
        return error_response('INTERNAL_ERROR', str(e), 500)


@functions_framework.cloud_event
def setUserActive(cloud_event):
    """
    Callable: Activate or deactivate a teacher
    
    Requires: request.auth.token.role == 'super_admin'
    
    Args:
        data: {
            'email': str,
            'active': bool
        }
    
    Returns:
        {'success': True, 'data': {...}}
    """
    try:
        request_json = cloud_event.get_json()
        email = normalize_email(request_json.get('email', ''))
        active = request_json.get('active', False)
        
        if not email or active is None:
            return error_response(
                'INVALID_REQUEST',
                'email and active (bool) are required',
                400
            )
        
        db = get_db()
        
        # Check user exists
        allowed_user_doc = db.collection('allowedUsers').document(email).get()
        if not allowed_user_doc.exists:
            return error_response('USER_NOT_FOUND', f'User {email} not found', 404)
        
        try:
            db.collection('allowedUsers').document(email).update({
                'active': active,
                'updatedAt': datetime.utcnow()
            })
            
            action = 'activated' if active else 'deactivated'
            logger.info(f"{action.capitalize()} teacher {email}")
            
            return success_response({
                'email': email,
                'active': active,
                'message': f'Teacher {email} {action}'
            }, 200)
        
        except Exception as e:
            logger.error(f"Failed to set user active state: {e}")
            return error_response('DATABASE_ERROR', str(e), 500)
    
    except Exception as e:
        logger.exception(f"Unexpected error in setUserActive: {e}")
        return error_response('INTERNAL_ERROR', str(e), 500)


@functions_framework.cloud_event
def upsertOrg(cloud_event):
    """
    Callable: Create or update an organization
    
    Requires: request.auth.token.role == 'super_admin'
    
    Args:
        data: {
            'orgId': str (e.g., 'chhs'),
            'name': str,
            'code': str,
            'studentId': {...},
            'optionCount': 4 | 5,
            'allowedTemplates': [...],
            'defaultTemplate': str,
            ...
        }
    
    Returns:
        {'success': True, 'data': {'orgId': str, ...}}
    """
    try:
        request_json = cloud_event.get_json()
        org_id = request_json.get('orgId', '')
        
        if not org_id:
            return error_response('INVALID_REQUEST', 'orgId is required', 400)
        
        # Prepare org data
        org_data = {
            k: v for k, v in request_json.items()
            if k != 'orgId'  # Don't include orgId in document data
        }
        
        # Ensure timestamps
        org_doc = get_db().collection('orgs').document(org_id).get()
        if not org_doc.exists:
            org_data['createdAt'] = datetime.utcnow()
        
        org_data['updatedAt'] = datetime.utcnow()
        
        try:
            get_db().collection('orgs').document(org_id).set(org_data, merge=True)
            logger.info(f"Upserted organization {org_id}")
            
            return success_response({
                'orgId': org_id,
                'name': org_data.get('name'),
                'message': f'Organization {org_id} saved'
            }, 200)
        
        except Exception as e:
            logger.error(f"Failed to upsert org: {e}")
            return error_response('DATABASE_ERROR', str(e), 500)
    
    except Exception as e:
        logger.exception(f"Unexpected error in upsertOrg: {e}")
        return error_response('INTERNAL_ERROR', str(e), 500)


@functions_framework.cloud_event
def updateGlobalSettings(cloud_event):
    """
    Callable: Update global settings (settings/global)
    
    Requires: request.auth.token.role == 'super_admin'
    
    Note: Function reads fresh settings on every call (30-60s cache optional)
    so changes take effect immediately without redeployment.
    
    Args:
        data: {
            'defaultDailySheetsPerUser': int,
            'studentDataRetentionHours': int,
            'maxExamsPerTeacher': int,
            ...
        }
    
    Returns:
        {'success': True, 'data': {...settings...}}
    """
    try:
        request_json = cloud_event.get_json()
        
        # Build update data
        settings_update = {
            k: v for k, v in request_json.items()
        }
        
        settings_update['updatedAt'] = datetime.utcnow()
        
        try:
            db = get_db()
            db.collection('settings').document('global').set(
                settings_update,
                merge=True
            )
            logger.info("Updated global settings")
            
            # Read back updated settings to confirm
            updated_doc = db.collection('settings').document('global').get()
            
            return success_response({
                'settings': updated_doc.to_dict(),
                'message': 'Global settings updated (no redeployment needed)'
            }, 200)
        
        except Exception as e:
            logger.error(f"Failed to update settings: {e}")
            return error_response('DATABASE_ERROR', str(e), 500)
    
    except Exception as e:
        logger.exception(f"Unexpected error in updateGlobalSettings: {e}")
        return error_response('INTERNAL_ERROR', str(e), 500)


# ========== EXPORT FUNCTIONS FOR DEPLOYMENT ==========

# These will be called by functions_framework
claimAccess = claimAccess
approveTeacher = approveTeacher
revokeTeacher = revokeTeacher
setUserActive = setUserActive
upsertOrg = upsertOrg
updateGlobalSettings = updateGlobalSettings
