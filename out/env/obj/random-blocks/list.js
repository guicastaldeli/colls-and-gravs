export let ListData = [];
export async function loadListData() {
    const res = await fetch('./.data/list-data.json');
    ListData = await res.json();
}
export function getRandomItem() {
    if (ListData.length === 0)
        throw new Error('List data not loaded.');
    const randomIndex = Math.floor(Math.random() * ListData.length);
    return ListData[randomIndex];
}
