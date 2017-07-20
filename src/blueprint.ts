import * as Chalk from "chalk";
import {exec} from "child_process";
import {diffLines} from "diff";
import * as fs from "fs-extra";
import * as inquirer from "inquirer";
import * as path from "path";
import {BlueprintSummary} from "./blueprint-summary";
import {BlueprintWizard} from "./blueprint-wizard";
import {renderTable} from "./cli/view-helpers";
import {UserError, ValidationError} from "./errors";
import {FileGenerator} from "./file-generator";
import {Change, Host, InsertChange, NodeHost} from "./lib/ast-tools/change";
import denodeify = require('denodeify');

/**
 * @internal
 */
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

    /**
     * @internal
     */
    async apply() {
        const cluster = this.getChangesCluster();

        Object.entries(cluster.changesByFile)
            .forEach(pair => fs.createFileSync(pair[0]));

        return cluster.changes
            .reduce((newChange, change) => newChange.then(() => change.apply(NodeHost)), Promise.resolve());
    }

    /**
     * This method determines whether this blueprint can be used
     * Eg. most of blueprint requires to be executed in existing project
     * This promise blocks cli startup, therefore is should be quick check
     */
    async precondition(): Promise<boolean> {
        return true;
    }

    /**
     * Executed after changes are applied
     */
    async postApply() {
    }

    /**
     * @internal
     */
    getChangesCluster(): ClusterChanges {
        if (!this.changesCluster) {
            this.changesCluster = new ClusterChanges(this.generateChanges());
        }
        return this.changesCluster;
    }

    /**
     * Create single new file from provided content
     */
    createFile(filename: string, content: string): Change {
        if (fs.existsSync(filename)) {
            throw new UserError(`Expected file ${filename} to not exist`);
        }
        return new InsertChange(filename, 0, content);
    }

    /**
     * Helper function that handles creating multiple files from templates
     * @param dir path to directory where templates are stored
     * @param translationMap tuple with 2 paths, first one is relative to dir and points to template,
     *   second one points to destination path, in path you can use replacements
     * @param replacements map placeholders to strings that should replace them in path and file content
     */
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

    /**
     * This command allows to execute shell commands in provided directory
     */
    async executeCommand(cwd: string, cmd: string, timeout: number = 0): Promise<CommandResult> {
        return new Promise<CommandResult>((resolve, reject) => {
            exec(cmd, {cwd, timeout}, (err, stdout, stderr) => {
                if(err) {
                    reject(err);
                }else {
                    resolve({stdout, stderr});
                }
            });
        });
    }
}

export interface CommandResult {
    stdout: string;
    stderr: string;
}

export interface BlueprintParameter {
    name: string;
    type: 'string' | 'boolean' | 'enum';
    description: string;
    choices?: (answers: { [key: string]: any }) => string[];
    require?: boolean;
    ask?: boolean;
}

/**
 * @internal
 */
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

/**
 * Create file in memory basing on local file,
 * Allow to apply changes to existing files without actually changing them
 * @internal
 */
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
/**
 * @internal
 */
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
        await this.blueprint.postApply();
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
