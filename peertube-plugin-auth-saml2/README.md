# SAML2 auth plugin for PeerTube

Add SAML2 support to login form in PeerTube.

## Keycloak example

### Signature

If you want to sign get requests:
 * Generate a certificate and private key: `openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem`
 * Import `cert.pem` in keycloak SAML client
 * Copy `cert.pem` and `key.pem` in PeerTube SAML plugin settings
 * Check the *Sign get request* checkbox in PeerTube SAML plugin settings

### Provider certificate

You can find the public key on: `http://keycloak.example.com/auth/realms/{realm}/protocol/saml/descriptor`.
