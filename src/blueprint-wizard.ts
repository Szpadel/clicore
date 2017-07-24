import * as fs from "fs-extra";
import * as inquirer from "inquirer";
import {ChoiceType, Question} from "inquirer";
import * as path from "path";
import {Blueprint, BlueprintParameter} from "./blueprint";

interface AutocompleteQuestion extends Question {
    source?: (answers: { [k: string]: any }, input: string | null) => Promise<ChoiceType[]>;
    suggestOnly?: boolean;
}

/**
 * @internal
 */
export class BlueprintWizard {
    constructor(private blueprint: Blueprint) {
        inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
    }

    async runWizard(options: { [k: string]: string | boolean }): Promise<{ [k: string]: string | boolean }> {
        const questions = this.blueprint
            .options
            .filter(o => o.ask)
            .map(o => {
                switch (o.type) {
                    case 'boolean':
                        return this.createBoolQuestion(o, options[o.name] as boolean);
                    case 'string':
                        return this.createStringQuestion(o, options[o.name] as string);
                    case 'enum':
                        return this.createItemQuestion(o, options[o.name] as string);
                    case 'file':
                        return this.createFileQuestion(o, options[o.name] as string);
                    case 'dir':
                        return this.createDirQuestion(o, options[o.name] as string);
                }
            });

        const resp = await inquirer.prompt(questions);

        return Object.assign(options, resp);
    }

    private createFileQuestion(option: BlueprintParameter, def: string): AutocompleteQuestion {
        return this.createFilePicker(option,
            def,
            (f) => fs.statSync(f).isFile(),
            () => true);
    }

    private createDirQuestion(option: BlueprintParameter, def: string): AutocompleteQuestion {
        return this.createFilePicker(option,
            def,
            (f) => fs.statSync(f).isDirectory(),
            (f) => fs.statSync(f).isDirectory());
    }

    private createFilePicker(option: BlueprintParameter,
                             def: string,
                             acceptFn: (path: string) => boolean,
                             filterFn: (path: string) => boolean): AutocompleteQuestion {
        return {
            type: 'autocomplete',
            message: option.description,
            name: option.name,
            default: def,
            suggestOnly: true,
            validate: (input: string) => {
                return fs.existsSync(input) && acceptFn(input);
            },
            filter: (dir) => path.relative(process.cwd(), dir),
            source: async (answers, rawInput) => {
                const input = path.normalize(path.resolve(rawInput || '.'));
                const dir = fs.existsSync(input) ? input : path.dirname(input);
                const file = fs.existsSync(input) ? '' : path.basename(input);

                if (!fs.existsSync(dir)) {
                    return [];
                }

                if (!fs.statSync(dir).isDirectory()) {
                    return [{
                        name: path.basename(dir),
                        value: dir
                    }];
                }

                return fs.readdirSync(dir)
                    .filter(d => d.startsWith(file))
                    .filter(d => filterFn(path.join(dir, d)))
                    .map(d => {
                        const full = path.join(dir, d);
                        const isDir = fs.statSync(full).isDirectory();
                        return {
                            name: isDir ? `${d}/` : d,
                            value: isDir ? `${full}/` : full
                        }
                    });
            }
        }
    }

    private createItemQuestion(option: BlueprintParameter, def?: string): Question {
        return {
            type: 'list',
            message: option.description,
            name: option.name,
            default: def,
            choices: option.choices,
        }
    }

    private createStringQuestion(option: BlueprintParameter, def?: string): Question {
        return {
            type: 'input',
            message: option.description,
            name: option.name,
            default: def
        }
    }

    private createBoolQuestion(option: BlueprintParameter, def?: boolean): Question {
        return {
            type: 'expand',
            message: option.description,
            name: option.name,
            default: def,
            choices: [
                {
                    key: 'y',
                    name: 'Yes',
                    value: 'y'
                },
                {
                    key: 'n',
                    name: 'No',
                    value: 'n'
                }
            ],
            validate: (i => i === 'y')
        };
    }
}
