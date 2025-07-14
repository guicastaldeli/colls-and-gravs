import { ListType } from './list-type';

export let ListData: ListType[] = [];

export async function loadListData(): Promise<void> {
    const res = await fetch('./env/obj/random-blocks/list-data.json');
    ListData = await res.json();
}

export function getRandomItem(): ListType {
    if(ListData.length === 0) throw new Error('List data not loaded.')
    const randomIndex = Math.floor(Math.random() * ListData.length);
    return ListData[randomIndex];
}