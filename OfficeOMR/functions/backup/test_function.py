"""Minimal test for Firebase Functions Framework."""

import functions_framework

@functions_framework.http
def hello_world(request):
    """Simple hello world function."""
    return 'Hello, World!', 200

@functions_framework.http
def health_check(request):
    """Health check endpoint."""
    return {'status': 'ok'}, 200
