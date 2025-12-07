# @riao/authn-password

A TypeScript library that provides password-based authentication for the RIAO Identity and Access Management (IAM) framework. This driver implements secure password hashing and verification using bcrypt.

## Features

- **Secure Password Hashing**: Uses bcrypt for secure password hashing with configurable salt rounds
- **Principal Management**: Create and manage user principals with associated passwords
- **Authentication**: Authenticate users with login credentials and passwords
- **Flexible Hash Implementation**: Supports custom hash implementations via the `Hash` interface
- **Database Agnostic**: Works with any database supported by the RIAO DBAL (Database Abstraction Layer)
- **TypeScript Support**: Full TypeScript support with type safety

## Installation

```bash
npm install @riao/authn-password @riao/iam @riao/dbal
npm install --save-dev @riao/cli
```

## Database Migrations

This driver requires the IAM password table to be created in your database. You can use the provided migrations:

```bash
npx riao migration:create import-iam-tables
```

Then, add the `AuthenticationPasswordMigrations` to your migration runner:

`database/main/migrations/1234567890-import-iam-tables.ts`
```typescript
import { AuthenticationPasswordMigrations } from 'authn-password';

export default AuthenticationPasswordMigrations;
```

## Quick Start

### Basic Usage

```typescript
import { PasswordAuthentication } from '@riao/authn-password';
import { Principal } from '@riao/iam/auth';
import { Database } from '@riao/dbal';

// Define your user interface
interface User extends Principal {
  login: string;
}

// Create an authentication service class
class UserAuthentication extends PasswordAuthentication<User> {}

// Initialize with your database
const db = new YourDatabase();
await db.init();
await db.connect();

const authService = new UserAuthentication({ db });

// Create a new user with a password
const userId = await authService.createPrincipal({
  login: 'john.doe',
  type: 'user',
  name: 'John Doe',
  password: 'securePassword123',
});

// Authenticate a user
const user = await authService.authenticate({
  login: 'john.doe',
  password: 'securePassword123',
});

if (user) {
  console.log(`Welcome ${user.name}!`);
}
else {
  console.log('Authentication failed');
}
```

## API Reference

### PasswordAuthentication<TPrincipal>

Abstract class that extends `Authentication<TPrincipal>` and adds password-based authentication.

#### Constructor Options

```typescript
interface PasswordAuthenticationOptions extends AuthOptions {
  hash?: Hash; // Optional custom hash implementation (defaults to bcrypt)
}
```

#### Methods

- **createPrincipal(principal)**: Creates a new principal with a hashed password
  - Parameters: Principal data with `password` field
  - Returns: Principal ID

- **authenticate(credentials)**: Authenticates a user with login and password
  - Parameters: Object with `login` and `password` fields
  - Returns: Principal object if successful, null if authentication fails

- **passwordsRepo**: Query repository for accessing password records directly

### Password Record Schema

Passwords are stored in the `iam_passwords` table:

```typescript
interface Password {
  id?: string;
  principal_id: string;      // Foreign key to principal
  password_hash: string;      // Bcrypt hashed password
  deactivate_timestamp?: string;
  create_timestamp?: string;
}
```

## Configuration

### Custom Hash Implementation

You can provide a custom hash implementation:

```typescript
import { Hash } from '@riao/iam/hash';

class CustomHash extends Hash {
  // Implement your custom hashing logic
}

const authService = new UserAuthentication({
  db,
  hash: new CustomHash(),
});
```

## Contributing & Development

See [contributing.md](docs/contributing/contributing.md) for information on how to develop or contribute to this project!
