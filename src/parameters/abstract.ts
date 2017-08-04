import {Inquirer, Question} from "inquirer";
import {BlueprintParameter} from "../";

/**
 * @internal
 */
export type ValidatorFn = (str: string) => any;

/**
 * @internal
 */
export interface CliConfig {
    needArgument: boolean;
    validator?: string[] | string | RegExp | ValidatorFn | Number;
}

/**
 * @internal
 */
export abstract class AbstractParameter {
    abstract get type(): string;

    setupInquirer(inquirer: Inquirer) {
    }

    abstract getCliConfig(option: BlueprintParameter): CliConfig;

    abstract createQuestion(option: BlueprintParameter, defaultParam: string | boolean): Question;
}
