import 'jasmine';
import { maindb } from '../../../../database/main';

beforeAll(async () => {
	maindb['databasePath'] = '../../database';

	await maindb.init();
});
