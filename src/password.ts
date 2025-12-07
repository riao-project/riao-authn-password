export interface Password {
	id: string;
	principal_id: string;
	password_hash: string;
	create_timestamp: Date;
	deactivate_timestamp?: Date | null;
}
