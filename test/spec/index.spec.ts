import 'jasmine';
import { maindb } from '../../database/main';

beforeAll(async () => {
	await maindb.init();
});
