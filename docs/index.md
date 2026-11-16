---
layout: default
title: NestJS Shield documentation
description: Install and configure nestjs-shield, a NestJS package for rate limiting, IP rules, automatic bans, bot filtering, payload limits, and an admin dashboard.
permalink: /
---
{% capture package_readme %}{% include package-readme.md %}{% endcapture %}
{{ package_readme | markdownify }}

{% capture contribution_guide %}{% include contributing.md %}{% endcapture %}
{{ contribution_guide | replace_first: '# Contributing', '## Contribution workflow' | markdownify }}
