# clicore

Library for automating tasks in application development inspired by [@angular/cli](https://github.com/angular/angular-cli)

# Status
**Alpha** No api stability is currently guaranteed, use for your own responsibility.

# How to start
Cli for creating cli's that use this library is available here: [cli-cli](https://github.com/Szpadel/cli-cli)

# Motivation
In big enterprise applications it is common that you have many places where you are doing repeatable actions to
implement new features (like creating new component or creating new RPC call to backend).
You often copy existing file/function/class and then just replace few things, but this process is very error prone
and boring.
Also when your company use the same boilerplate across multiple teams, it is very difficult
to upgrade that base.

Tools like [@angular/cli](https://github.com/angular/angular-cli) are awesome, but they are useless 
when you need different architecture or you are using different technology.

Creating new cli is difficult task and this project is targeted to solve it.

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
 * executing tasks (like build, test, lint)
 * tracking of layout/architecture version
 * helpers for upgrading project to never version
 * helpers for manipulating package.json
 * helpers for auto refactoring function usages
