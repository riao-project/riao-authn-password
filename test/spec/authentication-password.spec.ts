import 'jasmine';
// eslint-disable-next-line max-len
import { PasswordAuthentication } from '../../src/authentication-password';
import {
	createDatabase,
	runMigrations,
	runMigrationsDown,
} from '../../../../test/database';
import { Principal } from '@riao/iam/auth';
import { compare } from 'bcrypt';
// eslint-disable-next-line max-len
import { AuthenticationPasswordMigrations } from '../../src/authentication-password-migrations';

interface PasswordPrincipal extends Principal {
	password: string;
}

describe('Authentication - Password', () => {
	const db = createDatabase('authentication-password');

	const auth =
		new (class extends PasswordAuthentication<PasswordPrincipal> {})({
			db,
		});

	const repo = auth.principalRepo;

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, new AuthenticationPasswordMigrations());
		await runMigrationsDown(db, new AuthenticationPasswordMigrations());
		await runMigrations(db, new AuthenticationPasswordMigrations());
	});

	afterAll(async () => {
		await db.disconnect();
	});

	it('should create a principal with a hashed password', async () => {
		const id = await auth.createPrincipal({
			login: 'create_principal_test',
			type: 'user',
			name: 'Create Principal Test',
			password: 'password123',
		});

		const principal = await repo.findOne({ where: { id } });

		if (!principal) {
			throw new Error('Principal not found');
		}

		const passwordRecord = await auth.passwordsRepo.findOne({
			where: { principal_id: id as string },
		});

		if (!passwordRecord) {
			throw new Error('Password record not found');
		}

		expect(principal.id).toEqual(id as string);
		expect(
			await compare('password123', passwordRecord.password_hash)
		).toEqual(true);
	});

	it('should authenticate a principal with correct credentials', async () => {
		await auth.createPrincipal({
			login: 'correct_test',
			type: 'user',
			name: 'Correct Test',
			password: 'password123',
		});

		const authenticated = await auth.authenticate({
			login: 'correct_test',
			password: 'password123',
		});

		if (authenticated === null) {
			throw new Error('Authentication failed');
		}

		expect((authenticated.id as string).length).toBeGreaterThanOrEqual(1);
		expect(authenticated.login).toEqual('correct_test');
	});

	it('should fail authentication with incorrect credentials', async () => {
		await auth.createPrincipal({
			login: 'incorrect_test',
			type: 'user',
			name: 'Incorrect Test',
			password: 'password123',
		});

		const authenticated = await auth.authenticate({
			login: 'incorrect_test',
			password: 'wrongpassword',
		});

		expect(authenticated).toBeNull();
	});

	it('should fail authentication when principal does not exist', async () => {
		const authenticated = await auth.authenticate({
			login: 'nonexistent_user',
			password: 'password123',
		});

		expect(authenticated).toBeNull();
	});

	// eslint-disable-next-line max-len
	it('should fail authentication when password record does not exist', async () => {
		// Create a principal without going through PasswordAuthentication
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _id = await repo.insertOne({
			record: {
				login: 'no_password_test',
				type: 'user',
				name: 'No Password Test',
			},
		});

		const authenticated = await auth.authenticate({
			login: 'no_password_test',
			password: 'password123',
		});

		expect(authenticated).toBeNull();
	});

	// eslint-disable-next-line max-len
	it('should handle multiple password records and use the most recent active one', async () => {
		const principalId = await auth.createPrincipal({
			login: 'multiple_passwords_test',
			type: 'user',
			name: 'Multiple Passwords Test',
			password: 'firstpassword',
		});

		// Insert a second password record
		await auth.passwordsRepo.insertOne({
			record: {
				principal_id: principalId as string,
				password_hash: await auth['hash'].make('secondpassword'),
			},
		});

		// Should authenticate with the newest password
		const authenticated = await auth.authenticate({
			login: 'multiple_passwords_test',
			password: 'secondpassword',
		});

		expect(authenticated).not.toBeNull();
		expect(authenticated?.login).toEqual('multiple_passwords_test');
	});

	it('should not authenticate with deactivated passwords', async () => {
		const principalId = await auth.createPrincipal({
			login: 'deactivated_password_test',
			type: 'user',
			name: 'Deactivated Password Test',
			password: 'password123',
		});

		// Get the password record and deactivate it
		const passwordRecord = await auth.passwordsRepo.findOne({
			where: { principal_id: principalId as string },
		});

		if (!passwordRecord) {
			throw new Error('Password record not found');
		}

		await auth.passwordsRepo.update({
			where: { id: passwordRecord.id },
			set: {
				deactivate_timestamp: new Date(),
			},
		});

		// Should fail authentication with deactivated password
		const authenticated = await auth.authenticate({
			login: 'deactivated_password_test',
			password: 'password123',
		});

		expect(authenticated).toBeNull();
	});
});
