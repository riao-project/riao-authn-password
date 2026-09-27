import { PasswordAuthentication } from '../src';
import { Database } from '@riao/dbal';
import { createDatabase, db, runMigrations } from '../test/database';
import { AuthMigrations } from '@riao/iam/auth/auth-migrations';
import { AuthenticationPasswordMigrations } from '../src/authentication-password-migrations';
import { Principal } from '@riao/iam/auth';
import { maindb } from '../database/main';

/* eslint-disable no-console */

/**
 * Example implementation of PasswordAuthentication
 * This demonstrates how to use the authn-password driver with the
 * example database
 */

interface User extends Principal {
	login: string;
}

class UserPasswordAuthentication extends PasswordAuthentication<User> {}

async function main(): Promise<void> {
	let exampledb: Database;
	// Initialize the database connection
	console.log('Initializing example database...');
	await maindb.init();
	exampledb = await createDatabase('exampledb');
	await exampledb.init();
	console.log('✓ Database initialized');

	// Run migrations

	// Run migrations to create schema
	console.log('Running migrations...');
	await runMigrations(exampledb, new AuthMigrations());
	await runMigrations(exampledb, new AuthenticationPasswordMigrations());
	console.log('✓ Schema ready\n');

	try {
		// Create an instance of the password authentication
		const authService = new UserPasswordAuthentication({
			db: exampledb,
		});

		// Example 1: Create a new user with a password

		console.log('\n--- Creating a new user ---');
		const login = 'john.doe' + Date.now();
		const userId = await authService.createPrincipal({
			login,
			type: 'user',
			name: 'John Doe',
			password: 'securePassword123',
		});

		console.log(`User created with ID: ${userId}`);

		// Example 2: Authenticate with correct credentials

		console.log('\n--- Authenticating with correct credentials ---');
		const authenticatedUser = await authService.authenticate({
			login,
			password: 'securePassword123',
		});

		if (authenticatedUser) {
			console.log('Authentication successful!');

			console.log(
				`User: ${authenticatedUser.login} (${authenticatedUser.name})`
			);
		}
		else {
			console.log('Authentication failed!');
		}

		// Example 3: Try to authenticate with incorrect password

		console.log('\n--- Attempting authentication with wrong password ---');
		const failedAuth = await authService.authenticate({
			login,
			password: 'wrongPassword',
		});

		if (failedAuth) {
			console.log('Authentication successful! (This should not happen!)');
		}
		else {
			console.log('Authentication failed (as expected)');
		}

		console.log('\nExample completed successfully!');
	}
	catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
	finally {
		if (exampledb) {
			// Close the database connection
			await exampledb.disconnect();
		}
	}
}

void main();
