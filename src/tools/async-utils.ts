export async function resolveArray<T>(acc: Promise<T[]>, promise: Promise<T>): Promise<T[]> {
    (await acc).push(await promise);
    return acc;
}
