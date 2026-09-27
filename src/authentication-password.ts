import { DatabaseRecordId, QueryRepository } from '@riao/dbal';
import { Hash } from '@riao/crypto';
import { Principal } from '@riao/iam/auth';
import {
	Authentication,
	AuthenticationOptions,
	AuthenticationAttempt,
} from '@riao/iam/authentication';
import { Password } from './password';

export interface PasswordAuthenticationOptions extends AuthenticationOptions {
	hash?: Hash;
	maxFailedAttempts?: number;
	lockoutDurationMs?: number;
}

export abstract class PasswordAuthentication<
	TPrincipal extends Principal,
> extends Authentication<TPrincipal> {
	public passwordsRepo: QueryRepository<Password>;

	protected hash: Hash;
	protected readonly maxFailedAttempts: number;
	protected readonly lockoutDurationMs: number;

	public constructor(options: PasswordAuthenticationOptions) {
		super(options);
		this.hash = options.hash ?? new Hash();
		this.maxFailedAttempts = Math.max(
			1,
			options.maxFailedAttempts ?? 5
		);
		this.lockoutDurationMs = options.lockoutDurationMs ?? 15 * 60 * 1000;
		this.passwordsRepo = options.db.getQueryRepository<Password>({
			table: 'iam_passwords',
			identifiedBy: 'id',
		});
	}

	public override async createPrincipal(
		principal: Omit<TPrincipal, 'id' | 'create_timestamp'> & {
			password: string;
		}
	): Promise<DatabaseRecordId> {
		const hash = await this.hash.make(principal.password);
		delete (principal as { password?: string }).password;

		const principalId = await super.createPrincipal(principal);
		await this.insertPassword(principalId, hash);

		return principalId;
	}

	public async changePassword(
		principalId: DatabaseRecordId,
		newPassword: string
	): Promise<void> {
		const hash = await this.hash.make(newPassword);

		await this.revokePasswords(principalId);
		await this.insertPassword(principalId, hash);
	}

	public async authenticate(
		credentials: Partial<TPrincipal & { password: string }>
	): Promise<TPrincipal | null> {
		const attempt: AuthenticationAttempt = {
			scheme: 'password',
			subject: String(credentials.login ?? ''),
		};
		const protection = await this.beforeAuthenticationAttempt(attempt);
		if (!protection.allowed) {
			return null;
		}

		const principal = await this.findActivePrincipal({
			where: <TPrincipal>{
				login: credentials.login,
			},
		});

		if (!principal) {
			return null;
		}

		const passwordRecord = await this.passwordsRepo.findOne({
			where: { principal_id: principal.id, deactivate_timestamp: null },
			orderBy: { create_timestamp: 'DESC' },
		});

		if (!passwordRecord) {
			return null;
		}

		if (
			passwordRecord.locked_until &&
			passwordRecord.locked_until <= new Date()
		) {
			await this.passwordsRepo.update({
				set: {
					failed_authentication_count: 0,
					locked_until: null,
				},
				where: { id: passwordRecord.id },
			});
		}
		else if (
			passwordRecord.locked_until &&
			passwordRecord.locked_until > new Date()
		) {
			return null;
		}

		const isValid = await this.hash.check(
			credentials.password as string,
			passwordRecord?.password_hash as string
		);

		if (!isValid) {
			await this.recordAuthenticationFailure(attempt);
			await this.recordPasswordFailure(passwordRecord);
			return null;
		}

		await this.recordAuthenticationSuccess(attempt);
		await this.resetPasswordFailures(passwordRecord.id);
		return principal;
	}

	protected async recordPasswordFailure(password: Password): Promise<void> {
		if (
			password.locked_until &&
			password.locked_until <= new Date()
		) {
			await this.passwordsRepo.update({
				set: {
					failed_authentication_count: 0,
					locked_until: null,
				},
				where: { id: password.id },
			});
		}

		await this.passwordsRepo.increment({
			column: 'failed_authentication_count',
			where: { id: password.id },
		});

		const updatedPassword = await this.passwordsRepo.findOne({
			where: { id: password.id },
		});
		if (
			updatedPassword &&
			(updatedPassword.failed_authentication_count ?? 0) >=
				this.maxFailedAttempts
		) {
			await this.passwordsRepo.update({
				set: {
					locked_until: new Date(Date.now() + this.lockoutDurationMs),
				},
				where: { id: password.id },
			});
		}
	}

	protected async resetPasswordFailures(
		passwordId: DatabaseRecordId
	): Promise<void> {
		await this.passwordsRepo.update({
			set: {
				failed_authentication_count: 0,
				locked_until: null,
			},
			where: { id: passwordId as string },
		});
	}

	protected async revokePasswords(
		principalId: DatabaseRecordId
	): Promise<void> {
		await this.passwordsRepo.update({
			set: { deactivate_timestamp: new Date() },
			where: {
				principal_id: principalId as string,
				deactivate_timestamp: null,
			},
		});
	}

	protected async insertPassword(
		principalId: DatabaseRecordId,
		hash: string
	): Promise<void> {
		await this.passwordsRepo.insertOne({
			record: {
				principal_id: principalId as string,
				password_hash: hash,
				failed_authentication_count: 0,
				locked_until: null,
			},
		});
	}
}
