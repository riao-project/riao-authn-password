import { DatabaseRecordId, QueryRepository } from '@riao/dbal';
import { Hash } from '@riao/iam/hash';
import { Principal } from '@riao/iam/auth';
import { Authentication } from '@riao/iam/authentication';
import { AuthOptions } from '@riao/iam/auth/auth';
import { Password } from './password';

export interface PasswordAuthenticationOptions extends AuthOptions {
	hash?: Hash;
}

export abstract class PasswordAuthentication<
	TPrincipal extends Principal,
> extends Authentication<TPrincipal> {
	public passwordsRepo: QueryRepository<Password>;

	protected hash: Hash;

	public constructor(options: PasswordAuthenticationOptions) {
		super(options);
		this.hash = options.hash ?? new Hash();
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

		await this.passwordsRepo.insertOne({
			record: {
				principal_id: principalId as string,
				password_hash: hash,
			},
		});

		return principalId;
	}

	public async authenticate(
		credentials: Partial<TPrincipal & { password: string }>
	): Promise<TPrincipal | null> {
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

		const isValid = await this.hash.check(
			credentials.password as string,
			passwordRecord?.password_hash as string
		);

		return isValid ? principal : null;
	}
}
