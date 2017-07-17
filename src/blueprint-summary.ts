import {Blueprint, SummaryItem} from "./blueprint";
import {Change, MultiChange, NoopChange} from "./lib/ast-tools/change";
import * as ts from "typescript/lib/tsserverlibrary";
import Err = ts.server.Msg.Err;
import * as Chalk from "chalk";

/**
 * @internal
 */
export class BlueprintSummary {
    constructor(private blueprint: Blueprint) {

    }

    generateSummary(includeColors: boolean): SummaryItem[] {
        const cluster = this.blueprint.getChangesCluster();
        return Object.entries(cluster.changesByFile)
            .map(pair => {
                return {
                    filename: pair[0],
                    summary: this.generateChangesStats(pair[1], includeColors)
                };
            });
    }

    private generateChangesStats(changes: Change[], includeColors: boolean): string {
        // extract MultiChange to simple Change instances
        const extracted = changes
            .reduce((list, ch) => {
                if(ch instanceof MultiChange) {
                    return list.concat(ch.changes);
                }
                return list.concat(ch);
            }, [] as Change[])
            // remove noop changes
            .filter((ch) => ! (ch instanceof NoopChange));

        const stats = extracted
            .map((ch) => ch.constructor.name.replace('Change', '').toLowerCase())
            .reduce((stats, ch) => {
                if (!stats[ch]) {
                    stats[ch] = 0;
                }
                stats[ch]++;
                return stats;
            }, {} as { [k: string]: number });

        return Object.entries(stats)
            .map(stat => this.generateChangeStat(stat[0], stat[1], includeColors))
            .join(', ');
    }

    private generateChangeStat(changeName: string, amount: number, includeColors: boolean): string {
        const format = (name: string, num: number) => `${num} ${name}${num > 1 ? 's' : ''}`;

        if (!includeColors) {
            return format(changeName, amount);
        }

        switch (changeName) {
            case 'insert':
                return Chalk.green(format(changeName, amount));
            case 'remove':
                return Chalk.red(format(changeName, amount));
            case 'replace':
                return Chalk.blue(format(changeName, amount));
            default:
                return format(changeName, amount);
        }
    }
}
