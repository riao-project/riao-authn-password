export interface Password {
	id: string;
	principal_id: string;
	password_hash: string;
	create_timestamp: Date;
	deactivate_timestamp?: Date | null;
	failed_authentication_count?: number;
	locked_until?: Date | null;
}
