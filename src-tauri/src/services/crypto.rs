//! GemGym — Cryptographic Services
//!
//! Provides:
//! - Argon2id password hashing & verification
//! - AES-256-GCM symmetric encryption & decryption
//! - Random bytes / token generation

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::{
    password_hash::{rand_core::OsRng as ArgonOsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use thiserror::Error;

/// Cryptographic errors exposed to Tauri commands.
#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("Password hashing failed: {0}")]
    HashingFailed(String),

    #[error("Password verification failed")]
    VerificationFailed,

    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),

    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("Invalid key length — expected 32 bytes")]
    InvalidKeyLength,
}

/// Result alias for CryptoError.
pub type CryptoResult<T> = Result<T, CryptoError>;

// ── Password Hashing ──────────────────────────────────────────────────────

/// Hash a plaintext password using Argon2id with a random salt.
/// The resulting hash string contains all parameters needed for verification.
pub fn hash_password(password: &str) -> CryptoResult<String> {
    let salt = SaltString::generate(&mut ArgonOsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| CryptoError::HashingFailed(e.to_string()))
}

/// Verify a plaintext password against a stored Argon2 PHC hash string.
pub fn verify_password(password: &str, hash: &str) -> CryptoResult<bool> {
    let parsed = PasswordHash::new(hash)
        .map_err(|_| CryptoError::VerificationFailed)?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

// ── AES-256-GCM Encryption ────────────────────────────────────────────────

/// Encrypt plaintext with AES-256-GCM.
///
/// The output is Base64-encoded `nonce (12 bytes) || ciphertext`.
/// The `key` must be exactly 32 bytes.
pub fn encrypt(key: &[u8], plaintext: &str) -> CryptoResult<String> {
    if key.len() != 32 {
        return Err(CryptoError::InvalidKeyLength);
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    // Prepend nonce to ciphertext, then Base64-encode
    let mut combined = nonce.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(combined))
}

/// Decrypt a Base64-encoded `nonce || ciphertext` blob.
/// The `key` must be exactly 32 bytes.
pub fn decrypt(key: &[u8], encoded: &str) -> CryptoResult<String> {
    if key.len() != 32 {
        return Err(CryptoError::InvalidKeyLength);
    }

    let combined = BASE64
        .decode(encoded)
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

    if combined.len() < 12 {
        return Err(CryptoError::DecryptionFailed("Data too short".into()));
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

    String::from_utf8(plaintext)
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))
}

// ── Random Token Generation ───────────────────────────────────────────────

/// Generate a secure random hex string of `byte_count` bytes (2x chars).
pub fn generate_random_hex(byte_count: usize) -> String {
    use rand::RngCore;
    let mut bytes = vec![0u8; byte_count];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hash_and_verify() {
        let password = "SecureP@ssw0rd!";
        let hash = hash_password(password).expect("hashing should succeed");
        assert!(verify_password(password, &hash).expect("verify should succeed"));
        assert!(!verify_password("wrongpassword", &hash).expect("verify should succeed"));
    }

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = b"12345678901234567890123456789012"; // 32 bytes
        let plaintext = "hello@gemgym.app";
        let encrypted = encrypt(key, plaintext).expect("encryption should succeed");
        let decrypted = decrypt(key, &encrypted).expect("decryption should succeed");
        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_encrypt_unique_per_call() {
        let key = b"12345678901234567890123456789012";
        let plaintext = "same plaintext";
        let e1 = encrypt(key, plaintext).unwrap();
        let e2 = encrypt(key, plaintext).unwrap();
        assert_ne!(e1, e2, "Each encryption must use a unique nonce");
    }

    #[test]
    fn test_invalid_key_length() {
        let short_key = b"tooshort";
        assert!(encrypt(short_key, "test").is_err());
        assert!(decrypt(short_key, "test").is_err());
    }
}
