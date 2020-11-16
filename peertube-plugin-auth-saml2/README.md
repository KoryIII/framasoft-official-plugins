# SAML2 auth plugin for PeerTube

Add SAML2 support to login form in PeerTube.

The initial code of this plugin has been developed with the financial support of the "Direction du Numérique pour l'Éducation du Ministère de
l'Éducation et de la Jeunesse" (french Ministry of National Education).

## Concepts

The most important concepts in SAML2 authentication are:
- identity provider. This is what you authenticate against.
- service provider. This is our PeerTube application.
- entity id.
  - This is the unique identifier for the service provider, often the URL of the SAML metadata file.
  - PeerTube entity id: https://<your-peertube-domain>/plugins/auth-saml2/router/metadata.xml . Note: This will only work with the certificates in place. See below.
- ACS url or assertion consumer URL.
  - This is the endpoint on the service provider side that receives assertions or artifacts. This endpoint is the location where the federation partners communicate.
  - PeerTube ACS url: https://<your-peertube-domain>/plugins/auth-saml2/router/assert

## Keycloak example

### Signature

If you want to sign get requests:
 * Generate a certificate and private key: `openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem`
 * Import `cert.pem` in keycloak SAML client
 * Copy `cert.pem` and `key.pem` in PeerTube SAML plugin settings
 * Check the *Sign get request* checkbox in PeerTube SAML plugin settings

### Provider certificate

You can find the public key on: `http://keycloak.example.com/auth/realms/{realm}/protocol/saml/descriptor`.

## Google G Suite for Education example
### Before you start
Make sure you do not have any existing users on your PeerTube instance with the same user name or email address. This might cause you to lose quite a bit of time.

It's also good idea to create a few throwaway G Suite for Education accounts for testing.

### Generate the PeerTube instance SAML 2 certificate and private key
See under "KeyCloak example".

### Install the SAML2 plugin
Follow the standard PeerTube plugin installation instructions.

### Google: configure the basics
- Sign in to https://admin.google.com .
- At https://admin.google.com/ac/apps/unified , add a custom SAML app. Why not name it "PeerTube"?
- Copy the data Google offers you for the app: sso url, entity url, certificate, SHA-256 fingerprint.
- Fill out the PeerTube entity id and PeerTube ACS url.
- For Name-ID notation, choose "EMAIL" from the dropdown.
- For Name-ID, choose "Basic information > Primary email" from the dropdown.
- Next, we want to enable our new custom SAML app for actual domain users. Go to https://admin.google.com/ac/apps/unified , choose your new app and allow the users you want to have access. Note that this change might take up to 24 hours, even though in practice this almost always happens immediately.

### PeerTube plugin: configure the basics
- Your client id is https://<your-peertube-domain>/plugins/auth-saml2/router/metadata.xml .
- Auth display name is "SAML 2" by default.
- The SSO login URL you can copy from the data offered by google. They call it sso url. It will probably look approximately like https://accounts.google.com/o/saml2/idp?idpid=xxxxxxxxx .
- The identity provider certificate is easy. Google is our identity provider, and we only received one certificate from them.
- The service certificate is the one we generated on our PeerTube server a few steps back.
- The service private key is the one we generated on our PeerTube server a few steps back.
- For username property, we set "preferred_username".
- The rest we leave blank for now.
- Don't forget to save the settings. You might have to restart PeerTube. Not sure.

### Test the basic configuration


You should now be able to login to PeerTube using this Google account. Check this carefully. Have a little celebration if it works!

### Google: Add custom role property
In the previous step, you were logged in as a user. That's the role PeerTube will give you unless you specify otherwise. But you'll want some users to be moderators or even admins. That's what roles are for.

We'll have to add some custom fields to our directory schema. You can get there through admin->users -> more , or directly: https://admin.google.com/ac/customschema .

- Add a custom category "PeerTube".
- As a description, you may want to add "PeerTube roles: "0"=admin, "1"=moderator, "2"=user .
- Now let's build the custom schema field:
  - The name can be anything you want. Let's name it "peertube_role".
  - The type needs to be text, _not_ integer!
  - We need just one value.
- Save the custom schema.
- Now change the custom directory entry for a test user you have not used yet. You want to make him a moderator, so change his "peertube_role" custom property to "1". Save the user.

### PeerTube: set role property
- In the PeerTube SAML plugin configuration, set "Role property" to "peertube_role". Save the configuration.
- Now try to login with the user you just set the peertube_role property for.
