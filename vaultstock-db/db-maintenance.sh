#!/bin/bash

cd "$(dirname "$0")"

source .env

case "$1" in
  backup)
    mkdir -p ./backups
    FILENAME="./backups/vaultstock_$(date +%Y%m%d_%H%M%S).dump"
    echo "Creating backup to $FILENAME"
    docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc -Z 9 "$POSTGRES_DB" > "$FILENAME"
    echo "Backup completed successfully"
    ;;

  restore)
    if [ -z "$2" ]; then
      echo "Usage: $0 restore <backup_file>"
      exit 1
    fi
    echo "WARNING: This will overwrite all existing data!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$2"
      echo "Restore completed"
    fi
    ;;

  refresh-views)
    echo "Refreshing all materialized views..."
    docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT refresh_all_materialized_views();"
    ;;

  vacuum)
    echo "Running full vacuum analyze..."
    docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "VACUUM (VERBOSE, ANALYZE);"
    ;;

  stats)
    echo "Table statistics:"
    docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
      SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC;
    "
    ;;

  slow-queries)
    echo "Top 10 slowest queries by total time:"
    docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
      SELECT query, total_exec_time, calls, mean_exec_time
      FROM pg_stat_statements
      ORDER BY total_exec_time DESC
      LIMIT 10;
    "
    ;;

  cleanup-tokens)
    echo "Removing expired and revoked refresh tokens..."
    docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
      DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = true;
    "
    ;;

  prune-notifications)
    echo "Removing read notifications older than 30 days..."
    docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
      DELETE FROM notifications WHERE read = true AND created_at < NOW() - INTERVAL '30 days';
    "
    ;;

  *)
    echo "VaultStock Database Maintenance Script"
    echo "Usage: $0 <command>"
    echo
    echo "Commands:"
    echo "  backup                  Create full database backup"
    echo "  restore <file>          Restore from backup file"
    echo "  refresh-views           Refresh all materialized views"
    echo "  vacuum                  Run full vacuum and analyze"
    echo "  stats                   Show table statistics"
    echo "  slow-queries            Show top slow queries"
    echo "  cleanup-tokens          Remove expired refresh tokens"
    echo "  prune-notifications     Delete old read notifications"
    ;;
esac