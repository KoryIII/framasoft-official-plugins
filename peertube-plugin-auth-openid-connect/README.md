# OpenID Connect auth plugin for PeerTube

Add OpenID Connect support to login form in PeerTube.

The initial code of this plugin has been developed with the financial support of the "Direction du Numérique pour l'Éducation du Ministère de
l'Éducation et de la Jeunesse" (french Ministry of National Education).

## Configuration

The callback URL to configure on the OIDC provider side is: <your-instance-url>/plugins/auth-openid-connect/router/code-cb
If you don't specifie a role attribute new users will have a 'User' role by default. If you use this attribute it should hold an integer from this set of values: 0 (Administrator), 1 (Moderator), 2 (User).
