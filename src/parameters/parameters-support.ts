import * as inquirer from "inquirer";
import {AbstractParameter} from "./abstract";

/**
 * @internal
 */
export class ParametersSupport {
    private parameters = new Map<string, AbstractParameter>();

    registerParameter(param: AbstractParameter) {
        param.setupInquirer(inquirer);
        this.parameters.set(param.type, param);
    }

    getParam(type: string): AbstractParameter {
        const param = this.parameters.get(type);
        if (!param) {
            throw Error(`Param type: ${type} isn't registered!`);
        }
        return param;
    }
}
