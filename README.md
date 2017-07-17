# clicore

Library for automating tasks in application development inspired by [@angular/cli](https://github.com/angular/angular-cli)

# Status
**Alpha** No api stability is currently guaranteed, use for your own responsibility.

# How to start
Cli for creating cli's that use this library is currently development.

# Features
 * help generation, trivial parameters verification (from command line arguments)
 * wizard for using blueprints
 * post-apply actions
 * confirmation and preview of planned changes, before touching any files 
 * local project configuration - you can set configuration inside project that uses created cli
 * local project blueprint - users of your cli can provide additional project specific blueprints that can be used from the same cli
 * helpers for easy performing common tasks for typescript code
 * dynamic file generation with placeholders

# Roadmap
 * remove dependency for @angular/cli
 * unit tests
