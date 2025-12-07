import { Migration, MigrationPackage } from '@riao/dbal';
import { CreatePasswordsTable } from './migrations/001-create-passwords-table';

export class AuthenticationPasswordMigrations extends MigrationPackage {
	override package = '@riao/iam-authn-password';
	override name = '@riao/iam-authn-password';

	override async getMigrations(): Promise<
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		Record<string, typeof Migration<any>>
		> {
		return {
			'create-passwords-table': CreatePasswordsTable,
		};
	}
}
