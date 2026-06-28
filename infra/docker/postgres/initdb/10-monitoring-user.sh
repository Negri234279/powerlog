#!/bin/sh
# Least-privilege monitoring role for postgres-exporter (Prometheus).
#
# The official postgres image runs every file in /docker-entrypoint-initdb.d
# ONLY on first cluster init (empty data dir). For an EXISTING volume the role
# won't be created automatically — either recreate the volume
# (`docker compose ... down -v`) or run the GRANT below manually once.
set -e

if [ -z "${POSTGRES_EXPORTER_USER}" ] || [ -z "${POSTGRES_EXPORTER_PASSWORD}" ]; then
	echo "postgres-init: POSTGRES_EXPORTER_USER/PASSWORD not set — skipping monitoring role"
	exit 0
fi

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" <<-EOSQL
	DO \$\$
	BEGIN
		IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${POSTGRES_EXPORTER_USER}') THEN
			CREATE ROLE "${POSTGRES_EXPORTER_USER}" LOGIN PASSWORD '${POSTGRES_EXPORTER_PASSWORD}';
		END IF;
	END
	\$\$;
	-- pg_monitor bundles pg_read_all_stats / pg_read_all_settings → full
	-- pg_stat_* visibility for the exporter without granting write access.
	GRANT pg_monitor TO "${POSTGRES_EXPORTER_USER}";
EOSQL

echo "postgres-init: monitoring role '${POSTGRES_EXPORTER_USER}' ready"
