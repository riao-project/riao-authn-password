# authn-password - Changelog

## 3.0.0

- Require IAM 5 and consistently record missing/inactive credentials as failures.
- Reject malformed credentials before lookup or hash verification.
- Record success only after persistence; preserve operational failures.
- Document principal-bearing sessions and lockout boundary handling.
