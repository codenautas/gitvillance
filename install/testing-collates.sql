SET lc_messages TO 'en_US.UTF-8';

DROP COLLATION if exists semver_collate;

set search_path to gitvillance;

DROP COLLATION if exists semver_collate;

CREATE COLLATION semver_collate (
  LOCALE = 'en-US-u-kn-true-ka-shifted-ks-level1-kv-symbol',
  deterministic = false, 
  PROVIDER = icu
);

SELECT o.host, o.org, m.module collate semver_collate
    , min(coalesce(rm.version_lock, rm.version) collate semver_collate) version_min
    , max(coalesce(rm.version_lock, rm.version) collate semver_collate) version_max
  FROM modules m
    INNER JOIN repo_modules rm USING (module)
    INNER JOIN orgs o ON m.repository_host = o.host AND m.repository_org = o.org
  GROUP BY o.host, o.org, m.module;

/*
SELECT module, npm_latest, npm_info, repository_host, repository_org, repository_repo, repository_type, repository_url
	FROM gitvillance.modules;  
*/    