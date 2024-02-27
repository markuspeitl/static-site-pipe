
export type Nullable<ItemType> = ItemType | null | undefined;
export type NullableString = Nullable<string>;
export type SingleOrArray<ItemType> = Array<ItemType> | ItemType;
export type ArrayAndNull<ItemType> = Array<Nullable<ItemType>>;
export type NullableArray<ItemType> = Nullable<Array<Nullable<ItemType>>>;


export async function multiplyIfArray(fn, targetArg: any | any[], ...options: any[]) {

    if (!fn) {
        return undefined;
    }

    if (Array.isArray(targetArg)) {
        return targetArg.map((arg: any) => fn(arg, ...options));
        //return targetArg.map(async (arg: any) => await fn(arg, ...options));
    }

    return fn(targetArg, ...options);

    //fn.apply(null, targetArg)
}

export async function multiplyIfArrayAsync(fn, targetArg: any | any[], ...options: any[]) {

    if (!fn) {
        return undefined;
    }

    if (Array.isArray(targetArg)) {

        const promises = targetArg.map((arg: any) => fn(arg, ...options));

        return Promise.allSettled(promises);
        //return targetArg.map(async (arg: any) => await fn(arg, ...options));
    }

    return fn(targetArg, ...options);

    //fn.apply(null, targetArg)
}

//async function processPipeLineStages()

export function mergePropsToArray(dict: Object, keys: string[]): any[] {
    let collectedArray: any[] = [];

    for (const key of keys) {

        let selectedProp: any | null = null;
        if (!key) {
            selectedProp = dict;
        }
        else {
            selectedProp = dict[ key ];
        }

        if (selectedProp) {
            if (Array.isArray(selectedProp)) {
                collectedArray = collectedArray.concat(selectedProp);
            }
            else {
                collectedArray.push(selectedProp);
            }
        }
    }

    return collectedArray;
}


export function isTypeOrItemType(value: any | any[], matchType: string): boolean {
    let foundDefined = undefined;

    if (Array.isArray(value)) {

        for (const elem of value) {
            if (elem !== undefined) {
                foundDefined = elem;
            }
            else if (matchType === 'undefined') {
                return true;
            }

            if (foundDefined) {
                break;
            }
        }
    }
    else {
        foundDefined = value;
    }

    if (foundDefined && typeof value === matchType) {
        return true;
    }

    return false;
}