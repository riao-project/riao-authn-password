import {
	CreateTimestampColumn,
	PasswordColumn,
	UUIDKeyColumn,
} from '@riao/dbal/column-pack';
import { ColumnType, Migration } from '@riao/dbal';

export class CreatePasswordsTable extends Migration {
	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: 'iam_passwords',
			columns: [
				UUIDKeyColumn,
				{
					name: 'principal_id',
					type: ColumnType.UUID,
					fk: {
						referencesTable: 'iam_principals',
						referencesColumn: 'id',
						onDelete: 'CASCADE',
					},
				},
				{ ...PasswordColumn, name: 'password_hash' },
				CreateTimestampColumn,
				{
					name: 'deactivate_timestamp',
					type: ColumnType.TIMESTAMP,
					required: false,
				},
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({
			tables: 'iam_passwords',
		});
	}
}
