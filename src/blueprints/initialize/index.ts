import {Blueprint, BlueprintParameter} from "../../blueprint";
import {Change} from "../../lib/ast-tools/change";

export default //noinspection JSUnusedGlobalSymbols
class InitializeBlueprint extends Blueprint {
    name = 'initialize';
    description = 'Installs boilerplate files';
    options: BlueprintParameter[] = [
    ];

    prepare(options: { [p: string]: string | boolean }): void {
    }

    generateChanges(): Change[] {
        return [];
    }
}
