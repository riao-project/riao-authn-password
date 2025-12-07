import { DatabasePostgres18 } from '@riao/postgres';

export default class ExampleDatabase extends DatabasePostgres18 {
	override name = 'example';
}

export const exampledb = new ExampleDatabase();
