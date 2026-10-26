export const DEFAULT_PROBE_PATHS: RegExp[] = [
  /^\/\.(env|git|aws|ssh|svn|htaccess|DS_Store)/i,
  /^\/(wp-login|wp-admin|wp-content|wp-includes|xmlrpc)(\.php)?(\/|$)/i,
  /^\/(phpmyadmin|pma|myadmin|adminer)(\.php)?(\/|$)/i,
  /^\/(admin|administrator|login|config|setup|install|info|shell|test|backup)\.php$/i,
  /^\/(cgi-bin|vendor\/phpunit|actuator|boaform|HNAP1|solr|jenkins|manager\/html)(\/|$)/i,
  /\.(sql|bak|old|zip|tar\.gz|env)$/i,
];
