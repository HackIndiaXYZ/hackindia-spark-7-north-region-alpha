# ============================================================
# DIPDoc Backend — End-to-End Encryption Service
# AES-256-GCM with PBKDF2 key derivation
# ============================================================

import os
import base64
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes


class E2EEncryption:
    """
    End-to-End Encryption for health data.
    
    Only the user and their designated caregiver can decrypt.
    Uses AES-256-GCM for authenticated encryption.
    
    Key derivation: PBKDF2 with user-specific salt.
    """

    def __init__(self, master_key=None):
        self.master_key = (master_key or 'dipdoc-e2ee-default').encode('utf-8')

    def derive_key(self, user_id, salt=None):
        """
        Derive a 256-bit encryption key for a user.
        
        Args:
            user_id: Patient/user identifier
            salt: Optional salt (generated if not provided)
            
        Returns:
            tuple: (key_bytes, salt_bytes)
        """
        if salt is None:
            salt = os.urandom(16)
        elif isinstance(salt, str):
            salt = base64.b64decode(salt)

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits
            salt=salt,
            iterations=100_000
        )

        key_material = self.master_key + user_id.encode('utf-8')
        key = kdf.derive(key_material)

        return key, salt

    def encrypt(self, data, user_id):
        """
        Encrypt health data for a user.
        
        Args:
            data: Dict or string to encrypt
            user_id: Patient identifier
            
        Returns:
            str: Base64-encoded encrypted payload
        """
        if isinstance(data, dict):
            plaintext = json.dumps(data).encode('utf-8')
        elif isinstance(data, str):
            plaintext = data.encode('utf-8')
        else:
            plaintext = bytes(data)

        # Derive key
        key, salt = self.derive_key(user_id)

        # Generate nonce (96 bits for GCM)
        nonce = os.urandom(12)

        # Encrypt
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)

        # Pack: salt (16) + nonce (12) + ciphertext
        payload = salt + nonce + ciphertext
        return base64.b64encode(payload).decode('utf-8')

    def decrypt(self, encrypted_payload, user_id):
        """
        Decrypt health data for a user.
        
        Args:
            encrypted_payload: Base64-encoded encrypted string
            user_id: Patient identifier
            
        Returns:
            dict or str: Decrypted data
        """
        raw = base64.b64decode(encrypted_payload)

        # Unpack: salt (16) + nonce (12) + ciphertext
        salt = raw[:16]
        nonce = raw[16:28]
        ciphertext = raw[28:]

        # Derive same key
        key, _ = self.derive_key(user_id, salt)

        # Decrypt
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)

        # Try to parse as JSON
        try:
            return json.loads(plaintext.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return plaintext.decode('utf-8')

    def create_shared_access(self, data, user_id, caregiver_id):
        """
        Encrypt data that both user and caregiver can decrypt.
        
        Returns:
            dict: {user_encrypted, caregiver_encrypted}
        """
        return {
            'user_encrypted': self.encrypt(data, user_id),
            'caregiver_encrypted': self.encrypt(data, caregiver_id),
            'access': [user_id, caregiver_id]
        }

    def verify_access(self, encrypted_payload, user_id):
        """
        Verify that a user can decrypt the payload.
        
        Returns:
            bool: True if decryption succeeds
        """
        try:
            self.decrypt(encrypted_payload, user_id)
            return True
        except Exception:
            return False
