import { Database } from '@riao/dbal';
import { Hash } from '@riao/crypto';
import { Principal } from '@riao/iam/auth';
import { AuthenticationProtection } from '@riao/iam/authentication';
import { PasswordAuthentication } from '../../src/authentication-password';

describe('Password authentication contract', () => {
	let auth: PasswordAuthentication<Principal>;
	let protection: jasmine.SpyObj<AuthenticationProtection>;
	let hash: Hash;
	let principal: Principal;

	beforeEach(() => {
		const db = jasmine.createSpyObj<Database>('db', ['getQueryRepository']);
		const repo = jasmine.createSpyObj('repo', ['findOne', 'update']);
		db.getQueryRepository.and.returnValue(repo);
		protection = jasmine.createSpyObj<AuthenticationProtection>(
			'protection', ['beforeAttempt', 'onFailure', 'onSuccess']
		);
		protection.beforeAttempt.and.resolveTo({ allowed: true });
		protection.onFailure.and.resolveTo();
		protection.onSuccess.and.resolveTo();
		hash = new Hash();
		auth = new (class extends PasswordAuthentication<Principal> {})({
			db, hash, authenticationProtection: protection,
		});
		principal = {
			id: 'user', login: 'user', name: 'User', type: 'user',
			create_timestamp: new Date(),
		};
		spyOn(auth, 'findActivePrincipal').and.resolveTo(principal);
		repo.findOne.and.resolveTo({
			id: 'password', password_hash: 'hash', locked_until: null,
		});
		repo.update.and.resolveTo();
		spyOn(hash, 'check').and.resolveTo(true);
	});

	it('skips verification and recording when protection blocks', async () => {
		protection.beforeAttempt.and.resolveTo({
			allowed: false, retryAfterSeconds: 30,
		});
		expect(await auth.authenticate({ login: 'user', password: 'secret' }))
			.toBeNull();
		expect(auth.findActivePrincipal).not.toHaveBeenCalled();
		expect(hash.check).not.toHaveBeenCalled();
		expect(protection.onFailure).not.toHaveBeenCalled();
		expect(protection.onSuccess).not.toHaveBeenCalled();
	});

	it('records missing or inactive principal failures', async () => {
		(auth.findActivePrincipal as jasmine.Spy).and.resolveTo(null);
		expect(await auth.authenticate({ login: 'user', password: 'secret' }))
			.toBeNull();
		expect(protection.onFailure).toHaveBeenCalledTimes(1);
		expect(protection.onSuccess).not.toHaveBeenCalled();
	});

	it('records missing passwords and malformed credentials', async () => {
		(auth.passwordsRepo.findOne as jasmine.Spy).and.resolveTo(null);
		expect(await auth.authenticate({ login: 'user', password: 'secret' }))
			.toBeNull();
		expect(protection.onFailure).toHaveBeenCalledTimes(1);
		expect(await auth.authenticate({ login: 'user' })).toBeNull();
		expect(protection.onFailure).toHaveBeenCalledTimes(2);
	});

	it('rejects object logins without coercing the subject', async () => {
		const credentials = JSON.parse(
			'{"login":{"toString":null},"password":"secret"}'
		);
		expect(await auth.authenticate(credentials)).toBeNull();
		expect(protection.beforeAttempt).toHaveBeenCalledWith({
			scheme: 'password',
			subject: '',
		});
		expect(protection.onFailure).toHaveBeenCalledTimes(1);
		expect(auth.findActivePrincipal).not.toHaveBeenCalled();
	});

	it('does not count a local lockout as another failure', async () => {
		(auth.passwordsRepo.findOne as jasmine.Spy).and.resolveTo({
			id: 'password', locked_until: new Date(Date.now() + 60000),
		});
		expect(await auth.authenticate({ login: 'user', password: 'secret' }))
			.toBeNull();
		expect(hash.check).not.toHaveBeenCalled();
		expect(protection.onFailure).not.toHaveBeenCalled();
	});

	it('records success only after persistence', async () => {
		(protection.onSuccess as jasmine.Spy).and.callFake(async () => {
			expect(auth.passwordsRepo.update).toHaveBeenCalledTimes(1);
		});
		expect(await auth.authenticate({ login: 'user', password: 'secret' }))
			.toBe(principal);
		expect(protection.onSuccess).toHaveBeenCalledTimes(1);
		expect(protection.onFailure).not.toHaveBeenCalled();
	});

	it('propagates outages without recording', async () => {
		const error = new Error('Authentication store unavailable');
		(auth.findActivePrincipal as jasmine.Spy).and.rejectWith(error);
		await expectAsync(auth.authenticate({
			login: 'user', password: 'secret',
		})).toBeRejectedWith(error);
		(auth.findActivePrincipal as jasmine.Spy).and.resolveTo(principal);
		(hash.check as jasmine.Spy).and.rejectWith(error);
		await expectAsync(auth.authenticate({
			login: 'user', password: 'secret',
		})).toBeRejectedWith(error);
		(hash.check as jasmine.Spy).and.resolveTo(true);
		(auth.passwordsRepo.update as jasmine.Spy).and.rejectWith(error);
		await expectAsync(auth.authenticate({
			login: 'user', password: 'secret',
		})).toBeRejectedWith(error);
		expect(protection.onFailure).not.toHaveBeenCalled();
		expect(protection.onSuccess).not.toHaveBeenCalled();
	});
});
