import * as fs from 'fs-extra';
import {Change, Host, InsertChange, NodeHost} from './lib/ast-tools/change';
import {UserError, ValidationError} from "./errors";
import * as path from "path";
import {FileGenerator} from "./file-generator";
import * as Chalk from "chalk";
import {BlueprintSummary} from "./blueprint-summary";
import * as inquirer from "inquirer";
import {renderTable} from "./cli/view-helpers";
import {BlueprintWizard} from "./blueprint-wizard";
import denodeify = require('denodeify');
import {diffLines} from "diff";


export interface SummaryItem {
    filename: string;
    summary: string;
}

export abstract class Blueprint {
    private changesCluster?: ClusterChanges;

    abstract get name(): string;

    abstract get description(): string;

    abstract get options(): BlueprintParameter[];

    abstract prepare(options: { [k: string]: string | boolean }): void;

    abstract generateChanges(): Change[];

    async apply() {
        const cluster = this.getChangesCluster();

        Object.entries(cluster.changesByFile)
            .forEach(pair => fs.createFileSync(pair[0]));

        return cluster.changes
            .reduce((newChange, change) => newChange.then(() => change.apply(NodeHost)), Promise.resolve());
    }

    getChangesCluster(): ClusterChanges {
        if (!this.changesCluster) {
            this.changesCluster = new ClusterChanges(this.generateChanges());
        }
        return this.changesCluster;
    }

    createFile(filename: string, content: string): Change {
        if (fs.existsSync(filename)) {
            throw new UserError(`Expected file ${filename} to not exist`);
        }
        return new InsertChange(filename, 0, content);
    }

    createFilesFromTemplates(dir: string, translationMap: [string, string][], replacements: { [k: string]: string }): Change[] {
        const regexpList = Object.entries(replacements)
            .map(([token, value]) => [new RegExp(token, 'g'), value]);

        const pathMap = translationMap
            .map(([src, dest]) => {
                const outPath = regexpList.reduce((str, [reg, value]) => str.replace(reg, value as string), dest);
                return [src, outPath];
            })
            .map(([src, dest]) => [path.join(dir, src), dest]);

        return pathMap.map(([src, dest]) => {
            const tpl = fs.readFileSync(src).toString();
            const rendered = new FileGenerator(src).render(replacements);
            return this.createFile(dest, rendered);
        });
    }
}

export interface BlueprintParameter {
    name: string;
    type: 'string' | 'boolean'; //TODO: enum support
    description: string;
    require?: boolean;
    ask?: boolean;
}

export class ClusterChanges {
    changesByFile: { [k: string]: Change[] } = {};
    otherChanges: Change[] = [];
    changes: Change[];

    constructor(changes: Change[]) {
        this.changes = changes
            .sort((currentChange, nextChange) => nextChange.order - currentChange.order);

        this.changes
            .forEach((change) => {
                if (change.path) {
                    if (!this.changesByFile[change.path]) {
                        this.changesByFile[change.path] = [];
                    }
                    this.changesByFile[change.path].push(change);
                } else {
                    this.otherChanges.push(change);
                }
            });
    }
}

class InMemoryHost implements Host {
    private files: Map<string, string> = new Map();
    private readFile = (denodeify(fs.readFile) as (...args: any[]) => Promise<any>);

    async write(path: string, content: string): Promise<void> {
        this.files.set(path, content);
    }

    read(path: string): Promise<string> {
        if (this.files.has(path)) {
            return Promise.resolve(this.files.get(path) || '');
        } else {
            return this.readFile(path, 'utf8')
                .catch(() => '');
        }
    }
}

export class BlueprintExecutor {
    constructor(private blueprint: Blueprint) {

    }

    async execute(options: { [k: string]: string | boolean }) {
        try {
            await this.realExecute(options);
        } catch (e) {
            if (e instanceof ValidationError) {
                console.error(Chalk.red('Cannot proceed: ' + e.message));
                return;
            } else {
                console.log(e);
                throw e;
            }
        }
    }

    private async ensureOptions(options: { [k: string]: string | boolean }): Promise<{ [k: string]: string | boolean }> {
        const missing = this.blueprint
            .options
            .filter(o => o.require)
            .filter(o => typeof options[o.name] === 'undefined');

        // all required options are present, we can finish now
        if (missing.length === 0) {
            return options;
        }

        const wizard = new BlueprintWizard(this.blueprint);
        options = await wizard.runWizard(options);

        return options;
    }


    private async realExecute(options: { [k: string]: string | boolean }) {
        options = await this.ensureOptions(options);
        this.blueprint.prepare(options);
        if (!await this.confirm()) {
            return;
        }
        console.log(Chalk.blue(`Applying changes...`));
        await this.blueprint.apply();
        console.log(Chalk.blue(`Completed, have a productive day!`));
    }

    private async confirm(): Promise<boolean> {
        const blueprintSummary = new BlueprintSummary(this.blueprint);
        const summary = blueprintSummary.generateSummary(true)
            .map(item => [
                fs.existsSync(item.filename) ? Chalk.blue('change') : Chalk.green('create'),
                Chalk.cyan(item.filename),
                `[ ${item.summary} ]`
            ]);

        const changes = this.blueprint
            .getChangesCluster()
            .changesByFile;

        while (true) {
            console.log(Chalk.magenta('Plan of operation:'));
            console.log(renderTable(summary, {offset: 5, minPad: 20}));

            const answers = await inquirer.prompt([{
                type: 'expand',
                message: 'Apply changes?',
                name: 'apply',
                choices: [
                    {
                        key: 'y',
                        name: 'Apply',
                        value: 'apply'
                    },
                    {
                        key: 'n',
                        name: 'Abort',
                        value: 'cancel'
                    },
                    {
                        key: 'd',
                        name: 'Show diff',
                        value: 'show'
                    }
                ]
            }, {
                type: 'list',
                message: 'Select file',
                name: 'file',
                choices: () => {
                    return Object.entries(changes)
                        .map(([file]) => {
                            return {
                                name: file
                            }
                        });
                },
                when: (resp => resp.apply === 'show')
            }]);

            switch (answers.apply) {
                case 'show':
                    await this.showDiff(changes[answers.file]);
                    // display confirmation again
                    break;
                case 'apply':
                    return true;
                case 'cancel':
                    return false;
            }
        }
    }

    private async showDiff(changes: Change[]) {
        const file = changes[0].path as string;
        const memoryHost = new InMemoryHost();

        const org = await memoryHost.read(file);

        await changes
            .reduce((newChange, change) => newChange.then(() => change.apply(memoryHost)), Promise.resolve());

        const proceed = await memoryHost.read(file);

        console.log();
        diffLines(org, proceed)
            .forEach((part, index, parts) => {
                const color = part.added ? Chalk.green :
                    part.removed ? Chalk.red : Chalk.reset;

                const trimmed = !part.added && !part.removed
                    ? this.trimUnchanged(part.value,
                        index !== 0 ? 3 : 0,
                        index !== parts.length - 1 ? 3 : 0)
                    : part.value;

                process.stderr.write(color(trimmed));
            });
        console.log();
    }

    private trimUnchanged(text: string, keepBegin: number, keepEnd: number): string {
        const lines = text.split('\n');
        if (lines.length < keepBegin + keepEnd + 3) {
            return text;
        }

        return [
            ...lines.slice(0, keepBegin),
            Chalk.grey(` ... skipped ${lines.length - keepBegin - keepEnd} lines ...`),
            ...lines.slice(lines.length - keepEnd - 1)
        ].join('\n');
    }
}
