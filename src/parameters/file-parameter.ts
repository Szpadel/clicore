import * as fs from "fs-extra";
import {ChoiceType, Question} from "inquirer";
import * as path from "path";
import {BlueprintParameter} from "../";
import {AbstractParameter, CliConfig} from "./abstract";
import caporal = require("caporal");

/**
 * @internal
 */
export interface AutocompleteQuestion extends Question {
    source?: (answers: { [k: string]: any }, input: string | null) => Promise<ChoiceType[]>;
    suggestOnly?: boolean;
}

/**
 * @internal
 */
export abstract class DiskEntityParameter extends AbstractParameter {
    getCliConfig(option: BlueprintParameter): CliConfig {
        return {
            needArgument: true,
            validator: caporal.STRING
        }
    }

    protected createFilePicker(option: BlueprintParameter,
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
}

/**
 * @internal
 */
export class FileParameter extends DiskEntityParameter {
    type = 'file';

    createQuestion(option: BlueprintParameter, defaultParam: string | boolean): Question {
        return this.createFilePicker(option,
            defaultParam as string,
            (f) => fs.statSync(f).isFile(),
            () => true);
    }
}

/**
 * @internal
 */
export class DirParameter extends DiskEntityParameter {
    type = 'dir';

    createQuestion(option: BlueprintParameter, defaultParam: string | boolean): Question {
        return this.createFilePicker(option,
            defaultParam as string,
            (f) => fs.statSync(f).isDirectory(),
            (f) => fs.statSync(f).isDirectory());
    }
}
