export const isDev = false;
export const APP_VERSION = "v0.1.3";

export function calculateLevel(totalExp: number) {
    let level = 0;
    let expRemaining = totalExp;
    let nextLevelExp = 5000; // level 1

    while (expRemaining >= nextLevelExp) {
        level++;
        expRemaining -= nextLevelExp;
        nextLevelExp = level === 0 ? 5000 : (level+1) * 5000; // increase required exp for next level
    }

    return { level, curLevelExp: expRemaining, nextLevelExp: nextLevelExp };
}