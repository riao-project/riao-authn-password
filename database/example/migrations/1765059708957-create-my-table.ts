import { ColumnType, Migration, UUIDKeyColumn } from '@riao/dbal';

export default class CreateMyTable extends Migration {
	override async up() {
		await this.ddl.createTable({
			name: 'my_table',
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
			],
		});
	}

	override async down() {
		await this.ddl.dropTable({
			tables: 'my_table',
		});
	}
}
