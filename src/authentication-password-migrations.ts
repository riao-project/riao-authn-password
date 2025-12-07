import { Migration } from '@riao/dbal';
import { AuthMigrations } from '@riao/iam/auth/auth-migrations';
import { CreatePasswordsTable } from './migrations/001-create-passwords-table';

export class AuthenticationPasswordMigrations extends AuthMigrations {
	override async getMigrations(): Promise<
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		Record<string, typeof Migration<any>>
		> {
		return {
			...(await super.getMigrations()),
			'create-passwords-table': CreatePasswordsTable,
		};
	}
}
